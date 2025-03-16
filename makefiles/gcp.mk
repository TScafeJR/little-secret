##
## * GCP Targets

## make gcp-login; - login to gcp account
.PHONY: gcp-login
gcp-login:
	gcloud auth application-default login

.PHONY: gcp-config
gcp-config:
	gcloud config set project pro-juice
	gcloud config set run/region us-east1
