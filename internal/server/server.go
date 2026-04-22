package server

import (
	"context"
	"fmt"
	"sync"

	game "github.com/TScafeJR/little-secret/internal/game/service"
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

type Services struct {
	game.GameService
}

func NewServer(cfg srvcfg.Cfg) (*Server, *Services, CloseFn, error) {
	if err := cfg.Validate(); err != nil {
		return nil, nil, nil, fmt.Errorf("cfg.Validate(): %w", err)
	}

	dbPool, err := sqlx.Open("pgx", cfg.DbUri)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("sql.Open(): %w", err)
	}

	// Enables internal randomness pool to be used in the heap. Improves throughput of generation.
	enableRandPoolOnce.Do(uuid.EnableRandPool)

	db, err := sqldb.New(dbPool)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("sqldb.New(): %w", err)
	}

	gameservice, err := game.New(&game.ServiceCfg{
		Logger: cfg.Logger.Named("game_service"),
		Store:  game.NewPGEventStore(dbPool),
	})
	if err != nil {
		return nil, nil, nil, fmt.Errorf("game.New(): %w", err)
	}

	// Rebuild in-memory room state from the event log. A failure here shouldn't
	// prevent server startup — we log and continue; worst case, ongoing games
	// from before the crash are unrecoverable but new games still work.
	if err := gameservice.Recover(context.Background()); err != nil {
		cfg.Logger.Error("gameservice.Recover", zap.Error(err))
	}

	return &Server{
			logger: cfg.Logger,
			db:     db,
		}, &Services{
			GameService: *gameservice,
		},
		func() {
			dbPool.Close()
		}, nil
}
