import * as vscode from 'vscode';
import * as path from 'path';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser, StackConfig, StackComponent } from './stackParser';

/**
 * Tree item types for the stack viewer
 */
enum StackViewItemType {
    Stack = 'stack',
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
        public readonly componentName?: string
    ) {
        super(label, collapsibleState);
        
        // Set context value for when clauses
        this.contextValue = type;
        
        // Set icons based on type
        switch (type) {
            case StackViewItemType.Stack:
                this.iconPath = new vscode.ThemeIcon('layers');
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
    private currentStackFile: string | undefined;
    private mergedConfig: StackConfig | undefined;
    private isLoading = false;
    private error: string | undefined;
    
    constructor(configManager: AtmosConfigManager) {
        this.configManager = configManager;
        this.stackParser = new StackParser(configManager.getStacksPath());
    }
    
    /**
     * Refresh the tree view
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Update the viewer with a new stack file
     */
    public async updateStackFile(filePath: string | undefined): Promise<void> {
        this.currentStackFile = filePath;
        this.error = undefined;
        
        if (filePath && this.configManager.isStackFile(filePath)) {
            this.isLoading = true;
            this.refresh();
            
            try {
                this.mergedConfig = await this.deepMergeStack(filePath);
                this.error = undefined;
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
                this.mergedConfig = undefined;
            } finally {
                this.isLoading = false;
            }
        } else {
            this.mergedConfig = undefined;
        }
        
        this.refresh();
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
     * Get root level children
     */
    private getRootChildren(): StackViewItem[] {
        if (this.isLoading) {
            return [
                new StackViewItem(
                    'Loading stack configuration...',
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
        
        if (!this.currentStackFile || !this.mergedConfig) {
            return [
                new StackViewItem(
                    'No stack file open',
                    StackViewItemType.NoStack,
                    vscode.TreeItemCollapsibleState.None
                )
            ];
        }
        
        const items: StackViewItem[] = [];
        
        // Add stack info
        const stackName = this.getStackName(this.currentStackFile);
        items.push(
            new StackViewItem(
                stackName,
                StackViewItemType.Stack,
                vscode.TreeItemCollapsibleState.Expanded,
                undefined,
                this.currentStackFile
            )
        );
        
        return items;
    }
    
    /**
     * Get children for a specific item
     */
    private async getItemChildren(element: StackViewItem): Promise<StackViewItem[]> {
        if (!this.mergedConfig) {
            return [];
        }
        
        const items: StackViewItem[] = [];
        
        switch (element.type) {
            case StackViewItemType.Stack:
                return this.getStackChildren();
                
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
     * Get children for the stack node
     */
    private async getStackChildren(): Promise<StackViewItem[]> {
        if (!this.mergedConfig || !this.currentStackFile) {
            return [];
        }
        
        const items: StackViewItem[] = [];
        const parsed = await this.stackParser.parseStackFile(this.currentStackFile);
        
        // Add file info at the top
        const relativePath = path.relative(this.configManager.getStacksPath(), this.currentStackFile);
        items.push(
            new StackViewItem(
                `file: ${relativePath}`,
                StackViewItemType.Property,
                vscode.TreeItemCollapsibleState.None,
                relativePath,
                this.currentStackFile
            )
        );
        
        // Add imports section if present
        if (parsed.imports.length > 0) {
            const importsItem = new StackViewItem(
                `imports: [${parsed.imports.length}]`,
                StackViewItemType.Section,
                vscode.TreeItemCollapsibleState.Collapsed,
                parsed.imports
            );
            items.push(importsItem);
        }
        
        // Add separator
        items.push(
            new StackViewItem(
                '---',
                StackViewItemType.Section,
                vscode.TreeItemCollapsibleState.None
            )
        );
        
        // Add components section
        const components = this.mergedConfig.components?.terraform || this.mergedConfig.terraform || {};
        const componentCount = Object.keys(components).length;
        
        if (componentCount > 0) {
            const componentsItem = new StackViewItem(
                `components: [${componentCount}]`,
                StackViewItemType.Section,
                vscode.TreeItemCollapsibleState.Expanded,
                components
            );
            items.push(componentsItem);
        }
        
        // Add global vars section if present
        if (this.mergedConfig.vars && Object.keys(this.mergedConfig.vars).length > 0) {
            items.push(
                new StackViewItem(
                    'vars:',
                    StackViewItemType.Section,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    this.mergedConfig.vars
                )
            );
        }
        
        // Add global settings section if present
        if (this.mergedConfig.settings && Object.keys(this.mergedConfig.settings).length > 0) {
            items.push(
                new StackViewItem(
                    'settings:',
                    StackViewItemType.Section,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    this.mergedConfig.settings
                )
            );
        }
        
        return items;
    }
    
    /**
     * Get children for a section node
     */
    private getSectionChildren(element: StackViewItem): StackViewItem[] {
        const items: StackViewItem[] = [];
        
        if (element.label.startsWith('imports:')) {
            // Show import files in YAML list format
            const imports = element.value as string[];
            for (const importPath of imports) {
                const resolvedPath = this.stackParser.resolveImportPath(
                    this.currentStackFile!,
                    importPath
                );
                items.push(
                    new StackViewItem(
                        `- ${importPath}`,
                        StackViewItemType.Import,
                        vscode.TreeItemCollapsibleState.None,
                        undefined,
                        resolvedPath
                    )
                );
            }
        } else if (element.label.startsWith('components:')) {
            // Show components in YAML format
            const components = element.value as Record<string, StackComponent>;
            for (const [name, component] of Object.entries(components)) {
                const componentPath = this.getComponentPath(component.component || name);
                items.push(
                    new StackViewItem(
                        `${name}:`,
                        StackViewItemType.Component,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        component,
                        componentPath,
                        name
                    )
                );
            }
        } else {
            // Show properties
            return this.getObjectChildren(element.value);
        }
        
        return items;
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
     * Deep merge stack configuration
     */
    private async deepMergeStack(stackFilePath: string): Promise<StackConfig> {
        const visited = new Set<string>();
        return await this.mergeStackRecursive(stackFilePath, visited);
    }
    
    /**
     * Recursively merge stack configurations
     */
    private async mergeStackRecursive(
        stackFilePath: string,
        visited: Set<string>
    ): Promise<StackConfig> {
        if (visited.has(stackFilePath)) {
            return {};
        }
        visited.add(stackFilePath);
        
        const parsed = await this.stackParser.parseStackFile(stackFilePath);
        
        if (parsed.errors.length > 0) {
            console.warn(`Errors parsing ${stackFilePath}:`, parsed.errors);
        }
        
        let mergedConfig: StackConfig = {};
        
        // Process imports first
        for (const importPath of parsed.imports) {
            const resolvedPath = this.stackParser.resolveImportPath(
                stackFilePath,
                importPath
            );
            
            const importedConfig = await this.mergeStackRecursive(
                resolvedPath,
                visited
            );
            
            mergedConfig = this.mergeConfigs(mergedConfig, importedConfig);
        }
        
        // Merge current file's config
        mergedConfig = this.mergeConfigs(mergedConfig, parsed.config);
        
        return mergedConfig;
    }
    
    /**
     * Merge two stack configurations
     */
    private mergeConfigs(base: StackConfig, override: StackConfig): StackConfig {
        const merged: StackConfig = { ...base };
        
        if (override.vars) {
            merged.vars = { ...(merged.vars || {}), ...override.vars };
        }
        
        if (override.settings) {
            merged.settings = { ...(merged.settings || {}), ...override.settings };
        }
        
        if (override.components?.terraform) {
            if (!merged.components) {
                merged.components = {};
            }
            if (!merged.components.terraform) {
                merged.components.terraform = {};
            }
            
            for (const [name, component] of Object.entries(override.components.terraform)) {
                const baseComponent = merged.components.terraform[name] || {};
                merged.components.terraform[name] = this.mergeComponentConfigs(
                    baseComponent,
                    component
                );
            }
        }
        
        if (override.terraform) {
            if (!merged.terraform) {
                merged.terraform = {};
            }
            
            for (const [name, component] of Object.entries(override.terraform)) {
                const baseComponent = merged.terraform[name] || {};
                merged.terraform[name] = this.mergeComponentConfigs(
                    baseComponent,
                    component as StackComponent
                );
            }
        }
        
        return merged;
    }
    
    /**
     * Merge component configurations
     */
    private mergeComponentConfigs(
        base: StackComponent,
        override: StackComponent
    ): StackComponent {
        return {
            component: override.component || base.component,
            vars: { ...(base.vars || {}), ...(override.vars || {}) },
            settings: { ...(base.settings || {}), ...(override.settings || {}) },
            backend: override.backend || base.backend,
            backend_type: override.backend_type || base.backend_type,
            remote_state_backend: override.remote_state_backend || base.remote_state_backend,
            remote_state_backend_type: override.remote_state_backend_type || base.remote_state_backend_type,
            metadata: { ...(base.metadata || {}), ...(override.metadata || {}) }
        };
    }
    
    /**
     * Get stack name from file path
     */
    private getStackName(filePath: string): string {
        const stacksPath = this.configManager.getStacksPath();
        const relativePath = path.relative(stacksPath, filePath);
        return relativePath.replace(/\.ya?ml$/, '');
    }
    
    /**
     * Get component path
     */
    private getComponentPath(componentName: string): string {
        const componentsPath = this.configManager.getComponentsPath();
        return path.join(componentsPath, componentName);
    }
}
