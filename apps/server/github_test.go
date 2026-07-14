package main

import (
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func githubResponse(status int, body string, headers http.Header) *http.Response {
	if headers == nil {
		headers = make(http.Header)
	}
	return &http.Response{
		StatusCode: status,
		Header:     headers,
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func githubClientForTest(roundTrip roundTripFunc) *GithubClient {
	return &GithubClient{httpClient: &http.Client{Transport: roundTrip}}
}

const validGithubUserJSON = `{
	"id": 12345,
	"login": "test-user",
	"name": "Test User",
	"avatar_url": "https://avatars.githubusercontent.com/u/12345",
	"email": null,
	"company": "Test Corp",
	"location": "Test City",
	"bio": "A test user",
	"twitter_username": null,
	"public_repos": 42,
	"followers": 100,
	"following": 50,
	"created_at": "2020-01-01T00:00:00Z"
}`

func TestGithubClientMapsResponseAndAuthorization(t *testing.T) {
	const token = "github_pat_fake_test_value"
	client := githubClientForTest(func(r *http.Request) (*http.Response, error) {
		if got := r.Header.Get("Authorization"); got != "Bearer "+token {
			t.Fatalf("unexpected authorization header: %q", got)
		}
		return githubResponse(http.StatusOK, validGithubUserJSON, nil), nil
	})

	account, err := client.FetchUser(t.Context(), token)
	if err != nil {
		t.Fatalf("FetchUser returned an error: %v", err)
	}
	if account.GithubID != 12345 || account.Login != "test-user" || account.PublicRepos != 42 {
		t.Fatalf("unexpected account mapping: %+v", account)
	}
}

func TestGithubClientClassifiesStatuses(t *testing.T) {
	tests := []struct {
		name     string
		status   int
		headers  http.Header
		expected GithubErrorCode
	}{
		{name: "invalid token", status: http.StatusUnauthorized, expected: ErrInvalidToken},
		{name: "forbidden", status: http.StatusForbidden, expected: ErrForbidden},
		{
			name:     "primary rate limit",
			status:   http.StatusForbidden,
			headers:  http.Header{"X-Ratelimit-Remaining": []string{"0"}},
			expected: ErrRateLimited,
		},
		{name: "secondary rate limit", status: http.StatusTooManyRequests, expected: ErrRateLimited},
		{name: "upstream failure", status: http.StatusBadGateway, expected: ErrUpstreamError},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client := githubClientForTest(func(*http.Request) (*http.Response, error) {
				return githubResponse(test.status, `{}`, test.headers), nil
			})
			_, err := client.FetchUser(t.Context(), "secret-token")
			var githubErr *GithubClientError
			if !errors.As(err, &githubErr) {
				t.Fatalf("expected GithubClientError, got %v", err)
			}
			if githubErr.Code != test.expected {
				t.Fatalf("expected %q, got %q", test.expected, githubErr.Code)
			}
			if strings.Contains(githubErr.Error(), "secret-token") {
				t.Fatal("error message leaked the token")
			}
		})
	}
}

func TestGithubClientRejectsInvalidResponseShape(t *testing.T) {
	invalidBodies := []string{
		`{"id":123,"login":"bad login","created_at":"2020-01-01T00:00:00Z"}`,
		`{"id":123,"login":"valid-user","created_at":"not-a-date"}`,
		`{"id":123,"login":"valid-user","created_at":"2020-01-01T00:00:00Z","followers":-1}`,
	}

	for _, body := range invalidBodies {
		client := githubClientForTest(func(*http.Request) (*http.Response, error) {
			return githubResponse(http.StatusOK, body, nil), nil
		})
		_, err := client.FetchUser(t.Context(), "secret-token")
		var githubErr *GithubClientError
		if !errors.As(err, &githubErr) || githubErr.Code != ErrUpstreamError {
			t.Fatalf("expected upstream shape error for %s, got %v", body, err)
		}
	}
}
