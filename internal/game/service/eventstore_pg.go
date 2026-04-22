package gameservice

import (
	"context"
	"fmt"

	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/jmoiron/sqlx"
)

type pgEventStore struct {
	db *sqlx.DB
}

// NewPGEventStore returns an EventStore backed by the ls_game_events table.
func NewPGEventStore(db *sqlx.DB) EventStore {
	return &pgEventStore{db: db}
}

func (p *pgEventStore) Append(ctx context.Context, roomID id.RoomHash, eventType string, payload []byte) (int64, error) {
	// COALESCE + subquery keeps the seq assignment in a single statement; the
	// unique(room_id, seq) constraint catches any interleaved appends.
	const q = `
		insert into ls_game_events (room_id, seq, event_type, payload)
		values ($1, coalesce((select max(seq) from ls_game_events where room_id = $1), 0) + 1, $2, $3)
		returning seq
	`
	var seq int64
	if err := p.db.QueryRowxContext(ctx, q, string(roomID), eventType, payload).Scan(&seq); err != nil {
		return 0, fmt.Errorf("pgEventStore.Append: %w", err)
	}
	return seq, nil
}

func (p *pgEventStore) LoadForRoom(ctx context.Context, roomID id.RoomHash) ([]StoredEvent, error) {
	const q = `select room_id, seq, event_type, payload from ls_game_events where room_id = $1 order by seq asc`
	rows, err := p.db.QueryxContext(ctx, q, string(roomID))
	if err != nil {
		return nil, fmt.Errorf("pgEventStore.LoadForRoom: %w", err)
	}
	defer rows.Close()

	var out []StoredEvent
	for rows.Next() {
		var (
			room    string
			seq     int64
			etype   string
			payload []byte
		)
		if err := rows.Scan(&room, &seq, &etype, &payload); err != nil {
			return nil, fmt.Errorf("pgEventStore.LoadForRoom scan: %w", err)
		}
		out = append(out, StoredEvent{
			RoomID:    id.RoomHash(room),
			Seq:       seq,
			EventType: etype,
			Payload:   payload,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("pgEventStore.LoadForRoom rows: %w", err)
	}
	return out, nil
}

func (p *pgEventStore) ListRoomIDs(ctx context.Context) ([]id.RoomHash, error) {
	const q = `select distinct room_id from ls_game_events order by room_id asc`
	rows, err := p.db.QueryxContext(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("pgEventStore.ListRoomIDs: %w", err)
	}
	defer rows.Close()

	var out []id.RoomHash
	for rows.Next() {
		var r string
		if err := rows.Scan(&r); err != nil {
			return nil, fmt.Errorf("pgEventStore.ListRoomIDs scan: %w", err)
		}
		out = append(out, id.RoomHash(r))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("pgEventStore.ListRoomIDs rows: %w", err)
	}
	return out, nil
}
