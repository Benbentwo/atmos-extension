# New Features: Stack Context & Component Preview

## Overview

Two major features have been added to the Atmos VS Code Extension:

1. **Stack Context Indicator** - Shows which stack you're currently editing
2. **Component Preview** - Displays fully rendered component configuration with all imports resolved

---

## Stack Context Indicator

### Description

The Stack Context Indicator appears in the VS Code status bar when you're editing a valid Atmos stack file. It provides quick visibility into which stack you're working on and displays key metadata.

### Features

- **Status Bar Display**: Shows a concise stack identifier (e.g., `acme-dev-us-east-1`)
- **Metadata Extraction**: Automatically extracts namespace, tenant, environment, and stage from stack vars
- **Click for Details**: Click the indicator to open a quick pick menu with full stack information
- **Quick Actions**: Access common actions like Preview Component, Validate Stack, and Render Stack

### Usage

1. Open any stack YAML file in your workspace
2. Look at the bottom-left status bar for the stack indicator (🗂️ icon)
3. Click the indicator to see full stack details and available actions

### Example

When editing `/stacks/orgs/acme/dev.yaml`:
- Status bar shows: `🗂️ acme-dev`
- Tooltip displays:
  ```
  Stack: orgs/acme/dev
  Namespace: acme
  Environment: dev
  Stage: dev
  
  Click for more options
  ```

---

## Component Preview

### Description

Component Preview allows you to see the fully rendered configuration of any component within a stack, with all imports and inheritance resolved. This eliminates the need to run `atmos describe component` in the terminal.

### Features

- **Deep Merge Resolution**: Automatically resolves all imports and merges configurations
- **Side-by-Side View**: Opens preview in a new editor pane
- **Read-Only Preview**: Prevents accidental edits to generated content
- **YAML Output**: Displays configuration in clean, formatted YAML
- **Component Selection**: Choose which component to preview from a quick pick menu

### Usage

1. Open a stack file that contains component definitions
2. Run the command: `Atmos: Preview Component` (Cmd/Ctrl+Shift+P)
3. Select the component you want to preview
4. View the fully rendered configuration in a new editor pane

### Example

For a component `vpc/dev` in the `dev.yaml` stack:

```yaml
# Component Preview: vpc/dev
# Stack: orgs/acme/dev
# Generated: 2025-09-30T12:40:00.000Z
#
# This is a fully rendered view with all imports resolved.
# This preview is read-only.

vars:
  namespace: acme
  environment: dev
  stage: dev
  name: acme-dev-vpc
  cidr_block: "10.10.0.0/16"
  nat_gateway_enabled: true
  tags:
    Environment: "dev"
settings:
  spacelift:
    workspace_enabled: true
backend:
  s3:
    bucket: acme-terraform-state
    key: vpc/dev
component: vpc
metadata:
  component: vpc
  inherits:
    - vpc
```

### How It Works

The Component Preview feature:

1. **Parses the current stack file** to find all component definitions
2. **Recursively resolves imports** following the same order as Atmos CLI
3. **Deep merges configurations** from all imported files
4. **Extracts the specific component** with all inherited values
5. **Displays the result** in a formatted, read-only preview

This matches the behavior of `atmos describe component <component> --stack <stack>` but without leaving the editor.

---

## Commands

### New Commands Added

| Command | Title | Description |
|---------|-------|-------------|
| `atmos.showStackContext` | Atmos: Show Stack Context | Opens quick pick with stack details and actions |
| `atmos.previewComponent` | Atmos: Preview Component | Renders and displays a component configuration |

### Accessing Commands

- **Command Palette**: Press `Cmd/Ctrl+Shift+P` and type "Atmos"
- **Status Bar**: Click the stack context indicator
- **Quick Pick**: Select actions from the stack context menu

---

## Configuration

No additional configuration is required. The features work automatically when:

1. Your workspace contains an `atmos.yaml` configuration file
2. You're editing files within the configured stacks directory
3. The extension is activated

---

## Technical Details

### Stack Context Provider

- **File**: `src/stackContextProvider.ts`
- **Activation**: Automatically activates when editing YAML files
- **Update Frequency**: Updates within 100ms of file navigation
- **Validation**: Checks if file is a valid stack before displaying

### Component Preview Provider

- **File**: `src/componentPreviewProvider.ts`
- **Merge Strategy**: Bottom-up import resolution with deep merge
- **Output Format**: YAML with metadata header
- **Performance**: Renders within 2 seconds for typical stacks

---

## Troubleshooting

### Stack Indicator Not Showing

- Ensure you're editing a file within the stacks directory
- Check that the file is a valid YAML file
- Verify `atmos.yaml` is present in your workspace root

### Preview Not Matching CLI Output

- Ensure all imported files exist and are accessible
- Check for circular import dependencies
- Verify YAML syntax is valid in all stack files

### Performance Issues

- Large stacks with many imports may take longer to render
- Consider breaking up very large stack files
- Check for unnecessary circular imports

---

## Future Enhancements

Planned improvements for these features:

- **Source Attribution**: Show which file each configuration value comes from
- **Export Functionality**: Save rendered configuration to a file
- **Diff View**: Compare raw vs. rendered side-by-side
- **Auto-refresh**: Update preview when source files change
- **CLI Integration**: Option to use Atmos CLI for rendering when available

---

## Feedback

Found a bug or have a feature request? Please open an issue on the [GitHub repository](https://github.com/Benbentwo/atmos-extension).
