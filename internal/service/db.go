package service

import (
	"context"
	"database/sql"

	csql "github.com/TScafeJR/little-secret/internal/sql"
)

type DB interface {
	BeginTx(ctx context.Context, ops *sql.TxOptions) (csql.Transaction, error)
}
