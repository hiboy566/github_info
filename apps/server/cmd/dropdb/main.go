package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"regexp"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var previewDatabasePattern = regexp.MustCompile(`^personal_info_pr_[0-9]+$`)

func validatePreviewDatabaseName(name string) error {
	if !previewDatabasePattern.MatchString(name) {
		return fmt.Errorf("refusing to drop non-preview database %q", name)
	}
	return nil
}

func dropPreviewDatabase(ctx context.Context, connectionString, name string) error {
	if err := validatePreviewDatabaseName(name); err != nil {
		return err
	}

	cfg, err := pgxpool.ParseConfig(connectionString)
	if err != nil {
		return fmt.Errorf("parse database config: %w", err)
	}
	cfg.ConnConfig.Database = "template1"

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return fmt.Errorf("connect to template1: %w", err)
	}
	defer pool.Close()

	if _, err := pool.Exec(ctx,
		"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
		name,
	); err != nil {
		return fmt.Errorf("terminate preview connections: %w", err)
	}
	if _, err := pool.Exec(ctx, "DROP DATABASE IF EXISTS "+name); err != nil {
		return fmt.Errorf("drop preview database: %w", err)
	}
	return nil
}

func main() {
	databaseName := os.Getenv("PGDATABASE")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := dropPreviewDatabase(ctx, os.Getenv("DATABASE_URL"), databaseName); err != nil {
		log.Fatal(err)
	}
	log.Printf("Dropped preview database %s", databaseName)
}
