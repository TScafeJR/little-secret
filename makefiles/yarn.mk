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
	yarn playwright test src/tests/user-journey.spec.ts --reporter=list

## make yarn-test-e2e-external; - E2E without Playwright starting Vite (run `make yarn-dev` in another shell first, then this)
.PHONY: yarn-test-e2e-external
yarn-test-e2e-external:
	PLAYWRIGHT_SKIP_WEB_SERVER=1 yarn test

## make yarn-test-e2e; - run Playwright E2E (src/tests)
.PHONY: yarn-test-e2e
yarn-test-e2e:
	yarn test:e2e

## make yarn-test-journey; - run user journey spec only
.PHONY: yarn-test-journey
yarn-test-journey:
	yarn test:e2e:journey

.PHONY: yarn-test-ui
yarn-test-ui:
	yarn test:ui

.PHONY: yarn-storybook
yarn-storybook:
	yarn run storybook

.PHONY: yarn-clean
yarn-clean:
	yarn run clean
