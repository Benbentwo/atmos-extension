# Stack Name Pattern Feature

## Overview

The Atmos VS Code extension now calculates stack names dynamically using the pattern defined in `atmos.yaml`, rather than hardcoding the format.

## Configuration

In `atmos.yaml`, define the stack name pattern:

```yaml
stacks:
  name_pattern: "{tenant}-{environment}-{stage}"
  # OR use Go template style:
  # name_template: "{{.tenant}}-{{.environment}}-{{.stage}}"
```

## How It Works

1. **Pattern Definition**: The pattern is defined in `atmos.yaml` under `stacks.name_pattern` or `stacks.name_template`

2. **Variable Resolution**: Variables are extracted from the stack file's `vars` or `settings` sections:
   ```yaml
   vars:
     tenant: "plat"
     environment: "ue2"
     stage: "dev"
   ```

3. **Calculation**: The extension replaces template variables in the pattern:
   - Pattern: `{tenant}-{environment}-{stage}`
   - Result: `plat-ue2-dev`

4. **Display**: The calculated name appears in:
   - Status bar indicator
   - File decorations in Explorer
   - Tooltips and quick picks

## Supported Template Formats

- **Simple format**: `{variable}` (e.g., `{tenant}-{environment}`)
- **Go template format**: `{{.variable}}` (e.g., `{{.tenant}}-{{.environment}}`)

## Implementation Details

### Files Modified

1. **PRD.md**
   - Added documentation for stack name pattern calculation
   - Specified support for both `name_pattern` and `name_template`

2. **IMPLEMENTATION.md**
   - Added "Stack Name Pattern Calculation" section
   - Updated Stack Context provider documentation

3. **atmosConfig.ts**
   - Added `getStackNamePattern()`: Returns the pattern from config
   - Added `calculateStackName(vars)`: Calculates stack name from pattern and variables
   - Supports both `{var}` and `{{.var}}` template formats

4. **stackContextProvider.ts**
   - Updated `updateStatusBar()` to use pattern-based calculation
   - Added `buildFallbackStackName()` for when pattern is unavailable
   - Enhanced tooltip to show calculated name and pattern

5. **fileDecorationProvider.ts**
   - Updated `getStackName()` to use pattern-based calculation
   - Merges vars and settings for comprehensive variable resolution
   - Maintains fallback logic for backward compatibility

## Fallback Behavior

If the pattern is not defined or variables are missing:
1. Attempts to build name from available vars (namespace, tenant, environment, stage, region)
2. Falls back to file path-based naming

## Example

Given this configuration:

**atmos.yaml:**
```yaml
stacks:
  name_pattern: "{tenant}-{environment}-{stage}"
```

**Stack file (orgs/acme/plat/ue2/dev.yaml):**
```yaml
vars:
  tenant: plat
  environment: ue2
  stage: dev
```

**Result:**
- Status bar shows: `$(layers) plat-ue2-dev`
- File decoration shows: `plat-ue2-dev`
- Tooltip includes: "Calculated Name: plat-ue2-dev" and "Pattern: `{tenant}-{environment}-{stage}`"

## Benefits

1. **Flexibility**: Different projects can use different naming conventions
2. **Consistency**: Stack names follow the same pattern defined in Atmos config
3. **Maintainability**: Changing the pattern updates all displays automatically
4. **Compatibility**: Supports both Atmos naming formats (simple and Go template)
