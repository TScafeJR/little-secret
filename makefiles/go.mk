GO_SRC_PATHS=./internal/... ./...
GO_SRC_DIR=./internal

##
## * Go Specific Targets

## make go-install; - install go dependencies
.PHONY: go-install
go-install:
	go get $(GO_SRC_PATHS)

.PHONY: go-gen
go-gen: yarn-gen
	go generate $(GO_SRC_PATHS)

## make go-clean; - clean go config
.PHONY: go-clean
go-clean:
	go mod tidy -v && go clean $(GO_SRC_PATHS) && go clean -modcache

## make go-fmt; - format go files
.PHONY: go-fmt
go-fmt:
	go fmt $(GO_SRC_PATHS)

## make go-fmt-check; - check go code format
.PHONY: go-fmt-check
go-fmt-check:
	test -z $(shell go fmt $(GO_SRC_PATHS))

## make go-lint; - conform go code to format
.PHONY: go-lint
go-lint:
	staticcheck -f=stylish $(GO_SRC_PATHS)

## make go-lint-check; - check if go code conforms to format
.PHONY: go-lint-check
go-lint-check:
	test -z $(shell staticcheck $(GO_SRC_PATHS))

## make go-build-srv; - build go srv binary
.PHONY: go-build-srv
go-build-srv:
	@go build --buildvcs=false ./cmd/srv

## make go-build-cli; - build go cli binary
.PHONY: go-build-cli
go-build-cli:
	@go build --buildvcs=false ./cmd/cli

## make go-srv; - run the go server
.PHONY: go-srv
go-srv:
	@scripts/with-env .env-local go run cmd/cli/main.go srv local

## make go-debug; - run the debug server
.PHONY: go-debug
go-debug:
	@scripts/with-env .env-local dlv debug cmd/cli/main.go srv local

## make go-srv-debug; - run the go server with the ability to query grpc server with grpc-web disabled
.PHONY: go-srv-debug
go-srv-debug:
	@DISABLE_GRPC_WEB_PROXY=true scripts/with-env .env-local 'go run cmd/cli/main.go srv local'

## make go-docs; - run go docs server
.PHONY: go-docs
go-docs:
	cd $(GO_SRC_DIR) && godoc -http=:6060

.PHONY: go-test
go-test:
	go test -v $(GO_SRC_PATHS)
