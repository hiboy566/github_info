package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"time"
)

// GithubAccount is the canonical account shape shared with the frontend.
// JSON field names mirror the old tRPC payload so the web client keeps
// the exact same data contract.
type GithubAccount struct {
	GithubID        int64   `json:"githubId"`
	Login           string  `json:"login"`
	Name            *string `json:"name"`
	AvatarURL       *string `json:"avatarUrl"`
	Email           *string `json:"email"`
	Company         *string `json:"company"`
	Location        *string `json:"location"`
	Bio             *string `json:"bio"`
	TwitterUsername *string `json:"twitterUsername"`
	PublicRepos     int     `json:"publicRepos"`
	Followers       int     `json:"followers"`
	Following       int     `json:"following"`
	CreatedAt       string  `json:"createdAt"`
}

type GithubErrorCode string

const (
	ErrInvalidToken  GithubErrorCode = "invalid-token"
	ErrRateLimited   GithubErrorCode = "rate-limited"
	ErrForbidden     GithubErrorCode = "forbidden"
	ErrUpstreamError GithubErrorCode = "upstream-error"
)

// GithubClientError is a domain error from the GitHub client.
// The token must NEVER appear in Message (it is sent to the frontend).
type GithubClientError struct {
	Code    GithubErrorCode
	Message string
}

func (e *GithubClientError) Error() string { return e.Message }

// githubRequestTimeout bounds a slow/unresponsive GitHub endpoint (CWE-400).
const githubRequestTimeout = 10 * time.Second

// GitHub usernames are at most 39 characters and may contain alphanumerics
// and interior hyphens. Keeping this shared validation at the API boundary
// avoids pointless database queries for malformed intro routes.
var githubLoginPattern = regexp.MustCompile(`^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$`)

func isValidGithubLogin(login string) bool {
	return githubLoginPattern.MatchString(login)
}

type GithubClient struct {
	httpClient *http.Client
}

func NewGithubClient() *GithubClient {
	return &GithubClient{httpClient: &http.Client{Timeout: githubRequestTimeout}}
}

// githubUser mirrors the fields we consume from GET https://api.github.com/user.
type githubUser struct {
	ID              int64   `json:"id"`
	Login           string  `json:"login"`
	Name            *string `json:"name"`
	AvatarURL       *string `json:"avatar_url"`
	Email           *string `json:"email"`
	Company         *string `json:"company"`
	Location        *string `json:"location"`
	Bio             *string `json:"bio"`
	TwitterUsername *string `json:"twitter_username"`
	PublicRepos     *int    `json:"public_repos"`
	Followers       *int    `json:"followers"`
	Following       *int    `json:"following"`
	CreatedAt       string  `json:"created_at"`
}

// FetchUser fetches the authenticated GitHub user with the given
// Personal Access Token and returns a *GithubClientError on failure.
func (c *GithubClient) FetchUser(ctx context.Context, token string) (*GithubAccount, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return nil, &GithubClientError{ErrUpstreamError, "Failed to build the GitHub API request."}
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "github_info-app")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, &GithubClientError{ErrUpstreamError, "Failed to reach GitHub API. Please check your network connection."}
	}
	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		return nil, &GithubClientError{ErrInvalidToken, "The provided token is invalid or has expired."}
	case resp.StatusCode == http.StatusTooManyRequests:
		return nil, &GithubClientError{ErrRateLimited, "GitHub API rate limit exceeded. Please try again later."}
	case resp.StatusCode == http.StatusForbidden:
		if resp.Header.Get("x-ratelimit-remaining") == "0" {
			return nil, &GithubClientError{ErrRateLimited, "GitHub API rate limit exceeded. Please try again later."}
		}
		return nil, &GithubClientError{ErrForbidden, "The token does not have sufficient permissions."}
	case resp.StatusCode != http.StatusOK:
		return nil, &GithubClientError{ErrUpstreamError, fmt.Sprintf("GitHub API returned an unexpected status: %d.", resp.StatusCode)}
	}

	var user githubUser
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&user); err != nil {
		return nil, &GithubClientError{ErrUpstreamError, "GitHub API returned an unreadable response."}
	}
	_, createdAtErr := time.Parse(time.RFC3339, user.CreatedAt)
	if user.ID <= 0 || !isValidGithubLogin(user.Login) || createdAtErr != nil ||
		user.PublicRepos == nil || *user.PublicRepos < 0 ||
		user.Followers == nil || *user.Followers < 0 ||
		user.Following == nil || *user.Following < 0 {
		return nil, &GithubClientError{ErrUpstreamError, "GitHub API response did not match the expected shape."}
	}

	return &GithubAccount{
		GithubID:        user.ID,
		Login:           user.Login,
		Name:            user.Name,
		AvatarURL:       user.AvatarURL,
		Email:           user.Email,
		Company:         user.Company,
		Location:        user.Location,
		Bio:             user.Bio,
		TwitterUsername: user.TwitterUsername,
		PublicRepos:     *user.PublicRepos,
		Followers:       *user.Followers,
		Following:       *user.Following,
		CreatedAt:       user.CreatedAt,
	}, nil
}
