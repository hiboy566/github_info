package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func assertAPIError(t *testing.T, recorder *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	if recorder.Code != status {
		t.Fatalf("expected status %d, got %d: %s", status, recorder.Code, recorder.Body.String())
	}
	var body struct {
		Error apiErrorBody `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	if body.Error.Code != code {
		t.Fatalf("expected error code %q, got %q", code, body.Error.Code)
	}
}

func TestHandleFetchAccountRejectsInvalidInput(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{name: "invalid JSON", body: `{"token":`},
		{name: "unknown field", body: `{"token":"value","extra":true}`},
		{name: "multiple values", body: `{"token":"value"}{"token":"other"}`},
		{name: "empty token", body: `{"token":"   "}`},
		{name: "oversized token", body: `{"token":"` + strings.Repeat("a", maxTokenBytes+1) + `"}`},
	}

	server := &Server{}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodPost, "/api/github-account/fetch", strings.NewReader(test.body))
			server.handleFetchAccount(recorder, request)
			assertAPIError(t, recorder, http.StatusBadRequest, "BAD_REQUEST")
		})
	}
}

func TestHandleGetIntroRejectsInvalidLogin(t *testing.T) {
	server := &Server{}
	for _, login := range []string{"", "bad login", "-leading", "trailing-", strings.Repeat("a", 40)} {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, "/api/intro/invalid", nil)
		request.SetPathValue("login", login)
		server.handleGetIntro(recorder, request)
		assertAPIError(t, recorder, http.StatusBadRequest, "BAD_REQUEST")
	}
}
