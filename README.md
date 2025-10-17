# Atmos VS Code Extension

IntelliSense, navigation, and validation for [Cloud Posse Atmos](https://atmos.tools) stacks and components.

## Features

### Language Support
- **IntelliSense**: Component names, imports, variables
- **Go-to-Definition**: Navigate to components and imports
- **Syntax Highlighting**: Enhanced for templates and Atmos constructs
- **Outline View**: Document structure with breadcrumbs
- **Validation**: Real-time YAML, component, and import validation
  - Schema validation with helpful error messages
  - Common typo detection (e.g., `imports` → `import`)
  - Component and import path verification
  - Circular import detection

### Views & Navigation
- **Stack Context**: Status bar showing current stack calculated from `atmos.yaml` pattern
- **Stack Viewer**: Activity bar view with rendered component configuration
- **Components View**: Sidebar view of all components with search
- **Component Preview**: Deep-merged config with all imports resolved

### Advanced Features
- **Explorer Decorations**: Stack names displayed next to files
- **Component Tree**: Expandable stack files showing components
- **Custom Editor**: Optional split view with live preview
- **Multi-Workspace**: Auto-discover multiple `atmos.yaml` files

## Quick Start

1. Install extension from VS Code Marketplace
2. Open workspace containing `atmos.yaml`
3. Extension auto-activates and indexes project
4. Start editing stack YAML files with IntelliSense!

## Usage

**IntelliSense**: Type to get component/import suggestions  
**Navigation**: Cmd/Ctrl+Click on components or imports  
**Outline**: View document structure (Cmd/Ctrl+Shift+O)  
**Stack Context**: Check status bar for current stack  
**Stack Viewer**: Click Atmos icon in activity bar  
**Components View**: See all components in sidebar  
**Custom Editor**: Right-click stack file → "Open With..." → "Atmos Stack Editor"

## Commands

- `Atmos: Preview Component` - View rendered config
- `Atmos: Show Stack Context` - Stack details and actions
- `Atmos: Switch Workspace` - Change active workspace
- `Atmos: Validate Stack` - Validate current stack

## Configuration

```json
{
  "atmos.cliPath": "atmos",
  "atmos.validation.enabled": true,
  "atmos.explorer.showDecorations": true,
  "atmos.components.autoRefresh": true
}
```

See [PRD.md](PRD.md) for all settings.

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

Paths and stack naming are configurable in `atmos.yaml`:

```yaml
stacks:
  base_path: "stacks"
  name_pattern: "{tenant}-{environment}-{stage}"

components:
  terraform:
    base_path: "components/terraform"
```

The `name_pattern` defines how stack names are displayed in the status bar and file decorations. Variables are resolved from your stack's `vars` section.

## Documentation

- **[PRD.md](PRD.md)** - Product requirements and features
- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - Development guide
- **[VALIDATION_GUIDE.md](VALIDATION_GUIDE.md)** - Schema validation reference
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

## Development

```bash
# Install dependencies
pnpm install

# Compile
pnpm run compile

# Run in development (F5 in VS Code)
# Package for distribution
pnpm run package
```

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for detailed development guide.

## Resources

- [Atmos Documentation](https://atmos.tools)
- [Atmos GitHub](https://github.com/cloudposse/atmos)
- [Cloud Posse](https://cloudposse.com)

## License

Apache 2.0

---

**Enjoy building infrastructure with Atmos!** 🚀
