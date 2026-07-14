package main

import (
	"context"
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TestProfileStoreRoundTrip exercises the personal_info database end to end:
// connect (auto-creating if missing), upsert, case-insensitive lookup,
// update, and cleanup. Skipped when PG is down.
func TestProfileStoreRoundTrip(t *testing.T) {
	loadDotEnv(".env")
	databaseConfig := databaseConfigFromEnv()

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	profiles, err := ConnectProfileStore(ctx, databaseConfig)
	if err != nil {
		t.Skipf("database not reachable, skipping: %v", err)
	}
	defer profiles.Close()

	login := "profile-roundtrip-test-user"
	bio := "test bio"
	account := &GithubAccount{
		GithubID:    999_999_999_002,
		Login:       login,
		Bio:         &bio,
		PublicRepos: 5,
		Followers:   1,
		Following:   0,
		CreatedAt:   "2021-06-07T08:09:10Z",
	}

	cleanup := func() {
		if _, err := profiles.pool.Exec(ctx,
			"DELETE FROM personal_profiles WHERE github_id = $1",
			strconv.FormatInt(account.GithubID, 10),
		); err != nil {
			t.Logf("cleanup failed: %v", err)
		}
	}
	cleanup()
	defer cleanup()

	if err := profiles.UpsertProfile(ctx, account); err != nil {
		t.Fatalf("insert: %v", err)
	}

	stored, err := profiles.GetProfileByLogin(ctx, "PROFILE-ROUNDTRIP-TEST-USER")
	if err != nil {
		t.Fatalf("get after insert: %v", err)
	}
	if stored.Account.GithubID != account.GithubID || stored.Account.PublicRepos != 5 {
		t.Fatalf("unexpected stored profile: %+v", stored.Account)
	}
	if stored.Account.Bio == nil || *stored.Account.Bio != bio {
		t.Fatalf("bio round-trip mismatch: %v", stored.Account.Bio)
	}
	if stored.Account.CreatedAt != "2021-06-07T08:09:10Z" {
		t.Fatalf("createdAt round-trip mismatch: %q", stored.Account.CreatedAt)
	}

	// Upsert for the same GitHub ID must update, not duplicate.
	account.PublicRepos = 7
	if err := profiles.UpsertProfile(ctx, account); err != nil {
		t.Fatalf("upsert update: %v", err)
	}
	updated, err := profiles.GetProfileByLogin(ctx, login)
	if err != nil {
		t.Fatalf("get after update: %v", err)
	}
	if updated.Account.PublicRepos != 7 {
		t.Fatalf("publicRepos not updated, got %d", updated.Account.PublicRepos)
	}

	// GitHub usernames can change. The immutable GitHub ID must keep this as
	// one record and move the public intro route to the new login.
	renamedLogin := "profile-roundtrip-renamed-user"
	account.Login = renamedLogin
	if err := profiles.UpsertProfile(ctx, account); err != nil {
		t.Fatalf("upsert after login change: %v", err)
	}
	if _, err := profiles.GetProfileByLogin(ctx, login); !errors.Is(err, ErrAccountNotFound) {
		t.Fatalf("old login should no longer resolve, got %v", err)
	}
	renamed, err := profiles.GetProfileByLogin(ctx, renamedLogin)
	if err != nil {
		t.Fatalf("get after login change: %v", err)
	}
	if renamed.Account.GithubID != account.GithubID {
		t.Fatalf("github ID changed after rename: %d", renamed.Account.GithubID)
	}
	var profileCount int
	if err := profiles.pool.QueryRow(ctx,
		"SELECT count(*) FROM personal_profiles WHERE github_id = $1",
		strconv.FormatInt(account.GithubID, 10),
	).Scan(&profileCount); err != nil {
		t.Fatalf("count profiles after login change: %v", err)
	}
	if profileCount != 1 {
		t.Fatalf("expected one profile after login change, got %d", profileCount)
	}

	if _, err := profiles.GetProfileByLogin(ctx, "no-such-profile-xyz"); !errors.Is(err, ErrAccountNotFound) {
		t.Fatalf("expected ErrAccountNotFound, got %v", err)
	}
}

// TestConnectProfileStoreBootstrap verifies a missing database is created
// automatically via template1, and unsafe database names are rejected.
func TestConnectProfileStoreBootstrap(t *testing.T) {
	loadDotEnv(".env")
	databaseConfig := databaseConfigFromEnv()

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	admin, err := pgxpool.New(ctx, databaseConfig)
	if err != nil {
		t.Skipf("database not reachable, skipping: %v", err)
	}
	defer admin.Close()
	if err := admin.Ping(ctx); err != nil {
		t.Skipf("database not reachable, skipping: %v", err)
	}

	const testDB = "personal_info_bootstrap_test"
	dropTestDB := func() {
		if _, err := admin.Exec(ctx, "DROP DATABASE IF EXISTS "+testDB+" WITH (FORCE)"); err != nil {
			t.Logf("drop test database failed: %v", err)
		}
	}
	dropTestDB()
	defer dropTestDB()

	testConfig, err := pgxpool.ParseConfig(databaseConfig)
	if err != nil {
		t.Fatalf("parse database config: %v", err)
	}
	testConfig.ConnConfig.Database = testDB

	store, err := ConnectProfileStore(ctx, testConfig.ConnString())
	if err != nil {
		t.Fatalf("bootstrap connect: %v", err)
	}
	store.Close()

	// Idempotent for an existing database.
	if err := ensureDatabase(ctx, admin, testDB); err != nil {
		t.Fatalf("ensureDatabase idempotency: %v", err)
	}
	// ...and unsafe names are rejected before touching SQL.
	if err := ensureDatabase(ctx, admin, `bad";DROP DATABASE x;--`); err == nil {
		t.Fatal("expected invalid database name to be rejected")
	}
}
