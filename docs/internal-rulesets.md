# Internal Rulesets

Claude Composer now supports internal rulesets that ship with the CLI. These are pre-configured rulesets that can be referenced using the `internal:` prefix.

## Available Internal Rulesets

### `internal:cautious`

The cautious ruleset denies all automatic prompt acceptances, requiring manual confirmation for every action.

**Settings:**

- All `accept_*_prompts` settings are set to `false`
- Applies to both global and project-level prompts
- Covers: fetch content, create file, edit file, read files, and bash commands

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
  - internal:cautious
```

You can also use internal rulesets via CLI flags:

```bash
claude-composer --ruleset internal:cautious
```

For maximum safety:

```bash
claude-composer --ruleset internal:cautious
```

For automated workflows (use with caution):

```bash
claude-composer --ruleset internal:yolo
```

## Combining Rulesets

You can combine internal and custom rulesets. Later rulesets override earlier ones:

```yaml
rulesets:
  - internal:cautious # Start with cautious defaults
  - my-custom-overrides # Apply custom overrides
```

## Implementation Details

Internal rulesets are stored in the `src/internal-rulesets/` directory and are bundled with the CLI during the build process. They follow the same schema as regular ruleset files but are loaded from the application directory instead of the user's configuration directory.
