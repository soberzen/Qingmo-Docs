APP_ENV ?= production
export APP_ENV

BINARY := dist/server
APP_PACKAGE := ./cmd/server

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
	@if docker compose up --build 2>/dev/null; then \
		:; \
	else \
		echo "Falling back to Docker Compose V1"; \
		docker-compose up --build; \
	fi

docker-down:
	@if docker compose down 2>/dev/null; then \
		:; \
	else \
		echo "Falling back to Docker Compose V1"; \
		docker-compose down; \
	fi

clean:
	@echo "Cleaning..."
	@rm -rf dist
