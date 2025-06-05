# Rulesets Reference

Rulesets control which permission dialogs are automatically accepted or rejected in Claude Composer. They provide fine-grained control over Claude Code's interactions with your system.

## What are Rulesets?

Rulesets are YAML files that define rules for automatic dialog handling. They allow you to:

- Automatically accept or reject permission dialogs
- Define path-based rules for file and directory operations
- Filter commands based on patterns
- Control web request permissions by domain

## Built-in Rulesets

Claude Composer includes three internal rulesets that cover common use cases:

### `internal:safe`

Maximum security - all dialogs require manual confirmation.

```yaml
# All operations require manual confirmation
accept_fetch_content_prompts: false
accept_global_bash_command_prompts: false
accept_global_create_file_prompts: false
accept_global_edit_file_prompts: false
accept_global_read_files_prompts: false
accept_project_bash_command_prompts: false
accept_project_create_file_prompts: false
accept_project_edit_file_prompts: false
accept_project_read_files_prompts: false
```

**Use when:**

- Working with sensitive data
- Learning Claude Composer
- Maximum control is required

### `internal:cautious` (Recommended)

Balanced approach - automatically accepts project-level operations while requiring confirmation for global operations.

```yaml
# Project operations are automatic, global require confirmation
accept_fetch_content_prompts: false
accept_global_bash_command_prompts: false
accept_global_create_file_prompts: false
accept_global_edit_file_prompts: false
accept_global_read_files_prompts: false
accept_project_bash_command_prompts: true
accept_project_create_file_prompts: true
accept_project_edit_file_prompts: true
accept_project_read_files_prompts: true
```

**Use when:**

- Normal development workflow
- Want automation within project boundaries
- Need safety for system-wide operations

### `internal:yolo`

Maximum automation - accepts all operations without confirmation.

```yaml
# All operations are automatic
accept_fetch_content_prompts: true
accept_global_bash_command_prompts: true
accept_global_create_file_prompts: true
accept_global_edit_file_prompts: true
accept_global_read_files_prompts: true
accept_project_bash_command_prompts: true
accept_project_create_file_prompts: true
accept_project_edit_file_prompts: true
accept_project_read_files_prompts: true
```

**Use when:**

- Fully automated workflows
- Complete trust in operations
- CI/CD environments (with caution)

⚠️ **Warning**: Use `internal:yolo` with extreme caution as it bypasses all safety confirmations.

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

### Examples

```yaml
accept_project_edit_file_prompts:
  paths:
    # Match all JavaScript files
    - '**/*.js'

    # Match TypeScript files in src
    - 'src/**/*.ts'

    # Match test files
    - '**/*.test.js'
    - '**/*.spec.js'

    # Match specific directories
    - 'docs/**'
    - 'scripts/**'
```

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

### Step-by-Step Guide

1. **Create the directory**:

   ```bash
   # For global ruleset
   mkdir -p ~/.claude-composer/rulesets

   # For project ruleset
   mkdir -p .claude-composer/rulesets
   ```

2. **Create ruleset file**:

   ```bash
   # Create frontend-dev.yaml
   touch ~/.claude-composer/rulesets/frontend-dev.yaml
   ```

3. **Define rules**:

   ```yaml
   name: frontend-dev
   description: Rules for frontend development

   # Accept project operations with restrictions
   accept_project_edit_file_prompts:
     paths:
       - 'src/**/*.{js,jsx,ts,tsx}'
       - 'styles/**/*.{css,scss}'
       - 'public/**'
       - '!**/*.env*'

   accept_project_create_file_prompts:
     paths:
       - 'src/components/**'
       - 'src/pages/**'
       - 'tests/**'

   accept_project_bash_command_prompts:
     paths:
       - 'package.json' # npm scripts
       - 'scripts/**' # build scripts

   # Be careful with web requests
   accept_fetch_content_prompts:
     domains:
       - 'npmjs.com'
       - 'github.com'
       - 'developer.mozilla.org'
   ```

### Common Patterns

#### Backend Development

```yaml
name: backend-dev
description: Rules for backend development

accept_project_edit_file_prompts:
  paths:
    - 'src/**/*.{js,ts,py,go}'
    - 'test/**'
    - 'migrations/**'
    - '!**/*.env*'
    - '!**/secrets/**'

accept_project_bash_command_prompts:
  paths:
    - 'scripts/db/**'
    - 'scripts/deploy/**'
    - 'Makefile'
```

#### Documentation

```yaml
name: docs
description: Rules for documentation work

accept_project_edit_file_prompts:
  paths:
    - '**/*.md'
    - 'docs/**'
    - 'README*'
    - 'LICENSE*'

accept_project_create_file_prompts:
  paths:
    - 'docs/**'
    - 'examples/**'
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

### Override Example

```yaml
# First ruleset (internal:cautious)
accept_project_edit_file_prompts: true

# Second ruleset (my-overrides)
accept_project_edit_file_prompts:
  paths:
    - 'src/**'
    - '!src/generated/**'

# Result: Edit prompts accepted only for src/** excluding generated
```

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

### 3. Document Path Patterns

Add comments explaining complex patterns:

```yaml
accept_project_edit_file_prompts:
  paths:
    # Source files excluding generated
    - 'src/**'
    - '!src/generated/**'

    # Config files at root only
    - '*.config.js'
    - '.*.js'
```

### 4. Test Incrementally

1. Start with `internal:safe`
2. Add specific permissions as needed
3. Test each addition
4. Build up to desired automation level

### 5. Separate Concerns

Create focused rulesets:

```yaml
# ~/.claude-composer/rulesets/
├── file-operations.yaml   # File handling rules
├── commands.yaml          # Command execution rules
├── web-requests.yaml      # Web fetching rules
└── combined.yaml          # References all above
```

## Troubleshooting

### Rules Not Working

1. **Check ruleset is loaded**:

   ```bash
   claude-composer --ruleset my-ruleset
   ```

2. **Verify YAML syntax**:

   - Use a YAML validator
   - Check indentation (2 spaces)
   - Verify quotes around patterns

3. **Test path patterns**:
   - Start with simple patterns
   - Use `**` for recursive matching
   - Remember exclusions come after inclusions

### Unexpected Acceptances

1. Check ruleset order - later overrides earlier
2. Verify no `internal:yolo` in chain
3. Look for overly broad patterns (`**/*`)
4. Check for missing exclusion patterns

### Debugging Patterns

Use the debug flag to see pattern matching:

```bash
claude-composer --log-all-pattern-matches
# Check ~/.claude-composer/logs/ for details
```

## Security Considerations

### Path Traversal

Be careful with patterns that might match outside project:

```yaml
# Dangerous - could match parent directories
accept_project_edit_file_prompts:
  paths:
    - '../**' # Don't do this!
```

### Sensitive Files

Always exclude sensitive files:

```yaml
accept_project_edit_file_prompts:
  paths:
    - '**'
    - '!**/*.env*'
    - '!**/*.key'
    - '!**/*.pem'
    - '!**/secrets/**'
    - '!**/credentials/**'
```

### Command Execution

Be specific about command paths:

```yaml
# Good - specific directories
accept_project_bash_command_prompts:
  paths:
    - 'scripts/safe/**'

# Bad - too broad
accept_project_bash_command_prompts: true
```

## See Also

- [Configuration Guide](./configuration.md) - Overall configuration
- [Toolsets Reference](./toolsets.md) - Tool permissions
- [CLI Reference](./cli-reference.md) - Command-line usage
- [Examples](./examples.md) - Common workflows
