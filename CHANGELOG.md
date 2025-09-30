# Change Log

All notable changes to the Atmos VS Code extension.

## [0.1.0] - 2025-09-30

### Added - MVP Release

#### IntelliSense & Auto-completion
- Component name auto-completion from `components/terraform/` directory
- Stack import path suggestions
- Common variable name completion (namespace, tenant, environment, stage, etc.)
- Context-aware suggestions based on cursor position

#### Navigation Features
- Go-to-definition for component references → opens Terraform module
- Go-to-definition for stack imports → opens imported stack file
- Hover tooltips showing component and import information
- Clickable links in hover tooltips

#### Validation & Diagnostics
- Real-time YAML syntax validation
- Component reference validation (warns on non-existent components)
- Import path validation (errors on missing stack files)
- Circular import detection
- Problems panel integration with clickable diagnostics

#### Commands
- `Atmos: Render Stack Configuration` - Execute atmos describe in terminal
- `Atmos: Validate Stack` - Manually trigger validation
- `Atmos: Open Configuration` - Quick access to atmos.yaml

#### Configuration
- Auto-detection of Atmos projects via `atmos.yaml`
- Configurable Atmos CLI path
- Configurable validation settings (enable/disable, on-save)
- Respects atmos.yaml paths for stacks and components

#### Developer Experience
- Extension activates automatically when atmos.yaml is detected
- File system watcher for configuration changes
- Validation on document open, change, and save
- Clean error messages and user feedback

### Technical
- TypeScript implementation with strict type checking
- YAML parsing with error recovery
- Efficient file system operations
- VS Code Extension API best practices

## [Unreleased]

### Planned for 0.2.0
- Enhanced syntax highlighting with Atmos-specific grammar
- Stack tree view in sidebar
- Visual dependency graph
- Improved stack rendering with source attribution
- Find all references for components
- Code snippets for common patterns