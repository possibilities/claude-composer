# Toolsets Reference

Toolsets control which tools Claude can use and configure MCP (Model Context Protocol) servers. They provide a flexible way to manage Claude's capabilities on a per-project or global basis.

## What are Toolsets?

Toolsets are YAML files that define:

- **Allowed tools**: Explicit list of tools Claude can use (exclusive)
- **Disallowed tools**: List of tools Claude cannot use (Claude can use any tools except these)
- **MCP servers**: External tool providers via the Model Context Protocol

When multiple toolsets are loaded, their configurations merge intelligently.

## Built-in Toolsets

See [internal-toolsets.md](./internal-toolsets.md) for details on `internal:core`.

## Toolset Syntax

### Basic Structure

```yaml
# Tool permissions (choose one approach)
allowed:
  - Read
  - Write
  - Edit
  - MultiEdit
  - Bash

# OR

disallowed:
  - WebSearch
  - DangerousTool

# MCP server configuration
mcp:
  my-server:
    type: stdio
    command: node
    args:
      - ./path/to/server.js
```

### Tool Permission Models

#### Allowed List (Exclusive)

When you specify `allowed`, ONLY these tools can be used:

```yaml
allowed:
  - Read
  - Write
  - Edit
  - Bash
# Claude can ONLY use these four tools
```

#### Disallowed List (Blocklist)

When you specify `disallowed`, Claude can use any tools EXCEPT these:

```yaml
disallowed:
  - WebSearch
  - WebFetch
# Claude can use all tools except WebSearch and WebFetch
```

**Note**: You cannot use both `allowed` and `disallowed` in the same toolset.

### MCP Server Configuration

MCP servers provide additional tools to Claude:

```yaml
mcp:
  server-name:
    type: stdio # Communication type
    command: npx # Command to run
    args: # Command arguments
      - my-mcp-package
    env: # Optional environment variables
      API_KEY: ${MY_API_KEY}
```

## Creating Custom Toolsets

### File Locations

- **Global toolsets**: `~/.claude-composer/toolsets/*.yaml`
- **Project toolsets**: `.claude-composer/toolsets/*.yaml`

### Example Custom Toolset

```yaml
# dev-tools.yaml
allowed:
  - Read
  - Write
  - Edit
  - MultiEdit
  - Bash

mcp:
  my-server:
    type: stdio
    command: node
    args: [./mcp-server.js]
```

## MCP Server Configuration

MCP servers can use various commands:

- **Node.js**: `command: node`, `args: [./server.js]`
- **NPM packages**: `command: npx`, `args: [-y, '@package/name']`
- **Python**: `command: python`, `args: [-m, mcp_server]`

Use environment variables for secrets: `env: { API_KEY: ${API_KEY} }`

## Using Toolsets

### Via Configuration File

```yaml
# In config.yaml
toolsets:
  - internal:core # Built-in toolset
  - dev-tools # Global custom toolset
  - project:api-tools # Project-specific toolset
```

### Via Command Line

```bash
# Single toolset
claude-composer --toolset internal:core

# Multiple toolsets
claude-composer --toolset internal:core --toolset my-tools

# Project toolset
claude-composer --toolset project:custom-tools
```

### Toolset Prefixes

- `internal:` - Built-in toolsets
- `project:` - Project-specific toolsets
- No prefix - Global custom toolsets

## Toolset Merging

- **Allowed tools**: Combined from all toolsets
- **Disallowed tools**: Combined from all toolsets
- **MCP servers**: Later toolsets override earlier ones for same server name

## Available Tools

- **File Operations**: Read, Write, Edit, MultiEdit
- **File System**: LS, Glob, Grep
- **Task Management**: TodoRead, TodoWrite
- **External**: WebSearch, WebFetch, Bash
- **MCP Tools**: Format `mcp__{server}__{tool}`

## Best Practices

### 1. Start Minimal

Begin with only essential tools:

```yaml
# Start here
allowed:
  - Read
  - Edit
  - LS
# Add as needed
```

### 2. Group Related Tools

Create separate toolsets for different workflows (frontend, backend, docs).

### 3. Use Environment Variables

Keep secrets out of toolsets using `${ENV_VAR}` syntax.

### 4. Test Incrementally

Start with minimal tools and add as needed.

## Troubleshooting

- **Tools not available**: Check toolset loading and allowed/disallowed logic
- **MCP server issues**: Test commands manually, verify PATH
- **Debug**: Run MCP server commands directly to test

## Security Considerations

- **High-risk tools**: Bash, WebFetch, Write - consider disallowing
- **MCP servers**: Validate before adding, use env vars for secrets
- **Project isolation**: Use project-specific toolsets for different access levels

## See Also

- [Configuration Guide](./configuration.md) - Overall configuration
- [Rulesets Reference](./rulesets.md) - Dialog automation rules
- [CLI Reference](./cli-reference.md) - Command-line usage
- [Examples](./examples.md) - Common workflows
