.PHONY: docker-run
docker-run:
	docker compose up -d

.PHONY: docker-kill
docker-kill:
	docker compose down

.PHONY: docker-update
docker-update:
	docker compose down
	docker compose rm -f
	docker image prune -f
	docker compose pull
	docker compose up -d

