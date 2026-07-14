package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

type Server struct {
	profiles *ProfileStore
	github   *GithubClient
}

type apiErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write response: %v", err)
	}
}

// writeError sends {"error": {"code", "message"}}; codes mirror the old
// tRPC error codes so the frontend mapping stays semantically identical.
func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]apiErrorBody{"error": {Code: code, Message: message}})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte("OK"))
}

func githubErrorStatus(code GithubErrorCode) (int, string) {
	switch code {
	case ErrInvalidToken:
		return http.StatusUnauthorized, "UNAUTHORIZED"
	case ErrForbidden:
		return http.StatusForbidden, "FORBIDDEN"
	case ErrRateLimited:
		return http.StatusTooManyRequests, "TOO_MANY_REQUESTS"
	default:
		return http.StatusInternalServerError, "INTERNAL_SERVER_ERROR"
	}
}

type fetchRequest struct {
	Token string `json:"token"`
}

type fetchResponse struct {
	Account *GithubAccount `json:"account"`
	Saved   bool           `json:"saved"`
}

const (
	maxFetchBodyBytes = 4 << 10
	maxTokenBytes     = 1024
	databaseTimeout   = 5 * time.Second
)

func (s *Server) handleFetchAccount(w http.ResponseWriter, r *http.Request) {
	var body fetchRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxFetchBodyBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "请求体不是合法的 JSON。")
		return
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "请求体只能包含一个 JSON 对象。")
		return
	}

	token := strings.TrimSpace(body.Token)
	if token == "" {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Token 不能为空")
		return
	}
	if len(token) > maxTokenBytes {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Token 长度不合法")
		return
	}

	account, err := s.github.FetchUser(r.Context(), token)
	if err != nil {
		var ghErr *GithubClientError
		if errors.As(err, &ghErr) {
			status, code := githubErrorStatus(ghErr.Code)
			writeError(w, status, code, ghErr.Message)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "请求失败，请稍后重试。")
		return
	}

	// Save failure is non-blocking; the account is still returned with
	// saved=false and the error is logged without the token.
	saved := true
	saveCtx, cancel := context.WithTimeout(r.Context(), databaseTimeout)
	defer cancel()
	if err := s.profiles.UpsertProfile(saveCtx, account); err != nil {
		saved = false
		log.Printf("[github-account/fetch] profile upsert failed: %v", err)
	}

	writeJSON(w, http.StatusOK, fetchResponse{Account: account, Saved: saved})
}

func (s *Server) handleGetIntro(w http.ResponseWriter, r *http.Request) {
	login := strings.TrimSpace(r.PathValue("login"))
	if !isValidGithubLogin(login) {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "用户名格式不正确")
		return
	}

	queryCtx, cancel := context.WithTimeout(r.Context(), databaseTimeout)
	defer cancel()
	stored, err := s.profiles.GetProfileByLogin(queryCtx, login)
	if errors.Is(err, ErrAccountNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "还没有这个用户名的个人信息记录，请先在首页用 Token 获取一次。")
		return
	}
	if err != nil {
		log.Printf("[intro/get] query failed: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "请求失败，请稍后重试。")
		return
	}

	writeJSON(w, http.StatusOK, stored)
}
