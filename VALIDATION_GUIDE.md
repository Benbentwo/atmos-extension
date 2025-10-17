# Atmos YAML Validation Guide

## Overview

The Atmos extension now includes comprehensive validation for stack YAML files to catch common errors and typos.

## Schema Validation

### Valid Top-Level Keys

The following top-level keys are valid in Atmos stack files:

- `import` - Import other stack files (correct)
- `vars` - Define variables
- `settings` - Configuration settings
- `env` - Environment variables
- `backend` - Backend configuration
- `backend_type` - Backend type specification
- `remote_state_backend` - Remote state backend configuration
- `remote_state_backend_type` - Remote state backend type
- `components` - Component definitions
- `terraform` - Terraform components (legacy format)
- `helmfile` - Helmfile components
- `workflows` - Workflow definitions
- `metadata` - Metadata information
- `overrides` - Override configurations

### Common Typos and Corrections

The validator will detect common typos and suggest corrections:

| Invalid Key | Correct Key | Error Message |
|-------------|-------------|---------------|
| `imports` | `import` | Invalid key 'imports'. Did you mean 'import'? |
| `variable` | `vars` | Invalid key 'variable'. Did you mean 'vars'? |
| `variables` | `vars` | Invalid key 'variables'. Did you mean 'vars'? |
| `setting` | `settings` | Invalid key 'setting'. Did you mean 'settings'? |
| `component` | `components` | Invalid key 'component'. Did you mean 'components'? |
| `workflow` | `workflows` | Invalid key 'workflow'. Did you mean 'workflows'? |

## Examples

### ❌ Incorrect (will show red squiggle)

```yaml
imports:  # ERROR: Invalid key 'imports'. Did you mean 'import'?
  - orgs/acme/_defaults
  - catalog/rds

variables:  # ERROR: Invalid key 'variables'. Did you mean 'vars'?
  environment: staging
```

### ✅ Correct

```yaml
import:  # Correct
  - orgs/acme/_defaults
  - catalog/rds

vars:  # Correct
  environment: staging
```

## Validation Features

1. **Real-time validation** - Errors appear as you type
2. **Helpful suggestions** - Common typos include correction hints
3. **YAML syntax checking** - Validates YAML structure
4. **Component reference validation** - Checks if referenced components exist
5. **Import path validation** - Verifies import files exist
6. **Circular import detection** - Detects circular dependencies

## Configuration

Validation can be configured in VS Code settings:

```json
{
  "atmos.validation.enabled": true,
  "atmos.validation.onSave": true
}
```

## Implementation Details

The validation is implemented in:
- `src/diagnosticsProvider.ts` - Main validation logic
- `src/stackParser.ts` - Stack file parsing with support for both `import` and `imports` (legacy)
- `src/completionProvider.ts` - Auto-completion support

The parser maintains backward compatibility by supporting both `import` and `imports`, but the validator will flag `imports` as an error to encourage using the correct syntax.
