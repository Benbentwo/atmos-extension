import * as vscode from 'vscode';
import { AtmosWorkspaceManager, AtmosWorkspace } from './atmosWorkspaceManager';

export class WorkspaceSwitcher {
    private statusBarItem: vscode.StatusBarItem;
    private workspaceManager: AtmosWorkspaceManager;

    constructor(workspaceManager: AtmosWorkspaceManager) {
        this.workspaceManager = workspaceManager;
        
        // Create status bar item for workspace indicator
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            99 // Priority just before stack context indicator (100)
        );
        this.statusBarItem.command = 'atmos.switchWorkspace';
        this.statusBarItem.tooltip = 'Click to switch Atmos workspace';
    }

    public activate(context: vscode.ExtensionContext): void {
        context.subscriptions.push(this.statusBarItem);

        // Listen for workspace changes
        this.workspaceManager.onDidChangeActiveWorkspace(() => {
            this.updateStatusBar();
        });

        // Listen for active editor changes
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.workspaceManager.autoSetActiveWorkspace(editor.document.uri.fsPath);
                }
                this.updateStatusBar();
            })
        );

        // Initial update
        this.updateStatusBar();
    }

    private updateStatusBar(): void {
        const workspaceCount = this.workspaceManager.getWorkspaceCount();

        if (workspaceCount === 0) {
            this.statusBarItem.hide();
            return;
        }

        const activeWorkspace = this.workspaceManager.getActiveWorkspace();

        if (workspaceCount === 1) {
            // Single workspace - show simple indicator
            if (activeWorkspace) {
                this.statusBarItem.text = `$(folder) ${activeWorkspace.name}`;
                this.statusBarItem.tooltip = new vscode.MarkdownString(
                    `**Atmos Workspace**\n\n${activeWorkspace.rootPath}`
                );
            }
            // Only show if multiple workspaces might be added later
            // For now, hide if single workspace
            this.statusBarItem.hide();
        } else {
            // Multiple workspaces - show with count
            if (activeWorkspace) {
                this.statusBarItem.text = `$(folder) ${activeWorkspace.name} (${workspaceCount})`;
                this.statusBarItem.tooltip = new vscode.MarkdownString(
                    `**Active Workspace:** ${activeWorkspace.name}\n\n` +
                    `**Path:** ${activeWorkspace.rootPath}\n\n` +
                    `**Total Workspaces:** ${workspaceCount}\n\n` +
                    `_Click to switch workspace_`
                );
            } else {
                this.statusBarItem.text = `$(folder) Atmos (${workspaceCount})`;
                this.statusBarItem.tooltip = `${workspaceCount} Atmos workspaces found. Click to select one.`;
            }
            this.statusBarItem.show();
        }
    }

    public async showWorkspaceSwitcher(): Promise<void> {
        const workspaces = this.workspaceManager.getAllWorkspaces();

        if (workspaces.length === 0) {
            vscode.window.showInformationMessage('No Atmos workspaces found');
            return;
        }

        if (workspaces.length === 1) {
            vscode.window.showInformationMessage(
                `Only one Atmos workspace: ${workspaces[0].name}`
            );
            return;
        }

        const activeWorkspace = this.workspaceManager.getActiveWorkspace();

        // Build quick pick items
        const items: (vscode.QuickPickItem & { workspaceId: string })[] = workspaces.map(workspace => {
            const isActive = activeWorkspace?.id === workspace.id;
            const stacksPath = workspace.config?.stacksPath || 'stacks';
            const componentsPath = workspace.config?.componentsPath || 'components/terraform';

            return {
                workspaceId: workspace.id,
                label: `${isActive ? '$(check) ' : ''}${workspace.name}`,
                description: workspace.rootPath,
                detail: `Stacks: ${stacksPath}, Components: ${componentsPath}`,
                picked: isActive
            };
        });

        const selected = await vscode.window.showQuickPick(items, {
            title: 'Select Atmos Workspace',
            placeHolder: 'Choose the workspace to activate',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (selected) {
            const success = this.workspaceManager.setActiveWorkspace(selected.workspaceId);
            if (success) {
                const workspace = this.workspaceManager.getWorkspace(selected.workspaceId);
                vscode.window.showInformationMessage(
                    `Switched to workspace: ${workspace?.name}`
                );
            }
        }
    }

    public async showWorkspaceInfo(): Promise<void> {
        const activeWorkspace = this.workspaceManager.getActiveWorkspace();

        if (!activeWorkspace) {
            vscode.window.showInformationMessage('No active Atmos workspace');
            return;
        }

        const config = activeWorkspace.config;
        const workspaceCount = this.workspaceManager.getWorkspaceCount();

        const info = [
            `**Active Workspace:** ${activeWorkspace.name}`,
            `**Root Path:** ${activeWorkspace.rootPath}`,
            `**Config File:** ${activeWorkspace.configPath}`,
            '',
            '**Configuration:**',
            `- Stacks Path: ${config?.stacksPath || 'stacks'}`,
            `- Components Path: ${config?.componentsPath || 'components/terraform'}`,
            `- Base Path: ${config?.basePath || '.'}`,
            '',
            `**Total Workspaces:** ${workspaceCount}`
        ];

        if (workspaceCount > 1) {
            info.push('', '_Click status bar to switch workspaces_');
        }

        const panel = vscode.window.createWebviewPanel(
            'atmosWorkspaceInfo',
            `Atmos Workspace: ${activeWorkspace.name}`,
            vscode.ViewColumn.One,
            {}
        );

        panel.webview.html = this.getWorkspaceInfoHtml(activeWorkspace, workspaceCount);
    }

    private getWorkspaceInfoHtml(workspace: AtmosWorkspace, totalWorkspaces: number): string {
        const config = workspace.config;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Atmos Workspace Info</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        h2 {
            color: var(--vscode-textLink-foreground);
            margin-top: 20px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 10px;
            margin: 20px 0;
        }
        .label {
            font-weight: bold;
            color: var(--vscode-textPreformat-foreground);
        }
        .value {
            font-family: var(--vscode-editor-font-family);
            color: var(--vscode-editor-foreground);
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <h1>📁 Atmos Workspace: ${workspace.name}</h1>
    
    <div class="info-grid">
        <div class="label">Root Path:</div>
        <div class="value">${workspace.rootPath}</div>
        
        <div class="label">Config File:</div>
        <div class="value">${workspace.configPath}</div>
        
        <div class="label">Status:</div>
        <div class="value"><span class="badge">Active</span></div>
    </div>

    <h2>Configuration</h2>
    <div class="info-grid">
        <div class="label">Stacks Path:</div>
        <div class="value">${config?.stacksPath || 'stacks'}</div>
        
        <div class="label">Components Path:</div>
        <div class="value">${config?.componentsPath || 'components/terraform'}</div>
        
        <div class="label">Base Path:</div>
        <div class="value">${config?.basePath || '.'}</div>
    </div>

    ${totalWorkspaces > 1 ? `
    <h2>Workspace Management</h2>
    <p>
        <strong>${totalWorkspaces}</strong> Atmos workspace${totalWorkspaces > 1 ? 's' : ''} detected in this folder.
        Click the workspace indicator in the status bar to switch between them.
    </p>
    ` : ''}
</body>
</html>`;
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
