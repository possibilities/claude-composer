# Toolsets Reference

Toolsets control which tools Claude can use and configure MCP servers.

## Built-in Toolsets

See [internal-toolsets.md](./internal-toolsets.md) for `internal:core`.

## Loading Toolsets

### By Name

```bash
# Internal (built-in)
claude-composer --toolset internal:core

# Global (~/.claude-composer/toolsets/)
claude-composer --toolset my-tools

# Project (.claude-composer/toolsets/)
claude-composer --toolset project:dev-tools
```

### By Path

```bash
# Absolute path
claude-composer --toolset /opt/company/shared-tools.yaml

# Relative path
claude-composer --toolset ./local-tools.yaml

# With environment variables
claude-composer --toolset $CONFIG_DIR/tools.yaml
```

## Toolset Structure

```yaml
# Option 1: Allowed tools (exclusive)
allowed:
  - Read
  - Write
  - Edit
  - Bash

# Option 2: Disallowed tools (blocklist)
disallowed:
  - WebSearch
  - DangerousTool

# MCP servers
mcp:
  my-server:
    type: stdio
    command: node
    args: [./server.js]
```

## Permission Models

### Allowed List

Only specified tools can be used:

```yaml
allowed: [Read, Write, Edit]
```

### Disallowed List

All tools except specified can be used:

```yaml
disallowed: [WebSearch, WebFetch]
```

**Note**: Cannot use both in same toolset.

## MCP Servers

```yaml
mcp:
  server-name:
    type: stdio
    command: npx
    args: [-y, '@package/name']
    env:
      API_KEY: ${MY_API_KEY}
```

## Using Toolsets

### Configuration

```yaml
toolsets:
  - internal:core
  - my-custom
```

### Command Line

```bash
claude-composer --toolset internal:core
claude-composer --toolset internal:core --toolset my-tools
```

## See Also

- [Configuration Guide](./configuration.md)
- [CLI Reference](./cli-reference.md)
