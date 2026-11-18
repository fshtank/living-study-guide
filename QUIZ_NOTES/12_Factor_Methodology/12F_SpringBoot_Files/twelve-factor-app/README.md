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
