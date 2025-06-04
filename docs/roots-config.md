# Roots Configuration

The `roots` configuration option allows you to specify trusted root directories where Claude Composer will automatically accept the "Do you trust the files in this folder?" prompt when starting in a subdirectory.

## Configuration

Add a `roots` array to your configuration file (created with `claude-composer cc-init`):

```yaml
rulesets:
  - internal:cautious
toolsets:
  - internal:core
roots:
  - /home/user/projects
  - ~/work
  - $PROJECTS_DIR/repos
```

## How it works

When Claude Composer starts in a new directory, it checks if the parent directory of the current working directory is listed in the `roots` configuration. If it is, the trust prompt is automatically accepted.

### Path expansion

The roots configuration supports:

- **Absolute paths**: `/home/user/projects`
- **Tilde expansion**: `~/work` expands to your home directory
- **Environment variables**: `$PROJECTS_DIR/repos` expands environment variables

### Example

If you have the following configuration:

```yaml
roots:
  - /home/user/projects
```

And you start Claude Composer in `/home/user/projects/my-app`, the trust prompt will be automatically accepted with "Yes" (option 1).

If you start in `/home/user/other/my-app`, the trust prompt will be automatically declined with "No" (option 3).

## Notes

- The `roots` option is not available as a command-line flag
- An empty `roots` list is automatically added when creating a new config with `cc-init`
- Subdirectories of roots are also trusted (e.g., if `/home/user/projects` is a root, then `/home/user/projects/subfolder/app` is also trusted)
