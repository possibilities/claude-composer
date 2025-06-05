# Supplemental Documentation Final Plan

## Overview

This plan outlines the creation, organization, and integration of supplemental documentation for Claude Composer. The goal is to create focused, minimal documents that provide detailed information without cluttering the main README.

## Document Structure

### 1. Configuration Guide (`docs/configuration.md`)

**Purpose**: Comprehensive guide to configuring Claude Composer

**Content to include**:

- Configuration file structure and syntax
- Configuration precedence explained with examples
- Global vs project configuration details
- Directory structure examples
- Roots configuration with detailed examples
- Environment variable expansion
- Full YAML configuration examples
- Best practices for different workflows

**Links from main README**:

- "See [docs/configuration.md](docs/configuration.md) for detailed configuration options."

### 2. Rulesets Reference (`docs/rulesets.md`)

**Purpose**: Complete reference for creating and using rulesets

**Content to include**:

- What are rulesets (expanded explanation)
- Built-in rulesets detailed behavior
- Ruleset syntax reference
- Path pattern matching rules and examples
- Domain pattern matching for web requests
- Creating custom rulesets (step-by-step)
- Project vs global rulesets
- Ruleset chaining and precedence
- Common ruleset patterns and examples
- Troubleshooting ruleset issues

**Links from main README**:

- "See [docs/rulesets.md](docs/rulesets.md) for creating custom rulesets."

### 3. Toolsets Reference (`docs/toolsets.md`)

**Purpose**: Complete guide to toolset configuration and MCP servers

**Content to include**:

- What are toolsets (expanded explanation)
- Built-in toolsets detailed
- Tool permission model (allowed vs disallowed)
- MCP server configuration syntax
- Creating custom toolsets
- Toolset merging behavior
- Common MCP server configurations
- Debugging MCP server issues

**Links from main README**:

- "See [docs/toolsets.md](docs/toolsets.md) for creating custom toolsets."

### 4. CLI Reference (`docs/cli-reference.md`)

**Purpose**: Complete command-line options reference

**Content to include**:

- All command-line options with detailed descriptions
- Configuration options
- Safety options (with warnings and use cases)
- Notification options (all variants)
- Debug options
- Subcommands detailed reference
- Pass-through options explanation
- Command precedence and overrides
- Common command patterns and examples

**Links from main README**:

- "Command Line Reference" in documentation section

### 5. Installation Guide (`docs/installation.md`)

**Purpose**: Detailed installation and setup instructions

**Content to include**:

- Prerequisites with version requirements
- Installation methods for all package managers
- Global vs local installation considerations
- Initial setup walkthrough
- Troubleshooting installation issues
- Upgrading Claude Composer
- Uninstalling Claude Composer

**Links from main README**:

- Could be linked from Quick Start if users need more help

### 6. Examples & Workflows (`docs/examples.md`)

**Purpose**: Common usage patterns and workflows

**Content to include**:

- Starting new projects
- Working with different project types
- Team collaboration patterns
- CI/CD integration
- Common ruleset patterns for different workflows
- Transitioning from safe to YOLO mode gradually
- Project-specific configurations

**Links from main README**:

- Could be added to documentation section

### 7. Notifications Guide (`docs/notifications.md`)

**Purpose**: Understanding and configuring notifications

**Content to include**:

- Notification types explained
- Fine-grained notification controls
- Platform-specific notification setup
- Troubleshooting notification issues
- Best practices for notification configuration

**Links from main README**:

- Already referenced in the minimal README

## Implementation Plan

### Phase 1: Core References (Priority: High)

1. Create `docs/configuration.md`
2. Create `docs/rulesets.md`
3. Create `docs/toolsets.md`
4. Create `docs/cli-reference.md`

### Phase 2: Extended Guides (Priority: Medium)

1. Create `docs/installation.md`
2. Create `docs/examples.md`
3. Create/update `docs/notifications.md`

### Phase 3: Integration (Priority: High)

1. Update main README links to ensure all references work
2. Add cross-references between supplemental docs
3. Create a documentation index if needed

## Content Migration Strategy

For each document:

1. Start with content from `supplemental-docs-ideas.md`
2. Organize into logical sections
3. Add any missing information
4. Include practical examples
5. Add troubleshooting sections where relevant
6. Keep each document focused and minimal

## Linking Strategy

### From Main README

- Use relative links: `[text](docs/filename.md)`
- Place links contextually where topics are introduced
- Add documentation section with all supplemental docs listed

### Between Supplemental Docs

- Cross-reference related topics
- Use consistent link format
- Create "See also" sections at the end of each doc

### Back to Main README

- Each supplemental doc should link back to main README
- Include breadcrumb-style navigation if helpful

## Quality Guidelines

1. **Minimalism**: Each doc should contain only necessary information
2. **Clarity**: Use clear headings and logical organization
3. **Examples**: Include practical examples for complex topics
4. **Consistency**: Use consistent formatting and terminology
5. **Searchability**: Use descriptive headings for easy scanning

## Success Criteria

- Users can find detailed information easily
- Main README remains clean and scannable
- Supplemental docs are self-contained but connected
- Documentation reduces support questions
- New users can get started quickly
- Advanced users can find detailed information

## Notes

- Consider creating a `docs/README.md` as an index if we end up with many docs
- Keep monitoring which docs get the most use and update accordingly
- Consider versioning strategy for docs as the tool evolves
