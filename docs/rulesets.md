# Rulesets Reference

Rulesets control which permission dialogs are automatically accepted or rejected in Claude Composer. They provide fine-grained control over Claude Code's interactions with your system.

## What are Rulesets?

Rulesets are YAML files that define rules for automatic dialog handling. They allow you to:

- Automatically accept or reject permission dialogs
- Define path-based rules for file and directory operations
- Filter commands based on patterns
- Control web request permissions by domain

## Built-in Rulesets

See [internal-rulesets.md](./internal-rulesets.md) for details on:

- `internal:safe` - Maximum security
- `internal:cautious` - Balanced approach (recommended)
- `internal:yolo` - Maximum automation (⚠️ use with caution)

## Ruleset Syntax

### Basic Structure

```yaml
name: my-ruleset
description: Custom ruleset for my workflow

# Simple boolean rules
accept_project_edit_file_prompts: true
accept_project_bash_command_prompts: false

# Rules with path filters
accept_project_create_file_prompts:
  paths:
    - 'src/**'
    - 'test/**'
    - '!**/*.secret'

# Rules with domain filters
accept_fetch_content_prompts:
  domains:
    - 'github.com'
    - 'docs.*.com'
    - '*.mydomain.com'
```

### Rule Types

#### File Operation Rules

Control file creation, editing, and reading:

```yaml
# Project-level file operations
accept_project_create_file_prompts: true
accept_project_edit_file_prompts: true
accept_project_read_files_prompts: true

# Global file operations
accept_global_create_file_prompts: false
accept_global_edit_file_prompts: false
accept_global_read_files_prompts: false
```

#### Command Execution Rules

Control bash command execution:

```yaml
# Simple boolean
accept_project_bash_command_prompts: true

# With path filters (matches command working directory)
accept_project_bash_command_prompts:
  paths:
    - 'scripts/**'
    - 'tools/**'
```

#### Web Request Rules

Control fetching content from URLs:

```yaml
# Simple boolean
accept_fetch_content_prompts: true

# With domain filters
accept_fetch_content_prompts:
  domains:
    - 'github.com'
    - '*.githubusercontent.com'
    - 'docs.*.com'
```

## Path Pattern Matching

Path patterns use glob syntax with additional features:

### Basic Patterns

- `*` - Matches any characters except path separator
- `**` - Matches any characters including path separators
- `?` - Matches single character
- `[abc]` - Matches any character in brackets
- `{a,b}` - Matches any of the comma-separated patterns

### Exclusion Patterns

Use `!` prefix to exclude paths:

```yaml
accept_project_edit_file_prompts:
  paths:
    # Include all source files
    - 'src/**'

    # But exclude secrets
    - '!**/*.secret'
    - '!**/*.key'
    - '!**/credentials/**'
```

## Domain Pattern Matching

Domain patterns support wildcards for flexible matching:

### Pattern Types

- Exact match: `github.com`
- Subdomain wildcard: `*.github.com`
- Domain part wildcard: `docs.*.com`
- Full wildcard: `*`

### Examples

```yaml
accept_fetch_content_prompts:
  domains:
    # Exact domain
    - 'github.com'

    # All subdomains
    - '*.github.com'
    - '*.githubusercontent.com'

    # Pattern matching
    - 'docs.*.com'
    - '*.docs.com'
    - 'api.*.dev'
```

## Creating Custom Rulesets

### File Locations

- **Global rulesets**: `~/.claude-composer/rulesets/*.yaml`
- **Project rulesets**: `.claude-composer/rulesets/*.yaml`

### Example Custom Ruleset

```yaml
name: my-ruleset
description: Custom ruleset for my workflow

# Accept project file edits with path restrictions
accept_project_edit_file_prompts:
  paths:
    - 'src/**'
    - 'test/**'
    - '!**/*.secret'

# Control web requests by domain
accept_fetch_content_prompts:
  domains:
    - 'github.com'
    - '*.mydomain.com'
```

## Using Rulesets

### Via Configuration File

```yaml
# In config.yaml
rulesets:
  - internal:cautious
  - frontend-dev # Global custom ruleset
  - project:overrides # Project-specific ruleset
```

### Via Command Line

```bash
# Single ruleset
claude-composer --ruleset internal:cautious

# Multiple rulesets (later overrides earlier)
claude-composer --ruleset internal:safe --ruleset my-overrides

# Project ruleset
claude-composer --ruleset project:custom
```

### Ruleset Prefixes

- `internal:` - Built-in rulesets
- `project:` - Project-specific rulesets
- No prefix - Global custom rulesets

## Ruleset Chaining and Precedence

When multiple rulesets are specified, they are applied in order with later rulesets overriding earlier ones.

### Example

```yaml
# config.yaml
rulesets:
  - internal:safe # Start with maximum safety
  - common-overrides # Apply common relaxations
  - project:specific # Apply project-specific rules
```

### Merging Behavior

1. **Boolean values**: Later ruleset overrides
2. **Path arrays**: Later ruleset replaces entirely
3. **Domain arrays**: Later ruleset replaces entirely

## Best Practices

### 1. Start with Built-in Rulesets

Begin with an internal ruleset and override specific behaviors:

```yaml
rulesets:
  - internal:cautious
  - my-customizations
```

### 2. Use Descriptive Names

Name rulesets by their purpose:

- `frontend-dev`
- `backend-api`
- `documentation`
- `ci-automation`

### 3. Test Incrementally

Start with `internal:safe` and gradually add permissions as needed.

### 4. Separate Concerns

Create focused rulesets for different aspects (file operations, commands, web requests).

## Troubleshooting

- **Rules not working**: Check YAML syntax and ruleset loading order
- **Unexpected acceptances**: Later rulesets override earlier ones
- **Debug patterns**: Use `--log-all-pattern-matches` to see matches

## Security Considerations

### Path Traversal

Be careful with patterns that might match outside project:

```yaml
# Dangerous - could match parent directories
accept_project_edit_file_prompts:
  paths:
    - '../**' # Don't do this!
```

Always exclude sensitive files (`*.env`, `*.key`, `secrets/`) and be specific about command execution paths.

## See Also

- [Configuration Guide](./configuration.md) - Overall configuration
- [Toolsets Reference](./toolsets.md) - Tool permissions
- [CLI Reference](./cli-reference.md) - Command-line usage
- [Examples](./examples.md) - Common workflows
