# Stack Viewer and Custom Editor Refactoring Summary

## Overview
Refactored the Stack Viewer and Custom Editor to provide a better user experience with hierarchical stack navigation and provenance information display.

## Changes Made

### 1. New AtmosCli Module (`src/atmosCli.ts`)
Created a utility module to execute Atmos CLI commands:
- **`listStacks()`** - Executes `atmos list stacks --format json` to get all available stacks
- **`describeComponentWithProvenance()`** - Executes `atmos describe component --provenance -s <stack>` to get component configuration with source file annotations
- **`describeComponent()`** - Executes `atmos describe component -s <stack> --format json` for merged configuration
- **`getStackFiles()`** - Gets the list of files that contribute to a stack
- **`parseProvenanceOutput()`** - Parses the provenance output with symbols (●, ○, ∴) and source annotations

### 2. Stack Viewer Provider Refactoring (`src/stackViewerProvider.ts`)

#### Previous Behavior
- Showed a single stack file when opened in the editor
- Required a stack file to be open to display anything
- Displayed merged configuration for that single file

#### New Behavior
- **Root Level**: Shows all stacks from `atmos list stacks`
- **Stack Level**: Each stack expands to show the files that define it
- **File Level**: Each file expands to show the components defined in that file
- **Component Level**: Clicking a component opens the component definition file

#### Key Changes
- Removed `currentStackFile` and `mergedConfig` state
- Added `stacks: AtmosStack[]` to store all stacks
- Added `atmosCli: AtmosCli` for CLI interactions
- Changed `updateStackFile()` to `loadStacks()` and `reloadStacks()`
- Added new tree item type: `StackFile`
- Refactored tree structure:
  - `Stack` → `StackFile` → `Component`
- Removed deep merge logic (now handled by atmos CLI)

### 3. Custom Editor Enhancement (`src/stackCustomEditor.ts`)

#### Previous Behavior
- Showed basic component information
- Displayed imports and global variables
- No source file information

#### New Behavior
- **Component Selector**: Dropdown to select which component to view
- **Provenance Display**: When a component is selected, shows:
  - Legend explaining provenance symbols
  - Full component configuration with source annotations
  - Color-coded symbols:
    - **● Green** - Defined in parent stack
    - **○ Blue** - Inherited/imported from other files
    - **∴ Purple** - Computed/templated values
  - Source file paths with nesting level indicators

#### Key Changes
- Added `atmosCli: AtmosCli` for CLI interactions
- Updated `updateWebview()` to accept `selectedComponent` and `selectedStack` parameters
- Added `renderComponentProvenance()` method to display provenance information
- Enhanced CSS with provenance-specific styles
- Added JavaScript handler for component selection

### 4. Extension Integration (`src/extension.ts`)

#### Changes
- Removed `updateStackFile()` calls for `stackViewerProvider` (no longer needed)
- Updated `atmos.stackViewer.refresh` command to call `reloadStacks()`
- Kept `componentsViewProvider.updateStackFile()` for the components view

## User Experience

### Stack Viewer
1. Open the Atmos Stack Viewer in the sidebar
2. See all stacks listed (e.g., `acme-use1-dev`, `acme-use1-prod`)
3. Expand a stack to see contributing files (e.g., `orgs/acme/dev.yaml`, `catalog/vpc.yaml`)
4. Expand a file to see components defined in that file
5. Click a component to open its definition file

### Custom Editor
1. Open a stack YAML file with the Atmos custom editor
2. See a dropdown list of all components in the file
3. Select a component from the dropdown
4. View the component's full configuration with provenance annotations
5. See exactly which file each configuration value comes from
6. Understand the inheritance hierarchy with visual symbols

## Benefits

1. **Better Navigation**: Hierarchical view of stacks → files → components
2. **Complete Overview**: See all stacks at once, not just the currently open file
3. **Source Tracing**: Know exactly where each configuration value is defined
4. **Visual Clarity**: Color-coded symbols and clear annotations
5. **No File Switching Required**: View all stack information without opening multiple files

## Technical Notes

- All CLI commands are executed asynchronously with proper error handling
- The provenance parser handles the special symbols (●, ○, ∴) from atmos output
- The viewer automatically loads stacks on initialization
- The custom editor updates in real-time as you select different components
- TypeScript compilation successful with no errors

## Testing Recommendations

1. Open the extension and verify the Stack Viewer shows all stacks
2. Expand a stack and verify files are listed
3. Expand a file and verify components are shown
4. Click a component and verify it opens the correct file
5. Open a stack file with the custom editor
6. Select a component and verify provenance is displayed correctly
7. Verify the legend and color coding are correct
8. Test with stacks that have multiple levels of imports
