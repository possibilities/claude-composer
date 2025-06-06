# Internal Toolsets

Pre-configured toolsets shipped with Claude Composer.

## Available Toolsets

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
