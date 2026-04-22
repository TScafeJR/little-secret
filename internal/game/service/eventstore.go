package gameservice

import (
	"context"
	"slices"
	"sync"

	"github.com/TScafeJR/little-secret/internal/id"
)

// StoredEvent is one row in the ls_game_events table.
//
// Payload is the raw JSON of a Message (for inbound events) or the JSON of a
// decision payload (for server-generated events like roles_assigned). Readers
// that need structured access should unmarshal into the appropriate type.
type StoredEvent struct {
	RoomID    id.RoomHash
	Seq       int64
	EventType string
	Payload   []byte
}

// EventStore is the persistence boundary for the game event log. The Postgres
// implementation is authoritative; the in-memory implementation is used by
// tests.
//
// Append is monotonic per room: callers do not pass a seq; the store picks the
// next one atomically and returns it.
type EventStore interface {
	Append(ctx context.Context, roomID id.RoomHash, eventType string, payload []byte) (seq int64, err error)
	LoadForRoom(ctx context.Context, roomID id.RoomHash) ([]StoredEvent, error)
	ListRoomIDs(ctx context.Context) ([]id.RoomHash, error)
}

type memoryEventStore struct {
	mu     sync.Mutex
	events map[id.RoomHash][]StoredEvent
}

// NewMemoryEventStore returns an in-memory EventStore suitable for tests.
func NewMemoryEventStore() EventStore {
	return &memoryEventStore{events: make(map[id.RoomHash][]StoredEvent)}
}

func (m *memoryEventStore) Append(_ context.Context, roomID id.RoomHash, eventType string, payload []byte) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	seq := int64(len(m.events[roomID])) + 1
	cp := make([]byte, len(payload))
	copy(cp, payload)
	m.events[roomID] = append(m.events[roomID], StoredEvent{
		RoomID:    roomID,
		Seq:       seq,
		EventType: eventType,
		Payload:   cp,
	})
	return seq, nil
}

func (m *memoryEventStore) LoadForRoom(_ context.Context, roomID id.RoomHash) ([]StoredEvent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	src := m.events[roomID]
	out := make([]StoredEvent, len(src))
	copy(out, src)
	return out, nil
}

func (m *memoryEventStore) ListRoomIDs(_ context.Context) ([]id.RoomHash, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]id.RoomHash, 0, len(m.events))
	for r := range m.events {
		out = append(out, r)
	}
	slices.Sort(out)
	return out, nil
}
