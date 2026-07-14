package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
)

func main() {
	loadDotEnv(".env")

	port := envOr("PORT", "3000")
	databaseConfig := databaseConfigFromEnv()
	corsOrigins := splitOrigins(envOr("CORS_ORIGIN", "http://localhost:3001"))

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	profiles, err := ConnectProfileStore(ctx, databaseConfig)
	cancel()
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer profiles.Close()

	srv := &Server{profiles: profiles, github: NewGithubClient()}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", srv.handleHealth)
	mux.HandleFunc("POST /api/github-account/fetch", srv.handleFetchAccount)
	mux.HandleFunc("GET /api/intro/{login}", srv.handleGetIntro)

	handler := withCORS(corsOrigins, withLogging(mux))

	// On AWS Lambda (API Gateway HTTP API, payload v2) the same handler is
	// served through the proxy adapter — mirroring the old Node dual-mode.
	if os.Getenv("AWS_LAMBDA_FUNCTION_NAME") != "" {
		lambda.Start(httpadapter.NewV2(handler).ProxyWithContext)
		return
	}

	httpServer := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	log.Printf("Server is running on http://localhost:%s", port)
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}

const defaultDatabaseURL = "postgres://Admin@localhost:5432/personal_info"

// databaseConfigFromEnv keeps DATABASE_URL as the convenient local option.
// In Lambda, an empty connection string lets pgx read PGHOST/PGUSER/etc., so
// passwords never need to be interpolated into a URL.
func databaseConfigFromEnv() string {
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		return databaseURL
	}
	if os.Getenv("PGHOST") != "" {
		return ""
	}
	return defaultDatabaseURL
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func splitOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

// loadDotEnv loads KEY=VALUE lines from path into the process environment.
// Existing variables win; a missing file is not an error.
func loadDotEnv(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key != "" && os.Getenv(key) == "" {
			os.Setenv(key, value)
		}
	}
}

func withCORS(allowed []string, next http.Handler) http.Handler {
	allowedSet := make(map[string]struct{}, len(allowed))
	for _, origin := range allowed {
		allowedSet[origin] = struct{}{}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin != "" {
			if _, ok := allowedSet[origin]; ok {
				h := w.Header()
				h.Set("Access-Control-Allow-Origin", origin)
				h.Set("Access-Control-Allow-Credentials", "true")
				h.Add("Vary", "Origin")
			}
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, rec.status, time.Since(start).Round(time.Millisecond))
	})
}
