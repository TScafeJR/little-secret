package http

import (
	"net/http"
	"time"
)

func NewClient() *http.Client {
	transport := &http.Transport{
		MaxIdleConns:    10,
		IdleConnTimeout: 30 * time.Second,
	}

	return &http.Client{
		Transport: transport,
	}
}
