package http

import (
	"fmt"
	"net/http"
)

const MAX_REDIRECTS = 20

func GetFinalURL(url string) (string, error) {
	if url == "" {
		return "", nil
	}

	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= MAX_REDIRECTS {
				return fmt.Errorf("too many redirects")
			}
			return nil
		},
	}

	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	finalURL := resp.Request.URL.String()
	return finalURL, nil
}
