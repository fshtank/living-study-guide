#!/bin/bash

# Create project directory
PROJECT_DIR="twelve-factor-app"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Create Maven pom.xml
cat > pom.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.5</version>
        <relativePath/>
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
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>net.logstash.logback</groupId>
            <artifactId>logstash-logback-encoder</artifactId>
            <version>7.4</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.session</groupId>
            <artifactId>spring-session-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>

    <build>
        <plugins>
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
EOF

# Create directory structure for Java sources
mkdir -p src/main/java/com/example/twelvefactor
mkdir -p src/main/java/com/example/twelvefactor/config
mkdir -p src/main/java/com/example/twelvefactor/lifecycle
mkdir -p src/main/java/com/example/twelvefactor/admin
mkdir -p src/main/resources/db/migration

# Create application.yml
cat > src/main/resources/application.yml << 'EOF'
server:
  port: ${PORT:8080}
  shutdown: graceful
  tomcat:
    threads:
      max: 200
      min-spare: 10

spring:
  application:
    name: twelve-factor-app
  lifecycle:
    timeout-per-shutdown-phase: 30s
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/mydb}
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:secret}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
  session:
    store-type: redis
    redis:
      namespace: myapp:session
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

logging:
  level:
    root: INFO
    org.hibernate.SQL: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
  logstash:
    enabled: true

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true
EOF

# Create AppConfig.java
cat > src/main/java/com/example/twelvefactor/config/AppConfig.java << 'EOF'
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
EOF

# Create ShutdownHandler.java
cat > src/main/java/com/example/twelvefactor/lifecycle/ShutdownHandler.java << 'EOF'
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
EOF

# Create AdminTaskRunner.java
cat > src/main/java/com/example/twelvefactor/admin/AdminTaskRunner.java << 'EOF'
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
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
target/
!.mvn/wrapper/maven-wrapper.jar
!**/src/main/**/target/
!**/src/test/**/target/

### IntelliJ IDEA ###
.idea
*.iws
*.iml
*.ipr

### Eclipse ###
.classpath
.project
.settings/

### NetBeans ###
nbproject/private/
build/
nbbuild/
dist/
nbdist/
.nb-gradle/
EOF

# Create .env.example
cat > .env.example << 'EOF'
DATABASE_URL=jdbc:postgresql://localhost:5432/mydb
DB_USER=postgres
DB_PASSWORD=localpass
REDIS_HOST=localhost
APP_API_KEY=dev-key-123
EOF

# Create README.md
cat > README.md << 'EOF'
# Twelve-Factor Spring Boot Application

A production-ready Spring Boot application following the 12-Factor App methodology.

## Quick Start

### Local Development
```bash
# Start Postgres and Redis
docker run -d --name pg -e POSTGRES_PASSWORD=localpass -p 5432:5432 postgres:15
docker run -d --name redis -p 6379:6379 redis:7

# Run with env vars
source .env
mvn spring-boot:run