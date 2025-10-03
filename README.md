# Atmos VS Code Extension

IntelliSense, navigation, and validation for [Cloud Posse Atmos](https://atmos.tools) stacks and components.

## Features

This extension enhances your development experience when working with Atmos infrastructure-as-code projects:

### 🎯 Intelligent Code Completion

- **Component auto-completion**: Suggests available Terraform components from your `components/terraform/` directory
- **Stack import suggestions**: Auto-complete import paths for stack files
- **Variable completion**: Common Atmos variables like `namespace`, `tenant`, `environment`, `stage`

### 🔍 Navigation & Go-to-Definition

- **Jump to component**: Cmd/Ctrl+Click on component names to open the Terraform module
- **Jump to imports**: Cmd/Ctrl+Click on import paths to open referenced stack files
- **Hover information**: Hover over components and imports to see details and documentation

### ✅ Real-time Validation

- **YAML syntax validation**: Catch syntax errors as you type
- **Component validation**: Warns when referencing non-existent components
- **Import validation**: Errors when importing missing stack files
- **Circular import detection**: Identifies circular dependencies in stack imports

### 📊 Stack Context Indicator

- **Status bar display**: Shows which stack you're currently editing (e.g., `acme-dev-us-east-1`)
- **Stack metadata**: Displays namespace, tenant, environment, and stage information
- **Quick actions**: Click the indicator to access Preview Component, Validate Stack, and more
- **Smart detection**: Automatically validates if the current file is a valid stack

### 👁️ Component Preview

- **Fully rendered view**: See component configuration with all imports resolved
- **Deep merge resolution**: Automatically resolves and merges all stack inheritance
- **Side-by-side preview**: Opens in a new editor pane for easy comparison
- **No CLI required**: Pure TypeScript implementation matches `atmos describe component` output

### 🗂️ Multi-Workspace Support

- **Automatic discovery**: Finds all `atmos.yaml` files in your opened folder
- **Isolated workspaces**: Each Atmos project maintains independent configuration
- **Smart switching**: Automatically activates the correct workspace based on current file
- **Workspace switcher**: Manually switch between workspaces via status bar or command palette
- **Monorepo friendly**: Perfect for folders with multiple cloned repositories

### 🚀 Atmos Commands

- **Preview Component**: View fully rendered component configuration with all imports resolved
- **Show Stack Context**: Display current stack information and quick actions
- **Switch Workspace**: Choose active workspace when multiple are detected
- **Show Workspace Info**: View detailed information about the active workspace
- **Render Stack**: View the fully merged configuration for any stack
- **Validate Stack**: Manually trigger validation for the current stack
- **Open Configuration**: Quick access to your `atmos.yaml` configuration

## Requirements

- **VS Code** 1.101.0 or higher (or compatible editors like Windsurf)
- **Atmos CLI** (optional but recommended for full functionality)
  - Install: `brew install cloudposse/tap/atmos` (macOS)
  - Or see [Atmos installation guide](https://atmos.tools/install)

## Getting Started

1. **Install the extension** from the VS Code Marketplace or Windsurf extensions
2. **Open a workspace** containing an `atmos.yaml` file
3. The extension will automatically activate and index your project
4. Start editing stack YAML files with IntelliSense and validation!

## Extension Settings

This extension contributes the following settings:

- `atmos.cliPath`: Path to the Atmos CLI executable (default: `"atmos"`)
- `atmos.validation.enabled`: Enable real-time validation of stack files (default: `true`)
- `atmos.validation.onSave`: Validate stack files on save (default: `true`)

## Usage

### Auto-completion

When editing stack files, start typing to get suggestions:

```yaml
components:
  terraform:
    vpc:
      component: vpc/  # Auto-complete shows available components
```

### Navigation

- **Cmd/Ctrl+Click** on a component name to jump to its Terraform module
- **Cmd/Ctrl+Click** on an import path to open the imported stack
- **Hover** over components or imports to see details

### Stack Context & Preview

The extension automatically shows which stack you're editing in the status bar:

1. Open any stack file (e.g., `stacks/orgs/acme/dev.yaml`)
2. Look at the bottom-left status bar for the stack indicator (🗂️ icon)
3. Click the indicator to see full stack details and quick actions
4. Select "Preview Component" to see fully rendered configuration

### Commands

Access commands via the Command Palette (Cmd/Ctrl+Shift+P):

- `Atmos: Preview Component` - View fully rendered component with all imports resolved
- `Atmos: Show Stack Context` - Display current stack information and actions
- `Atmos: Render Stack Configuration` - View merged stack config
- `Atmos: Validate Stack` - Manually validate current stack
- `Atmos: Open Configuration` - Open atmos.yaml

## Project Structure

The extension expects an Atmos project structure:

```
.
├── atmos.yaml              # Atmos configuration
├── stacks/                 # Stack configurations (configurable)
│   ├── catalog/
│   └── orgs/
└── components/
    └── terraform/          # Terraform components (configurable)
        ├── vpc/
        ├── eks/
        └── ...
```

Paths are configurable in `atmos.yaml`:

```yaml
stacks:
  base_path: "stacks"

components:
  terraform:
    base_path: "components/terraform"
```

## Known Issues

- Syntax highlighting uses generic YAML highlighting (custom Atmos grammar coming in future release)
- Stack rendering requires Atmos CLI to be installed and in PATH
- Large projects (500+ stacks) may experience slower initial indexing

## Release Notes

### 0.1.0 - Initial Release

**MVP Features:**
- ✅ IntelliSense for components, imports, and variables
- ✅ Go-to-definition for components and imports
- ✅ Hover tooltips with component information
- ✅ Real-time validation (YAML syntax, component references, imports)
- ✅ Circular import detection
- ✅ Atmos commands integration
- ✅ Configurable via atmos.yaml

## Contributing

Contributions are welcome! Please see the [GitHub repository](https://github.com/Benbentwo/atmos-extension) for:

- Bug reports and feature requests
- Pull requests
- Documentation improvements

## Resources

- [Atmos Documentation](https://atmos.tools)
- [Atmos GitHub](https://github.com/cloudposse/atmos)
- [Cloud Posse](https://cloudposse.com)

## License

Apache 2.0

---

**Enjoy building infrastructure with Atmos!** 🚀
