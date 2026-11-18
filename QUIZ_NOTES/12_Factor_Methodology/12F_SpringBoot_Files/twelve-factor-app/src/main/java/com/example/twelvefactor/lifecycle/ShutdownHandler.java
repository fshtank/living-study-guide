package com.example.twelvefactor.lifecycle;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ShutdownHandler {

    @PreDestroy
    public void onShutdown() {
        log.info("SIGTERM received. Cleaning up resources...");
        log.info("Cleanup complete. Exiting.");
    }
}
