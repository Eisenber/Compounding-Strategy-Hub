package com.example.compound.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 数据刷新服务 — 调用 Python fetch_stocks.py 拉取最新行情与财务数据。
 * <p>
 * 支持定时自动刷新（交易日 15:30）和手动触发刷新，
 * 使用 AtomicBoolean 防止并发刷新。
 */
@Service
public class DataRefreshService {

    private static final Logger logger = LoggerFactory.getLogger(DataRefreshService.class);

    private final AtomicBoolean refreshing = new AtomicBoolean(false);

    @Value("${data.refresh.python-path:python}")
    private String pythonPath;

    @Value("${data.refresh.script-path:scripts/fetch_stocks.py}")
    private String scriptPath;

    @Value("${data.refresh.timeout-minutes:5}")
    private int timeoutMinutes;

    @Value("${data.refresh.schedule-enabled:true}")
    private boolean scheduleEnabled;

    /**
     * 定时刷新 — 默认每个交易日 15:30 执行
     */
    @Scheduled(cron = "${data.refresh.schedule-cron:0 30 15 * * MON-FRI}")
    public void scheduledRefresh() {
        if (!scheduleEnabled) {
            return;
        }
        logger.info("定时数据刷新开始...");
        try {
            triggerRefresh();
        } catch (Exception e) {
            logger.error("定时数据刷新失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 同步触发刷新（阻塞直到完成或超时）。
     * 如果已有刷新在进行中，直接返回 false。
     *
     * @return true 表示刷新成功，false 表示跳过或失败
     */
    public boolean triggerRefresh() {
        if (!refreshing.compareAndSet(false, true)) {
            logger.warn("数据刷新已在运行中，跳过本次请求");
            return false;
        }

        try {
            logger.info("开始执行数据刷新脚本: {}", scriptPath);

            // 确定项目根目录 — 从当前工作目录向上查找包含 scripts/ 和 backend/ 的目录
            Path projectRoot = Path.of("").toAbsolutePath();
            while (projectRoot != null
                    && !java.nio.file.Files.exists(projectRoot.resolve("scripts").resolve("fetch_stocks.py"))
                    && !java.nio.file.Files.exists(projectRoot.resolve("backend"))) {
                Path parent = projectRoot.getParent();
                if (parent == null || parent.equals(projectRoot)) break;
                projectRoot = parent;
            }
            Path dbPath = projectRoot.resolve("backend").resolve("data").resolve("compound.db");
            Path resolvedScript = projectRoot.resolve(scriptPath);
            logger.info("项目根目录: {}, 脚本路径: {}", projectRoot, resolvedScript);

            ProcessBuilder pb = new ProcessBuilder(
                    pythonPath,
                    resolvedScript.toString(),
                    "--db-path", dbPath.toString()
            );
            pb.directory(projectRoot.toFile());
            pb.redirectErrorStream(true);

            Process process = pb.start();

            // 在独立线程中读取输出，避免阻塞
            StringBuilder output = new StringBuilder();
            Thread outputReader = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        output.append(line).append("\n");
                        logger.info("  [fetch] {}", line);
                    }
                } catch (IOException e) {
                    logger.warn("读取脚本输出时出错: {}", e.getMessage());
                }
            }, "fetch-stdout-reader");
            outputReader.setDaemon(true);
            outputReader.start();

            boolean finished = process.waitFor(timeoutMinutes, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                outputReader.interrupt();
                logger.error("数据刷新脚本超时 ({} 分钟)，已强制终止", timeoutMinutes);
                return false;
            }

            // 等待输出线程读完最后几行
            outputReader.join(5000);

            int exitCode = process.exitValue();
            if (exitCode == 0) {
                logger.info("数据刷新成功完成");
                return true;
            } else {
                logger.error("数据刷新脚本退出码: {}\n输出: {}", exitCode, output);
                return false;
            }

        } catch (IOException e) {
            logger.error("无法启动数据刷新脚本: {} — 请确认 Python 已安装且路径正确 ({})",
                    e.getMessage(), pythonPath);
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.error("数据刷新被中断: {}", e.getMessage());
            return false;
        } finally {
            refreshing.set(false);
        }
    }

    /**
     * 异步触发刷新 — 后台执行，立即返回。
     */
    public void triggerRefreshAsync() {
        CompletableFuture.runAsync(this::triggerRefresh);
    }

    /**
     * 是否正在刷新中。
     */
    public boolean isRefreshing() {
        return refreshing.get();
    }
}
