# Quick Start Guide - Atmos Extension

## ✅ Installation Complete!

The Atmos extension has been installed in Windsurf. Follow these steps to start using it.

## Step 1: Reload Windsurf

**Press:** `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)  
**Type:** `Developer: Reload Window`  
**Press:** Enter

This will reload Windsurf and activate the extension.

## Step 2: Open an Atmos Project

The extension activates automatically when you open a workspace containing an `atmos.yaml` file.

```bash
# Example: Open your Atmos project
cd /path/to/your/atmos/project
code .  # or open in Windsurf
```

## Step 3: Verify Activation

1. **Open Output Panel:**
   - Menu: View → Output
   - Or press: `Cmd+Shift+U` / `Ctrl+Shift+U`

2. **Select "Atmos" from dropdown** (top-right of Output panel)

3. **Look for:** `Atmos extension activated successfully`

If you see this message, the extension is working! 🎉

## Step 4: Try the Features

### 🎯 Auto-completion

1. Open any stack YAML file (e.g., `stacks/orgs/acme/dev.yaml`)
2. Start typing:
   ```yaml
   components:
     terraform:
       my-component:
         component: 
   ```
3. After typing `component:` you should see a list of available components!

### 🔍 Navigation

1. In a stack file, find a component reference like:
   ```yaml
   component: vpc/aws
   ```
2. **Cmd+Click** (or Ctrl+Click) on `vpc/aws`
3. It should jump to the Terraform module!

### 💡 Hover Information

1. Hover your mouse over any component name
2. You'll see a tooltip with:
   - Component path
   - Description (if README.md exists)
   - Link to open the component

### ✅ Validation

1. Try referencing a non-existent component:
   ```yaml
   component: does-not-exist
   ```
2. You should see a warning in the Problems panel
3. Open Problems panel: View → Problems or `Cmd+Shift+M`

### 🚀 Commands

Press `Cmd+Shift+P` and type "Atmos" to see available commands:

- **Atmos: Render Stack Configuration** - View merged stack config
- **Atmos: Validate Stack** - Manually validate current stack
- **Atmos: Open Configuration** - Open atmos.yaml

## Common Use Cases

### 1. Exploring Available Components

**Scenario:** You want to see what components are available.

**Solution:**
1. Open any stack file
2. Type `component:` 
3. Browse the auto-complete suggestions

### 2. Understanding Component Configuration

**Scenario:** You want to see what variables a component accepts.

**Solution:**
1. Cmd+Click on the component name
2. Opens the Terraform module
3. Look at `variables.tf`

### 3. Tracing Stack Inheritance

**Scenario:** You want to see which stacks a stack imports.

**Solution:**
1. Look at the `imports:` section
2. Cmd+Click on any import path
3. Opens the imported stack file

### 4. Validating Before Deployment

**Scenario:** You want to catch errors before running `atmos terraform apply`.

**Solution:**
1. Save your stack file
2. Check the Problems panel for errors/warnings
3. Fix issues before deploying

### 5. Viewing Final Configuration

**Scenario:** You want to see the merged configuration after all imports.

**Solution:**
1. Open the stack file
2. Press `Cmd+Shift+P`
3. Type "Atmos: Render Stack"
4. View the output in the terminal

## Configuration

### Extension Settings

Open Settings (`Cmd+,`) and search for "atmos":

```json
{
  "atmos.cliPath": "atmos",              // Path to Atmos CLI
  "atmos.validation.enabled": true,       // Enable validation
  "atmos.validation.onSave": true        // Validate on save
}
```

### Project Structure

The extension expects this structure (paths configurable in `atmos.yaml`):

```
your-project/
├── atmos.yaml              # Required: Atmos configuration
├── stacks/                 # Stack configurations
│   ├── catalog/
│   │   └── vpc.yaml
│   └── orgs/
│       └── acme/
│           ├── dev.yaml
│           └── prod.yaml
└── components/
    └── terraform/          # Terraform components
        ├── vpc/
        │   ├── main.tf
        │   └── variables.tf
        └── eks/
            ├── main.tf
            └── variables.tf
```

## Troubleshooting

### Extension Not Working?

**Check 1:** Is `atmos.yaml` in your workspace root?
```bash
ls -la atmos.yaml
```

**Check 2:** Did you reload Windsurf?
- Press `Cmd+Shift+P` → "Developer: Reload Window"

**Check 3:** Check the Output panel
- View → Output → Select "Atmos"
- Look for error messages

### Auto-completion Not Showing?

**Check 1:** Are you editing a `.yaml` file?

**Check 2:** Does the components directory exist?
```bash
ls -la components/terraform/
```

**Check 3:** Is the path correct in `atmos.yaml`?
```yaml
components:
  terraform:
    base_path: "components/terraform"  # Check this path
```

### Validation Errors?

**Disable temporarily:**
1. Open Settings (`Cmd+,`)
2. Search: `atmos.validation.enabled`
3. Uncheck the box

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Go to Definition | `Cmd+Click` / `F12` |
| Command Palette | `Cmd+Shift+P` |
| Problems Panel | `Cmd+Shift+M` |
| Output Panel | `Cmd+Shift+U` |
| Settings | `Cmd+,` |
| Reload Window | `Cmd+Shift+P` → "Reload" |

## Next Steps

1. ✅ **Reload Windsurf** to activate the extension
2. ✅ **Open an Atmos project** with `atmos.yaml`
3. ✅ **Try the features** listed above
4. 📖 **Read the full README.md** for detailed documentation
5. 🐛 **Report issues** on GitHub if you find bugs
6. 💡 **Request features** you'd like to see

## Getting Help

- **Documentation:** See `README.md` in this directory
- **Installation:** See `INSTALL.md` for detailed installation options
- **PRD:** See `PRD.md` for planned features and roadmap
- **Implementation:** See `IMPLEMENTATION_SUMMARY.md` for technical details

## Uninstalling

If you need to uninstall:

```bash
rm -rf ~/.windsurf/extensions/cloudposse-atmos-0.1.0
```

Then reload Windsurf.

---

**Enjoy using the Atmos extension!** 🚀

If you have feedback or find issues, please open an issue on GitHub.
