package com.example.compound.service.knowledge;

import com.example.compound.config.KnowledgeBaseProperties;
import com.example.compound.dto.knowledge.KnowledgeAnswerResponse;
import com.example.compound.dto.knowledge.KnowledgeAskRequest;
import com.example.compound.dto.knowledge.KnowledgeReindexResponse;
import com.example.compound.dto.knowledge.KnowledgeSourceDto;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class KnowledgeBaseService {

    private static final Pattern LATIN_PATTERN = Pattern.compile("[a-z0-9][a-z0-9._-]{1,}");
    private static final Pattern HAN_PATTERN = Pattern.compile("[\\p{IsHan}]{2,}");
    private static final Set<String> INDEXED_EXTENSIONS = Set.of(".md", ".txt", ".json", ".csv");

    private final KnowledgeBaseProperties properties;
    private final KnowledgeAnswerGenerator answerGenerator;
    private final Path projectRoot;
    private final AtomicReference<KnowledgeIndex> indexRef = new AtomicReference<>(KnowledgeIndex.empty());

    @Autowired
    public KnowledgeBaseService(KnowledgeBaseProperties properties,
                                OpenAiCompatibleKnowledgeAnswerGenerator answerGenerator) {
        this(properties, (KnowledgeAnswerGenerator) answerGenerator, detectProjectRoot());
    }

    KnowledgeBaseService(KnowledgeBaseProperties properties,
                         KnowledgeAnswerGenerator answerGenerator,
                         Path projectRoot) {
        this.properties = properties;
        this.answerGenerator = answerGenerator;
        this.projectRoot = projectRoot.toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        if (properties.isEnabled()) {
            rebuildIndex();
        }
    }

    public synchronized KnowledgeReindexResponse rebuildIndex() {
        List<Path> sourceFiles = collectSourceFiles();
        List<KnowledgeChunk> chunks = sourceFiles.stream()
                .flatMap(this::readAndChunkFile)
                .toList();

        KnowledgeIndex index = new KnowledgeIndex(sourceFiles, chunks, LocalDateTime.now());
        indexRef.set(index);

        KnowledgeReindexResponse response = new KnowledgeReindexResponse();
        response.setIndexedDocumentCount(index.documentCount());
        response.setIndexedChunkCount(index.chunkCount());
        response.setRebuiltAt(index.rebuiltAt());
        response.setSourcePaths(index.sourceFiles().stream().map(this::toRelativeDisplayPath).toList());
        return response;
    }

    public KnowledgeAnswerResponse ask(KnowledgeAskRequest request) {
        KnowledgeIndex index = ensureIndex();
        int topK = request.getTopK() != null ? request.getTopK() : properties.getDefaultTopK();
        List<KnowledgeChunkSearchResult> matches = search(request.getQuestion(), topK, index);

        KnowledgeAnswerResponse response = new KnowledgeAnswerResponse();
        response.setQuestion(request.getQuestion().trim());
        response.setIndexedDocumentCount(index.documentCount());
        response.setIndexedChunkCount(index.chunkCount());
        response.setGenerationAvailable(isGenerationAvailable());
        response.setGeneratedAt(LocalDateTime.now());
        response.setSources(matches.stream().map(this::toSourceDto).toList());

        boolean useGeneration = request.getUseGeneration() == null || request.getUseGeneration();
        if (useGeneration) {
            answerGenerator.generate(request.getQuestion(), matches).ifPresentOrElse(
                    answer -> {
                        response.setMode("rag");
                        response.setAnswer(answer);
                    },
                    () -> {
                        response.setMode("retrieval");
                        response.setAnswer(buildRetrievalOnlyAnswer(request.getQuestion(), matches));
                    }
            );
        } else {
            response.setMode("retrieval");
            response.setAnswer(buildRetrievalOnlyAnswer(request.getQuestion(), matches));
        }

        return response;
    }

    boolean isGenerationAvailable() {
        return answerGenerator instanceof OpenAiCompatibleKnowledgeAnswerGenerator generator && generator.isAvailable();
    }

    private List<KnowledgeChunkSearchResult> search(String question, int topK, KnowledgeIndex index) {
        List<String> queryTokens = tokenize(question);
        String normalizedQuestion = normalize(question);

        return index.chunks().stream()
                .map(chunk -> new KnowledgeChunkSearchResult(chunk, scoreChunk(chunk, queryTokens, normalizedQuestion)))
                .filter(result -> result.score() > 0)
                .sorted(Comparator.comparingDouble(KnowledgeChunkSearchResult::score).reversed())
                .limit(Math.max(1, topK))
                .toList();
    }

    private KnowledgeIndex ensureIndex() {
        KnowledgeIndex current = indexRef.get();
        if (current.chunkCount() > 0 || !properties.isEnabled()) {
            return current;
        }
        rebuildIndex();
        return indexRef.get();
    }

    private List<Path> collectSourceFiles() {
        if (properties.getSourcePaths() == null || properties.getSourcePaths().isEmpty()) {
            return List.of();
        }

        Set<Path> files = new LinkedHashSet<>();
        for (String configuredPath : properties.getSourcePaths()) {
            if (configuredPath == null || configuredPath.isBlank()) {
                continue;
            }

            Path resolved = projectRoot.resolve(configuredPath).normalize();
            if (!resolved.startsWith(projectRoot) || !Files.exists(resolved)) {
                continue;
            }

            if (Files.isDirectory(resolved)) {
                try (Stream<Path> stream = Files.walk(resolved)) {
                    stream.filter(Files::isRegularFile)
                            .filter(this::isIndexableFile)
                            .filter(this::isAllowedProjectFile)
                            .forEach(files::add);
                } catch (IOException ignored) {
                    // Skip unreadable directories and keep building the rest of the index.
                }
            } else if (isIndexableFile(resolved) && isAllowedProjectFile(resolved)) {
                files.add(resolved);
            }
        }

        return files.stream().sorted().toList();
    }

    private Stream<KnowledgeChunk> readAndChunkFile(Path file) {
        try {
            String raw = Files.readString(file, StandardCharsets.UTF_8);
            if (raw.isBlank()) {
                return Stream.empty();
            }
            return chunkContent(file, raw).stream();
        } catch (IOException ignored) {
            return Stream.empty();
        }
    }

    private List<KnowledgeChunk> chunkContent(Path file, String raw) {
        List<String> paragraphs = splitParagraphs(raw.replace("\r\n", "\n"));
        List<KnowledgeChunk> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        String currentHeading = file.getFileName().toString();

        for (String paragraph : paragraphs) {
            if (paragraph.startsWith("#")) {
                currentHeading = paragraph.replaceFirst("^#+\\s*", "").trim();
            }

            if (current.length() > 0 && current.length() + paragraph.length() + 2 > properties.getMaxChunkLength()) {
                chunks.add(buildChunk(file, currentHeading, current.toString()));
                current = new StringBuilder(tail(current.toString(), properties.getChunkOverlap()));
            }

            if (current.length() > 0) {
                current.append("\n\n");
            }
            current.append(paragraph.trim());
        }

        if (current.length() > 0) {
            chunks.add(buildChunk(file, currentHeading, current.toString()));
        }

        return chunks.stream()
                .filter(chunk -> !chunk.content().isBlank())
                .toList();
    }

    private KnowledgeChunk buildChunk(Path file, String heading, String content) {
        String cleanedContent = content.trim();
        String path = toRelativeDisplayPath(file);
        String title = heading == null || heading.isBlank()
                ? file.getFileName().toString()
                : file.getFileName() + " / " + heading;
        return new KnowledgeChunk(
                title,
                path,
                cleanedContent,
                normalize(cleanedContent),
                normalize(path + " " + title),
                tokenize(cleanedContent + "\n" + title + "\n" + path)
        );
    }

    private List<String> splitParagraphs(String raw) {
        return Stream.of(raw.split("\n\\s*\n"))
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .toList();
    }

    private double scoreChunk(KnowledgeChunk chunk, List<String> queryTokens, String normalizedQuestion) {
        double score = 0;
        for (String token : queryTokens) {
            int occurrences = countOccurrences(chunk.normalizedContent(), token);
            if (occurrences > 0) {
                score += occurrences * Math.min(3.0, token.length() * 0.35);
            }
            if (chunk.normalizedPath().contains(token)) {
                score += 3.5;
            }
        }

        if (!normalizedQuestion.isBlank() && chunk.normalizedContent().contains(normalizedQuestion)) {
            score += 8;
        }

        long sharedTokens = chunk.tokens().stream().filter(queryTokens::contains).count();
        score += sharedTokens * 0.8;
        return score;
    }

    private String buildRetrievalOnlyAnswer(String question, List<KnowledgeChunkSearchResult> matches) {
        if (matches.isEmpty()) {
            return "The knowledge base does not have enough related material for this question yet. Try another phrasing or rebuild the index first.";
        }

        StringBuilder builder = new StringBuilder();
        builder.append("Retrieval-only answer:\n\n");
        builder.append("Question: ").append(question.trim()).append("\n\n");
        for (int i = 0; i < matches.size(); i++) {
            KnowledgeChunkSearchResult result = matches.get(i);
            builder.append(i + 1)
                    .append(". Source ")
                    .append(result.chunk().path())
                    .append(": ")
                    .append(summarizeExcerpt(result.chunk().content()))
                    .append('\n');
        }
        if (!isGenerationAvailable()) {
            builder.append("\nGeneration is not configured yet. Set app.rag.llm.api-key and app.rag.llm.model to enable full RAG answers.");
        }
        return builder.toString().trim();
    }

    private KnowledgeSourceDto toSourceDto(KnowledgeChunkSearchResult result) {
        KnowledgeSourceDto dto = new KnowledgeSourceDto();
        dto.setTitle(result.chunk().title());
        dto.setPath(result.chunk().path());
        dto.setExcerpt(summarizeExcerpt(result.chunk().content()));
        dto.setScore(Math.round(result.score() * 100.0) / 100.0);
        return dto;
    }

    private String summarizeExcerpt(String content) {
        String compact = content.replace('\n', ' ').replaceAll("\\s+", " ").trim();
        if (compact.length() <= 220) {
            return compact;
        }
        return compact.substring(0, 220).trim() + "...";
    }

    private String tail(String content, int maxChars) {
        if (content.length() <= maxChars) {
            return content;
        }
        return content.substring(content.length() - maxChars).trim();
    }

    private int countOccurrences(String haystack, String needle) {
        if (needle == null || needle.isBlank()) {
            return 0;
        }
        int count = 0;
        int index = 0;
        while ((index = haystack.indexOf(needle, index)) >= 0) {
            count++;
            index += needle.length();
        }
        return count;
    }

    private List<String> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }

        Set<String> tokens = new LinkedHashSet<>();
        String normalized = normalize(text);

        Matcher latinMatcher = LATIN_PATTERN.matcher(normalized);
        while (latinMatcher.find()) {
            tokens.add(latinMatcher.group());
        }

        Matcher hanMatcher = HAN_PATTERN.matcher(text);
        while (hanMatcher.find()) {
            String group = hanMatcher.group();
            tokens.add(group);
            for (int i = 0; i < group.length() - 1; i++) {
                tokens.add(group.substring(i, i + 2));
            }
            if (group.length() >= 3) {
                for (int i = 0; i < group.length() - 2; i++) {
                    tokens.add(group.substring(i, i + 3));
                }
            }
        }

        return tokens.stream()
                .filter(token -> token.length() >= 2)
                .limit(80)
                .collect(Collectors.toList());
    }

    private String normalize(String text) {
        return text == null ? "" : text.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private boolean isIndexableFile(Path path) {
        String fileName = path.getFileName().toString().toLowerCase(Locale.ROOT);
        return INDEXED_EXTENSIONS.stream().anyMatch(fileName::endsWith);
    }

    private boolean isAllowedProjectFile(Path path) {
        String normalized = path.toString().replace('\\', '/').toLowerCase(Locale.ROOT);
        return !normalized.contains("/node_modules/")
                && !normalized.contains("/target/")
                && !normalized.contains("/dist/")
                && !normalized.contains("/.git/")
                && !normalized.contains("/backend/data/");
    }

    private String toRelativeDisplayPath(Path file) {
        return projectRoot.relativize(file.toAbsolutePath().normalize()).toString().replace('\\', '/');
    }

    static Path detectProjectRoot() {
        Path cwd = Paths.get("").toAbsolutePath().normalize();
        if (Files.isDirectory(cwd.resolve("frontend")) && Files.isDirectory(cwd.resolve("backend"))) {
            return cwd;
        }
        if ("backend".equalsIgnoreCase(String.valueOf(cwd.getFileName()))) {
            Path parent = cwd.getParent();
            if (parent != null
                    && Files.isDirectory(parent.resolve("frontend"))
                    && Files.isDirectory(parent.resolve("backend"))) {
                return parent;
            }
        }
        return cwd;
    }

    private record KnowledgeIndex(List<Path> sourceFiles, List<KnowledgeChunk> chunks, LocalDateTime rebuiltAt) {
        static KnowledgeIndex empty() {
            return new KnowledgeIndex(List.of(), List.of(), LocalDateTime.now());
        }

        int documentCount() {
            return sourceFiles.size();
        }

        int chunkCount() {
            return chunks.size();
        }
    }
}
