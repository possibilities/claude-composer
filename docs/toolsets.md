# Toolsets Reference

Toolsets control which tools Claude can use and configure MCP (Model Context Protocol) servers. They provide a flexible way to manage Claude's capabilities on a per-project or global basis.

## What are Toolsets?

Toolsets are YAML files that define:

- **Allowed tools**: Explicit list of tools Claude can use (exclusive)
- **Disallowed tools**: List of tools Claude cannot use (Claude can use any tools except these)
- **MCP servers**: External tool providers via the Model Context Protocol

When multiple toolsets are loaded, their configurations merge intelligently.

## Built-in Toolsets

### `internal:core`

Provides access to Context7 documentation tools:

```yaml
mcp:
  context7:
    type: stdio
    command: npx
    args:
      - -y
      - '@upstash/context7-mcp'

allowed:
  - mcp__context7__resolve-library-id
  - mcp__context7__get-library-docs
```

**Use when:**

- Need up-to-date library documentation
- Working with popular frameworks
- Want current API references

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

### Step-by-Step Guide

1. **Create the directory**:

   ```bash
   # For global toolset
   mkdir -p ~/.claude-composer/toolsets

   # For project toolset
   mkdir -p .claude-composer/toolsets
   ```

2. **Create toolset file**:

   ```bash
   touch ~/.claude-composer/toolsets/dev-tools.yaml
   ```

3. **Define toolset**:

   ```yaml
   # Development tools configuration
   allowed:
     - Read
     - Write
     - Edit
     - MultiEdit
     - Bash
     - LS
     - Glob
     - Grep

   mcp:
     # Database tools
     db-tools:
       type: stdio
       command: node
       args:
         - ./tools/db-mcp-server.js
   ```

### Common Patterns

#### Basic Development

```yaml
# basic-dev.yaml
allowed:
  - Read
  - Write
  - Edit
  - MultiEdit
  - LS
  - Glob
  - Grep
```

#### Full Development

```yaml
# full-dev.yaml
allowed:
  - Read
  - Write
  - Edit
  - MultiEdit
  - Bash
  - LS
  - Glob
  - Grep
  - TodoRead
  - TodoWrite
  - WebFetch
```

#### Restricted Environment

```yaml
# restricted.yaml
disallowed:
  - Bash # No command execution
  - WebSearch # No web searching
  - WebFetch # No web fetching
  - Write # No file creation
```

#### Documentation Focus

```yaml
# docs-tools.yaml
allowed:
  - Read
  - Edit
  - MultiEdit
  - LS
  - Glob
  - Grep
  - mcp__context7__resolve-library-id
  - mcp__context7__get-library-docs
```

## MCP Server Examples

### Local MCP Server

```yaml
mcp:
  local-tools:
    type: stdio
    command: node
    args:
      - /path/to/local/mcp-server.js
    env:
      CONFIG_PATH: ./config.json
```

### NPM Package MCP Server

```yaml
mcp:
  npm-tools:
    type: stdio
    command: npx
    args:
      - -y # Auto-install if needed
      - '@company/mcp-tools'
    env:
      API_KEY: ${COMPANY_API_KEY}
```

### Python MCP Server

```yaml
mcp:
  python-tools:
    type: stdio
    command: python
    args:
      - -m
      - mcp_server
      - --config
      - ./mcp-config.json
```

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

When multiple toolsets are specified, they merge according to these rules:

### Allowed Tools Merging

All allowed tools are combined:

```yaml
# Toolset 1
allowed:
  - Read
  - Write

# Toolset 2
allowed:
  - Edit
  - Bash

# Result
allowed:
  - Read
  - Write
  - Edit
  - Bash
```

### Disallowed Tools Merging

All disallowed tools are combined:

```yaml
# Toolset 1
disallowed:
  - WebSearch

# Toolset 2
disallowed:
  - WebFetch

# Result
disallowed:
  - WebSearch
  - WebFetch
```

### MCP Server Merging

Later toolsets override earlier ones for the same server name:

```yaml
# Toolset 1
mcp:
  my-server:
    command: node
    args: [./v1/server.js]

# Toolset 2
mcp:
  my-server:
    command: node
    args: [./v2/server.js]

# Result: v2 server is used
```

## Tool Reference

### File Operations

- `Read` - Read file contents
- `Write` - Create new files
- `Edit` - Modify existing files
- `MultiEdit` - Multiple edits in one operation

### File System

- `LS` - List directory contents
- `Glob` - Find files by pattern
- `Grep` - Search file contents

### Task Management

- `TodoRead` - Read task list
- `TodoWrite` - Manage task list

### External

- `WebSearch` - Search the web
- `WebFetch` - Fetch web content
- `Bash` - Execute shell commands

### MCP Tools

MCP tools follow the pattern: `mcp__{server}__{tool}`

Example: `mcp__context7__get-library-docs`

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

Create toolsets for specific workflows:

```yaml
# frontend-tools.yaml
allowed:
  - Read
  - Write
  - Edit
  - MultiEdit
  - WebFetch  # For API testing

# backend-tools.yaml
allowed:
  - Read
  - Write
  - Edit
  - Bash      # For database operations
```

### 3. Document MCP Servers

Add comments explaining MCP server purposes:

```yaml
mcp:
  # Provides database introspection and query tools
  db-tools:
    type: stdio
    command: npx
    args: ['@company/db-mcp']

  # Adds deployment and infrastructure commands
  deploy-tools:
    type: stdio
    command: ./tools/deploy-mcp
```

### 4. Use Environment Variables

Keep sensitive data out of toolsets:

```yaml
mcp:
  api-tools:
    type: stdio
    command: node
    args: [./api-server.js]
    env:
      API_KEY: ${API_KEY} # Set in environment
      API_URL: ${API_URL}
```

### 5. Test Incrementally

1. Start with allowed list of basic tools
2. Add tools as you need them
3. Test each addition
4. Document why each tool is needed

## Troubleshooting

### Tools Not Available

1. **Check toolset is loaded**:

   ```bash
   claude-composer --toolset my-toolset
   ```

2. **Verify allowed/disallowed logic**:

   - If using `allowed`, tool must be in list
   - If using `disallowed`, tool must NOT be in list

3. **Check MCP server started**:
   - Look for server startup messages
   - Verify command and args are correct

### MCP Server Issues

1. **Server not starting**:

   - Check command exists in PATH
   - Verify args are correct
   - Test command manually

2. **Tools not appearing**:
   - Ensure server provides expected tools
   - Check tool names match pattern
   - Verify no conflicts with allowed/disallowed

### Debugging MCP Servers

Test MCP server manually:

```bash
# Test command from toolset
node ./path/to/mcp-server.js

# Check if npx package works
npx -y @company/mcp-package
```

## Security Considerations

### Tool Restrictions

Always consider security when allowing tools:

```yaml
# High risk tools
disallowed:
  - Bash # Can execute any command
  - WebFetch # Can access any URL
  - Write # Can create any file
```

### MCP Server Security

1. **Validate MCP servers** before adding
2. **Use environment variables** for secrets
3. **Restrict file access** in server configs
4. **Review third-party** MCP packages

### Project Isolation

Use project-specific toolsets for isolation:

```yaml
# Project A - full access
allowed: [Read, Write, Edit, Bash]

# Project B - read only
allowed: [Read, LS, Glob, Grep]
```

## Advanced Patterns

### Progressive Enhancement

Start restrictive and add capabilities:

```yaml
# Stage 1: Reading only
allowed: [Read, LS, Glob, Grep]

# Stage 2: Add editing
allowed: [Read, LS, Glob, Grep, Edit, MultiEdit]

# Stage 3: Add creation
allowed: [Read, LS, Glob, Grep, Edit, MultiEdit, Write]
```

### Environment-Specific Toolsets

Different toolsets for different environments:

```bash
# Development
claude-composer --toolset dev-full

# Staging
claude-composer --toolset staging-restricted

# Production
claude-composer --toolset prod-readonly
```

### Toolset Composition

Build complex toolsets from simple ones:

```yaml
# base-tools.yaml
allowed: [Read, LS, Glob, Grep]

# edit-tools.yaml
allowed: [Edit, MultiEdit]

# create-tools.yaml
allowed: [Write]

# In config.yaml - compose them
toolsets:
  - base-tools
  - edit-tools
  - create-tools  # Full access through composition
```

## See Also

- [Configuration Guide](./configuration.md) - Overall configuration
- [Rulesets Reference](./rulesets.md) - Dialog automation rules
- [CLI Reference](./cli-reference.md) - Command-line usage
- [Examples](./examples.md) - Common workflows
