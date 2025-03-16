##
## * Database Specific Targets

## make db-run; - starts the db configuration
.PHONY: db-run
db-run:
	yarn run supabase:start

## make db-kill; - stops the current local db config
.PHONY: db-kill
db-kill:
	yarn run supabase:stop

## make db-add-migrations; - create migration file based on current db config.
.PHONY: db-add-migrations
db-add-migrations:
	@(./scripts/db createMigration)

## make db-reset; - reset db migrations in db to previous migration version
.PHONY: db-reset
db-reset:
	yarn run supabase:reset

## make db-gen-types; - generate types based on current db configuration. we do not need to commit these since we can generate these
.PHONY: db-gen-types
db-gen-types:
	@(mkdir -p $(COMMON_DIR)/lib/db && npx supabase gen types typescript --local > $(COMMON_DIR)/lib/db/database.types.ts)

## make db-push; - push and apply local database migrations to db database
.PHONY: db-push
db-push:
	@(yarn run supabase:push)

.PHONY: db-upgrade
db-upgrade:
	yarn run supabase:upgrade
