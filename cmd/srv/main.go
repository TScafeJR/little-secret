package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/TScafeJR/little-secret/internal/secret"
	"github.com/TScafeJR/little-secret/internal/server"
	"github.com/TScafeJR/little-secret/internal/server/srvcfg"

	"github.com/blendle/zapdriver"
	"go.uber.org/zap"
)

const defaultPort = 8080

func getSafePort(port string) (int, error) {
	safePort, err := strconv.Atoi(port)
	if err != nil {
		return 0, fmt.Errorf("strconv.Atoi(): %v", err)
	}

	return safePort, nil
}

func marshalBoolean(logger *zap.Logger, s string) bool {
	if strings.ToLower(s) == "false" {
		return false
	} else if strings.ToLower(s) == "true" {
		return true
	}
	logger.Fatal("Start up failed", zap.Error(fmt.Errorf("%s is not true or false", s)))
	return false
}

func main() {
	var port int

	logger, err := zapdriver.NewProductionWithCore(zapdriver.WrapCore(
		zapdriver.ReportAllErrors(true),
		zapdriver.ServiceName("little-secret"),
	))
	if err != nil {
		logger.Fatal("Start up failed", zap.Error(fmt.Errorf("`zapdriver.NewProductionWithCore(): %w", err)))
	}
	defer logger.Sync()

	projectID, ok := os.LookupEnv("GOOGLE_CLOUD_PROJECT")
	if !ok {
		logger.Fatal("Start up failed", zap.Error(errors.New("`GOOGLE_CLOUD_PROJECT` env var missing")))
	}

	portEnv := os.Getenv("PORT")
	if portEnv == "" {
		port = defaultPort
	} else {
		port, err = getSafePort(portEnv)
		if err != nil {
			log.Fatalf("Error loading port: %v", err)
		}
	}

	ctx := context.Background()
	secretMgr, closeFn, err := secret.New(ctx)
	if err != nil {
		logger.Fatal("Start up failed", zap.Error(fmt.Errorf("secret.New(): %w", err)))
	}
	defer closeFn()

	secret := func(v string) string {
		return secretMgr.Get(ctx, projectID, v)
	}
	dbUri := secret("POSTGRES_URL")

	allowedOrigins := make([]string, 0)

	// Prod serves the Vite build alongside /ws from a single Cloud Run service.
	// The prod Dockerfile copies the build to /app/dist; override via env var
	// only for non-default layouts.
	staticPath := os.Getenv("STATIC_FILE_PATH")
	if staticPath == "" {
		staticPath = "/app/dist"
	}

	if err := server.ServeWeb(srvcfg.Cfg{
		PublicPort:     port,
		AllowedOrigins: allowedOrigins,
		Logger:         logger,
		StaticFilePath: staticPath,
		DbUri:          dbUri,
	}); err != nil {
		logger.Fatal("server.ServeGRPCWeb()", zap.Error(err))
	}
}
