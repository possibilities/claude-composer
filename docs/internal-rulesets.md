# Internal Rulesets

Pre-configured rulesets that ship with Claude Composer.

## Available Rulesets

### `internal:cautious`

Balanced approach - accepts project operations, confirms global operations.
See [source](../src/internal-rulesets/cautious.yaml)

### `internal:safe`

Maximum safety - requires manual confirmation for every action.
See [source](../src/internal-rulesets/safe.yaml)

### `internal:yolo`

Maximum automation - accepts all prompts without confirmation.
⚠️ **Warning**: Use with extreme caution.
See [source](../src/internal-rulesets/yolo.yaml)

## Usage

```yaml
# In config.yaml
rulesets:
  - internal:cautious
```

```bash
# Via CLI
claude-composer --ruleset internal:cautious
```

## Combining Rulesets

Later rulesets override earlier ones:

```yaml
rulesets:
  - internal:safe # Base safety
  - my-custom-overrides # Apply overrides
```
