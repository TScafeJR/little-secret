##
## * Help
## make; - show help
help:
	@make --no-print-directory show-help
show-help:
	@./scripts/fmt-make-help Makefile makefiles/* | column -s ';' -t
	@echo

##
## * General Targets

## make install; - install project dependencies
.PHONY: install
install: go-install yarn-install

## make clean; - clean project state
.PHONY: clean
clean: go-clean

## make lint; - run linters for protoc, go, and web
.PHONY: lint
lint: go-lint 

## make lint-check; - run lint checkers for protoc, go, and web
.PHONY: lint-check
lint-check: go-lint-check

## make go-fmt; - run project linters
.PHONY: fix
fix: go-fmt yarn-fmt

## make fmt; - run go and web formatters
.PHONY: fmt
fmt: fix

## make fmt-check; - check project format
.PHONY: fmt-check
fmt-check: go-fmt-check

## make test; - run project tests
.PHONY: test
test: go-test yarn-test

.PHONY: update-companies
update-companies:
	@./scripts/update-companies

.PHONY: build
build:
	@./scripts/build

## make help; - show make help
.PHONY: help show-help

include makefiles/*.mk
