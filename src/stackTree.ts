import * as vscode from 'vscode';
import { loadAtmosConfig, listStacks } from './atmos';

export class StackTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
        if (element) {
            return [];
        }
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const config = loadAtmosConfig(workspaceFolder);
        if (!config) {
            return [];
        }
        return listStacks(config).map(s => {
            const item = new vscode.TreeItem(s, vscode.TreeItemCollapsibleState.None);
            item.command = {
                command: 'vscode.open',
                title: 'Open Stack',
                arguments: [vscode.Uri.file(config.stacksPath + '/' + s)]
            };
            return item;
        });
    }
}
