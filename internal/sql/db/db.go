package db

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"

	csql "github.com/TScafeJR/little-secret/internal/sql"
)

// New returns a new DB object that uses a given sql.DB and has the prepared
// statements for the package.
func New(db *sqlx.DB) *DB {
	return &DB{
		DB:    db,
		stmts: map[interface{}]*sql.Stmt{},
	}
}

// DB is a wrapper around sql.DB to aid in managing prepared
// statements and tranasctions.
type DB struct {
	DB    *sqlx.DB
	stmts map[interface{}]*sql.Stmt
}

// BeginTx begins a Transaction.
func (d *DB) BeginTx(ctx context.Context, ops *sql.TxOptions) (csql.Transaction, error) {
	return d.DB.BeginTx(ctx, ops)
}

// Register takes a map of `statement keys` to sql statements, and prepares them.
// The statement keys can be used as arguments to a d.{Exec,Query}Stmt to call
// the prepared statements. Register returns an error if a statementTransaction key
// has already been used in an earlier call to register.
func (d *DB) Register(stmtsToBePrepared map[interface{}]string) error {
	for k, stmtStr := range stmtsToBePrepared {
		if _, found := d.stmts[k]; found {
			d.Close()
			return fmt.Errorf("statement to be prepared has a duplicate key: %q", k)
		}
		stmt, err := d.DB.Prepare(stmtStr)
		if err != nil {
			d.Close()
			return fmt.Errorf("d.DB.Prepare() failed for statement with key %q: %v:\n%v", k, stmtStr, err)
		}
		d.stmts[k] = stmt
	}
	return nil
}

// Close closes the database
func (d *DB) Close() {
	for _, stmt := range d.stmts {
		stmt.Close()
	}
}

// Query is a simple wrapper around sql Query() functionality. If the
// transaction is non-nil, the query is run in the transaction.
// Otherwise the query is run on d.DB.
func (d *DB) Query(tx csql.Transaction, query string, args ...interface{}) (*sql.Rows, error) {
	if tx := csql.DBTx(tx); tx != nil {
		return tx.Query(query, args...)
	}
	return d.DB.Query(query, args...)
}

// QueryRow is a simple wraper around sql QueryRow() functionality. If the
// tranasction tx is non-nil, the given query is run in the Transaction.
// Otherwise the query is run on the d.DB.
func (d *DB) QueryRow(tx csql.Transaction, query string, args ...interface{}) *sql.Row {
	if tx := csql.DBTx(tx); tx != nil {
		return tx.QueryRow(query, args...)
	}
	return d.DB.QueryRow(query, args...)
}

// Exec is a simple wraper around sql Exec() functionality. If the
// tranasction tx is non-nil, the given query is run in the Transaction.
// Otherwise the query is run on the d.DB.
func (d *DB) Exec(tx csql.Transaction, query string, args ...interface{}) (sql.Result, error) {
	if tx := csql.DBTx(tx); tx != nil {
		return tx.Exec(query, args...)
	}
	return d.DB.Exec(query, args...)
}

// QueryStmt takes a stmtKey that was passed as part of the map to Register,
// and calls .Query() on the prepared statement with the given args. If tx is
// non-nil, the stmt is executed in the transaction, otherwise it is executed
// using d.DB.
func (d *DB) QueryStmt(tx csql.Transaction, key interface{}, args ...interface{}) (*sql.Rows, error) {
	stmt, err := d.stmtForKey(key)
	if err != nil {
		return nil, err
	}
	if tx := csql.DBTx(tx); tx != nil {
		return tx.Stmt(stmt).Query(args...)
	}
	return stmt.Query(args...)
}

// Row is an interface for the result of DB queries tha return a single row.
type Row interface {
	Scan(dest ...interface{}) error
}

// errRow is an implementation of a Row that always returns a canned error
// when scanned.
type errRow struct {
	err error
}

// Scan implments the Row interface for errRow
func (r *errRow) Scan(dest ...interface{}) error {
	return r.err
}

// QueryRowStmt takes a stmtKey that was passed as part of a map to
// Register, and calls .QueryRow() on the prepared statement with the
// given args. If tx is non-nil, the stmt is executed in the Transaction,
// otherwise it is executed using d.DB.
func (d *DB) QueryRowStmt(tx csql.Transaction, key interface{}, args ...interface{}) Row {
	stmt, err := d.stmtForKey(key)
	if err != nil {
		return &errRow{err: err}
	}
	if tx := csql.DBTx(tx); tx != nil {
		return tx.Stmt(stmt).QueryRow(args...)
	}
	return stmt.QueryRow(args...)
}

// ExecStmt takes a stmtKey that was passed as part of a map to Register,
// and calls .Exec() on the prepared statement with the given args. If tx is
// non-nil, the stmt is executed in the transaction, otherwise it is executed
// using d.DB.
func (d *DB) ExecStmt(tx csql.Transaction, key interface{}, args ...interface{}) (sql.Result, error) {
	stmt, err := d.stmtForKey(key)
	if err != nil {
		return nil, err
	}
	if tx := csql.DBTx(tx); tx != nil {
		return tx.Stmt(stmt).Exec(args...)
	}
	return stmt.Exec(args...)
}

func (d *DB) stmtForKey(key interface{}) (*sql.Stmt, error) {
	stmt, found := d.stmts[key]
	if !found {
		return nil, fmt.Errorf("no prepared statement found for key %q in statements map %#v. (Did you rememeber to call Reigster()?)", key, d.stmts)
	}
	return stmt, nil
}

// StartOrContinueTx starts a new tx if cstx is nil, or continues the same one.
// The first return value is the tx to use. The second is the function that should
// be called if an error occurs while using the tex (ussually just deferred).
// The third is a function that should be called to commit the operations done by a tx.
func (d *DB) StartOrContinueTx(cstx csql.Transaction) (csql.Transaction, func() error, func() error, error) {
	if cstx != nil {
		noop := func() error {
			return nil
		}
		return cstx, noop, noop, nil
	}
	tx, err := d.DB.Begin()
	if err != nil {
		return nil, nil, nil, err
	}
	return tx, tx.Rollback, tx.Commit, nil
}

// StartOrContinueTxWithCtx starts a new tx if cstx is nil, or continues the same one.
// The first return value is the tx to use. The second is the function that should
// be called if an error occurs while using the tex (ussually just deferred).
// The third is a function that should be called to commit the operations done by a tx.
func (d *DB) StartOrContinueTxWithCtx(ctx context.Context, cstx csql.Transaction) (csql.Transaction, func() error, func() error, error) {
	if cstx != nil {
		noop := func() error {
			return nil
		}
		return cstx, noop, noop, nil
	}
	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, nil, err
	}
	return tx, tx.Rollback, tx.Commit, nil
}

func (d *DB) PingContext(ctx context.Context) error {
	return d.DB.PingContext(ctx)
}
