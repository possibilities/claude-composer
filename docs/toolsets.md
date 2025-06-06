# Toolsets Reference

Toolsets control which tools Claude can use and configure MCP servers.

## Built-in Toolsets

See [internal-toolsets.md](./internal-toolsets.md) for `internal:core`.

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

## File Locations

- **Global**: `~/.claude-composer/toolsets/*.yaml`
- **Project**: `.claude-composer/toolsets/*.yaml`

## Available Tools

- **Files**: Read, Write, Edit, MultiEdit
- **System**: LS, Glob, Grep, Bash
- **Tasks**: TodoRead, TodoWrite
- **Web**: WebSearch, WebFetch
- **MCP**: Format `mcp__{server}__{tool}`

## Best Practices

1. Start minimal with essential tools
2. Group tools by workflow (frontend, backend)
3. Use environment variables for secrets
4. Test incrementally

## Security

- Consider disallowing: Bash, WebFetch, Write
- Validate MCP servers before adding
- Use project toolsets for isolation

## See Also

- [Configuration Guide](./configuration.md)
- [Rulesets Reference](./rulesets.md)
- [CLI Reference](./cli-reference.md)
