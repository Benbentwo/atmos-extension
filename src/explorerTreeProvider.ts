import * as vscode from 'vscode';
import * as path from 'path';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser, StackComponent } from './stackParser';

/**
 * Tree item types for the explorer view
 */
export enum TreeItemType {
    StackFile = 'stackFile',
    Component = 'component',
    ComponentSection = 'componentSection'
}

/**
 * Tree item for stack files and components in Explorer
 */
export class StackTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: TreeItemType,
        public readonly filePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly componentName?: string,
        public readonly lineNumber?: number
    ) {
        super(label, collapsibleState);

        this.contextValue = type;
        this.setIcon();
        this.setCommand();
    }

    private setIcon(): void {
        switch (this.type) {
            case TreeItemType.StackFile:
                this.iconPath = new vscode.ThemeIcon('file-code');
                break;
            case TreeItemType.Component:
                this.iconPath = new vscode.ThemeIcon('package');
                break;
            case TreeItemType.ComponentSection:
                this.iconPath = new vscode.ThemeIcon('symbol-property');
                break;
        }
    }

    private setCommand(): void {
        if (this.type === TreeItemType.Component && this.lineNumber !== undefined) {
            this.command = {
                command: 'atmos.explorer.openComponent',
                title: 'Open Component',
                arguments: [this.filePath, this.componentName, this.lineNumber]
            };
        }
    }
}

/**
 * Tree data provider for stack files with expandable components
 * This integrates with VS Code's Explorer view to show components within stack files
 */
export class ExplorerTreeProvider implements vscode.TreeDataProvider<StackTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<StackTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private stackParser: StackParser;
    private fileWatcher: vscode.FileSystemWatcher | undefined;

    constructor(private configManager: AtmosConfigManager) {
        this.stackParser = new StackParser(configManager.getStacksPath());
        this.setupFileWatcher();
    }

    /**
     * Set up file system watcher for stack files
     */
    private setupFileWatcher(): void {
        const stacksPath = this.configManager.getStacksPath();
        const pattern = new vscode.RelativePattern(stacksPath, '**/*.{yaml,yml}');
        
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        this.fileWatcher.onDidChange(() => this.refresh());
        this.fileWatcher.onDidCreate(() => this.refresh());
        this.fileWatcher.onDidDelete(() => this.refresh());
    }

    /**
     * Get tree item for display
     */
    getTreeItem(element: StackTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children for a tree item
     */
    async getChildren(element?: StackTreeItem): Promise<StackTreeItem[]> {
        if (!element) {
            // Root level - this provider doesn't show root items
            // It only provides children for stack files
            return [];
        }

        if (element.type === TreeItemType.StackFile) {
            // Return components for this stack file
            return this.getComponentsForStack(element.filePath);
        }

        return [];
    }

    /**
     * Get parent of a tree item
     */
    getParent(element: StackTreeItem): vscode.ProviderResult<StackTreeItem> {
        // Components don't have parents in this simple tree
        return null;
    }

    /**
     * Get components for a stack file
     */
    private async getComponentsForStack(filePath: string): Promise<StackTreeItem[]> {
        try {
            const parsed = await this.stackParser.parseStackFile(filePath);
            const components: StackTreeItem[] = [];

            // Get terraform components
            if (parsed.components.size > 0) {
                for (const [name, component] of parsed.components.entries()) {
                    const lineNumber = await this.findComponentLineNumber(filePath, name);
                    
                    const item = new StackTreeItem(
                        name,
                        TreeItemType.Component,
                        filePath,
                        vscode.TreeItemCollapsibleState.None,
                        name,
                        lineNumber
                    );

                    // Add tooltip with component info
                    const componentType = component.component || 'unknown';
                    item.tooltip = `Component: ${componentType}\nClick to navigate`;
                    item.description = componentType;

                    components.push(item);
                }
            }

            return components;
        } catch (error) {
            console.error(`Error getting components for ${filePath}:`, error);
            return [];
        }
    }

    /**
     * Find the line number where a component is defined
     */
    private async findComponentLineNumber(filePath: string, componentName: string): Promise<number | undefined> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const text = document.getText();
            const lines = text.split('\n');

            let inComponents = false;
            let inTerraform = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Check if we're in the components section
                if (line.match(/^components:/)) {
                    inComponents = true;
                    continue;
                }

                // Check if we're in the terraform subsection
                if (inComponents && line.match(/^\s{2}terraform:/)) {
                    inTerraform = true;
                    continue;
                }

                // Check for component name
                if (inTerraform && line.match(new RegExp(`^\\s{4}${componentName}:`))) {
                    return i;
                }

                // Exit sections if we hit a non-indented line
                if (line.match(/^[a-zA-Z]/) && !line.match(/^components:/)) {
                    inComponents = false;
                    inTerraform = false;
                }
            }

            return undefined;
        } catch (error) {
            console.error(`Error finding line number for component ${componentName}:`, error);
            return undefined;
        }
    }

    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this._onDidChangeTreeData.dispose();
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
    }
}

/**
 * Helper function to check if a URI represents a stack file
 */
export function isStackFile(uri: vscode.Uri, configManager: AtmosConfigManager): boolean {
    return configManager.isStackFile(uri.fsPath);
}

/**
 * Helper function to get components for a stack file
 * This can be used by other parts of the extension
 */
export async function getStackComponents(
    filePath: string,
    configManager: AtmosConfigManager
): Promise<Map<string, StackComponent>> {
    const stackParser = new StackParser(configManager.getStacksPath());
    const parsed = await stackParser.parseStackFile(filePath);
    return parsed.components;
}
