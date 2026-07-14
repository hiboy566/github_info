package main

import "testing"

func TestValidatePreviewDatabaseName(t *testing.T) {
	t.Parallel()

	valid := []string{
		"personal_info_pr_1",
		"personal_info_pr_12345",
	}
	for _, name := range valid {
		if err := validatePreviewDatabaseName(name); err != nil {
			t.Errorf("expected %q to be valid: %v", name, err)
		}
	}

	invalid := []string{
		"",
		"personal_info",
		"database_github_info",
		"personal_info_pr_main",
		"personal_info_pr_1; DROP DATABASE postgres",
	}
	for _, name := range invalid {
		if err := validatePreviewDatabaseName(name); err == nil {
			t.Errorf("expected %q to be rejected", name)
		}
	}
}
