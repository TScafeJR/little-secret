package uuid

import "github.com/google/uuid"

// CreateUUID creates a uuid
func CreateUUID() uuid.UUID {
	return uuid.New()
}
