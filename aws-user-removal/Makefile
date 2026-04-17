.PHONY: build build-all clean help test lint

BINARY_NAME=aws-user-removal
VERSION?=1.0.0
LDFLAGS=-ldflags="-s -w -X main.Version=$(VERSION)"

help:
	@echo "Available targets:"
	@echo "  build          - Build for current platform"
	@echo "  build-all      - Build for all platforms (Linux, macOS, Windows)"
	@echo "  build-linux    - Build for Linux (AMD64, ARM64)"
	@echo "  build-darwin   - Build for macOS (AMD64, ARM64)"
	@echo "  build-windows  - Build for Windows (AMD64)"
	@echo "  clean          - Remove build artifacts"
	@echo "  test           - Run tests"
	@echo "  lint           - Run linter"

build:
	go build $(LDFLAGS) -o $(BINARY_NAME) .

build-all: build-linux build-darwin build-windows

build-linux:
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BINARY_NAME)-linux-amd64 .
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(BINARY_NAME)-linux-arm64 .

build-darwin:
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(BINARY_NAME)-darwin-amd64 .
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(BINARY_NAME)-darwin-arm64 .

build-windows:
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(BINARY_NAME)-windows-amd64.exe .

clean:
	rm -f $(BINARY_NAME) $(BINARY_NAME)-*

test:
	go test -v -race -coverprofile=coverage.txt ./...

lint:
	golangci-lint run ./...

fmt:
	go fmt ./...

vet:
	go vet ./...

deps:
	go mod download
	go mod verify

tidy:
	go mod tidy

