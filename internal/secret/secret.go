package secret

import (
	"context"
	"fmt"
	"log"

	secretmanager "cloud.google.com/go/secretmanager/apiv1"
	secretmanagerpb "google.golang.org/genproto/googleapis/cloud/secretmanager/v1"
)

// Secret fetches secrets from remote storage.
type Secret struct {
	client *secretmanager.Client
}

type CloseFn func()

// New creates a new Secret Manager.
func New(ctx context.Context) (*Secret, CloseFn, error) {
	client, err := secretmanager.NewClient(ctx)
	if err != nil {
		log.Fatalf("failed to create secretmanager client: %v", err)
	}
	return &Secret{
		client: client,
	}, func() { client.Close() }, nil
}

// Get fetches a secret with a provided client.
func (s *Secret) Get(ctx context.Context, projectID, name string) string {
	// Build the request.
	req := &secretmanagerpb.AccessSecretVersionRequest{
		Name: fmt.Sprintf("projects/%v/secrets/%v/versions/latest", projectID, name),
	}

	// Call the API.
	result, err := s.client.AccessSecretVersion(ctx, req)
	if err != nil {
		log.Fatalf("unable to access secret with name %v: %v", name, err)
	}
	return string(result.Payload.Data)
}
