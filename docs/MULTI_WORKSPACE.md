# Multi-Workspace Support

## Overview

The Atmos VS Code Extension now supports managing multiple Atmos projects within a single opened folder. This is particularly useful for:

- **Monorepos**: Multiple projects in one repository
- **Development folders**: Multiple cloned repositories in a parent directory
- **Multi-tenant setups**: Separate Atmos configurations for different environments or clients

## How It Works

### Automatic Discovery

When you open a folder in VS Code, the extension automatically:

1. **Recursively scans** the entire folder structure for `atmos.yaml` or `atmos.yml` files
2. **Creates isolated workspaces** for each discovered configuration
3. **Sets the first workspace as active** by default
4. **Monitors file changes** to detect new or removed configurations

### Workspace Context

Each workspace maintains its own:

- **Configuration**: Independent `atmos.yaml` settings
- **Stacks path**: Separate stack directories
- **Components path**: Separate component directories
- **Validation rules**: Isolated diagnostics and linting

### Automatic Switching

The extension intelligently switches the active workspace based on:

- **Current file location**: Automatically activates the workspace containing the file you're editing
- **Manual selection**: Use the workspace switcher to manually choose a workspace

## User Interface

### Status Bar Indicator

When multiple workspaces are detected, a workspace indicator appears in the status bar:

```
📁 project-a (3)
```

- **Icon**: 📁 folder icon
- **Name**: Current workspace name (relative path from opened folder)
- **Count**: Total number of workspaces in parentheses
- **Click**: Opens workspace switcher

### Workspace Switcher

Access via:
- Clicking the status bar indicator
- Command Palette: `Atmos: Switch Workspace`
- Keyboard shortcut (if configured)

The switcher shows:
- ✓ **Active workspace** (checkmark indicator)
- **Workspace name** (relative path)
- **Root path** (full path to workspace)
- **Configuration details** (stacks path, components path)

### Workspace Info Panel

View detailed information about the active workspace:

- Command: `Atmos: Show Workspace Info`
- Shows:
  - Workspace name and paths
  - Configuration settings
  - Total workspace count
  - Quick actions

## Example Scenarios

### Scenario 1: Development Folder with Multiple Repos

```
~/dev/
├── project-a/
│   ├── atmos.yaml
│   ├── stacks/
│   └── components/
├── project-b/
│   ├── atmos.yaml
│   ├── stacks/
│   └── components/
└── project-c/
    ├── atmos.yaml
    ├── stacks/
    └── components/
```

**Result**: 3 workspaces detected
- `project-a`
- `project-b`
- `project-c`

When you edit a file in `project-a/stacks/dev.yaml`, the extension automatically switches to the `project-a` workspace.

### Scenario 2: Monorepo with Multiple Atmos Projects

```
monorepo/
├── infrastructure/
│   ├── aws/
│   │   ├── atmos.yaml
│   │   └── stacks/
│   └── gcp/
│       ├── atmos.yaml
│       └── stacks/
└── applications/
    └── backend/
        ├── atmos.yaml
        └── stacks/
```

**Result**: 3 workspaces detected
- `infrastructure/aws`
- `infrastructure/gcp`
- `applications/backend`

Each workspace is completely isolated with its own configuration.

### Scenario 3: Nested Workspaces

```
parent/
├── atmos.yaml          # Parent workspace
├── stacks/
└── child/
    ├── atmos.yaml      # Child workspace
    └── stacks/
```

**Result**: 2 workspaces detected
- `root` (parent)
- `child`

The extension detects both and treats them as separate workspaces. When editing files, it selects the **most specific** workspace (longest matching path).

## Commands

| Command | Description |
|---------|-------------|
| `Atmos: Switch Workspace` | Open workspace switcher to manually select active workspace |
| `Atmos: Show Workspace Info` | Display detailed information about the active workspace |

## Configuration

No additional configuration is required. The multi-workspace feature works automatically.

### Workspace Discovery Settings (Future)

Planned settings for customizing workspace discovery:

- `atmos.workspace.maxDepth`: Maximum directory depth to search (default: 10)
- `atmos.workspace.excludePaths`: Glob patterns to exclude from search
- `atmos.workspace.autoSwitch`: Enable/disable automatic workspace switching

## Performance

### Discovery Performance

- **Typical folders**: < 1 second
- **Large folders** (1000+ directories): < 2 seconds
- **Excluded directories**: `node_modules`, `.git`, `dist`, `out`, `build`, `.terraform`, `vendor`

### Memory Usage

Each workspace maintains:
- Configuration object (~1-5 KB)
- File system watchers (minimal overhead)
- Stack/component caches (lazy-loaded)

**Total overhead**: ~10-50 KB per workspace

## Troubleshooting

### Workspaces Not Detected

**Problem**: Extension doesn't find your `atmos.yaml` files

**Solutions**:
1. Ensure files are named exactly `atmos.yaml` or `atmos.yml`
2. Check that files are not in excluded directories
3. Verify files are within the opened folder
4. Reload VS Code window

### Wrong Workspace Active

**Problem**: Extension activates the wrong workspace for a file

**Solutions**:
1. Manually switch using the workspace switcher
2. Check for nested `atmos.yaml` files (most specific wins)
3. Verify file is within the workspace root path

### Performance Issues

**Problem**: Slow workspace discovery or switching

**Solutions**:
1. Reduce folder size (exclude unnecessary directories)
2. Close unused workspace folders
3. Check for excessive file system watchers

## Technical Details

### Workspace ID Generation

Each workspace gets a unique ID based on its relative path:

```typescript
// Example: infrastructure/aws/atmos.yaml
// ID: infrastructure_aws_atmos
```

### Active Workspace Selection

Priority order:
1. **File-based**: Workspace containing the current file (longest path match)
2. **Manual**: User-selected workspace via switcher
3. **Default**: First discovered workspace

### Workspace Isolation

Each workspace maintains:
- Independent `AtmosConfigManager` instance
- Separate stack parser with workspace-specific paths
- Isolated diagnostics and validation
- Independent file watchers

### Event Flow

```
1. File opened/changed
   ↓
2. Determine workspace for file path
   ↓
3. Switch active workspace if different
   ↓
4. Update all providers with new config
   ↓
5. Re-validate open documents
   ↓
6. Update UI (status bar, indicators)
```

## API for Extension Developers

If you're extending this extension, you can access the workspace manager:

```typescript
import { AtmosWorkspaceManager } from './atmosWorkspaceManager';

// Get active workspace
const workspace = workspaceManager.getActiveWorkspace();

// Listen for workspace changes
workspaceManager.onDidChangeActiveWorkspace((workspace) => {
    console.log(`Switched to: ${workspace?.name}`);
});

// Get all workspaces
const allWorkspaces = workspaceManager.getAllWorkspaces();

// Switch workspace programmatically
workspaceManager.setActiveWorkspace(workspaceId);
```

## Future Enhancements

Planned improvements:

- [ ] Workspace-specific settings overrides
- [ ] Workspace templates and scaffolding
- [ ] Cross-workspace component references
- [ ] Workspace dependency graphs
- [ ] Workspace health dashboard
- [ ] Import/export workspace configurations

## Feedback

Have suggestions for improving multi-workspace support? Open an issue on [GitHub](https://github.com/Benbentwo/atmos-extension/issues).
