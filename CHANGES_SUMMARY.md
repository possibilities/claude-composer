# Summary of Test Updates

## Overview

Updated all test files that referenced the removed danger flags (`dangerously_accept_edit_file_prompts`, `dangerously_accept_create_file_prompts`, `dangerously_accept_bash_command_prompts`, `dangerously_accept_read_files_prompts`, `dangerously_accept_fetch_content_prompts`) to work with the new model where rulesets control acceptance directly.

## Files Updated

### 1. `/test/config/config-validation.test.ts`

- Replaced danger flag tests with `safe` flag validation

### 2. `/test/config/config.test.ts`

- Updated to test loading `safe` setting instead of danger flags
- Modified test for loading all configuration options

### 3. `/test/config/ignore-global-config.test.ts`

- Updated to use rulesets instead of danger flags
- Fixed test expectations to match automatic acceptance warning behavior
- Added proper working directory setup to isolate tests

### 4. `/test/config/project-config.test.ts`

- Replaced danger flag references with `safe` flag
- Fixed YAML formatting for toolsets array
- Added `toolsetNames: []` to skip toolset loading in tests

### 5. `/test/cli/cli.test.ts`

- Removed all danger flag CLI tests
- Added tests for `--safe` flag
- Updated to test ruleset configuration
- Replaced danger flag config tests with safe mode tests

### 6. `/test/integration/bash-command-path-acceptance.test.ts`

- Updated `shouldAcceptPrompt` logic to check `safe` flag instead of danger flags
- All path-based acceptance tests continue to work with rulesets

### 7. `/test/integration/ruleset-pattern-integration.test.ts`

- Updated prompt acceptance logic to respect `safe` flag
- Changed test from "respect global dangerous flag" to "respect safe flag"

### 8. `/test/safety/automatic-acceptance-warnings.test.ts`

- Updated tests to match actual test mode behavior
- Removed tests expecting interactive prompts (which are skipped in test mode)
- Added test for rulesets without acceptance rules

## Additional Changes

### `/src/config/rulesets.ts`

- Added `hasActiveAcceptanceRules()` function to check if any acceptance rules are active

### `/src/safety/checker.ts`

- Updated `handleAutomaticAcceptanceWarning()` to accept `mergedRuleset` parameter
- Added check to only show warning when there are active acceptance rules

### `/src/core/preflight.ts`

- Updated call to `handleAutomaticAcceptanceWarning()` to pass `mergedRuleset`

## Test Results

All 367 tests are now passing with the new ruleset-based acceptance model.
