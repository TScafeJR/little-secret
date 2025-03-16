package sql

import (
	"context"
	"database/sql"

	"github.com/go-sql-driver/mysql"
	"github.com/pkg/errors"
)

const (
	// https://dev.mysql.com/doc/refman/5.7/en/innodb-deadlock-example.html
	mysqlDeadlock = 1213
	ErrNoRows     = "sql: no rows in result set"
)

// Transaction is an interface that represents a database transaction.
type Transaction interface {
	// Commit commits the transaction.
	Commit() error
	// Rollback rolls back the transaction.
	Rollback() error
}

// TransactionWrapper is an interface for a wraper around a sql.Tx
// (generally for testing) that can provide the real transaction.
type TransactionWrapper interface {
	RealTransaction() *sql.Tx
}

// DBTx converts a Transaction to a *sql.Tx. If tx is not nil,
// does not implet the TranasctionWrapper interface, and is not a *sql.Tx,
// it will panic.
func DBTx(tx Transaction) *sql.Tx {
	if tx == nil {
		return nil
	}
	if wrap, ok := tx.(TransactionWrapper); ok {
		return wrap.RealTransaction()
	}
	return tx.(*sql.Tx)
}

// RunTransaction calls a function that may return a retryable tranasction error.
// If such an error is returned, the function is called again.
// Example:
//
//	err := RunTransaction(func() error {
//	  tx, err := storage.Begin()
//	  if err != nil {
//	    return err
//	  }
//	  defer tx.Rollback()
//	  ...
//	  return tx.Commit()
//	})
func RunTransaction(ctx context.Context, f func() error) error {
	for i := 1; i <= 15; i++ {
		err := f()
		if e, ok := errors.Cause(err).(*mysql.MySQLError); ok && e != nil && e.Number == mysqlDeadlock {
			continue
		}
		return err
	}
	return errors.New("tx failed too many times")
}
