package com.example.twelvefactor.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.env.Environment;

@SpringBootApplication
@RequiredArgsConstructor
@Slf4j
public class AdminTaskRunner implements CommandLineRunner {

    private final Environment env;

    public static void main(String[] args) {
        SpringApplication.run(AdminTaskRunner.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        String task = env.getProperty("task", "");

        if (task.isEmpty()) {
            log.error("No task specified. Use --task=<name>");
            System.exit(1);
        }

        switch (task) {
            case "backfill-users":
                log.info("Running user backfill...");
                break;
            case "clear-cache":
                log.info("Clearing Redis cache...");
                break;
            default:
                log.warn("Unknown task: {}", task);
        }

        System.exit(0);
    }
}
