.PHONY: build-lambda build-scheduler clean

# Build the Lambda binary for ARM64 Linux (required by provided.al2023 runtime)
# The output name 'bootstrap' is required by the AWS Lambda custom runtime.
# The lambda.norpc build tag disables the deprecated RPC handler (recommended for provided.al2023).
build-lambda:
	GOARCH=arm64 GOOS=linux CGO_ENABLED=0 \
	  go build -tags lambda.norpc -o cmd/lambda/bootstrap ./cmd/lambda/

# Build the local scheduler binary (for development with Docker Compose)
build-scheduler:
	go build -o bin/scheduler ./cmd/scheduler/

# SAM shorthand: build + deploy interactively
deploy:
	sam build
	sam deploy --guided

clean:
	rm -f cmd/lambda/bootstrap
	rm -f bin/scheduler
