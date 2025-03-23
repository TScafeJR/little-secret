package game

import "testing"

func Test_getConfig(t *testing.T) {
	tests := []struct {
		name    string
		players int
		wantErr bool
	}{
		{
			name:    "should return something for 3 players",
			players: 3,
			wantErr: true,
		},
		{
			name:    "should return something for 4 players",
			players: 4,
		},
		{
			name:    "should return something for 5 players",
			players: 5,
		},
		{
			name:    "should return something for 6 players",
			players: 6,
		},
		{
			name:    "should return something for 7 players",
			players: 7,
		},
		{
			name:    "should return something for 8 players",
			players: 8,
		},
		{
			name:    "should return something for 9 players",
			players: 9,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := getConfig(tt.players)
			if (err != nil) != tt.wantErr {
				t.Errorf("getConfig() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}
