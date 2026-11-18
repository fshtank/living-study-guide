package com.example.twelvefactor.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppConfig {
    private boolean featureFlagX = false;
    private String apiKey;
    private int maxUploadSizeMb = 10;
}
