# Atmos Extension - Implementation Guide

**Version:** 0.1.0  
**Status:** ✅ Complete

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Compile
pnpm run compile

# Run in development
F5 (or Run > Start Debugging)

# Package for distribution
pnpm run package
```

---

## Project Structure

```
src/
├── extension.ts                    # Main entry point
├── atmosConfig.ts                  # Config manager
├── atmosWorkspaceManager.ts        # Multi-workspace support
├── stackParser.ts                  # YAML parser
│
├── Language Features
│   ├── completionProvider.ts       # IntelliSense
│   ├── definitionProvider.ts       # Go-to-definition
│   ├── hoverProvider.ts            # Hover info
│   ├── documentSymbolProvider.ts   # Outline view
│   └── semanticTokensProvider.ts   # Syntax highlighting
│
├── Views
│   ├── stackViewerProvider.ts      # Activity bar stack viewer
│   ├── componentsViewProvider.ts   # Sidebar components view
│   └── stackContextProvider.ts     # Status bar indicator
│
├── v2.0 Features
│   ├── fileDecorationProvider.ts   # Explorer decorations
│   ├── explorerTreeProvider.ts     # Component tree
│   └── stackCustomEditor.ts        # Custom editor
│
└── Utilities
    ├── diagnosticsProvider.ts      # Validation
    ├── componentPreviewProvider.ts # Preview
    └── workspaceSwitcher.ts        # Workspace switcher
```

---

## Key Components

### Language Features

**Completion Provider** (`completionProvider.ts`)
- Component names from `components/terraform/`
- Import paths for stack files
- Variable names (namespace, tenant, environment, stage)

**Definition Provider** (`definitionProvider.ts`)
- Component → Terraform module
- Import → Stack file

**Document Symbol Provider** (`documentSymbolProvider.ts`)
- Outline view: imports, vars, settings, components, backend
- Breadcrumb navigation

**Semantic Tokens Provider** (`semanticTokensProvider.ts`)
- Component names, template expressions `{{ ... }}`
- Variable references `.vars.name`
- Import paths, function calls, keywords

### Views

**Stack Viewer** (`stackViewerProvider.ts`)
- Activity bar view
- Shows rendered component configuration
- Expandable tree with vars, settings, backend

**Components View** (`componentsViewProvider.ts`)
- Sidebar view of current stack components
- Search and filter
- Click to navigate

**Stack Context** (`stackContextProvider.ts`)
- Status bar indicator
- Calculates stack name using pattern from `atmos.yaml`
  - Reads `stacks.name_pattern` or `stacks.name_template` from config
  - Resolves template variables (e.g., `{tenant}`, `{environment}`, `{stage}`)
  - Variables extracted from stack's `vars` or `settings` sections
  - Example: pattern `{tenant}-{environment}-{stage}` → `plat-ue2-dev`
- Shows calculated stack identifier in status bar
- Click for quick actions

### v2.0 Features

**File Decoration Provider** (`fileDecorationProvider.ts`)
- Shows stack names in Explorer: `dev.yaml    plat-use2-dev`
- Caches for performance
- Updates on file changes

**Explorer Tree Provider** (`explorerTreeProvider.ts`)
- Expandable stack files
- Shows components
- Click to navigate to definition

**Custom Editor** (`stackCustomEditor.ts`)
- Webview-based split view
- Source + live preview
- Toolbar: Validate, Format, Refresh

---

## Stack Name Pattern Calculation

The extension calculates stack names dynamically using the pattern defined in `atmos.yaml`:

```typescript
// atmos.yaml configuration
stacks:
  name_pattern: "{tenant}-{environment}-{stage}"
  // OR
  name_template: "{{.tenant}}-{{.environment}}-{{.stage}}"

// Stack file vars
vars:
  tenant: "plat"
  environment: "ue2"
  stage: "dev"

// Calculated stack name: "plat-ue2-dev"
```

**Implementation:**
1. `AtmosConfigManager` loads and exposes `stacks.name_pattern` or `stacks.name_template`
2. `StackContextProvider` retrieves the pattern from config
3. Pattern variables are resolved from stack's `vars` or `settings`
4. Template syntax supports both `{var}` and `{{.var}}` formats
5. Calculated name is displayed in status bar and file decorations

---

## Configuration Flow

```typescript
// 1. Discover workspaces
workspaceManager.discoverWorkspaces()
  → Finds all atmos.yaml files
  → Creates isolated contexts

// 2. Initialize providers
new AtmosConfigManager(workspaceRoot)
  → Loads atmos.yaml
  → Resolves paths (stacks, components)
  → Exposes stack name pattern

// 3. Register language features
vscode.languages.registerCompletionItemProvider(...)
vscode.languages.registerDefinitionProvider(...)
vscode.languages.registerDocumentSymbolProvider(...)

// 4. Register views
vscode.window.createTreeView('atmosStackViewer', ...)
vscode.window.createTreeView('atmosComponents', ...)

// 5. Register decorations
vscode.window.registerFileDecorationProvider(...)

// 6. Register custom editor
vscode.window.registerCustomEditorProvider(...)
```

---

## Testing

### Manual Testing Checklist

**Language Features**
- [ ] IntelliSense suggests components
- [ ] Go-to-definition works for components and imports
- [ ] Hover shows component info
- [ ] Outline view shows stack structure
- [ ] Syntax highlighting for templates

**Views**
- [ ] Stack Viewer shows rendered config
- [ ] Components View lists all components
- [ ] Search filters components
- [ ] Click navigation works

**v2.0 Features**
- [ ] File decorations show stack names
- [ ] Stack files expand to show components
- [ ] Custom editor opens with split view
- [ ] Preview updates on edit

**Validation**
- [ ] Syntax errors highlighted
- [ ] Invalid component references warned
- [ ] Missing imports detected

### Performance Targets

| Feature | Target | Status |
|---------|--------|--------|
| Extension activation | < 500ms | ✅ |
| IntelliSense | < 100ms | ✅ |
| File decoration | < 200ms | ⏳ |
| Component tree | < 100ms | ⏳ |
| Custom editor preview | < 500ms | ⏳ |

---

## Troubleshooting

### Extension not activating
- Check `atmos.yaml` exists in workspace
- Reload window: Cmd/Ctrl+Shift+P → "Reload Window"

### IntelliSense not working
- Verify file is in stacks directory
- Check `atmos.yaml` paths configuration
- Ensure file has `.yaml` or `.yml` extension

### File decorations not showing
- Check `atmos.explorer.showDecorations` is `true`
- Verify file is a valid stack file
- Clear cache: Reload window

### Custom editor not opening
- Right-click file → "Open With..." → "Atmos Stack Editor"
- Check webview is enabled
- Verify file is in stacks directory

---

## Development

### Adding a New Provider

1. Create provider file in `src/`
2. Implement VS Code provider interface
3. Import in `extension.ts`
4. Register in `activate()` function
5. Add to `package.json` contributions
6. Update documentation

### Adding a New Command

1. Add to `package.json` commands
2. Register in `extension.ts`:
   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand('atmos.myCommand', async () => {
       // Implementation
     })
   );
   ```
3. Add menu contribution if needed
4. Update documentation

### Adding a New View

1. Create tree data provider
2. Add to `package.json` views
3. Register in `extension.ts`:
   ```typescript
   const treeView = vscode.window.createTreeView('myView', {
     treeDataProvider: myProvider
   });
   context.subscriptions.push(treeView);
   ```
4. Add refresh command
5. Update documentation

---

## Release Process

1. **Update Version**
   ```bash
   # Update package.json version
   npm version major|minor|patch
   ```

2. **Update CHANGELOG**
   - Document all changes
   - Include breaking changes
   - Add migration guide if needed

3. **Test**
   - Run all manual tests
   - Verify in clean workspace
   - Test on different platforms

4. **Package**
   ```bash
   pnpm run package
   # Creates .vsix file
   ```

5. **Publish**
   ```bash
   vsce publish
   ```

---

## Architecture Decisions

### Why File Decorations?
- Provides instant visual context
- No need to open files
- Minimal performance impact with caching

### Why Custom Editor is Optional?
- Not all users want split view
- Standard editor is familiar
- Allows gradual adoption

### Why Separate Components View?
- Dedicated space for component exploration
- Doesn't clutter activity bar
- Easy to hide if not needed

### Why Semantic Tokens?
- Better than regex-based highlighting
- Theme-aware colors
- Supports nested structures

---

## Known Limitations

1. **Template Evaluation**: Not yet implemented (v2.1)
2. **Deep Merge in Components View**: Shows raw config
3. **Custom Editor Sync**: No synchronized scrolling yet
4. **Code Actions**: Quick fixes not yet implemented
5. **Rename Refactoring**: Not yet implemented

---

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

**Code Style:**
- TypeScript strict mode
- ESLint configuration
- Proper error handling
- Resource disposal
- JSDoc comments

---

**Status:** ✅ 0.1.0 Complete  
**Next:** User testing and feedback
