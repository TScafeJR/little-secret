package sql

import (
	"context"
	"github.com/jackc/pgx"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

// New sets up a connection to a new DB.
func New(ctx context.Context, dsn string) (*sqlx.DB, error) {
	db, err := setup(ctx, dsn)
	if err != nil {
		return nil, errors.Wrap(err, "failed to set up DB")
	}
	return db, nil
}

func setup(ctx context.Context, dsn string) (*sqlx.DB, error) {
	cfg, err := pgx.ParseDSN(dsn)
	if err != nil {
		return nil, err
	}
	return sqlx.Open("pgx", cfg.Database)
}
