package common

import (
	"errors"
	"hash/fnv"
	"strings"
	"sync"
)

// Storage for UUID ↔ ShortCode mapping (can be replaced with DB)
var (
	mu          sync.Mutex
	shortToUUID = make(map[string]string)
	uuidToShort = make(map[string]string)
)

const base32 = "0123456789ABCDEFGHJKMNPQRSTUVWXYZ" // No 'I' or 'O' to avoid confusion

const base = uint32(len(base32))

func normalizeUUID(u string) string {
	return strings.ToLower(u)
}

func hashUUID(u string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(normalizeUUID(u)))
	return h.Sum32()
}

// Encodes uint32 into a **4-char Base32 string**
func encodeBase32(num uint32) string {
	result := make([]byte, 4)
	for i := 3; i >= 0; i-- {
		result[i] = base32[num%base]
		num /= base
	}
	return string(result)
}

// Generates a unique 4-character short code for a UUID
func UUIDToShort(uuidStr string) (string, error) {
	mu.Lock()
	defer mu.Unlock()

	// Normalize UUID before hashing
	normalizedUUID := normalizeUUID(uuidStr)

	// Return existing mapping if already converted
	if short, exists := uuidToShort[normalizedUUID]; exists {
		return short, nil
	}

	// Generate a short code
	hashed := hashUUID(normalizedUUID)
	shortCode := encodeBase32(hashed)

	// Handle collisions by modifying hash slightly
	_, collision := shortToUUID[shortCode]
	for collision {
		hashed++
		shortCode = encodeBase32(hashed)
		_, collision = shortToUUID[shortCode]
	}

	// Store bidirectional mapping
	shortToUUID[shortCode] = normalizedUUID
	uuidToShort[normalizedUUID] = shortCode

	return shortCode, nil
}

// Decodes a 4-character short code back to UUID
func ShortToUUID(shortCode string) (string, error) {
	mu.Lock()
	defer mu.Unlock()

	uuidStr, exists := shortToUUID[strings.ToUpper(shortCode)]
	if !exists {
		return "", errors.New("short code not found")
	}
	return uuidStr, nil
}
