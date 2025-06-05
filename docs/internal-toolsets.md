# Internal Toolsets

Claude Composer ships with pre-configured toolsets using the `internal:` prefix.

## Available Internal Toolsets

### `internal:core`

Provides Context7 documentation tools.

See [source](../src/internal-toolsets/core.yaml)

## Usage

```yaml
# In config.yaml
toolsets:
  - internal:core
```

```bash
# Via CLI
claude-composer --toolset internal:core
```
