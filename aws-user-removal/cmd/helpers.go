package cmd

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"strings"
)

func validateInputs() error {
	if username == "" {
		return fmt.Errorf("username is required (use -u or --username)")
	}
	if len(accounts) == 0 {
		return fmt.Errorf("at least one account is required (use -a or --accounts)")
	}
	return nil
}

func validateDateFormat(date string) error {
	matched, err := regexp.MatchString(`^\d{8}$`, date)
	if err != nil || !matched {
		return fmt.Errorf("invalid date format: %s. Use YYYYMMDD format (e.g., 20251120)", date)
	}
	return nil
}

func confirmAction(action string) bool {
	fmt.Printf("\n⚠️  WARNING: This will %s user '%s' from the following accounts:\n", action, username)
	for _, account := range accounts {
		fmt.Printf("  - %s\n", account)
	}
	fmt.Printf("\n⚠️  This action CANNOT be undone!\n\n")

	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Are you sure you want to continue? (type 'DELETE' to confirm): ")
	input, _ := reader.ReadString('\n')
	input = strings.TrimSpace(input)

	return input == "DELETE"
}

