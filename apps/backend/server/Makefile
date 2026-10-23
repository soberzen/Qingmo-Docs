APP_ENV ?= production
export APP_ENV

BINARY := dist/server
APP_PACKAGE := ./cmd/server
COMPOSE_FLAGS = --env-file ".env.${APP_ENV}" -p "qingmo-${APP_ENV}"

.PHONY: all build run dev prod test docker-run docker-down clean

all: build

build:
	@echo "📦 Building $(BINARY)..."
	@mkdir -p $(dir $(BINARY))
	@go build -o $(BINARY) $(APP_PACKAGE)

run: build
	@echo "🚀 Running in $(APP_ENV) mode..."
	@APP_ENV=$(APP_ENV) ./$(BINARY)

dev:
	@echo "🚀 Running in development mode..."
	@APP_ENV=development go run $(APP_PACKAGE)

prod: build
	@echo "🚀 Running in production mode..."
	@APP_ENV=production ./$(BINARY)

test:
	@echo "🧪 Running tests..."
	@APP_ENV=test go test -v ./...

docker-run:
	@if docker compose version >/dev/null 2>&1; then \
		docker compose -f docker-compose.yml $(COMPOSE_FLAGS) up --build; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		echo "Using Docker Compose V1"; \
		docker-compose -f docker-compose.yml $(COMPOSE_FLAGS) up --build; \
	else \
		echo "error: please ensure Docker Compose is installed"; \
		exit 1; \
	fi

docker-down:
	@if docker compose version >/dev/null 2>&1; then \
		docker compose -f docker-compose.yml $(COMPOSE_FLAGS) down; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		echo "Using Docker Compose V1"; \
		docker-compose -f docker-compose.yml $(COMPOSE_FLAGS) down; \
	else \
		echo "error: please ensure Docker Compose is installed"; \
		exit 1; \
	fi

clean:
	@echo "Cleaning..."
	@rm -rf dist
