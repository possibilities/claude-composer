# Roots Configuration

Specify trusted root directories to auto-accept trust prompts.

## Configuration

```yaml
roots:
  - /home/user/projects
  - ~/work
  - $PROJECTS_DIR/repos
```

## How It Works

When starting in a directory, checks if parent is in `roots` list and auto-accepts trust.

### Path Support

- **Absolute**: `/home/user/projects`
- **Tilde**: `~/work` (expands to home)
- **Variables**: `$PROJECTS_DIR` (expands env vars)

### Example

With `roots: [/home/user/projects]`:

- `/home/user/projects/my-app` → trusted
- `/home/user/other/my-app` → not trusted
