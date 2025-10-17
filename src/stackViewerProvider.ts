import * as vscode from 'vscode';
import * as path from 'path';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser, StackConfig, StackComponent } from './stackParser';
import { AtmosCli, AtmosStack } from './atmosCli';

/**
 * Tree item types for the stack viewer
 */
enum StackViewItemType {
    Stack = 'stack',
    StackFile = 'stackfile',
    Component = 'component',
    Section = 'section',
    Property = 'property',
    Value = 'value',
    Import = 'import',
    NoStack = 'nostack',
    Loading = 'loading',
    Error = 'error'
}

/**
 * Tree item for the stack viewer
 */
class StackViewItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: StackViewItemType,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly value?: any,
        public readonly filePath?: string,
        public readonly componentName?: string,
        public readonly stackName?: string
    ) {
        super(label, collapsibleState);
        
        // Set context value for when clauses
        this.contextValue = type;
        
        // Set icons based on type
        switch (type) {
            case StackViewItemType.Stack:
                this.iconPath = new vscode.ThemeIcon('layers');
                break;
            case StackViewItemType.StackFile:
                this.iconPath = new vscode.ThemeIcon('file');
                break;
            case StackViewItemType.Component:
                this.iconPath = new vscode.ThemeIcon('package');
                break;
            case StackViewItemType.Section:
                this.iconPath = new vscode.ThemeIcon('symbol-namespace');
                break;
            case StackViewItemType.Import:
                this.iconPath = new vscode.ThemeIcon('references');
                break;
            case StackViewItemType.Property:
                this.iconPath = new vscode.ThemeIcon('symbol-property');
                break;
            case StackViewItemType.Value:
                this.iconPath = new vscode.ThemeIcon('symbol-string');
                break;
            case StackViewItemType.Error:
                this.iconPath = new vscode.ThemeIcon('error');
                break;
            case StackViewItemType.Loading:
                this.iconPath = new vscode.ThemeIcon('loading~spin');
                break;
            case StackViewItemType.NoStack:
                this.iconPath = new vscode.ThemeIcon('info');
                break;
        }
        
        // Description is now shown inline in the label for better YAML-like appearance
        
        // Set tooltip
        if (filePath) {
            this.tooltip = filePath;
        }
        
        // Make components clickable to navigate to definition
        if (type === StackViewItemType.Component && filePath) {
            this.command = {
                command: 'atmos.stackViewer.openComponent',
                title: 'Open Component',
                arguments: [filePath, componentName]
            };
        }
        
        // Make stack files clickable
        if (type === StackViewItemType.StackFile && filePath) {
            this.command = {
                command: 'atmos.stackViewer.openFile',
                title: 'Open File',
                arguments: [filePath]
            };
        }
        
        // Make imports clickable
        if (type === StackViewItemType.Import && filePath) {
            this.command = {
                command: 'atmos.stackViewer.openFile',
                title: 'Open File',
                arguments: [filePath]
            };
        }
    }
    
    private formatValue(value: any): string {
        if (value === null || value === undefined) {
            return 'null';
        }
        if (typeof value === 'boolean') {
            return value.toString();
        }
        if (typeof value === 'number') {
            return value.toString();
        }
        if (typeof value === 'string') {
            return value.length > 50 ? value.substring(0, 47) + '...' : value;
        }
        if (Array.isArray(value)) {
            return `[${value.length} items]`;
        }
        if (typeof value === 'object') {
            return `{${Object.keys(value).length} keys}`;
        }
        return String(value);
    }
}

/**
 * Stack Viewer Provider for the activity bar
 */
export class StackViewerProvider implements vscode.TreeDataProvider<StackViewItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<StackViewItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    private configManager: AtmosConfigManager;
    private stackParser: StackParser;
    private atmosCli: AtmosCli;
    private stacks: AtmosStack[] = [];
    private isLoading = false;
    private error: string | undefined;
    
    constructor(configManager: AtmosConfigManager) {
        this.configManager = configManager;
        this.stackParser = new StackParser(configManager.getStacksPath());
        this.atmosCli = new AtmosCli(configManager.getWorkspaceRoot());
        
        // Load stacks on initialization
        this.loadStacks();
    }
    
    /**
     * Refresh the tree view
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Load all stacks from atmos list stacks
     */
    private async loadStacks(): Promise<void> {
        this.isLoading = true;
        this.error = undefined;
        this.refresh();
        
        try {
            this.stacks = await this.atmosCli.listStacks();
            this.error = undefined;
        } catch (err) {
            this.error = err instanceof Error ? err.message : String(err);
            this.stacks = [];
        } finally {
            this.isLoading = false;
            this.refresh();
        }
    }
    
    /**
     * Reload stacks
     */
    public async reloadStacks(): Promise<void> {
        await this.loadStacks();
    }
    
    /**
     * Get tree item
     */
    getTreeItem(element: StackViewItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Get children for tree view
     */
    async getChildren(element?: StackViewItem): Promise<StackViewItem[]> {
        // Root level
        if (!element) {
            return this.getRootChildren();
        }
        
        // Child levels
        return this.getItemChildren(element);
    }
    
    /**
     * Get root level children - show all stacks
     */
    private getRootChildren(): StackViewItem[] {
        if (this.isLoading) {
            return [
                new StackViewItem(
                    'Loading stacks...',
                    StackViewItemType.Loading,
                    vscode.TreeItemCollapsibleState.None
                )
            ];
        }
        
        if (this.error) {
            return [
                new StackViewItem(
                    `Error: ${this.error}`,
                    StackViewItemType.Error,
                    vscode.TreeItemCollapsibleState.None
                )
            ];
        }
        
        if (this.stacks.length === 0) {
            return [
                new StackViewItem(
                    'No stacks found',
                    StackViewItemType.NoStack,
                    vscode.TreeItemCollapsibleState.None
                )
            ];
        }
        
        // Create a tree item for each stack
        return this.stacks.map(stack => 
            new StackViewItem(
                stack.stack,
                StackViewItemType.Stack,
                vscode.TreeItemCollapsibleState.Collapsed,
                stack,
                undefined,
                undefined,
                stack.stack
            )
        );
    }
    
    /**
     * Get children for a specific item
     */
    private async getItemChildren(element: StackViewItem): Promise<StackViewItem[]> {
        switch (element.type) {
            case StackViewItemType.Stack:
                return this.getStackChildren(element);
                
            case StackViewItemType.StackFile:
                return this.getStackFileChildren(element);
                
            case StackViewItemType.Section:
                return this.getSectionChildren(element);
                
            case StackViewItemType.Component:
                return this.getComponentChildren(element);
                
            case StackViewItemType.Property:
                if (element.value && typeof element.value === 'object' && !Array.isArray(element.value)) {
                    return this.getObjectChildren(element.value);
                }
                if (Array.isArray(element.value)) {
                    return this.getArrayChildren(element.value);
                }
                return [];
                
            default:
                return [];
        }
    }
    
    /**
     * Get children for the stack node - show stack files
     */
    private async getStackChildren(element: StackViewItem): Promise<StackViewItem[]> {
        if (!element.stackName) {
            return [];
        }
        
        try {
            // Get stack files that contribute to this stack
            const stackFiles = await this.atmosCli.getStackFiles(element.stackName);
            
            if (stackFiles.length === 0) {
                return [
                    new StackViewItem(
                        'No stack files found',
                        StackViewItemType.NoStack,
                        vscode.TreeItemCollapsibleState.None
                    )
                ];
            }
            
            // Create items for each stack file
            const stacksPath = this.configManager.getStacksPath();
            return stackFiles.map(({ file, components }) => {
                const fullPath = path.join(stacksPath, file.endsWith('.yaml') ? file : `${file}.yaml`);
                const label = `${file} [${components.length} component${components.length !== 1 ? 's' : ''}]`;
                
                return new StackViewItem(
                    label,
                    StackViewItemType.StackFile,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    components, // Store components in value
                    fullPath,
                    undefined,
                    element.stackName
                );
            });
        } catch (error) {
            console.error('Failed to get stack files:', error);
            return [
                new StackViewItem(
                    'Error loading stack files',
                    StackViewItemType.Error,
                    vscode.TreeItemCollapsibleState.None
                )
            ];
        }
    }
    
    /**
     * Get children for a stack file node - show components
     */
    private async getStackFileChildren(element: StackViewItem): Promise<StackViewItem[]> {
        if (!element.filePath || !element.stackName) {
            return [];
        }
        
        // Get components from the stored value (array of component names)
        const components = element.value as string[];
        
        if (!components || components.length === 0) {
            return [
                new StackViewItem(
                    'No components in this file',
                    StackViewItemType.NoStack,
                    vscode.TreeItemCollapsibleState.None
                )
            ];
        }
        
        // Create items for each component
        return components.map(componentName => {
            // Use the stack file path instead of component path
            // so we can navigate to where the component is defined in the stack file
            return new StackViewItem(
                componentName,
                StackViewItemType.Component,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                element.filePath, // Use the stack file path
                componentName,
                element.stackName
            );
        });
    }
    
    /**
     * Get children for a section node
     */
    private getSectionChildren(element: StackViewItem): StackViewItem[] {
        // Show properties
        return this.getObjectChildren(element.value);
    }
    
    /**
     * Get children for a component node
     */
    private getComponentChildren(element: StackViewItem): StackViewItem[] {
        const component = element.value as StackComponent;
        const items: StackViewItem[] = [];
        
        // Add component reference
        if (component.component) {
            const componentPath = this.getComponentPath(component.component);
            items.push(
                new StackViewItem(
                    `component: ${component.component}`,
                    StackViewItemType.Property,
                    vscode.TreeItemCollapsibleState.None,
                    component.component,
                    componentPath
                )
            );
        }
        
        // Add metadata
        if (component.metadata && Object.keys(component.metadata).length > 0) {
            items.push(
                new StackViewItem(
                    'metadata:',
                    StackViewItemType.Section,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    component.metadata
                )
            );
        }
        
        // Add vars
        if (component.vars && Object.keys(component.vars).length > 0) {
            items.push(
                new StackViewItem(
                    'vars:',
                    StackViewItemType.Section,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    component.vars
                )
            );
        }
        
        // Add settings
        if (component.settings && Object.keys(component.settings).length > 0) {
            items.push(
                new StackViewItem(
                    'settings:',
                    StackViewItemType.Section,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    component.settings
                )
            );
        }
        
        // Add backend
        if (component.backend) {
            items.push(
                new StackViewItem(
                    'backend:',
                    StackViewItemType.Section,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    component.backend
                )
            );
        }
        
        // Add backend_type
        if (component.backend_type) {
            items.push(
                new StackViewItem(
                    `backend_type: ${component.backend_type}`,
                    StackViewItemType.Property,
                    vscode.TreeItemCollapsibleState.None,
                    component.backend_type
                )
            );
        }
        
        return items;
    }
    
    /**
     * Get children for an object
     */
    private getObjectChildren(obj: Record<string, any>): StackViewItem[] {
        const items: StackViewItem[] = [];
        
        for (const [key, value] of Object.entries(obj)) {
            const hasChildren = (typeof value === 'object' && value !== null) || Array.isArray(value);
            const label = hasChildren ? `${key}:` : `${key}: ${this.formatValueInline(value)}`;
            items.push(
                new StackViewItem(
                    label,
                    StackViewItemType.Property,
                    hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                    value
                )
            );
        }
        
        return items;
    }
    
    /**
     * Format value for inline display
     */
    private formatValueInline(value: any): string {
        if (value === null || value === undefined) {
            return 'null';
        }
        if (typeof value === 'boolean') {
            return value.toString();
        }
        if (typeof value === 'number') {
            return value.toString();
        }
        if (typeof value === 'string') {
            // Quote strings that contain special characters or spaces
            if (value.includes(' ') || value.includes(':') || value.includes('#')) {
                return `"${value}"`;
            }
            return value;
        }
        return '';
    }
    
    /**
     * Get children for an array
     */
    private getArrayChildren(arr: any[]): StackViewItem[] {
        return arr.map((item, index) => {
            const hasChildren = (typeof item === 'object' && item !== null) || Array.isArray(item);
            const label = hasChildren ? `- [${index}]` : `- ${this.formatValueInline(item)}`;
            return new StackViewItem(
                label,
                StackViewItemType.Value,
                hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                item
            );
        });
    }
    
    /**
     * Get component path
     */
    private getComponentPath(componentName: string): string {
        const componentsPath = this.configManager.getComponentsPath();
        return path.join(componentsPath, componentName);
    }
}
