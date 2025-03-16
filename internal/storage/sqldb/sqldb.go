package sqldb

import (
	"github.com/TScafeJR/little-secret/internal/sql/db"
	"github.com/jmoiron/sqlx"
)

type statementKey string

// DB defines the db struct config.
type DB struct {
	*db.DB
}

// New creates a new DB instance.
func New(sqlDB *sqlx.DB) (*DB, error) {
	sdb := db.New(sqlDB)

	d := &DB{DB: sdb}

	return d, nil
}
