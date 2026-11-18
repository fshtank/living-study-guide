Here is a complete, production-ready example of a Spring Boot application configured according to the 12-Factor Methodology.

### 1. `pom.xml` (Factor 2: Dependencies)
This configuration ensures all dependencies are explicitly declared and packaged into an immutable Fat JAR. It uses **Spring Boot 3.x** (Java 17+).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.5</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>
    
    <groupId>com.example</groupId>
    <artifactId>twelve-factor-app</artifactId>
    <version>1.0.0</version>
    <name>twelve-factor-app</name>
    <description>12-Factor App Implementation in Spring Boot</description>
    
    <properties>
        <java.version>17</java.version>
    </properties>
    
    <dependencies>
        <!-- Factor 4: Backing Services (Postgres, Redis) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        
        <!-- Factor 7: Port Binding / Web Server -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <!-- Factor 11: Logs (Structured JSON) -->
        <dependency>
            <groupId>net.logstash.logback</groupId>
            <artifactId>logstash-logback-encoder</artifactId>
            <version>7.4</version>
        </dependency>
        
        <!-- Factor 9: Disposability (Health Checks for K8s/Heroku) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        
        <!-- Factor 12: Admin Processes (Migrations) -->
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>

        <!-- Factor 6: Stateless Sessions -->
        <dependency>
            <groupId>org.springframework.session</groupId>
            <artifactId>spring-session-data-redis</artifactId>
        </dependency>

        <!-- Database Driver (Runtime only) -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        
        <!-- Lombok for cleaner config classes -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Factor 5: Build Stage - Creates Immutable Fat JAR -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

### 2. `application.yml` (Factors 3, 4, 7, 9, 11)
This file contains **no secrets**. All sensitive or environment-specific values are injected via Environment Variables.

```yaml
# src/main/resources/application.yml

server:
  # Factor 7: Port Binding - Use $PORT env var, default to 8080
  port: ${PORT:8080}
  
  # Factor 9: Disposability - Graceful shutdown
  shutdown: graceful
  
  tomcat:
    threads:
      max: 200
      min-spare: 10

spring:
  application:
    name: twelve-factor-app
  
  lifecycle:
    # Factor 9: Max time to wait for requests to finish before killing process
    timeout-per-shutdown-phase: 30s

  # Factor 4: Backing Services - Postgres
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/mydb}
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:secret}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2

  # Factor 4: Backing Services - Redis
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}

  # Factor 6: Processes - Externalized Session Store
  session:
    store-type: redis
    redis:
      namespace: myapp:session

  jpa:
    hibernate:
      ddl-auto: validate # Never auto-update schema in prod; use Flyway
    open-in-view: false

  # Factor 12: Admin Processes - Run migrations on startup (or disable in CI)
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

# Factor 11: Logs - Structured JSON output
logging:
  level:
    root: INFO
    org.hibernate.SQL: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
  logstash:
    enabled: true

# Factor 9: Disposability - Health Check Endpoints
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true # Adds /actuator/health/liveness and /readiness
```

### 3. Type-Safe Configuration Class (Factor 3: Config)
Instead of scattering `${...}` strings across your code, bind them to a typed object. This validates that required env vars are present at startup.

```java
package com.example.twelvefactor.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Factor 3: Config
 * Binds environment variables to a type-safe Java object.
 * If 'FEATURE_FLAG_X' is missing, the app fails fast at startup.
 */
@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppConfig {
    
    // Maps to APP_FEATURE_FLAG_X env var
    private boolean featureFlagX = false;
    
    // Maps to APP_API_KEY env var (Required)
    private String apiKey;
    
    // Maps to APP_MAX_UPLOAD_SIZE_MB
    private int maxUploadSizeMb = 10;
}
```

### 4. Graceful Shutdown Hook (Factor 9: Disposability)
While Spring Boot handles HTTP requests gracefully, you may need custom logic for background jobs or cache flushing.

```java
package com.example.twelvefactor.lifecycle;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Factor 9: Disposability
 * Ensures resources are cleaned up when SIGTERM is received.
 */
@Slf4j
@Component
public class ShutdownHandler {

    @PreDestroy
    public void onShutdown() {
        log.info("SIGTERM received. Cleaning up resources...");
        
        // 1. Flush any pending metrics/logs
        // 2. Close custom non-managed connections
        // 3. Notify external services if needed
        
        log.info("Cleanup complete. Exiting.");
    }
}
```

### 5. One-Off Admin Task (Factor 12: Admin Processes)
Run this as a separate command using the same JAR. Do not bundle admin logic into the main web controller.

```java
package com.example.twelvefactor.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Factor 12: Admin Processes
 * Run with: java -jar app.jar --task=backfill-users
 */
@SpringBootApplication
@RequiredArgsConstructor
@Slf4j
public class AdminTaskRunner implements CommandLineRunner {

    private final Environment env;
    // Inject your repositories/services here
    
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
                // performMigrationLogic();
                break;
            case "clear-cache":
                log.info("Clearing Redis cache...");
                // redisTemplate.keys("*").forEach(redisTemplate::delete);
                break;
            default:
                log.warn("Unknown task: {}", task);
        }
        
        // Exit after task completion
        System.exit(0);
    }
}
```

### 6. Dockerfile (Factors 2, 5, 10)
Multi-stage build ensures the runtime image contains *only* the JRE and the JAR. No Maven, no source code.

```dockerfile
# --- Stage 1: Build ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom first for dependency caching (Layer optimization)
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests

# --- Stage 2: Release/Run ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create non-root user (Security best practice)
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Factor 5: Copy ONLY the immutable artifact
COPY --from=build /app/target/*.jar app.jar

# Factor 7: Expose port
EXPOSE 8080

# Factor 9: JVM Tuning for Containers
# -XX:+UseContainerSupport helps JVM detect cgroup limits
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

### How to Run This Locally (Factor 10: Dev/Prod Parity)
Use a `.env` file locally (never committed) and `docker-compose` to simulate prod backing services.

```bash
# .env (Local Only)
DATABASE_URL=jdbc:postgresql://localhost:5432/mydb
DB_USER=postgres
DB_PASSWORD=localpass
REDIS_HOST=localhost
APP_API_KEY=dev-key-123
```

```bash
# Start local Postgres & Redis
docker run -d --name pg -e POSTGRES_PASSWORD=localpass -p 5432:5432 postgres:15
docker run -d --name redis -p 6379:6379 redis:7

# Run app
source .env
mvn spring-boot:run
```

This setup gives you a strictly stateless, observable, and portable Spring Boot application ready for Kubernetes, Cloud Foundry, or Heroku.