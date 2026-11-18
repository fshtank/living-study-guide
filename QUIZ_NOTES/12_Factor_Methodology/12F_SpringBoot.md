The **12-Factor App** methodology applies to Java and Spring Boot with specific nuances, primarily revolving around classloading, dependency management (Maven/Gradle), and the Spring ecosystem’s configuration philosophy.

Here is how each factor is implemented in a modern Java/Spring Boot application.

###### 1. Codebase
**One codebase tracked in version control, many deploys.**

*   **Java Practice:** Use a single Git repository for the service. If you have a large multi-module project, keep it in one repo (Monorepo) or use tools like **Bazel** or **Maven Multi-Module** to ensure atomic commits.
*   **Key Rule:** The same artifact (JAR) produced by the build pipeline should be promoted through Dev → Staging → Prod without modification.
*   **Tooling:** Git, **Maven** (`pom.xml`) or **Gradle** (`build.gradle`).

### 2. Dependencies
**Explicitly declare and isolate dependencies.**

Java’s "JAR Hell" (version conflicts) is the biggest enemy of this factor. You must ensure the app includes *only* its declared dependencies.

*   **Java Practice:**
    *   Use **Maven** or **Gradle** to declare dependencies explicitly.
    *   **Fat JAR (Uber JAR):** Spring Boot’s default packaging includes all dependencies inside the executable JAR. This isolates the app from the host JVM’s library path.
    *   **No System Jars:** Never use `<scope>system</scope>` in Maven pointing to local paths.
*   **Tooling:**
    *   `mvn dependency:tree` to audit conflicts.
    *   **Spring Boot Maven Plugin**: Handles the fat JAR creation automatically.
    ```xml
    <!-- pom.xml snippet -->
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
    ```

### 3. Config
**Store config in the environment.**

Spring Boot has a robust **Environment Abstraction** that respects the 12-Factor principle out of the box.

*   **Java Practice:**
    *   **Never** hardcode secrets in `application.properties` or `application.yml` checked into Git.
    *   Use **Spring Boot Properties** bound to Java classes (`@ConfigurationProperties`).
    *   Spring Boot automatically reads from **Environment Variables** (OS env vars) and command-line arguments, overriding properties files.
*   **Tooling:**
    *   `@ConfigurationProperties` for type-safe configuration.
    *   **Spring Cloud Config** or **HashiCorp Vault** for centralized externalized config in microservices.
    ```java
    // application.properties (committed to git)
    app.greeting=Hello

    // OS Environment Variable (NOT committed)
    export DB_PASSWORD=supersecret

    // Java Code
    @ConfigurationProperties(prefix = "app")
    @Data
    public class AppProperties {
        private String greeting;
        private String dbPassword; // Spring injects this from env var
    }
    ```

### 4. Backing Services
**Treat backing services as attached resources.**

Databases, Redis, Kafka, etc., are attached via configuration.

*   **Java Practice:**
    *   Use **Spring Boot Auto-Configuration**. It detects backing service credentials in env vars (or `VCAP_SERVICES` on Cloud Foundry) and creates beans automatically.
    *   **No Local Hardcoding:** Don’t hardcode `jdbc:postgresql://localhost:5432/mydb`. Use `${DATABASE_URL}`.
*   **Tooling:**
    *   `spring-boot-starter-data-jpa`
    *   `spring-boot-starter-data-redis`
    *   `spring-kafka`
    *   These starters look for standard env vars like `SPRING_DATASOURCE_URL`, `SPRING_REDIS_HOST`, etc.

### 5. Build, Release, Run
**Strictly separate build and run stages.**

*   **Java Practice:**
    *   **Build:** `mvn clean package` produces an executable JAR. This JAR is immutable.
    *   **Release:** Tag the JAR with a unique version (e.g., `myapp-1.2.3.jar`) and store it in a repository (Nexus, Artifactory, Docker Registry).
    *   **Run:** `java -jar myapp-1.2.3.jar` or via Docker.
*   **Key Rule:** The JAR built in CI/CD is the *only* artifact that runs in Prod. Do not rebuild for Prod.

### 6. Processes
**Execute the app as one or more stateless processes.**

Spring Boot apps should be stateless. Any session data must be externalized.

*   **Java Practice:**
    *   **Sessions:** If using Spring Session, configure it to use **Redis** or **JDBC** backend, not in-memory.
    *   **File Uploads:** Stream to S3, Azure Blob, or GCS. Never store on the local filesystem (`/tmp`).
    *   **Caching:** Use **Spring Cache Abstraction** with a Redis or Caffeine (for local, non-critical) backend.
*   **Anti-Pattern:** Storing user state in static variables or local HashMaps.

### 7. Port Binding
**Export services via port binding.**

Spring Boot’s embedded Tomcat/Jetty/Undertow binds to a port.

*   **Java Practice:**
    *   Read the port from the `PORT` environment variable.
    *   Default is `8080`, but production platforms (Heroku, Kubernetes) often inject a dynamic `PORT`.
    ```java
    // application.properties
    server.port=${PORT:8080}
    ```
*   **Key Rule:** The app is self-contained. It doesn’t rely on an external WebSphere/WebLogic server.

### 8. Concurrency
**Scale out via the process model.**

Java’s JVM is heavy to start, so scaling is often done via **Kubernetes Pods** (each running a JVM) rather than threading within a single process.

*   **Java Practice:**
    *   **Thread Pools:** Configure Tomcat’s thread pool size (`server.tomcat.threads.max`) appropriately.
    *   **Async Processing:** Use `@Async` or **Spring WebFlux** (Reactive) for high-throughput I/O.
    *   **Scaling:** Add more JVM instances behind a Load Balancer (Nginx, AWS ALB).
*   **Note:** Java’s GIL is not an issue (it’s not Python), but CPU-bound tasks still benefit from horizontal scaling due to JVM overhead.

### 9. Disposability
**Maximize robustness with fast startup and graceful shutdown.**

JVM startup can be slow. This is critical for containerized environments with auto-scaling.

*   **Java Practice:**
    *   **Fast Startup:**
        *   Use **Spring Boot DevTools** only for dev.
        *   Use **ZGC** or **G1GC** for faster garbage collection.
        *   Consider **Native Image (GraalVM)** for sub-second startup if applicable.
    *   **Graceful Shutdown:** Spring Boot 2.3+ supports graceful shutdown by default.
    ```yaml
    # application.properties
    server.shutdown=graceful
    spring.lifecycle.timeout-per-shutdown-phase=30s
    ```
*   **Key Rule:** The app should finish in-flight requests before exiting when it receives `SIGTERM`.

### 10. Dev/Prod Parity
**Keep development, staging, and production as similar as possible.**

*   **Java Practice:**
    *   **Same JVM Version:** Use Docker images with the exact same JDK version (e.g., Amazon Corretto 17) in Dev and Prod.
    *   **Same DB:** Run Postgres in Docker locally, not MySQL in Prod.
    *   **Same Config:** Use the same `application.yml` structure, differing only via env var overrides.
*   **Tooling:** Docker Compose for local dev environments that mimic Prod.

### 11. Logs
**Treat logs as event streams.**

Spring Boot logs to `stdout` by default.

*   **Java Practice:**
    *   Use **Logback** or **Log4j2** with a console appender.
    *   Use **Structured Logging** (JSON) for easier parsing by ELK/Datadog.
    *   **Correlation IDs:** Use **MDC (Mapped Diagnostic Context)** to inject trace IDs for distributed tracing.
    ```xml
    <!-- logback-spring.xml -->
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder" />
    </appender>
    ```
*   **Anti-Pattern:** Writing to local files (`/var/log/app.log`).

### 12. Admin Processes
**Run admin/management tasks as one-off processes.**

*   **Java Practice:**
    *   **Migrations:** Use **Flyway** or **Liquibase**. These run as separate CLI tools or Spring Boot apps in CI/CD *before* the main app starts.
    *   **One-off Jobs:** Create a separate Spring Boot class with `@SpringBootApplication` and a `main()` method that runs a specific task (e.g., data migration) and exits.
    ```java
    @SpringBootApplication
    public class DataMigrationRunner {
        public static void main(String[] args) {
            ApplicationContext ctx = SpringApplication.run(DataMigrationRunner.class, args);
            // Run migration
            ctx.getBean(MigrationService.class).run();
        }
    }
    ```
*   **Key Rule:** Admin tasks use the same classpath and config as the main app.

---

### Summary Checklist for Java/Spring Boot

| Factor | Key Java/Spring Tool/Pattern | Anti-Pattern to Avoid |
| :--- | :--- | :--- |
| **Codebase** | Single Git repo, Maven/Gradle | Copy-pasting JARs between projects |
| **Dependencies** | `spring-boot-maven-plugin`, Fat JAR | System-scope dependencies, classpath conflicts |
| **Config** | `@ConfigurationProperties`, `server.port=${PORT}` | Hardcoded secrets in `application.yml` |
| **Backing Services** | Spring Boot Starters, Auto-config | Hardcoded DB URLs, local file storage |
| **Build/Release/Run** | Immutable JARs, CI/CD pipelines | Rebuilding JAR for Prod |
| **Processes** | Stateless, Spring Session + Redis | Storing state in static variables |
| **Port Binding** | `server.port=${PORT:8080}` | Relying on external App Server (WebLogic) |
| **Concurrency** | Kubernetes Pods, Thread Pool tuning | Scaling via threads only in a single JVM |
| **Disposability** | `server.shutdown=graceful`, G1GC | Slow startup, no SIGTERM handling |
| **Dev/Prod Parity** | Docker for Dev, Same JDK version | MySQL in Dev, Postgres in Prod |
| **Logs** | Logback/Log4j2 to stdout, JSON format | Writing to local log files |
| **Admin Processes** | Flyway/Liquibase CLI, One-off Spring Apps | Running migrations inside the main app startup |

Would you like a sample `application.yml` and `pom.xml` configuration that adheres to these principles?