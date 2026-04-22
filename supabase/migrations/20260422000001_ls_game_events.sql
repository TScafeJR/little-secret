-- Append-only event log for Little Secret rooms. Serves double duty as the
-- crash-recovery source of truth (rebuild *Game in memory by replaying events
-- in seq order) and as an audit trail. Events are never purged.
create table if not exists ls_game_events (
  id bigserial primary key,
  room_id text not null,
  seq bigint not null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (room_id, seq)
);

create index if not exists ls_game_events_room_seq_idx
  on ls_game_events (room_id, seq);
