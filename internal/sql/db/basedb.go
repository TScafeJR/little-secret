package db

import (
	"context"
	"database/sql"

	csql "github.com/TScafeJR/little-secret/internal/sql"
)

type BaseServiceDB interface {
	BeginTx(ctx context.Context, ops *sql.TxOptions) (csql.Transaction, error)
}
