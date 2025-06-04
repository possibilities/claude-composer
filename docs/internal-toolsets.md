# Internal Toolsets

Claude Composer now supports internal toolsets that ship with the CLI. These are pre-configured toolsets that can be referenced using the `internal:` prefix.

## Available Internal Toolsets

### `internal:core`

The core toolset provides access to Context7 MCP tools for resolving and fetching library documentation.

**Included tools:**

- `mcp__context7__resolve-library-id` - Resolves library names to Context7-compatible IDs
- `mcp__context7__get-library-docs` - Fetches documentation for libraries

**MCP Server:**

- Context7 MCP server via `npx -y @upstash/context7-mcp`

## Usage

To use an internal toolset, add it to your `config.yaml` file with the `internal:` prefix:

```yaml
toolsets:
  - internal:core
```

You can mix internal and custom toolsets:

```yaml
toolsets:
  - internal:core
  - my-custom-toolset
```

## Implementation Details

Internal toolsets are stored in the `src/internal-toolsets/` directory and are bundled with the CLI during the build process. They follow the same schema as regular toolset files but are loaded from the application directory instead of the user's configuration directory.

You can also use internal toolsets via CLI flags:

```bash
claude-composer --toolset internal:core
```
