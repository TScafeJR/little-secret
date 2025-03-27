package common

type Set[T comparable] struct {
	m map[T]struct{}
}

func NewSet[T comparable]() *Set[T] {
	return &Set[T]{
		m: make(map[T]struct{}),
	}
}

func (s *Set[T]) Add(v T) {
	s.m[v] = struct{}{}
}

func (s *Set[T]) Remove(v T) {
	delete(s.m, v)
}

func (s *Set[T]) Contains(v T) bool {
	_, exists := s.m[v]
	return exists
}

func (s *Set[T]) Len() int {
	return len(s.m)
}

func (s *Set[T]) Values() []T {
	values := make([]T, 0, len(s.m))
	for v := range s.m {
		values = append(values, v)
	}
	return values
}

func (s *Set[T]) Clear() {
	for k := range s.m {
		delete(s.m, k)
	}
}
