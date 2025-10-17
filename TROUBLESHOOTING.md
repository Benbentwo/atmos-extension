# Troubleshooting the Atmos Language Server

This guide helps you diagnose and fix issues with the Atmos extension's language server features (syntax highlighting, IntelliSense, hover, etc.).

## Quick Diagnostics Checklist

### 1. Check Extension Activation

The extension only activates when it finds an `atmos.yaml` file in your workspace.

**Steps:**
1. Open VSCode Command Palette (`Cmd+Shift+P` on Mac)
2. Run: `Developer: Show Running Extensions`
3. Search for "Atmos" - it should appear in the list
4. If not listed, the extension hasn't activated

**Common causes:**
- No `atmos.yaml` file in workspace root
- Extension not installed or disabled
- VSCode needs reload

### 2. View Extension Logs

**Steps:**
1. Open Command Palette (`Cmd+Shift+P`)
2. Run: `Developer: Toggle Developer Tools`
3. Click the **Console** tab
4. Look for messages starting with "Activating Atmos extension..."
5. Check for any error messages in red

**Expected output:**
```
Activating Atmos extension...
Discovered X Atmos workspace(s)
Atmos extension activated successfully
```

**If you see errors:**
- Copy the error message
- Check if it mentions missing files or configuration issues
- Verify your `atmos.yaml` is valid YAML

### 3. Check File Type Detection

The language server only works on YAML files in stack directories.

**Steps:**
1. Open a stack file (e.g., `stacks/orgs/acme/_defaults.yaml`)
2. Look at the bottom-right corner of VSCode
3. Verify it says "YAML" (not "Plain Text")
4. If it says "Plain Text", click it and select "YAML"

### 4. Verify Extension is Compiled

**Steps:**
```bash
cd /Users/bensmith/dev/src/github.com/Benbentwo/atmos-extension
ls -la out/
```

**Expected:** You should see `.js` and `.js.map` files
**If missing:** Run `pnpm run compile`

### 5. Check Workspace Configuration

**Steps:**
1. Verify `atmos.yaml` exists in workspace root
2. Check that it has valid `stacks` configuration:
```yaml
stacks:
  base_path: "stacks"
  included_paths:
    - "orgs/**/*"
  excluded_paths:
    - "**/_defaults.yaml"
  name_pattern: "{tenant}-{environment}-{stage}"
```

### 6. Test Language Server Features

Open a stack file and test each feature:

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| **Syntax Highlighting** | Open any `.yaml` file in `stacks/` | Keys, values, and comments should be colored |
| **Autocomplete** | Type `component` and press `Ctrl+Space` | Suggestions appear |
| **Hover** | Hover over a component name | Shows component details |
| **Go to Definition** | `Cmd+Click` on a component reference | Jumps to component file |
| **Document Symbols** | Press `Cmd+Shift+O` | Shows outline of stack structure |

### 7. Check Extension Settings

**Steps:**
1. Open Settings (`Cmd+,`)
2. Search for "Atmos"
3. Verify these settings:

```json
{
  "atmos.validation.enabled": true,
  "atmos.language.evaluateTemplates": true,
  "atmos.language.showInlineHints": true
}
```

## Common Issues and Solutions

### Issue: No syntax highlighting at all

**Solution:**
1. Ensure file is detected as YAML (see step 3 above)
2. Check if you have conflicting YAML extensions installed
3. Try disabling other YAML extensions temporarily
4. Reload VSCode: `Developer: Reload Window`

### Issue: Extension not activating

**Solution:**
1. Verify `atmos.yaml` exists in workspace root
2. Check activation events in developer console
3. Try manually running: `Developer: Reload Window`
4. If still not working, check for errors in developer console

### Issue: IntelliSense not working

**Solution:**
1. Verify the extension is activated (see step 1)
2. Check that you're in a stack file (under `stacks/` directory)
3. Try triggering manually with `Ctrl+Space`
4. Check developer console for errors in the completion provider

### Issue: "No Atmos configuration found" message

**Solution:**
1. Create an `atmos.yaml` file in your workspace root
2. Add minimal configuration:
```yaml
base_path: "."
components:
  terraform:
    base_path: "components/terraform"
stacks:
  base_path: "stacks"
  included_paths:
    - "**/*"
```
3. Reload VSCode

### Issue: Language server features work in some files but not others

**Solution:**
1. Check if the file is in a path matched by `stacks.included_paths`
2. Verify the file isn't in `stacks.excluded_paths`
3. Check file permissions (must be readable)
4. Look for YAML syntax errors in the file

## Advanced Debugging

### Enable Verbose Logging

Currently, the extension logs to the developer console. To see all logs:

1. Open Developer Tools: `Developer: Toggle Developer Tools`
2. Go to Console tab
3. Filter by "Atmos" to see extension-specific logs

### Check Language Server Registration

In the developer console, you should see these providers registered:
- CompletionItemProvider
- DefinitionProvider
- HoverProvider
- DocumentSymbolProvider
- SemanticTokensProvider

### Inspect Extension State

Run in developer console:
```javascript
// Check if extension is active
vscode.extensions.getExtension('cloudposse.cloudposse-atmos')?.isActive
```

### Force Recompile and Reload

```bash
cd /Users/bensmith/dev/src/github.com/Benbentwo/atmos-extension
pnpm run compile
```

Then in VSCode: `Developer: Reload Window`

## Development Mode Debugging

If you're developing the extension:

1. Open the extension workspace in VSCode
2. Press `F5` to launch Extension Development Host
3. Open a test workspace with `atmos.yaml`
4. Check the Debug Console in the original VSCode window for logs
5. Set breakpoints in TypeScript files to debug

## Getting Help

If none of these solutions work:

1. Collect the following information:
   - VSCode version: `Code > About Visual Studio Code`
   - Extension version: Check in Extensions panel
   - Error messages from developer console
   - Your `atmos.yaml` configuration
   - Example stack file that's not working

2. Check the extension repository for known issues
3. Create a new issue with the collected information

## Quick Fix Commands

```bash
# Recompile extension
pnpm run compile

# Run linter
pnpm run lint

# Run tests
pnpm run test

# Package extension
pnpm run package
```

## VSCode Commands for Troubleshooting

- `Developer: Show Running Extensions` - See if extension is active
- `Developer: Toggle Developer Tools` - View console logs
- `Developer: Reload Window` - Restart extension host
- `Developer: Show Logs` - View all VSCode logs
- `Preferences: Open Settings (JSON)` - Edit settings directly
