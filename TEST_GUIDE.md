# Extension Testing Guide

This guide walks you through testing all features of the Atmos extension using the sample project structure.

## Prerequisites

1. **Reload Windsurf** to activate the extension:
   - Press `Cmd+Shift+P`
   - Type "Developer: Reload Window"
   - Press Enter

2. **Verify Extension is Active**:
   - View → Output (or `Cmd+Shift+U`)
   - Select "Atmos" from the dropdown
   - Look for: `Atmos extension activated successfully`

## Test 1: Auto-completion for Components

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. Scroll to the bottom and add a new component:
   ```yaml
   
   test-component:
     component: 
   ```
3. After typing `component:` and a space, wait 1 second
4. You should see auto-completion suggestions

### Expected Results:
- ✅ Dropdown shows: `vpc`, `eks/cluster`, `rds`
- ✅ Selecting one inserts the component name

### Troubleshooting:
- If no suggestions appear, check Output panel for errors
- Ensure `components/terraform/` directory exists and has subdirectories

---

## Test 2: Auto-completion for Stack Imports

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. In the `imports:` section, add a new line:
   ```yaml
   imports:
     - orgs/acme/_defaults
     - catalog/vpc
     - catalog/eks
     - 
   ```
3. After typing `- ` wait for suggestions

### Expected Results:
- ✅ Dropdown shows available stack files
- ✅ Shows paths like `catalog/rds`, `catalog/vpc`, etc.

---

## Test 3: Go-to-Definition for Components

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. Find the line: `component: vpc`
3. Hold `Cmd` (macOS) or `Ctrl` (Windows/Linux)
4. Click on `vpc`

### Expected Results:
- ✅ Opens `components/terraform/vpc/main.tf`
- ✅ Cursor is at the top of the file

### Alternative Test:
1. Place cursor on `eks/cluster` in the file
2. Press `F12` or right-click → "Go to Definition"
3. Should open `components/terraform/eks/cluster/main.tf`

---

## Test 4: Go-to-Definition for Imports

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. Find the imports section:
   ```yaml
   imports:
     - orgs/acme/_defaults
     - catalog/vpc
   ```
3. `Cmd+Click` on `catalog/vpc`

### Expected Results:
- ✅ Opens `stacks/catalog/vpc.yaml`

### Try These Too:
- Click on `orgs/acme/_defaults` → opens `stacks/orgs/acme/_defaults.yaml`
- Click on `catalog/eks` → opens `stacks/catalog/eks.yaml`

---

## Test 5: Hover Information for Components

### Steps:
1. Open `stacks/orgs/acme/staging.yaml`
2. Hover your mouse over `vpc` in the line `component: vpc`
3. Wait for tooltip to appear

### Expected Results:
- ✅ Tooltip shows:
  - "Terraform Component"
  - Component name: `vpc`
  - Path to component
  - Description from README (if available)
  - Clickable link to open component

---

## Test 6: Hover Information for Imports

### Steps:
1. Open `stacks/orgs/acme/prod.yaml`
2. Hover over `catalog/rds` in the imports section

### Expected Results:
- ✅ Tooltip shows:
  - "Stack Import"
  - Import path
  - Resolved file path
  - Clickable link to open stack

---

## Test 7: Validation - Missing Component

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. Add a component that doesn't exist:
   ```yaml
   
   test-missing:
     component: does-not-exist
   ```
3. Save the file (`Cmd+S`)

### Expected Results:
- ✅ Warning appears in Problems panel (View → Problems or `Cmd+Shift+M`)
- ✅ Yellow squiggly line under `does-not-exist`
- ✅ Message: "Component 'does-not-exist' not found in components/terraform"

### Cleanup:
Remove the test component after verifying

---

## Test 8: Validation - Missing Import

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. Add a non-existent import:
   ```yaml
   imports:
     - orgs/acme/_defaults
     - catalog/vpc
     - catalog/eks
     - catalog/missing-file
   ```
3. Save the file

### Expected Results:
- ✅ Error appears in Problems panel
- ✅ Red squiggly line under `catalog/missing-file`
- ✅ Message: "Import file 'catalog/missing-file' not found"

### Cleanup:
Remove the bad import after verifying

---

## Test 9: Validation - YAML Syntax Error

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. Introduce a syntax error (e.g., remove a colon):
   ```yaml
   vars
     environment: dev
   ```
3. Save the file

### Expected Results:
- ✅ Error appears immediately in Problems panel
- ✅ Red squiggly line at the error location
- ✅ Message describes the YAML syntax error

### Cleanup:
Fix the syntax error (add back the colon)

---

## Test 10: Validation - Circular Import Detection

### Steps:
1. Create a circular import scenario:
   - Edit `stacks/catalog/vpc.yaml`
   - Add at the top: `imports: [catalog/eks]`
   - Edit `stacks/catalog/eks.yaml`
   - Add at the top: `imports: [catalog/vpc]`
2. Open either file

### Expected Results:
- ✅ Error in Problems panel
- ✅ Message: "Circular import detected"

### Cleanup:
Remove the circular imports after testing

---

## Test 11: Command - Render Stack Configuration

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. Press `Cmd+Shift+P`
3. Type "Atmos: Render"
4. Select "Atmos: Render Stack Configuration"

### Expected Results:
- ✅ Terminal opens at the bottom
- ✅ Command runs: `atmos describe component ...`
- ✅ If Atmos CLI is installed, shows merged configuration
- ✅ If not installed, shows error (expected)

---

## Test 12: Command - Validate Stack

### Steps:
1. Open `stacks/orgs/acme/staging.yaml`
2. Press `Cmd+Shift+P`
3. Type "Atmos: Validate"
4. Select "Atmos: Validate Stack"

### Expected Results:
- ✅ Validation runs
- ✅ Message appears: "Stack validation complete"
- ✅ Problems panel updates with any issues

---

## Test 13: Command - Open Configuration

### Steps:
1. Press `Cmd+Shift+P`
2. Type "Atmos: Open"
3. Select "Atmos: Open Configuration"

### Expected Results:
- ✅ Opens `atmos.yaml` in the editor

---

## Test 14: Real-time Validation

### Steps:
1. Open `stacks/orgs/acme/prod.yaml`
2. Start typing a new component reference:
   ```yaml
   
   new-component:
     component: test
   ```
3. Don't save yet - just type

### Expected Results:
- ✅ As you type, validation runs automatically
- ✅ Warning appears for non-existent component
- ✅ Updates in real-time as you type

---

## Test 15: Navigation Through Multiple Imports

### Steps:
1. Open `stacks/orgs/acme/prod.yaml`
2. Note it imports `orgs/acme/_defaults`
3. `Cmd+Click` on `orgs/acme/_defaults`
4. In the opened file, `Cmd+Click` on `catalog/_defaults`

### Expected Results:
- ✅ First click opens `stacks/orgs/acme/_defaults.yaml`
- ✅ Second click opens `stacks/catalog/_defaults.yaml`
- ✅ Can navigate the entire import chain

---

## Test 16: Component with Nested Path

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. Find `component: eks/cluster`
3. `Cmd+Click` on `eks/cluster`

### Expected Results:
- ✅ Opens `components/terraform/eks/cluster/main.tf`
- ✅ Handles nested directory structure correctly

---

## Test 17: Multiple Stack Files

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. Open `stacks/orgs/acme/staging.yaml`
3. Open `stacks/orgs/acme/prod.yaml`
4. Switch between tabs

### Expected Results:
- ✅ All files validate independently
- ✅ Auto-completion works in all files
- ✅ No performance issues with multiple files open

---

## Test 18: Configuration Change Detection

### Steps:
1. Open `atmos.yaml`
2. Change the stacks path:
   ```yaml
   stacks:
     base_path: "my-stacks"  # Changed from "stacks"
   ```
3. Save the file

### Expected Results:
- ✅ Message appears: "Atmos configuration reloaded"
- ✅ Extension re-indexes with new paths
- ✅ Validation updates accordingly

### Cleanup:
Change back to `base_path: "stacks"`

---

## Test 19: Component README Integration

### Steps:
1. Open `stacks/orgs/acme/dev.yaml`
2. Hover over `component: vpc`
3. Look at the tooltip

### Expected Results:
- ✅ Tooltip includes description from `components/terraform/vpc/README.md`
- ✅ Shows first paragraph of README
- ✅ Provides context about the component

---

## Test 20: Problems Panel Integration

### Steps:
1. Open Problems panel: View → Problems (`Cmd+Shift+M`)
2. Open `stacks/orgs/acme/dev.yaml`
3. Add an invalid component reference
4. Save the file

### Expected Results:
- ✅ Problem appears in the panel
- ✅ Shows file path, line number, and message
- ✅ Clicking the problem navigates to the error
- ✅ Problems are grouped by file

---

## Summary Checklist

After completing all tests, verify:

- ✅ Auto-completion works for components
- ✅ Auto-completion works for imports
- ✅ Auto-completion works for variables
- ✅ Go-to-definition works for components
- ✅ Go-to-definition works for imports
- ✅ Hover tooltips show component info
- ✅ Hover tooltips show import info
- ✅ Validation catches missing components
- ✅ Validation catches missing imports
- ✅ Validation catches YAML syntax errors
- ✅ Validation detects circular imports
- ✅ Real-time validation works
- ✅ Commands execute correctly
- ✅ Configuration changes are detected
- ✅ Problems panel integration works
- ✅ Multiple files can be edited simultaneously
- ✅ Performance is acceptable

---

## Common Issues & Solutions

### Issue: Extension Not Activating
**Solution:** Ensure `atmos.yaml` exists in workspace root, then reload window

### Issue: No Auto-completion
**Solution:** Check that you're in a `.yaml` file and components directory exists

### Issue: Go-to-Definition Not Working
**Solution:** Verify component/stack files exist at expected paths

### Issue: Validation Not Running
**Solution:** Check settings: `atmos.validation.enabled` should be `true`

### Issue: Performance Slow
**Solution:** Normal for first load while indexing; subsequent operations should be fast

---

## Next Steps

After testing:

1. **Report Issues**: Note any features that don't work as expected
2. **Suggest Improvements**: Think about what would make the extension better
3. **Try Real Projects**: Test with your actual Atmos projects
4. **Share Feedback**: Let us know what works well and what doesn't

---

**Happy Testing!** 🧪
