package com.example.compound.service.knowledge;

import com.example.compound.config.KnowledgeBaseProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@Component
public class OpenAiCompatibleKnowledgeAnswerGenerator implements KnowledgeAnswerGenerator {

    private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";
    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleKnowledgeAnswerGenerator.class);

    private final KnowledgeBaseProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OpenAiCompatibleKnowledgeAnswerGenerator(KnowledgeBaseProperties properties,
                                                    ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public Optional<String> generate(String question, List<KnowledgeChunkSearchResult> sources) {
        if (!isAvailable() || sources.isEmpty()) {
            return Optional.empty();
        }

        String requestBody;
        try {
            requestBody = buildRequestBody(question, sources);
        } catch (Exception ex) {
            return Optional.empty();
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(trimTrailingSlash(properties.getLlm().getBaseUrl()) + "/chat/completions"))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json; charset=UTF-8")
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + properties.getLlm().getApiKey())
                .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("LLM request failed with status {} and body: {}", response.statusCode(), abbreviate(response.body()));
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode message = root.path("choices").path(0).path("message");
            JsonNode content = message.path("content");
            if (content.isTextual() && !content.asText().isBlank()) {
                log.info("LLM answer resolved from message.content text.");
                return Optional.of(content.asText().trim());
            }

            if (content.isArray()) {
                StringBuilder builder = new StringBuilder();
                for (JsonNode item : content) {
                    String text = item.path("text").asText("");
                    if (!text.isBlank()) {
                        if (builder.length() > 0) {
                            builder.append('\n');
                        }
                        builder.append(text.trim());
                    }
                }
                if (builder.length() > 0) {
                    log.info("LLM answer resolved from message.content array.");
                    return Optional.of(builder.toString());
                }
            }

            JsonNode reasoningContent = message.path("reasoning_content");
            if (reasoningContent.isTextual() && !reasoningContent.asText().isBlank()) {
                log.info("LLM answer resolved from message.reasoning_content.");
                return Optional.of(reasoningContent.asText().trim());
            }

            log.warn("LLM returned 2xx but no usable content. Response body: {}", abbreviate(response.body()));
        } catch (IOException ex) {
            log.warn("LLM response parsing failed: {}", ex.getMessage());
            return Optional.empty();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("LLM request interrupted.");
            return Optional.empty();
        }

        return Optional.empty();
    }

    boolean isAvailable() {
        return properties.getLlm() != null
                && properties.getLlm().getApiKey() != null
                && !properties.getLlm().getApiKey().isBlank()
                && properties.getLlm().getModel() != null
                && !properties.getLlm().getModel().isBlank();
    }

    private String buildRequestBody(String question, List<KnowledgeChunkSearchResult> sources) throws IOException {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("model", properties.getLlm().getModel());
        payload.put("temperature", properties.getLlm().getTemperature());
        payload.put("stream", false);

        ArrayNode messages = objectMapper.createArrayNode();
        messages.add(objectMapper.createObjectNode()
                .put("role", "system")
                .put("content", "You are a project knowledge-base assistant. Answer only from the supplied context. If evidence is insufficient, say so clearly. Use citations like [1] [2]."));
        messages.add(objectMapper.createObjectNode()
                .put("role", "user")
                .put("content", buildPrompt(question, sources)));

        payload.set("messages", messages);
        return objectMapper.writeValueAsString(payload);
    }

    private String buildPrompt(String question, List<KnowledgeChunkSearchResult> sources) {
        StringBuilder builder = new StringBuilder();
        builder.append("Question: ").append(question.trim()).append("\n\n");
        builder.append("Context:\n");
        for (int i = 0; i < sources.size(); i++) {
            KnowledgeChunk chunk = sources.get(i).chunk();
            builder.append('[').append(i + 1).append("] ")
                    .append(chunk.title()).append(" (").append(chunk.path()).append(")\n")
                    .append(chunk.content().trim())
                    .append("\n\n");
        }
        builder.append("Answer using only the context above. Start with the direct conclusion, then cite the key evidence. If the context is not enough, say 'insufficient evidence'.");
        return builder.toString();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_BASE_URL;
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String abbreviate(String value) {
        if (value == null) {
            return "";
        }
        String compact = value.replaceAll("\\s+", " ").trim();
        return compact.length() <= 800 ? compact : compact.substring(0, 800) + "...";
    }
}
