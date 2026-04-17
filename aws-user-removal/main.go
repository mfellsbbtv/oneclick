package main

import (
	"context"
	"fmt"
	"os"

	"github.com/bbtv/rhei-iac-tools/aws-user-removal/cmd"
)

func main() {
	ctx := context.Background()
	if err := cmd.Execute(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

