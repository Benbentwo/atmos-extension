import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { StackContextProvider } from '../stackContextProvider';
import { AtmosConfigManager } from '../atmosConfig';

suite('Stack Context Provider Test Suite', () => {
    vscode.window.showInformationMessage('Start Stack Context tests.');

    test('Stack context should be extracted from dev stack', async () => {
        // Get workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Workspace folder should exist');

        // Initialize config manager
        const configManager = new AtmosConfigManager(workspaceFolder.uri.fsPath);
        await configManager.loadConfig();

        // Initialize stack context provider
        const stackContextProvider = new StackContextProvider(configManager);

        // Open the dev.yaml stack file
        const devStackPath = path.join(
            workspaceFolder.uri.fsPath,
            'stacks',
            'orgs',
            'acme',
            'dev.yaml'
        );

        const document = await vscode.workspace.openTextDocument(devStackPath);
        await vscode.window.showTextDocument(document);

        // Wait a bit for the context to update
        await new Promise(resolve => setTimeout(resolve, 200));

        // Get the current context
        const context = stackContextProvider.getCurrentContext();

        // Verify context was extracted
        assert.ok(context, 'Context should be extracted');
        assert.strictEqual(context?.environment, 'dev', 'Environment should be dev');
        assert.strictEqual(context?.stage, 'dev', 'Stage should be dev');
        assert.strictEqual(context?.isValid, true, 'Stack should be valid');

        // Cleanup
        stackContextProvider.dispose();
    });

    test('Stack context should show not valid for non-stack files', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder);

        const configManager = new AtmosConfigManager(workspaceFolder.uri.fsPath);
        await configManager.loadConfig();

        const stackContextProvider = new StackContextProvider(configManager);

        // Open a non-stack file (README.md)
        const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
        const document = await vscode.workspace.openTextDocument(readmePath);
        await vscode.window.showTextDocument(document);

        await new Promise(resolve => setTimeout(resolve, 200));

        const context = stackContextProvider.getCurrentContext();
        assert.strictEqual(context, null, 'Context should be null for non-stack files');

        stackContextProvider.dispose();
    });
});
