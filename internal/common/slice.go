package common

import "math/rand"

// Shuffle implements the Fisher-Yates shuffle on a slice
func Shuffle[T any](p []*T) {

	for i := len(p) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
		p[i], p[j] = p[j], p[i]
	}
}
