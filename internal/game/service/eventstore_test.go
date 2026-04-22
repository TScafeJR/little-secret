package gameservice

import (
	"context"
	"testing"

	"github.com/TScafeJR/little-secret/internal/id"
)

func TestMemoryEventStore_AppendAssignsMonotonicSeq(t *testing.T) {
	s := NewMemoryEventStore()
	ctx := context.Background()
	room := id.RoomHash("room-a")

	for i := 1; i <= 3; i++ {
		seq, err := s.Append(ctx, room, "x", []byte(`{}`))
		if err != nil {
			t.Fatalf("append: %v", err)
		}
		if seq != int64(i) {
			t.Fatalf("seq[%d] = %d, want %d", i, seq, i)
		}
	}

	events, err := s.LoadForRoom(ctx, room)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(events) != 3 {
		t.Fatalf("len(events) = %d, want 3", len(events))
	}
	for i, e := range events {
		if e.Seq != int64(i+1) {
			t.Errorf("events[%d].Seq = %d, want %d", i, e.Seq, i+1)
		}
	}
}

func TestMemoryEventStore_SeqIsolatedPerRoom(t *testing.T) {
	s := NewMemoryEventStore()
	ctx := context.Background()

	seqA, _ := s.Append(ctx, "a", "t", []byte(`{}`))
	seqB, _ := s.Append(ctx, "b", "t", []byte(`{}`))
	seqA2, _ := s.Append(ctx, "a", "t", []byte(`{}`))

	if seqA != 1 || seqB != 1 || seqA2 != 2 {
		t.Fatalf("seqs: a1=%d b1=%d a2=%d (want 1,1,2)", seqA, seqB, seqA2)
	}
}

func TestMemoryEventStore_PayloadIsCopied(t *testing.T) {
	s := NewMemoryEventStore()
	ctx := context.Background()

	p := []byte(`{"v":1}`)
	if _, err := s.Append(ctx, "r", "t", p); err != nil {
		t.Fatalf("append: %v", err)
	}
	p[0] = 'X'

	events, _ := s.LoadForRoom(ctx, "r")
	if string(events[0].Payload) != `{"v":1}` {
		t.Fatalf("payload was not defensively copied: %s", events[0].Payload)
	}
}

func TestMemoryEventStore_ListRoomIDsSorted(t *testing.T) {
	s := NewMemoryEventStore()
	ctx := context.Background()

	for _, r := range []id.RoomHash{"gamma", "alpha", "beta"} {
		if _, err := s.Append(ctx, r, "t", []byte(`{}`)); err != nil {
			t.Fatalf("append: %v", err)
		}
	}

	rooms, err := s.ListRoomIDs(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	want := []id.RoomHash{"alpha", "beta", "gamma"}
	if len(rooms) != len(want) {
		t.Fatalf("rooms=%v want %v", rooms, want)
	}
	for i := range want {
		if rooms[i] != want[i] {
			t.Fatalf("rooms[%d]=%s want %s", i, rooms[i], want[i])
		}
	}
}
