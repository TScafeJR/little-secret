package secrets

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log"

	secretmanager "cloud.google.com/go/secretmanager/apiv1"
	"github.com/TScafeJR/little-secret/cmd/cli/common"
	"github.com/urfave/cli/v2"
	"google.golang.org/api/iterator"
	secretmanagerpb "google.golang.org/genproto/googleapis/cloud/secretmanager/v1"
)

var listSecretsCommand = &cli.Command{
	Name:   "list",
	Usage:  "For listing all secrets in a gcloud environment",
	Action: listSecrets,
}

func parseSecretName(name string) (string, error) {
	var secretNameStr = `projects\/(?P<Project>.*)\/secrets\/(?P<Secret>.*)`
	regexMap := common.GetRegexParams(secretNameStr, name)
	if val, ok := regexMap["Secret"]; ok {
		return val, nil
	}
	return "", fmt.Errorf("secret is not in correct format")
}

func listSecrets(c *cli.Context) error {
	gcloudProjectId := c.String("project_id")
	ctx := context.Background()

	client, err := secretmanager.NewClient(ctx)
	if err != nil {
		log.Fatalf("failed to setup client: %v", err)
	}
	defer client.Close()

	req := &secretmanagerpb.ListSecretsRequest{
		Parent: fmt.Sprintf("projects/%s", gcloudProjectId),
	}
	it := client.ListSecrets(ctx, req)
	var buffer bytes.Buffer
	for {
		resp, err := it.Next()
		if errors.Is(err, iterator.Done) {
			break
		}
		if err != nil {
			return err
		}

		secretName, err := parseSecretName(resp.Name)
		if err != nil {
			return err
		}

		secretReq := &secretmanagerpb.AccessSecretVersionRequest{
			Name: fmt.Sprintf("%s/versions/latest", resp.Name),
		}
		secretResp, err := client.AccessSecretVersion(ctx, secretReq)

		if err != nil {
			return err
		}

		secretLine := fmt.Sprintf("%s=%s\n", secretName, secretResp.Payload.Data)
		buffer.WriteString(secretLine)
	}

	fmt.Printf("%s", buffer.String())
	return nil
}
