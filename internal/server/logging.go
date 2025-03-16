package server

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// requestLogger logs an http request.
func requestLogger(logger *zap.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		fn := func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			var requestID string
			if reqID := r.Context().Value(middleware.RequestIDKey); reqID != nil {
				requestID = reqID.(string)
			}
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			// capture body if an error occurs
			buf := newLimitBuffer(512)
			ww.Tee(buf)

			next.ServeHTTP(ww, r)

			latency := time.Since(start)

			fields := []zapcore.Field{
				zap.Duration("took", latency),
				zap.Int64("milliseconds", latency.Nanoseconds()/1000000),
				zap.String("request.remote", r.RemoteAddr),
				zap.String("request.uri", r.RequestURI),
				zap.String("request.method", r.Method),
				zap.Int("response.status", ww.Status()),
				zap.Int("response.bytes_written", ww.BytesWritten()),
			}

			// add request headers
			for key, values := range r.Header {
				if key == "Authorization" { // redact jwt
					fields = append(fields, zap.String("request.header.Authorization", "***redacted***"))
				} else if len(values) > 0 {
					fields = append(fields, zap.String(fmt.Sprintf("request.header.%s", key), values[0]))
				}
			}

			if r.Header.Get("Authorization") == "" {
				fields = append(fields, zap.String("request.header.Authorization", "nil"))
			}

			if requestID != "" {
				fields = append(fields, zap.String("request.id", requestID))
			}

			if ww.Status() >= 400 {
				var err error

				var reader io.ReadCloser
				switch ww.Header().Get("Content-Encoding") {
				case "gzip":
					reader, err = gzip.NewReader(buf)
				case "deflate":
					reader = flate.NewReader(buf)
				default:
					reader = buf
				}

				var respBody []byte
				if err == nil {
					respBody, _ = io.ReadAll(reader)
					reader.Close()
				} else {
					logger.Error("gzip.NewReader()", zap.Error(err))
				}

				fields = append(fields, zap.ByteString("response.body", respBody))
			}
			logger.Info(fmt.Sprintf("Request: %s %s", r.Method, r.RequestURI), fields...)
		}
		return http.HandlerFunc(fn)
	}
}

// from https://github.com/go-chi/httplog/blob/master/util.go
type limitBuffer struct {
	*bytes.Buffer
	limit int
}

func newLimitBuffer(size int) io.ReadWriteCloser {
	return limitBuffer{
		Buffer: bytes.NewBuffer(make([]byte, 0, size)),
		limit:  size,
	}
}

func (b limitBuffer) Write(p []byte) (n int, err error) {
	if b.Buffer.Len() >= b.limit {
		return len(p), nil
	}
	limit := b.limit
	if len(p) < limit {
		limit = len(p)
	}
	return b.Buffer.Write(p[:limit])
}

func (b limitBuffer) Read(p []byte) (n int, err error) {
	return b.Buffer.Read(p)
}

// no op
func (b limitBuffer) Close() error {
	return nil
}
