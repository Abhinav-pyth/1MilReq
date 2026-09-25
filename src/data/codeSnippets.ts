export const javaCode = {
  main: `package com.highperf.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableCaching
@EnableAsync
public class HighPerformanceApplication {

    public static void main(String[] args) {
        // Optimize for throughput
        System.setProperty("reactor.schedulers.defaultBoundedElasticOnVirtualThreads", "true");
        
        SpringApplication.run(HighPerformanceApplication.class, args);
    }
}`,

  controller: `package com.highperf.api.controller;

import com.highperf.api.model.Request;
import com.highperf.api.model.Response;
import com.highperf.api.service.CacheService;
import com.highperf.api.service.SupabaseService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.time.Instant;

@RestController
@RequestMapping("/api/v1")
public class RequestController {

    private final SupabaseService supabaseService;
    private final CacheService cacheService;

    public RequestController(SupabaseService supabaseService, 
                             CacheService cacheService) {
        this.supabaseService = supabaseService;
        this.cacheService = cacheService;
    }

    /**
     * High-throughput GET endpoint
     * - Checks L1 cache (Caffeine) first
     * - Falls back to L2 cache (Redis)
     * - Finally queries Supabase if cache miss
     */
    @GetMapping("/data/{id}")
    @RateLimiter(name = "dataApi", fallbackMethod = "dataFallback")
    @CircuitBreaker(name = "supabaseCircuit", fallbackMethod = "dataFallback")
    public Mono<Response> getData(@PathVariable String id) {
        return cacheService.get("data:" + id)
            .switchIfEmpty(
                supabaseService.findById(id)
                    .flatMap(response -> 
                        cacheService.put("data:" + id, response, Duration.ofMinutes(5))
                            .thenReturn(response)
                    )
            )
            .timeout(Duration.ofMillis(50))
            .onErrorResume(ex -> 
                Mono.just(Response.error("Service temporarily unavailable"))
            );
    }

    /**
     * High-throughput POST endpoint with async write-behind
     */
    @PostMapping("/data")
    @RateLimiter(name = "writeApi", fallbackMethod = "writeFallback")
    public Mono<Response> createData(@RequestBody Request request) {
        return Mono.fromCallable(() -> {
                String id = java.util.UUID.randomUUID().toString();
                return new Response(id, request.getData(), Instant.now());
            })
            .subscribeOn(Schedulers.boundedElastic())
            .flatMap(response -> 
                // Async write to Supabase (fire-and-forget for throughput)
                supabaseService.saveAsync(response)
                    .thenReturn(response)
            )
            .flatMap(response ->
                cacheService.put("data:" + response.id(), response, Duration.ofMinutes(5))
                    .thenReturn(response)
            )
            .timeout(Duration.ofMillis(100));
    }

    /**
     * Health check endpoint - used by K8s probes and load balancers
     */
    @GetMapping("/health")
    public Mono<String> health() {
        return Mono.just("OK");
    }

    /**
     * Batch endpoint for maximum throughput
     */
    @PostMapping("/batch")
    public Mono<Response> batchRequest(@RequestBody java.util.List<Request> requests) {
        return Mono.just(requests)
            .flatMapMany(reactor.core.publisher.Flux::fromIterable)
            .flatMap(request -> 
                supabaseService.saveAsync(
                    new Response(java.util.UUID.randomUUID().toString(), 
                                request.getData(), Instant.now())
                ), 1000 // concurrency limit
            )
            .collectList()
            .map(results -> new Response("batch", 
                "Processed " + results.size() + " items", Instant.now()))
            .timeout(Duration.ofSeconds(5));
    }

    // Fallback methods for resilience
    private Mono<Response> dataFallback(String id, Throwable t) {
        return Mono.just(Response.cached("data:" + id));
    }

    private Mono<Response> writeFallback(Request request, Throwable t) {
        return Mono.just(Response.error("Rate limit exceeded. Try again later."));
    }
}`,

  supabase: `package com.highperf.api.service;

import com.highperf.api.model.Response;
import io.r2dbc.pool.ConnectionPool;
import io.r2dbc.pool.ConnectionPoolConfiguration;
import io.r2dbc.spi.ConnectionFactories;
import io.r2dbc.spi.ConnectionFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.Map;

@Service
public class SupabaseService {

    private final DatabaseClient databaseClient;
    private final ConnectionPool connectionPool;

    public SupabaseService(
            @Value("\${supabase.url}") String supabaseUrl,
            @Value("\${supabase.password}") String password,
            @Value("\${supabase.pool.size:100}") int poolSize,
            @Value("\${supabase.pool.maxIdleTime:30}") int maxIdleTime) {

        // R2DBC connection to Supabase PostgreSQL via PgBouncer
        String connectionUrl = String.format(
            "r2dbc:postgresql://%s:5432/postgres?sslmode=require",
            extractHost(supabaseUrl)
        );

        ConnectionFactory connectionFactory = ConnectionFactories.get(connectionUrl);

        // Connection pool configuration for high throughput
        ConnectionPoolConfiguration poolConfig = ConnectionPoolConfiguration.builder(connectionFactory)
            .maxSize(poolSize)                    // Max connections in pool
            .initialSize(poolSize / 2)            // Start with half
            .maxIdleTime(Duration.ofSeconds(maxIdleTime))
            .maxLifeTime(Duration.ofMinutes(30))  // Recycle connections
            .maxAcquireTime(Duration.ofSeconds(5))
            .maxCreateConnectionTime(Duration.ofSeconds(5))
            .build();

        this.connectionPool = new ConnectionPool(poolConfig);
        this.databaseClient = DatabaseClient.create(this.connectionPool);
    }

    /**
     * Find by ID with optimized query
     */
    public Mono<Response> findById(String id) {
        return databaseClient.sql(
                "SELECT id, data, created_at FROM api_data WHERE id = $1 LIMIT 1"
            )
            .bind("$1", id)
            .map((row, metadata) -> new Response(
                row.get("id", String.class),
                row.get("data", String.class),
                row.get("created_at", java.time.Instant.class)
            ))
            .one()
            .timeout(Duration.ofMillis(100));
    }

    /**
     * Async save with fire-and-forget pattern for maximum throughput
     */
    public Mono<Void> saveAsync(Response response) {
        return databaseClient.sql(
                "INSERT INTO api_data (id, data, created_at) VALUES ($1, $2, $3) " +
                "ON CONFLICT (id) DO UPDATE SET data = $2, created_at = $3"
            )
            .bind("$1", response.id())
            .bind("$2", response.data())
            .bind("$3", response.createdAt())
            .then()
            .timeout(Duration.ofMillis(200));
    }

    /**
     * Batch insert for maximum throughput
     */
    public Flux<Response> saveBatch(java.util.List<Response> responses) {
        return Flux.fromIterable(responses)
            .flatMap(this::saveAsyncReturning, 500) // 500 concurrent inserts
            .timeout(Duration.ofSeconds(10));
    }

    private Mono<Response> saveAsyncReturning(Response response) {
        return databaseClient.sql(
                "INSERT INTO api_data (id, data, created_at) VALUES ($1, $2, $3) " +
                "ON CONFLICT (id) DO UPDATE SET data = $2 RETURNING *"
            )
            .bind("$1", response.id())
            .bind("$2", response.data())
            .bind("$3", response.createdAt())
            .map((row, metadata) -> response)
            .one();
    }

    private String extractHost(String url) {
        // Extract host from Supabase URL: https://xxx.supabase.co
        return url.replace("https://", "")
                  .replace("http://", "")
                  .split("/")[0];
    }
}`,

  cache: `package com.highperf.api.service;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
public class CacheService {

    private final ReactiveRedisTemplate<String, Object> redisTemplate;
    
    // L1 Cache: Caffeine (in-process, ultra-fast)
    private final com.github.benmanes.caffeine.cache.Cache<String, Object> l1Cache;

    public CacheService(ReactiveRedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
        
        // L1 Cache: 100K entries, 30s TTL, optimized for read throughput
        this.l1Cache = Caffeine.newBuilder()
            .maximumSize(100_000)
            .expireAfterWrite(30, TimeUnit.SECONDS)
            .recordStats()  // Enable metrics
            .build();
    }

    /**
     * Get from cache with L1 -> L2 fallback
     * L1 (Caffeine): < 0.01ms latency
     * L2 (Redis): < 1ms latency
     */
    public <T> Mono<T> get(String key) {
        // Check L1 cache first (synchronous, ultra-fast)
        @SuppressWarnings("unchecked")
        T l1Value = (T) l1Cache.getIfPresent(key);
        if (l1Value != null) {
            return Mono.just(l1Value);
        }

        // Fall back to L2 cache (Redis)
        return redisTemplate.opsForValue()
            .get(key)
            .doOnNext(value -> l1Cache.put(key, value)) // Populate L1
            .map(value -> {
                @SuppressWarnings("unchecked")
                T result = (T) value;
                return result;
            });
    }

    /**
     * Put to both L1 and L2 caches
     */
    public <T> Mono<T> put(String key, T value, Duration ttl) {
        // Put to L1 immediately
        l1Cache.put(key, value);

        // Put to L2 (Redis) asynchronously
        return redisTemplate.opsForValue()
            .set(key, value, ttl)
            .thenReturn(value);
    }

    /**
     * Invalidate from both cache layers
     */
    public Mono<Void> invalidate(String key) {
        l1Cache.invalidate(key);
        return redisTemplate.delete(key).then();
    }

    /**
     * Get cache statistics for monitoring
     */
    public CacheStats getStats() {
        var stats = l1Cache.stats();
        return new CacheStats(
            stats.hitRate(),
            stats.hitCount(),
            stats.missCount(),
            stats.evictionCount()
        );
    }

    public record CacheStats(double hitRate, long hits, long misses, long evictions) {}
}`
};

export const supabaseConfig = `package com.highperf.api.config;

import io.r2dbc.pool.ConnectionPool;
import io.r2dbc.pool.ConnectionPoolConfiguration;
import io.r2dbc.spi.ConnectionFactories;
import io.r2dbc.spi.ConnectionFactory;
import io.r2dbc.spi.ConnectionFactoryOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

@Configuration
public class SupabaseConfig {

    @Value("\${supabase.host}")
    private String supabaseHost;

    @Value("\${supabase.port:5432}")
    private int supabasePort;

    @Value("\${supabase.database:postgres}")
    private String database;

    @Value("\${supabase.username:postgres}")
    private String username;

    @Value("\${supabase.password}")
    private String password;

    @Value("\${supabase.pool.size:200}")
    private int poolSize;

    @Bean
    public ConnectionFactory connectionFactory() {
        // Connect to Supabase via PgBouncer for connection multiplexing
        ConnectionFactoryOptions options = ConnectionFactoryOptions.builder()
            .option(ConnectionFactoryOptions.DRIVER, "pool")
            .option(ConnectionFactoryOptions.PROTOCOL, "postgresql")
            .option(ConnectionFactoryOptions.HOST, supabaseHost)
            .option(ConnectionFactoryOptions.PORT, supabasePort)
            .option(ConnectionFactoryOptions.USER, username)
            .option(ConnectionFactoryOptions.PASSWORD, password)
            .option(ConnectionFactoryOptions.DATABASE, database)
            .option(ConnectionFactoryOptions.SSL, true)
            .build();

        ConnectionFactory connectionFactory = ConnectionFactories.get(options);

        ConnectionPoolConfiguration poolConfig = ConnectionPoolConfiguration.builder(connectionFactory)
            .maxSize(poolSize)
            .initialSize(poolSize / 4)
            .maxIdleTime(Duration.ofSeconds(60))
            .maxLifeTime(Duration.ofMinutes(30))
            .maxAcquireTime(Duration.ofSeconds(10))
            .maxCreateConnectionTime(Duration.ofSeconds(5))
            .validationQuery("SELECT 1")
            .build();

        return new ConnectionPool(poolConfig);
    }

    @Bean
    public ReactiveRedisConnectionFactory redisConnectionFactory(
            @Value("\${redis.host:localhost}") String redisHost,
            @Value("\${redis.port:6379}") int redisPort) {
        LettuceConnectionFactory factory = new LettuceConnectionFactory(redisHost, redisPort);
        factory.setValidateConnection(true);
        return factory;
    }

    @Bean
    public ReactiveRedisTemplate<String, Object> reactiveRedisTemplate(
            ReactiveRedisConnectionFactory factory) {
        return new ReactiveRedisTemplate<>(
            factory,
            org.springframework.data.redis.serializer.RedisSerializationContext
                .<String, Object>newSerializationContext(new StringRedisSerializer())
                .value(new GenericJackson2JsonRedisSerializer())
                .build()
        );
    }
}`;

export const nginxConfig = `# nginx.conf - Optimized for 1M+ RPS
# Place at /etc/nginx/nginx.conf

user nginx;
worker_processes auto;  # Auto-detect CPU cores
worker_rlimit_nofile 1000000;
worker_cpu_affinity auto;
pid /run/nginx.pid;

events {
    worker_connections 65535;
    multi_accept on;
    use epoll;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 100000;
    types_hash_max_size 2048;
    
    # Buffer settings for throughput
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 4k;
    large_client_header_buffers 8 16k;
    
    # Logging
    access_log off;  # Disable for max perf (use structured logging in app)
    error_log /var/log/nginx/error.log warn;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain application/json application/javascript text/css;
    
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=1000r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
    
    # Upstream - Java application servers
    upstream java_backend {
        least_conn;  # Least connections algorithm
        
        # Kubernetes service endpoints
        server java-app.default.svc.cluster.local:8080 weight=1 max_fails=3 fail_timeout=5s;
        
        # Connection keepalive to backend
        keepalive 1000;
        keepalive_timeout 60s;
        keepalive_requests 10000;
    }
    
    # Rate limit zone for API
    upstream api_servers {
        hash $request_uri consistent;
        
        server 10.0.1.10:8080 max_fails=2 fail_timeout=3s;
        server 10.0.1.11:8080 max_fails=2 fail_timeout=3s;
        server 10.0.1.12:8080 max_fails=2 fail_timeout=3s;
        server 10.0.1.13:8080 max_fails=2 fail_timeout=3s;
        server 10.0.1.14:8080 max_fails=2 fail_timeout=3s;
        
        keepalive 2000;
    }
    
    server {
        listen 80;
        listen 443 ssl http2;
        server_name api.example.com;
        
        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;
        
        # Health check endpoint (no rate limit)
        location /api/v1/health {
            proxy_pass http://java_backend;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            access_log off;
        }
        
        # API endpoints with rate limiting
        location /api/ {
            limit_req zone=api_limit burst=50000 nodelay;
            limit_conn conn_limit 10000;
            
            proxy_pass http://api_servers;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeout settings
            proxy_connect_timeout 2s;
            proxy_send_timeout 5s;
            proxy_read_timeout 10s;
            
            # Buffer settings
            proxy_buffering off;
            proxy_request_buffering off;
        }
        
        # Metrics endpoint (restricted)
        location /metrics {
            allow 10.0.0.0/8;
            deny all;
            proxy_pass http://java_backend;
        }
    }
}`;

export const dockerConfig = `# Multi-stage Dockerfile for optimized Java 21 image
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /app

# Copy Maven wrapper and pom.xml first for better caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B

# Copy source and build
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# Runtime stage - minimal image
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy built artifact
COPY --from=builder /app/target/*.jar app.jar

# JVM configuration for high throughput
ENV JAVA_OPTS="-server \\
  -Xms4g -Xmx4g \\
  -XX:+UseZGC \\
  -XX:+ZGenerational \\
  -XX:MaxGCPauseMillis=1 \\
  -XX:+AlwaysPreTouch \\
  -XX:+UseNUMA \\
  -XX:+UseStringDeduplication \\
  -Dio.netty.leakDetection.level=disabled \\
  -Dio.netty.eventLoop.maxPendingTasks=100000 \\
  -Dreactor.schedulers.defaultBoundedElasticOnVirtualThreads=true \\
  -Dspring.main.web-application-type=reactive"

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \\
  CMD curl -f http://localhost:8080/api/v1/health || exit 1

# Expose port
EXPOSE 8080

# Run as non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]`;

export const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.1</version>
        <relativePath/>
    </parent>
    
    <groupId>com.highperf</groupId>
    <artifactId>high-perf-api</artifactId>
    <version>1.0.0</version>
    <name>High Performance API</name>
    <description>1M RPS API with Spring WebFlux and Supabase</description>
    
    <properties>
        <java.version>21</java.version>
        <r2dbc-postgresql.version>1.0.4.RELEASE</r2dbc-postgresql.version>
        <resilience4j.version>2.2.0</resilience4j.version>
        <caffeine.version>3.1.8</caffeine.version>
    </properties>
    
    <dependencies>
        <!-- Spring WebFlux (Reactive, Non-blocking) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>
        
        <!-- R2DBC for reactive database access -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-r2dbc</artifactId>
        </dependency>
        
        <!-- PostgreSQL R2DBC Driver -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>r2dbc-postgresql</artifactId>
            <version>\${r2dbc-postgresql.version}</version>
        </dependency>
        
        <!-- R2DBC Connection Pool -->
        <dependency>
            <groupId>io.r2dbc</groupId>
            <artifactId>r2dbc-pool</artifactId>
        </dependency>
        
        <!-- Redis Reactive (L2 Cache) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
        </dependency>
        
        <!-- Caffeine Cache (L1 Cache) -->
        <dependency>
            <groupId>com.github.ben-manes.caffeine</groupId>
            <artifactId>caffeine</artifactId>
            <version>\${caffeine.version}</version>
        </dependency>
        
        <!-- Resilience4j (Circuit Breaker, Rate Limiter) -->
        <dependency>
            <groupId>io.github.resilience4j</groupId>
            <artifactId>resilience4j-spring-boot3</artifactId>
            <version>\${resilience4j.version}</version>
        </dependency>
        <dependency>
            <groupId>io.github.resilience4j</groupId>
            <artifactId>resilience4j-reactor</artifactId>
            <version>\${resilience4j.version}</version>
        </dependency>
        
        <!-- Actuator for monitoring -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        
        <!-- Micrometer Prometheus -->
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-registry-prometheus</artifactId>
        </dependency>
        
        <!-- Jackson for JSON -->
        <dependency>
            <groupId>com.fasterxml.jackson.datatype</groupId>
            <artifactId>jackson-datatype-jsr310</artifactId>
        </dependency>
        
        <!-- Validation -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        
        <!-- Test dependencies -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>io.projectreactor</groupId>
            <artifactId>reactor-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <jvmArguments>
                        -XX:+UseZGC -XX:+ZGenerational
                    </jvmArguments>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>`;

export const applicationYaml = `# application.yml - Spring Boot Configuration
server:
  port: 8080
  netty:
    connection-timeout: 5s
    idle-timeout: 60s

spring:
  main:
    web-application-type: reactive
    banner-mode: off
  
  # R2DBC - Supabase PostgreSQL
  r2dbc:
    url: r2dbc:postgresql://\${SUPABASE_HOST:db.project.supabase.co}:5432/postgres?sslmode=require
    username: \${SUPABASE_USER:postgres}
    password: \${SUPABASE_PASSWORD}
    pool:
      initial-size: 50
      max-size: 200
      max-idle-time: 60s
      max-life-time: 30m
      max-acquire-time: 10s
      validation-query: SELECT 1

  # Redis Configuration
  data:
    redis:
      host: \${REDIS_HOST:localhost}
      port: \${REDIS_PORT:6379}
      password: \${REDIS_PASSWORD:}
      lettuce:
        pool:
          max-active: 200
          max-idle: 50
          min-idle: 10
          max-wait: 5s

  # Cache Configuration
  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=100000,expireAfterWrite=30s

# Supabase Configuration
supabase:
  url: \${SUPABASE_URL:https://project.supabase.co}
  key: \${SUPABASE_KEY}
  host: \${SUPABASE_HOST:db.project.supabase.co}
  port: 5432
  database: postgres
  username: postgres
  password: \${SUPABASE_PASSWORD}
  pool:
    size: 200
    maxIdleTime: 30

# Redis Configuration
redis:
  host: \${REDIS_HOST:localhost}
  port: \${REDIS_PORT:6379}

# Resilience4j Configuration
resilience4j:
  circuitbreaker:
    instances:
      supabaseCircuit:
        slidingWindowSize: 100
        failureRateThreshold: 50
        waitDurationInOpenState: 5s
        permittedNumberOfCallsInHalfOpenState: 10
        slidingWindowType: COUNT_BASED
        minimumNumberOfCalls: 50
  
  ratelimiter:
    instances:
      dataApi:
        limitForPeriod: 100000
        limitRefreshPeriod: 1s
        timeoutDuration: 0
      writeApi:
        limitForPeriod: 50000
        limitRefreshPeriod: 1s
        timeoutDuration: 0

  timelimiter:
    instances:
      default:
        timeoutDuration: 3s

# Actuator / Metrics
management:
  endpoints:
    web:
      exposure:
        include: health,prometheus,metrics,info
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: high-perf-api

# Logging
logging:
  level:
    root: WARN
    com.highperf: INFO
    io.r2dbc: WARN
    org.springframework.r2dbc: WARN
  pattern:
    console: "%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"

# Thread/Event Loop Configuration
reactor:
  schedulers:
    defaultBoundedElasticOnVirtualThreads: true`;

export const k8sConfig = `# k8s-deployment.yaml - Kubernetes Deployment for High Throughput
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-perf-api
  labels:
    app: high-perf-api
spec:
  replicas: 15  # Scale based on load testing
  selector:
    matchLabels:
      app: high-perf-api
  strategy:
    rollingUpdate:
      maxSurge: 3
      maxUnavailable: 1
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: high-perf-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/actuator/prometheus"
    spec:
      containers:
      - name: high-perf-api
        image: your-registry/high-perf-api:latest
        ports:
        - containerPort: 8080
          name: http
        resources:
          requests:
            cpu: "4"
            memory: "8Gi"
          limits:
            cpu: "8"
            memory: "16Gi"
        env:
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: supabase-secrets
              key: url
        - name: SUPABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: supabase-secrets
              key: password
        - name: SUPABASE_HOST
          valueFrom:
            secretKeyRef:
              name: supabase-secrets
              key: host
        - name: REDIS_HOST
          value: "redis-cluster.redis.svc.cluster.local"
        - name: REDIS_PORT
          value: "6379"
        - name: JAVA_OPTS
          value: >-
            -server
            -Xms4g -Xmx4g
            -XX:+UseZGC
            -XX:+ZGenerational
            -XX:MaxGCPauseMillis=1
            -XX:+AlwaysPreTouch
            -XX:+UseNUMA
            -Dio.netty.eventLoop.maxPendingTasks=100000
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 5
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /api/v1/health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 30
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - high-perf-api
              topologyKey: kubernetes.io/hostname
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: high-perf-api
---
apiVersion: v1
kind: Service
metadata:
  name: high-perf-api
spec:
  type: ClusterIP
  ports:
  - port: 8080
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: high-perf-api
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: high-perf-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: high-perf-api
  minReplicas: 10
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "60000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Pods
        value: 5
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 2
        periodSeconds: 120`;

export const benchmarkScript = `#!/bin/bash
# benchmark.sh - Distributed Load Testing Script
# Prerequisites: wrk2, vegeta installed on test machines

set -e

TARGET_URL="\${1:-http://localhost:8080/api/v1/health}"
DURATION="\${2:-60}"
CONNECTIONS="\${3:-400}"
THREADS="\${4:-12}"
TARGET_RPS="\${5:-100000}"

echo "============================================"
echo "  High-Performance API Benchmark"
echo "============================================"
echo "Target:     $TARGET_URL"
echo "Duration:   \${DURATION}s"
echo "Threads:    $THREADS"
echo "Connections: $CONNECTIONS"
echo "Target RPS: $TARGET_RPS"
echo "============================================"
echo ""

# Phase 1: Warmup (10% of target load)
echo "🔥 Phase 1: Warmup (10% target load)..."
WARMUP_RPS=$((TARGET_RPS / 10))
wrk2 -t$THREADS -c$CONNECTIONS -d30s -R$WARMUP_RPS --latency "$TARGET_URL" > /dev/null 2>&1
echo "   Warmup complete."
echo ""

# Phase 2: Ramp up (50% of target load)
echo "📈 Phase 2: Ramp-up (50% target load)..."
RAMPUP_RPS=$((TARGET_RPS / 2))
wrk2 -t$THREADS -c$CONNECTIONS -d30s -R$RAMPUP_RPS --latency "$TARGET_URL" > /tmp/bench_rampup.txt
echo "   Ramp-up results:"
grep "Requests/sec" /tmp/bench_rampup.txt | head -1
echo ""

# Phase 3: Full load test
echo "🚀 Phase 3: Full load test ($TARGET_RPS RPS)..."
wrk2 -t$THREADS -c$CONNECTIONS -d\${DURATION}s -R$TARGET_RPS --latency "$TARGET_URL" > /tmp/bench_full.txt
echo ""
echo "   Full load results:"
echo "   -------------------"
cat /tmp/bench_full.txt
echo ""

# Phase 4: Burst test (200% of target load for 10s)
echo "💥 Phase 4: Burst test (200% target load, 10s)..."
BURST_RPS=$((TARGET_RPS * 2))
wrk2 -t$THREADS -c$CONNECTIONS -d10s -R$BURST_RPS --latency "$TARGET_URL" > /tmp/bench_burst.txt
echo "   Burst results:"
grep "Requests/sec" /tmp/bench_burst.txt | head -1
echo ""

# Phase 5: Sustained load (target for 5 minutes)
echo "⏱️  Phase 5: Sustained load (5 minutes)..."
wrk2 -t$THREADS -c$CONNECTIONS -d300s -R$TARGET_RPS --latency "$TARGET_URL" > /tmp/bench_sustained.txt
echo "   Sustained results:"
cat /tmp/bench_sustained.txt
echo ""

echo "============================================"
echo "  Benchmark Complete!"
echo "============================================"
echo ""
echo "Results saved to:"
echo "  /tmp/bench_rampup.txt"
echo "  /tmp/bench_full.txt"
echo "  /tmp/bench_burst.txt"
echo "  /tmp/bench_sustained.txt"
echo ""
echo "For distributed testing, run this script on"
echo "multiple machines simultaneously targeting"
echo "different load balancer endpoints."`;
