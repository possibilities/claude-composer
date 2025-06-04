# Internal Rulesets

Claude Composer now supports internal rulesets that ship with the CLI. These are pre-configured rulesets that can be referenced using the `internal:` prefix.

## Available Internal Rulesets

### `internal:cautious` (Recommended)

The cautious ruleset provides a balanced approach by automatically accepting project-level prompts while requiring confirmation for global operations.

**Settings:**

- `accept_fetch_content_prompts`: `false`
- `accept_global_*_prompts`: `false` (all global operations require confirmation)
- `accept_project_*_prompts`: `true` (project-level operations are automatically accepted)
- Covers: create file, edit file, read files, and bash commands

This is the recommended ruleset for most users as it allows smooth workflow within your project while maintaining safety for operations outside the project directory.

### `internal:safe`

The safe ruleset denies all automatic prompt acceptances, requiring manual confirmation for every action.

**Settings:**

- All `accept_*_prompts` settings are set to `false`
- Applies to both global and project-level prompts
- Covers: fetch content, create file, edit file, read files, and bash commands

Use this ruleset when you want complete control over every operation.

### `internal:yolo`

The YOLO (You Only Live Once) ruleset automatically accepts all prompts without confirmation.

**Settings:**

- All `accept_*_prompts` settings are set to `true`
- Applies to both global and project-level prompts
- Covers: fetch content, create file, edit file, read files, and bash commands

⚠️ **Warning**: Use `internal:yolo` with extreme caution as it bypasses all safety confirmations.

## Usage

To use an internal ruleset, add it to your `config.yaml` file with the `internal:` prefix:

```yaml
rulesets:
  - internal:cautious # Recommended default
```

You can also use internal rulesets via CLI flags:

```bash
# Recommended: Balance between safety and productivity
claude-composer --ruleset internal:cautious

# Maximum safety: Confirm every operation
claude-composer --ruleset internal:safe

# Automated workflows (use with extreme caution):
claude-composer --ruleset internal:yolo
```

### Using cc-init

The `cc-init` command provides an interactive way to set up your configuration:

```bash
# Create global config with interactive prompts
claude-composer cc-init

# Create project-specific config in current directory
claude-composer cc-init --project

# Skip prompts and use specific ruleset
claude-composer cc-init --use-cautious-ruleset
claude-composer cc-init --use-safe-ruleset
claude-composer cc-init --use-yolo-ruleset
```

## Combining Rulesets

You can combine internal and custom rulesets. Later rulesets override earlier ones:

```yaml
rulesets:
  - internal:safe # Start with safe defaults
  - my-custom-overrides # Apply custom overrides
```

## Implementation Details

Internal rulesets are stored in the `src/internal-rulesets/` directory and are bundled with the CLI during the build process. They follow the same schema as regular ruleset files but are loaded from the application directory instead of the user's configuration directory.
