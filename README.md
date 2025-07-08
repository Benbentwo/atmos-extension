# Cloud Posse Atmos

The Cloud Posse Atmos extension provides navigation helpers for projects using [Atmos](https://github.com/cloudposse/atmos). It reads the `atmos.yaml` in the workspace to discover where stack definitions live and exposes a set of tools to explore them.

## Features

* Command‑click `import:` entries in stack files to open the referenced stack relative to `stacks.base_path`.
* Hover over `component:` lines to see component information.
* "Atmos Stacks" view in the explorer listing detected stacks.
* Command `Show Atmos Stack Info` refreshes the tree view.

## Requirements

Stacks must be defined in `atmos.yaml` using the `base_path` and `stacks.base_path` keys. The extension automatically loads these values on startup.

## Extension Settings

This extension contributes the `cloudposse-atmos.showStackInfo` command which can be used from the command palette.

## Documentation

See the [docs](docs/) directory for development and usage instructions.
