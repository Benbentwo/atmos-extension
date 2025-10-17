# Validation and Navigation Fixes

## Summary

Fixed three critical issues with YAML validation and navigation in the Atmos extension:

1. **Schema Validation**: Stack files are now validated against the Atmos manifest schema
2. **Navigation Control**: Disabled Cmd/Ctrl+Click navigation for invalid `imports` key
3. **Diagnostic Highlighting**: Improved red squiggle detection for invalid keys

## Changes Made

### 1. Schema-Based Validation (`src/atmosConfig.ts`)

**Updated `AtmosConfig` interface** to properly parse schema configuration:
```typescript
schemas?: {
    atmos?: {
        manifest?: string;
    };
    jsonschema?: {
        base_path?: string;
    };
    opa?: {
        base_path?: string;
    };
};
```

**Added `getManifestSchemaPath()` method**:
- Returns the schema path from `atmos.yaml` under `schemas.atmos.manifest`
- Falls back to default: `https://atmos.tools/schemas/atmos/atmos-manifest/1.0/atmos-manifest.json`
- Supports both URL and local file paths

### 2. Enhanced Diagnostics Provider (`src/diagnosticsProvider.ts`)

**Added schema validation methods**:
- `validateAgainstSchema()`: Validates YAML against JSON schema
- `loadSchema()`: Loads and caches schemas from URLs or local files
- `fetchSchema()`: Fetches schemas from HTTP/HTTPS URLs

**Improved `findTopLevelKeyPosition()`**:
- Now skips comment lines
- Only matches keys with zero indentation (true top-level)
- Added regex escaping for special characters
- More precise range detection for red squiggles

**Added validation settings check**:
- Respects `atmos.validation.enabled` configuration
- Allows users to disable validation if needed

### 3. Navigation Control

**Updated `stackParser.ts`**:
- `extractImportAtPosition()` now only recognizes valid `import:` key
- Removed support for invalid `imports:` key in navigation

**Updated `completionProvider.ts`**:
- Auto-completion only triggers under valid `import:` sections
- Removed completion support for invalid `imports:` key

**Hover provider** (`hoverProvider.ts`):
- Already uses `extractImportAtPosition()`, so inherits the fix
- Only shows tooltips for valid `import:` entries

**Definition provider** (`definitionProvider.ts`):
- Already uses `extractImportAtPosition()`, so inherits the fix
- Cmd/Ctrl+Click navigation only works for valid `import:` entries

## Configuration

### atmos.yaml Schema Configuration

To use a custom schema, add to your `atmos.yaml`:

```yaml
schemas:
  atmos:
    manifest: "stacks/schemas/atmos/atmos-manifest/1.0/atmos-manifest.json"
```

If omitted, the extension uses the default schema from atmos.tools.

### VS Code Settings

```json
{
  "atmos.validation.enabled": true,
  "atmos.validation.onSave": true
}
```

## Testing

To test the fixes:

1. **Schema Validation**:
   - Open any stack YAML file
   - The extension will validate against the configured schema
   - Missing required properties will show errors

2. **Invalid Key Detection**:
   - Open `/stacks/orgs/acme/_defaults.yaml`
   - Line 7 has `imports:` (invalid) - should show red squiggle
   - Line 11 has `foo:` (invalid) - should show red squiggle
   - Error message: "Invalid key 'imports'. Did you mean 'import'?"

3. **Navigation Disabled for Invalid Keys**:
   - Try Cmd/Ctrl+Click on paths under `imports:` - should NOT navigate
   - Try Cmd/Ctrl+Click on paths under `import:` - SHOULD navigate
   - Hover over paths under `imports:` - should NOT show tooltip
   - Hover over paths under `import:` - SHOULD show tooltip

4. **Auto-completion**:
   - Type under `import:` section - should show completions
   - Type under `imports:` section - should NOT show completions

## Valid Top-Level Keys

The following keys are recognized as valid in Atmos stack files:

- `import` - Import other stack files (correct syntax)
- `vars` - Variables
- `settings` - Settings
- `env` - Environment variables
- `backend` - Backend configuration
- `backend_type` - Backend type
- `remote_state_backend` - Remote state backend
- `remote_state_backend_type` - Remote state backend type
- `components` - Component definitions
- `terraform` - Terraform components (legacy)
- `helmfile` - Helmfile components
- `workflows` - Workflows
- `metadata` - Metadata
- `overrides` - Overrides

## Common Typos Detected

The validator provides helpful suggestions for common mistakes:

- `imports` → `import`
- `variable` or `variables` → `vars`
- `setting` → `settings`
- `component` → `components`
- `workflow` → `workflows`

## Files Modified

- `src/atmosConfig.ts` - Added schema path configuration
- `src/diagnosticsProvider.ts` - Enhanced validation and diagnostics
- `src/stackParser.ts` - Restricted import detection to valid syntax
- `src/completionProvider.ts` - Restricted completions to valid syntax
- `src/hoverProvider.ts` - Inherits navigation restrictions
- `src/definitionProvider.ts` - Inherits navigation restrictions

## Backward Compatibility

The parser still reads `imports:` for backward compatibility when parsing files, but:
- The validator flags it as an error
- Navigation features are disabled
- Auto-completion is disabled
- This encourages migration to the correct `import:` syntax
