package main

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrAccountNotFound = errors.New("github account not found")

// StoredAccount is a saved account plus persistence metadata.
type StoredAccount struct {
	Account   GithubAccount `json:"account"`
	UpdatedAt time.Time     `json:"updatedAt"`
}

// personal_profiles lives in the app's only database (personal_info), reached
// through DATABASE_URL locally or pgx's PG* variables in Lambda.
const profileSchemaSQL = `
CREATE TABLE IF NOT EXISTS personal_profiles (
	id text PRIMARY KEY,
	login text NOT NULL UNIQUE,
	github_id text NOT NULL,
	name text,
	avatar_url text,
	email text,
	company text,
	location text,
	bio text,
	twitter_username text,
	public_repos integer NOT NULL DEFAULT 0,
	followers integer NOT NULL DEFAULT 0,
	following integer NOT NULL DEFAULT 0,
	github_created_at timestamp,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS personal_profiles_github_id_unique
	ON personal_profiles (github_id);

CREATE INDEX IF NOT EXISTS personal_profiles_login_lower_idx
	ON personal_profiles (lower(login));
`

var databaseNamePattern = regexp.MustCompile(`^[a-z_][a-z0-9_]*$`)

// ensureDatabase creates the named database if it does not exist yet, using
// an established connection to another database on the same server.
// CREATE DATABASE cannot use bind parameters, so the name is validated
// against a strict identifier pattern before being interpolated.
func ensureDatabase(ctx context.Context, admin *pgxpool.Pool, name string) error {
	if !databaseNamePattern.MatchString(name) {
		return fmt.Errorf("invalid database name %q", name)
	}
	var exists bool
	if err := admin.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)", name,
	).Scan(&exists); err != nil {
		return fmt.Errorf("check database %q: %w", name, err)
	}
	if exists {
		return nil
	}
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+name); err != nil {
		return fmt.Errorf("create database %q: %w", name, err)
	}
	return nil
}

// databaseNameFromConfig extracts the database name from a connection string
// or, when it is empty, from pgx's PG* environment variables.
func databaseNameFromConfig(connectionString string) (string, error) {
	cfg, err := pgxpool.ParseConfig(connectionString)
	if err != nil {
		return "", err
	}
	if cfg.ConnConfig.Database == "" {
		return "", errors.New("connection string has no database name")
	}
	return cfg.ConnConfig.Database, nil
}

type ProfileStore struct {
	pool *pgxpool.Pool
}

// ConnectProfileStore connects to the personal-info database, creating the
// database on the fly when it does not exist yet (first boot on a fresh
// machine or a fresh Aurora cluster). Bootstrap goes through template1 on
// the same server, which PostgreSQL guarantees to exist.
func ConnectProfileStore(ctx context.Context, connectionString string) (*ProfileStore, error) {
	store, err := NewProfileStore(ctx, connectionString)
	if err == nil {
		return store, nil
	}
	if !isDatabaseMissing(err) {
		return nil, err
	}

	name, nameErr := databaseNameFromConfig(connectionString)
	if nameErr != nil {
		return nil, nameErr
	}

	adminCfg, cfgErr := pgxpool.ParseConfig(connectionString)
	if cfgErr != nil {
		return nil, cfgErr
	}
	adminCfg.ConnConfig.Database = "template1"
	admin, adminErr := pgxpool.NewWithConfig(ctx, adminCfg)
	if adminErr != nil {
		return nil, adminErr
	}
	defer admin.Close()
	if err := ensureDatabase(ctx, admin, name); err != nil {
		return nil, err
	}

	return NewProfileStore(ctx, connectionString)
}

// isDatabaseMissing reports whether err is PostgreSQL "database does not
// exist" (SQLSTATE 3D000).
func isDatabaseMissing(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "3D000"
}

// NewProfileStore connects to the personal-info database and ensures its schema.
func NewProfileStore(ctx context.Context, connectionString string) (*ProfileStore, error) {
	pool, err := pgxpool.New(ctx, connectionString)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	if _, err := pool.Exec(ctx, profileSchemaSQL); err != nil {
		pool.Close()
		return nil, err
	}
	return &ProfileStore{pool: pool}, nil
}

func (s *ProfileStore) Close() {
	s.pool.Close()
}

const profileUpsertSQL = `
INSERT INTO personal_profiles (
	id, login, github_id, name, avatar_url, email, company, location, bio,
	twitter_username, public_repos, followers, following, github_created_at
) VALUES (
	gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
)
ON CONFLICT (github_id) DO UPDATE SET
	login = EXCLUDED.login,
	name = EXCLUDED.name,
	avatar_url = EXCLUDED.avatar_url,
	email = EXCLUDED.email,
	company = EXCLUDED.company,
	location = EXCLUDED.location,
	bio = EXCLUDED.bio,
	twitter_username = EXCLUDED.twitter_username,
	public_repos = EXCLUDED.public_repos,
	followers = EXCLUDED.followers,
	following = EXCLUDED.following,
	github_created_at = EXCLUDED.github_created_at,
	updated_at = now()
`

// UpsertProfile saves the personal-introduction record, keyed on GitHub's
// immutable numeric ID. Login remains the public lookup key and can change.
func (s *ProfileStore) UpsertProfile(ctx context.Context, a *GithubAccount) error {
	githubCreatedAt, err := time.Parse(time.RFC3339, a.CreatedAt)
	if err != nil {
		return fmt.Errorf("parse GitHub account creation time: %w", err)
	}
	_, err = s.pool.Exec(ctx, profileUpsertSQL,
		a.Login, strconv.FormatInt(a.GithubID, 10), a.Name, a.AvatarURL, a.Email,
		a.Company, a.Location, a.Bio, a.TwitterUsername,
		a.PublicRepos, a.Followers, a.Following, githubCreatedAt,
	)
	return err
}

const profileSelectSQL = `
SELECT github_id, login, name, avatar_url, email, company, location, bio,
	twitter_username, public_repos, followers, following, github_created_at, updated_at
FROM personal_profiles
WHERE lower(login) = lower($1)
LIMIT 1
`

// GetProfileByLogin returns the stored personal profile for a login
// (case-insensitive), or ErrAccountNotFound.
func (s *ProfileStore) GetProfileByLogin(ctx context.Context, login string) (*StoredAccount, error) {
	var (
		account         GithubAccount
		githubID        string
		githubCreatedAt *time.Time
		updatedAt       time.Time
	)
	err := s.pool.QueryRow(ctx, profileSelectSQL, login).Scan(
		&githubID, &account.Login, &account.Name, &account.AvatarURL,
		&account.Email, &account.Company, &account.Location, &account.Bio,
		&account.TwitterUsername, &account.PublicRepos, &account.Followers,
		&account.Following, &githubCreatedAt, &updatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrAccountNotFound
	}
	if err != nil {
		return nil, err
	}
	id, err := strconv.ParseInt(githubID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse stored GitHub ID: %w", err)
	}
	if githubCreatedAt == nil {
		return nil, errors.New("stored GitHub creation time is missing")
	}
	account.GithubID = id
	account.CreatedAt = githubCreatedAt.UTC().Format(time.RFC3339)
	return &StoredAccount{Account: account, UpdatedAt: updatedAt}, nil
}
