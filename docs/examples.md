# Examples & Workflows

Common usage patterns and workflows for Claude Composer.

## Getting Started

### First Time Setup

```bash
# 1. Install Claude Composer
pnpm add -g claude-composer

# 2. Run interactive setup
claude-composer cc-init

# 3. Start using
claude-composer
```

### Project Setup

```bash
# Navigate to project
cd my-project

# Create project-specific config
claude-composer cc-init --project

# Start with project config
claude-composer
```

## Common Workflows

### New Feature Development

When starting a new feature in an existing project:

```bash
# 1. Ensure clean git state
git status

# 2. Create feature branch
git checkout -b feature/new-component

# 3. Start Claude Composer with balanced automation
claude-composer --ruleset internal:cautious

# 4. Work on your feature
# Claude can now edit project files automatically
# but will ask permission for system-wide operations
```

### Documentation Updates

For documentation-focused work:

```yaml
# Create ~/.claude-composer/rulesets/docs.yaml
name: docs
description: Documentation workflow

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

# No bash commands for safety
accept_project_bash_command_prompts: false
```

Use it:

```bash
claude-composer --ruleset docs
```

### Code Review Preparation

Before submitting code for review:

```bash
# Start in safe mode to carefully review changes
claude-composer --ruleset internal:safe

# Claude will ask permission for every operation
# allowing you to review each change
```

### Debugging Session

For debugging with full access:

```bash
# Maximum access for debugging
claude-composer \
  --ruleset internal:yolo \
  --toolset internal:core \
  --allow-buffer-snapshots

# Use Ctrl+Shift+S to capture terminal output
```

## Team Collaboration

### Shared Project Configuration

Create consistent team setup:

```bash
# 1. Create project config
claude-composer cc-init --project --use-cautious-ruleset

# 2. Add custom rules
cat > .claude-composer/rulesets/team.yaml << 'EOF'
name: team
description: Team development rules

accept_project_edit_file_prompts:
  paths:
    - 'src/**'
    - 'tests/**'
    - '!src/generated/**'
    - '!**/*.env*'

accept_project_bash_command_prompts:
  paths:
    - 'scripts/dev/**'
    - 'Makefile'
EOF

# 3. Update config
cat >> .claude-composer/config.yaml << 'EOF'
rulesets:
  - internal:cautious
  - project:team
EOF

# 4. Commit configuration
git add .claude-composer/
git commit -m "Add Claude Composer team configuration"
```

### Onboarding New Developers

```bash
# New developer setup
git clone https://github.com/team/project.git
cd project
npm install

# Claude Composer will use project config automatically
claude-composer

# Or they can add their personal overrides
claude-composer --ruleset project:team --ruleset personal-prefs
```

## CI/CD Integration

### Automated Testing

```bash
#!/bin/bash
# ci-test.sh

# Run in CI environment
export CLAUDE_COMPOSER_NO_NOTIFY=1

claude-composer \
  --ruleset internal:cautious \
  --quiet \
  --dangerously-allow-in-dirty-directory \
  --dangerously-suppress-automatic-acceptance-confirmation \
  "Run the test suite and fix any failing tests"
```

### Documentation Generation

```bash
#!/bin/bash
# generate-docs.sh

claude-composer \
  --ruleset internal:cautious \
  --toolset internal:core \
  --no-show-notifications \
  "Update API documentation based on code changes"
```

## Security-Conscious Workflows

### Working with Sensitive Data

```yaml
# ~/.claude-composer/rulesets/secure.yaml
name: secure
description: High security workflow

# No file operations by default
accept_project_edit_file_prompts: false
accept_project_create_file_prompts: false

# No command execution
accept_project_bash_command_prompts: false

# No web requests
accept_fetch_content_prompts: false
```

```bash
# Use for sensitive projects
claude-composer --ruleset secure
```

### Gradual Trust Building

Start restrictive and gradually allow more:

```bash
# Day 1: Maximum safety
claude-composer --ruleset internal:safe

# Week 1: Allow project file reading
claude-composer --ruleset internal:safe --ruleset read-only

# Week 2: Allow project file editing
claude-composer --ruleset internal:cautious

# Month 1: Custom workflow
claude-composer --ruleset my-workflow
```

## Development Patterns

### Frontend Development

```yaml
# ~/.claude-composer/rulesets/frontend.yaml
name: frontend
description: Frontend development workflow

accept_project_edit_file_prompts:
  paths:
    - 'src/**/*.{js,jsx,ts,tsx}'
    - 'src/**/*.{css,scss,less}'
    - 'public/**'
    - 'package.json'

accept_project_bash_command_prompts:
  paths:
    - 'package.json' # npm scripts

accept_fetch_content_prompts:
  domains:
    - 'npmjs.com'
    - 'cdn.jsdelivr.net'
    - 'unpkg.com'
```

### Backend API Development

```yaml
# ~/.claude-composer/rulesets/backend-api.yaml
name: backend-api
description: Backend API development

accept_project_edit_file_prompts:
  paths:
    - 'src/**/*.{js,ts,py,go}'
    - 'test/**'
    - 'migrations/**'
    - '!**/*.env*'

accept_project_bash_command_prompts:
  paths:
    - 'scripts/db/**'
    - 'docker-compose.yml'

toolsets:
  - internal:core # For API documentation
```

### Full-Stack Development

```bash
# Combine rulesets for full-stack work
claude-composer \
  --ruleset internal:cautious \
  --ruleset frontend \
  --ruleset backend-api \
  --toolset internal:core
```

## Special Use Cases

### Learning and Exploration

When learning a new codebase:

```bash
# Read-only exploration
claude-composer --ruleset internal:safe \
  "Explain the architecture of this project"
```

### Refactoring

For large refactoring tasks:

```bash
# Create refactoring ruleset
cat > ~/.claude-composer/rulesets/refactor.yaml << 'EOF'
name: refactor
description: Refactoring workflow

accept_project_edit_file_prompts:
  paths:
    - 'src/**'
    - 'test/**'

# Allow test running
accept_project_bash_command_prompts:
  paths:
    - 'package.json'
    - 'Makefile'
EOF

# Use with todo tracking
claude-composer --ruleset refactor
```

### Code Migration

When migrating between frameworks:

```bash
# Setup migration environment
claude-composer \
  --ruleset internal:cautious \
  --toolset internal:core \
  --sticky-notifications

# Track progress with notifications
```

## Advanced Patterns

### Multi-Project Management

```bash
# Global config for all projects
cat > ~/.claude-composer/config.yaml << 'EOF'
roots:
  - ~/projects
  - ~/work
rulesets:
  - internal:cautious
EOF

# Project-specific overrides
cd ~/projects/project-a
claude-composer cc-init --project --use-yolo-ruleset

cd ~/projects/project-b
claude-composer cc-init --project --use-safe-ruleset
```

### Custom Tool Integration

```yaml
# .claude-composer/toolsets/custom.yaml
mcp:
  database-tools:
    type: stdio
    command: npx
    args: ['@company/db-mcp']

  api-tools:
    type: stdio
    command: python
    args: ['-m', 'company_api_tools']

allowed:
  - Read
  - Edit
  - mcp__database-tools__query
  - mcp__api-tools__generate
```

### Progressive Automation

```bash
# Week 1: Manual everything
alias cc-learn='claude-composer --ruleset internal:safe'

# Week 2: Auto-accept reads
alias cc-read='claude-composer --ruleset internal:safe --ruleset allow-reads'

# Week 3: Auto-accept project edits
alias cc-dev='claude-composer --ruleset internal:cautious'

# Week 4: Custom workflow
alias cc-work='claude-composer --ruleset my-workflow --toolset my-tools'
```

## Troubleshooting Workflows

### When Things Go Wrong

```bash
# 1. Start with maximum safety
claude-composer --ruleset internal:safe

# 2. Enable debug logging
claude-composer --log-all-pattern-matches

# 3. Check pattern matches
tail -f ~/.claude-composer/logs/pattern-matches-*.log

# 4. Test specific ruleset
claude-composer --ignore-global-config --ruleset test-rules
```

### Pattern Testing

```bash
# Create test ruleset
cat > test-rules.yaml << 'EOF'
name: test
accept_project_edit_file_prompts:
  paths:
    - 'test/**/*.js'
    - '!test/fixtures/**'
EOF

# Test with logging
claude-composer \
  --ruleset test-rules \
  --log-all-pattern-matches

# Verify in logs
grep "test/fixtures" ~/.claude-composer/logs/pattern-matches-*.log
```

## Best Practices

### 1. Start Conservative

Always begin with restrictive settings:

```bash
# Good first day approach
claude-composer --ruleset internal:safe

# After comfort builds
claude-composer --ruleset internal:cautious
```

### 2. Document Your Workflows

Create README for team:

```markdown
# Claude Composer Workflows

## Development

Use: `claude-composer --ruleset internal:cautious`

## Documentation

Use: `claude-composer --ruleset docs`

## Debugging

Use: `claude-composer --ruleset internal:yolo --allow-buffer-snapshots`
```

### 3. Version Control Configuration

Always commit your configuration:

```bash
git add .claude-composer/
git commit -m "Add Claude Composer configuration"
```

### 4. Regular Reviews

Periodically review and update rules:

```bash
# Check what's being auto-accepted
claude-composer --log-all-pattern-matches

# Review logs
~/.claude-composer/logs/

# Update rules based on usage
```

## See Also

- [Configuration Guide](./configuration.md) - Configuration details
- [Rulesets Reference](./rulesets.md) - Creating rulesets
- [Toolsets Reference](./toolsets.md) - Tool configuration
- [CLI Reference](./cli-reference.md) - Command options
