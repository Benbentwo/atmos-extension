# Development

Use `pnpm` for managing dependencies and scripts.

```bash
pnpm run lint      # check code style
pnpm run compile   # build the extension
pnpm test          # run tests (requires vscode-test)
```

The tests rely on the `vscode-test` package and may require network access to download VS Code binaries on first run.
