##
## * GCP Targets
##
## Prod deploy target: Cloud Run single-instance service at
##   https://little-secret.scafejr.me
## Backend and frontend are packaged into one container
## (see docker/production.Dockerfile). Rooms are in-memory so we pin
## --max-instances=1; crash recovery replays from ls_game_events in the DB.

GCP_PROJECT      := deft-ellipse-183820
GCP_REGION       := us-east1
AR_REPO          := little-secret
AR_IMAGE         := us-east1-docker.pkg.dev/$(GCP_PROJECT)/$(AR_REPO)/little-secret
GIT_SHA          := $(shell git rev-parse --short HEAD)
CR_SERVICE       := little-secret

## make gcp-login; - login to gcp account (application-default creds)
.PHONY: gcp-login
gcp-login:
	gcloud auth application-default login

## make gcp-config; - set the active project + region for gcloud
.PHONY: gcp-config
gcp-config:
	gcloud config set project $(GCP_PROJECT)
	gcloud config set run/region $(GCP_REGION)

## make gcp-ar-create; - create Artifact Registry Docker repo (one-time)
.PHONY: gcp-ar-create
gcp-ar-create:
	gcloud artifacts repositories create $(AR_REPO) \
		--repository-format=docker \
		--location=$(GCP_REGION) \
		--project=$(GCP_PROJECT)

## make gcp-docker-auth; - configure local Docker to push to Artifact Registry
.PHONY: gcp-docker-auth
gcp-docker-auth:
	gcloud auth configure-docker $(GCP_REGION)-docker.pkg.dev

## make gcp-build; - build the production image (multi-stage: vite + go + alpine)
.PHONY: gcp-build
gcp-build:
	docker build \
		-f docker/production.Dockerfile \
		-t $(AR_IMAGE):latest \
		-t $(AR_IMAGE):$(GIT_SHA) \
		.

## make gcp-push; - push the image to Artifact Registry (latest + git SHA)
.PHONY: gcp-push
gcp-push:
	docker push $(AR_IMAGE):latest
	docker push $(AR_IMAGE):$(GIT_SHA)

## make gcp-deploy; - deploy to Cloud Run (single instance, WS enabled)
## POSTGRES_URL is pulled from Secret Manager (shared with the atlas project
## per user direction; little-secret tables are ls_-prefixed to stay isolated).
## GOOGLE_CLOUD_PROJECT is required by cmd/srv/main.go for Secret Manager init.
.PHONY: gcp-deploy
gcp-deploy:
	gcloud run deploy $(CR_SERVICE) \
		--image $(AR_IMAGE):latest \
		--region $(GCP_REGION) \
		--project $(GCP_PROJECT) \
		--platform managed \
		--allow-unauthenticated \
		--port 8080 \
		--min-instances=0 \
		--max-instances=1 \
		--timeout=3600 \
		--session-affinity \
		--set-secrets=POSTGRES_URL=POSTGRES_URL:latest \
		--set-env-vars=GOOGLE_CLOUD_PROJECT=$(GCP_PROJECT) \
		--ingress=all

## make gcp-ship; - build, push, and deploy in one shot
.PHONY: gcp-ship
gcp-ship: gcp-build gcp-push gcp-deploy

# ── Cloud Scheduler keepalive ───────────────────────────────────────────────
# Cloud Run scales to zero after ~15 min idle. The scheduler pings /healthz
# every 5 min so the first player of the day doesn't eat a cold start.

CR_URL        := $(shell gcloud run services describe $(CR_SERVICE) --region=$(GCP_REGION) --project=$(GCP_PROJECT) --format="value(status.url)" 2>/dev/null)
SCHEDULER_JOB := $(CR_SERVICE)-keepalive

## make gcp-keepalive-create; - create scheduler job pinging /healthz every 5 min
.PHONY: gcp-keepalive-create
gcp-keepalive-create:
	gcloud scheduler jobs create http $(SCHEDULER_JOB) \
		--location=$(GCP_REGION) \
		--schedule="*/5 * * * *" \
		--uri="$(CR_URL)/healthz" \
		--http-method=GET \
		--attempt-deadline=30s \
		--description="Keepalive ping for little-secret backend"

## make gcp-keepalive-pause; - pause the keepalive scheduler
.PHONY: gcp-keepalive-pause
gcp-keepalive-pause:
	gcloud scheduler jobs pause $(SCHEDULER_JOB) --location=$(GCP_REGION)

## make gcp-keepalive-resume; - resume the keepalive scheduler
.PHONY: gcp-keepalive-resume
gcp-keepalive-resume:
	gcloud scheduler jobs resume $(SCHEDULER_JOB) --location=$(GCP_REGION)

## make gcp-keepalive-delete; - delete the keepalive scheduler job
.PHONY: gcp-keepalive-delete
gcp-keepalive-delete:
	gcloud scheduler jobs delete $(SCHEDULER_JOB) --location=$(GCP_REGION)

## make gcp-keepalive-status; - show keepalive scheduler job status
.PHONY: gcp-keepalive-status
gcp-keepalive-status:
	gcloud scheduler jobs describe $(SCHEDULER_JOB) --location=$(GCP_REGION)

## make gcp-keepalive-run; - trigger the keepalive job immediately
.PHONY: gcp-keepalive-run
gcp-keepalive-run:
	gcloud scheduler jobs run $(SCHEDULER_JOB) --location=$(GCP_REGION)
