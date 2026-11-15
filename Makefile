.PHONY: all build test lint format smoke preview

all: lint test build smoke

build:
	npm run build

test:
	npm test

lint:
	npm run lint

format:
	npm run format

smoke:
	node scripts/smoke.mjs $(TARGET)

preview:
	npm run preview

