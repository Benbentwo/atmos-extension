# Atmos VS Code Extension - Product Requirements

**Version:** 0.1.0  
**Last Updated:** 2025-10-09  
**Status:** Initial Release

---

## Overview

VS Code extension providing intelligent code assistance, navigation, and visualization for Cloud Posse's Atmos framework. Reduces cognitive load and accelerates infrastructure-as-code development.

**Target Users:** DevOps Engineers, Platform Engineers, SREs

---

## Core Features

### Language Support
- **Syntax Highlighting**: Atmos-specific YAML with template expressions
- **IntelliSense**: Component names, imports, variables, Atmos config keys
- **Go-to-Definition**: Navigate to components, imports, and modules
- **Hover Info**: Documentation and metadata on hover
- **Document Symbols**: Outline view with imports, vars, components, settings
- **Semantic Tokens**: Enhanced highlighting for components, templates, variables

### Validation & Diagnostics
- Component reference validation
- Import path validation
- Circular dependency detection
- Quick fixes for common issues

### Navigation & Context
- **Stack Context Indicator**: Status bar showing current stack calculated from pattern in `atmos.yaml`
  - Pattern defined in `stacks.name_pattern` (e.g., `{tenant}-{environment}-{stage}`)
  - Supports both `name_pattern` and `name_template` formats
  - Dynamically resolves variables from stack configuration
- **Multi-Workspace Support**: Auto-discover multiple `atmos.yaml` files
- **Breadcrumb Navigation**: Stack inheritance chain
{{ ... }}
### Visualization & Preview
- **Stack Viewer**: Activity bar view showing rendered component configuration
- **Component Preview**: Deep-merged config with all imports resolved
- **Components View**: Sidebar view of all components in current stack with search

### Explorer Integration
- **File Decorations**: Stack names displayed next to files (`dev.yaml    plat-use2-dev`)
- **Component Tree**: Expandable stack files showing components with click-to-navigate

### Custom Editor (Optional)
- Split view with source and live preview
- Integrated toolbar (Validate, Format, Refresh)
- Shows imports, components, global vars
- Auto-updates with debouncing

---

## Configuration

```json
{
  // Core
  "atmos.cliPath": "atmos",
  "atmos.validation.enabled": true,
  "atmos.validation.onSave": true,
  
  // Explorer
  "atmos.explorer.showDecorations": true,
  "atmos.explorer.showComponents": true,
  
  // Editor
  "atmos.editor.useCustomEditor": false,
  "atmos.editor.showPreview": true,
  
  // Language
  "atmos.language.evaluateTemplates": true,
  "atmos.language.showInlineHints": true,
  
  // Components View
  "atmos.components.autoRefresh": true
}
```

---

## Commands

| Command | Description |
|---------|-------------|
| `atmos.renderStack` | Render stack configuration |
| `atmos.validateStack` | Validate current stack |
| `atmos.previewComponent` | Preview component with deep merge |
| `atmos.showStackContext` | Show stack metadata |
| `atmos.switchWorkspace` | Switch between workspaces |
| `atmos.componentsView.search` | Search components |

---

## Architecture

```
Extension
├── Language Features
│   ├── Completion, Definition, Hover
│   ├── Document Symbols (outline)
│   └── Semantic Tokens (highlighting)
├── Views
│   ├── Stack Viewer (activity bar)
│   └── Components View (sidebar)
├── Explorer Integration
│   ├── File Decorations
│   └── Component Tree
├── Custom Editor (optional)
│   └── Split view with preview
└── Core Services
    ├── Config Manager
    ├── Workspace Manager
    ├── Stack Parser
    └── Diagnostics Provider
```

---

## Future Enhancements

### Planned
- Template expression evaluation
- Inline hints with resolved values
- Code actions (quick fixes)
- Rename refactoring
- Custom editor with sync scrolling
- Deep merge in components view
- Source attribution
- Export rendered configuration

### Long-term
- Visual dependency graph
- Diff view for stack layers
- Interactive component editor
- AI-powered suggestions

---

## Success Metrics

- 60% reduction in navigation time
- 40% reduction in configuration errors
- 80% adoption rate among Atmos users
- 4+ star marketplace rating

---

**Status:** ✅ 0.1.0 Complete | **Next:** Testing & User Feedback
