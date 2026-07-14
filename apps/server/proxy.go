package main

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

const internalProxyResponseHeaderTimeout = 20 * time.Second

// newInternalAPIProxy forwards Lambda requests to the ECS service discovered
// through a private Cloud Map DNS name. Only plain HTTP is accepted because
// traffic stays inside the VPC and the target name has no public certificate.
func newInternalAPIProxy(rawTarget string) (http.Handler, error) {
	target, err := url.Parse(strings.TrimSpace(rawTarget))
	if err != nil {
		return nil, fmt.Errorf("parse target URL: %w", err)
	}
	if target.Scheme != "http" || target.Host == "" {
		return nil, fmt.Errorf("target URL must use http and include a host")
	}
	if target.User != nil || target.RawQuery != "" || target.Fragment != "" {
		return nil, fmt.Errorf("target URL must not include credentials, a query, or a fragment")
	}
	target.Path = strings.TrimRight(target.Path, "/")

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = internalProxyResponseHeaderTimeout

	proxy := &httputil.ReverseProxy{
		Rewrite: func(request *httputil.ProxyRequest) {
			request.SetURL(target)
			request.SetXForwarded()
		},
		Transport: transport,
		ErrorHandler: func(w http.ResponseWriter, _ *http.Request, proxyErr error) {
			log.Printf("internal API proxy failed: %v", proxyErr)
			writeError(w, http.StatusBadGateway, "BAD_GATEWAY", "服务暂时不可用，请稍后重试。")
		},
	}
	return proxy, nil
}
