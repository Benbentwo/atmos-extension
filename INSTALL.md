# Installation Guide

## Installing in Windsurf (or VS Code)

### Method 1: Install from VSIX (Recommended for Development)

1. **Package the extension:**
   ```bash
   cd /path/to/atmos-extension
   pnpm run package
   ```
   This creates `cloudposse-atmos-0.1.0.vsix`

2. **Install in Windsurf:**
   - Open Windsurf
   - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Extensions: Install from VSIX..."
   - Select the generated `.vsix` file

3. **Reload Windsurf:**
   - Press `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Type "Developer: Reload Window"

### Method 2: Run in Development Mode

1. **Open the extension project:**
   ```bash
   cd /path/to/atmos-extension
   code .  # or open in Windsurf
   ```

2. **Press F5** to launch Extension Development Host
   - This opens a new window with the extension loaded
   - You can debug and see console output

### Method 3: Symlink for Development

1. **Build the extension:**
   ```bash
   pnpm run compile
   ```

2. **Create symlink** (macOS/Linux):
   ```bash
   ln -s $(pwd) ~/.vscode/extensions/cloudposse-atmos-0.1.0
   # For Windsurf, use the Windsurf extensions directory
   ```

3. **Reload editor**

## Verifying Installation

1. Open a workspace with an `atmos.yaml` file
2. Check the Output panel (View → Output) and select "Atmos" from dropdown
3. You should see: "Atmos extension activated successfully"
4. Open a stack YAML file and try:
   - Typing `component:` to see auto-completion
   - Cmd/Ctrl+Click on a component name
   - Hovering over components or imports

## Troubleshooting

### Extension Not Activating

- **Check for atmos.yaml**: The extension only activates in workspaces with an `atmos.yaml` file
- **Check Output panel**: View → Output → Select "Atmos" to see activation logs
- **Reload window**: Cmd/Ctrl+Shift+P → "Developer: Reload Window"

### Auto-completion Not Working

- Ensure you're editing a `.yaml` or `.yml` file
- Check that your `atmos.yaml` has correct paths configured
- Verify components exist in the configured components directory

### Validation Errors

- Check that `atmos.yaml` is valid YAML
- Verify stack and component paths in `atmos.yaml`
- Disable validation temporarily: Settings → Search "atmos.validation.enabled"

## Uninstalling

1. Open Extensions panel (Cmd/Ctrl+Shift+X)
2. Find "Atmos" extension
3. Click gear icon → Uninstall

Or via command line:
```bash
code --uninstall-extension cloudposse.cloudposse-atmos
```

## Development Setup

If you want to contribute or modify the extension:

1. **Clone and install:**
   ```bash
   git clone https://github.com/Benbentwo/atmos-extension
   cd atmos-extension
   pnpm install
   ```

2. **Make changes** to TypeScript files in `src/`

3. **Compile:**
   ```bash
   pnpm run compile
   # Or watch mode:
   pnpm run watch
   ```

4. **Test:**
   - Press F5 to launch Extension Development Host
   - Make changes and reload (Cmd/Ctrl+R in dev host)

5. **Package:**
   ```bash
   pnpm run package
   ```

## Next Steps

- Read the [README.md](README.md) for feature documentation
- Check the [PRD.md](PRD.md) for planned features
- See [CHANGELOG.md](CHANGELOG.md) for version history
