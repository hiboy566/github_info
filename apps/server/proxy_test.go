package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestInternalAPIProxyForwardsRequest(t *testing.T) {
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/api/example" || r.URL.RawQuery != "source=lambda" {
			t.Fatalf("unexpected target URL: %s", r.URL.String())
		}
		if r.Header.Get("Authorization") != "Bearer test-token" {
			t.Fatalf("authorization header was not forwarded")
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read request body: %v", err)
		}
		if string(body) != `{"hello":"world"}` {
			t.Fatalf("unexpected request body: %s", body)
		}
		w.Header().Set("X-Backend", "ecs")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer target.Close()

	proxy, err := newInternalAPIProxy(target.URL)
	if err != nil {
		t.Fatalf("newInternalAPIProxy returned an error: %v", err)
	}

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/example?source=lambda",
		strings.NewReader(`{"hello":"world"}`),
	)
	request.Header.Set("Authorization", "Bearer test-token")
	proxy.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", recorder.Code)
	}
	if recorder.Header().Get("X-Backend") != "ecs" {
		t.Fatalf("backend response header was not forwarded")
	}
	if recorder.Body.String() != `{"ok":true}` {
		t.Fatalf("unexpected response body: %s", recorder.Body.String())
	}
}

func TestInternalAPIProxyRejectsInvalidTarget(t *testing.T) {
	for _, target := range []string{
		"",
		"https://api.github-info.local:3000",
		"http://",
		"http://user:password@api.github-info.local:3000",
		"http://api.github-info.local:3000?debug=true",
		"http://api.github-info.local:3000#fragment",
	} {
		t.Run(target, func(t *testing.T) {
			if _, err := newInternalAPIProxy(target); err == nil {
				t.Fatalf("expected target %q to be rejected", target)
			}
		})
	}
}
