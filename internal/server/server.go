package server

import (
	"fmt"
	"sync"

	"github.com/TScafeJR/little-secret/internal/server/srvcfg"
	"github.com/TScafeJR/little-secret/internal/service"
	"github.com/TScafeJR/little-secret/internal/storage/sqldb"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type CloseFn func()

var enableRandPoolOnce sync.Once

type Server struct {
	logger *zap.Logger
	db     service.DB
}

func NewServer(cfg srvcfg.Cfg) (*Server, CloseFn, error) {
	if err := cfg.Validate(); err != nil {
		return nil, nil, err
	}

	dbPool, err := sqlx.Open("pgx", cfg.DbUri)
	if err != nil {
		return nil, nil, fmt.Errorf("sql.Open(): %w", err)
	}

	// Enables internal randomness pool to be used in the heap. Improves throughput of generation.
	enableRandPoolOnce.Do(uuid.EnableRandPool)

	db, err := sqldb.New(dbPool)
	if err != nil {
		return nil, nil, fmt.Errorf("sqldb.New(): %w", err)
	}

	return &Server{
			logger: cfg.Logger,
			db:     db,
		}, func() {
			dbPool.Close()
		}, nil
}
