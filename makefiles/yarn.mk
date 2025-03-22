##
## * Yarn Specific Targets

## make yarn-fmt; - apply yarn formatting
.PHONY: yarn-fmt
yarn-fmt:
	yarn fmt

.PHONY: yarn-gen
yarn-gen:
	yarn run transform

.PHONY: yarn-dev
yarn-dev:
	yarn dev

.PHONY: yarn-install
yarn-install:
	yarn install

.PHONY: yarn-test
yarn-test:
	yarn test
