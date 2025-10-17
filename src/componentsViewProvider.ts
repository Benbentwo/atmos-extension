import * as vscode from 'vscode';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser, StackComponent } from './stackParser';

/**
 * Tree item for the Components View
 */
export class ComponentViewItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: 'component' | 'section' | 'property' | 'value',
        public readonly filePath?: string,
        public readonly componentName?: string,
        public readonly value?: any
    ) {
        super(label, collapsibleState);
        
        this.contextValue = itemType;
        this.setIcon();
        this.setTooltip();
    }

    private setIcon(): void {
        switch (this.itemType) {
            case 'component':
                this.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('symbolIcon.packageForeground'));
                break;
            case 'section':
                this.iconPath = new vscode.ThemeIcon('symbol-namespace', new vscode.ThemeColor('symbolIcon.namespaceForeground'));
                break;
            case 'property':
                this.iconPath = new vscode.ThemeIcon('symbol-property', new vscode.ThemeColor('symbolIcon.propertyForeground'));
                break;
            case 'value':
                this.iconPath = new vscode.ThemeIcon('symbol-string', new vscode.ThemeColor('symbolIcon.stringForeground'));
                break;
        }
    }

    private setTooltip(): void {
        if (this.value !== undefined) {
            this.tooltip = `${this.label}: ${JSON.stringify(this.value, null, 2)}`;
        } else {
            this.tooltip = this.label;
        }
    }
}

/**
 * Provides a tree view of components in the currently active stack file
 * Shows fully rendered configuration for each component
 */
export class ComponentsViewProvider implements vscode.TreeDataProvider<ComponentViewItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ComponentViewItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private currentStackFile: string | undefined;
    private stackParser: StackParser;
    private searchFilter: string = '';

    constructor(private configManager: AtmosConfigManager) {
        this.stackParser = new StackParser(configManager.getStacksPath());
    }

    /**
     * Get tree item
     */
    getTreeItem(element: ComponentViewItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children for a tree item
     */
    async getChildren(element?: ComponentViewItem): Promise<ComponentViewItem[]> {
        if (!this.currentStackFile) {
            return [new ComponentViewItem(
                'No stack file active',
                vscode.TreeItemCollapsibleState.None,
                'value'
            )];
        }

        if (!element) {
            // Root level - show all components
            return this.getComponents();
        }

        if (element.itemType === 'component') {
            // Show sections for a component
            return this.getComponentSections(element.componentName!);
        }

        if (element.itemType === 'section') {
            // Show properties for a section
            return this.getSectionProperties(element.componentName!, element.label);
        }

        if (element.itemType === 'property' && element.value && typeof element.value === 'object') {
            // Show nested properties
            return this.getNestedProperties(element.value);
        }

        return [];
    }

    /**
     * Get all components from the current stack file
     */
    private async getComponents(): Promise<ComponentViewItem[]> {
        if (!this.currentStackFile) {
            return [];
        }

        try {
            const parsed = await this.stackParser.parseStackFile(this.currentStackFile);
            const items: ComponentViewItem[] = [];

            for (const [name, component] of parsed.components.entries()) {
                // Apply search filter
                if (this.searchFilter && !name.toLowerCase().includes(this.searchFilter.toLowerCase())) {
                    continue;
                }

                const item = new ComponentViewItem(
                    name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'component',
                    this.currentStackFile,
                    name
                );

                item.description = component.component || '';
                item.command = {
                    command: 'atmos.componentsView.openComponent',
                    title: 'Open Component',
                    arguments: [this.currentStackFile, name]
                };

                items.push(item);
            }

            if (items.length === 0 && this.searchFilter) {
                return [new ComponentViewItem(
                    `No components matching "${this.searchFilter}"`,
                    vscode.TreeItemCollapsibleState.None,
                    'value'
                )];
            }

            if (items.length === 0) {
                return [new ComponentViewItem(
                    'No components found',
                    vscode.TreeItemCollapsibleState.None,
                    'value'
                )];
            }

            return items;
        } catch (error) {
            console.error('Error getting components:', error);
            return [new ComponentViewItem(
                'Error loading components',
                vscode.TreeItemCollapsibleState.None,
                'value'
            )];
        }
    }

    /**
     * Get sections for a component (vars, settings, backend, metadata)
     */
    private async getComponentSections(componentName: string): Promise<ComponentViewItem[]> {
        if (!this.currentStackFile) {
            return [];
        }

        try {
            const parsed = await this.stackParser.parseStackFile(this.currentStackFile);
            const component = parsed.components.get(componentName);

            if (!component) {
                return [];
            }

            const sections: ComponentViewItem[] = [];

            // Add component reference
            if (component.component) {
                sections.push(new ComponentViewItem(
                    `component: ${component.component}`,
                    vscode.TreeItemCollapsibleState.None,
                    'property',
                    this.currentStackFile,
                    componentName,
                    component.component
                ));
            }

            // Add vars section
            if (component.vars && Object.keys(component.vars).length > 0) {
                sections.push(new ComponentViewItem(
                    'vars',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'section',
                    this.currentStackFile,
                    componentName
                ));
            }

            // Add settings section
            if (component.settings && Object.keys(component.settings).length > 0) {
                sections.push(new ComponentViewItem(
                    'settings',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'section',
                    this.currentStackFile,
                    componentName
                ));
            }

            // Add backend section
            if (component.backend && Object.keys(component.backend).length > 0) {
                sections.push(new ComponentViewItem(
                    'backend',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'section',
                    this.currentStackFile,
                    componentName
                ));
            }

            // Add metadata section
            if (component.metadata && Object.keys(component.metadata).length > 0) {
                sections.push(new ComponentViewItem(
                    'metadata',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'section',
                    this.currentStackFile,
                    componentName
                ));
            }

            return sections;
        } catch (error) {
            console.error(`Error getting sections for component ${componentName}:`, error);
            return [];
        }
    }

    /**
     * Get properties for a section
     */
    private async getSectionProperties(componentName: string, sectionName: string): Promise<ComponentViewItem[]> {
        if (!this.currentStackFile) {
            return [];
        }

        try {
            const parsed = await this.stackParser.parseStackFile(this.currentStackFile);
            const component = parsed.components.get(componentName);

            if (!component) {
                return [];
            }

            let sectionData: Record<string, any> | undefined;

            switch (sectionName) {
                case 'vars':
                    sectionData = component.vars;
                    break;
                case 'settings':
                    sectionData = component.settings;
                    break;
                case 'backend':
                    sectionData = component.backend;
                    break;
                case 'metadata':
                    sectionData = component.metadata;
                    break;
            }

            if (!sectionData) {
                return [];
            }

            return this.getNestedProperties(sectionData);
        } catch (error) {
            console.error(`Error getting properties for section ${sectionName}:`, error);
            return [];
        }
    }

    /**
     * Get nested properties from an object
     */
    private getNestedProperties(obj: Record<string, any>): ComponentViewItem[] {
        const items: ComponentViewItem[] = [];

        for (const [key, value] of Object.entries(obj)) {
            const isExpandable = value !== null && typeof value === 'object' && !Array.isArray(value);
            const collapsibleState = isExpandable 
                ? vscode.TreeItemCollapsibleState.Collapsed 
                : vscode.TreeItemCollapsibleState.None;

            let label = key;
            let description: string | undefined;

            if (!isExpandable) {
                if (Array.isArray(value)) {
                    description = `[${value.length} items]`;
                } else if (typeof value === 'string') {
                    description = value.length > 50 ? `${value.substring(0, 50)}...` : value;
                } else {
                    description = String(value);
                }
            }

            const item = new ComponentViewItem(
                label,
                collapsibleState,
                'property',
                this.currentStackFile,
                undefined,
                value
            );

            item.description = description;
            items.push(item);
        }

        return items;
    }

    /**
     * Update the current stack file
     */
    async updateStackFile(filePath: string | undefined): Promise<void> {
        this.currentStackFile = filePath;
        this.refresh();
    }

    /**
     * Set search filter
     */
    setSearchFilter(filter: string): void {
        this.searchFilter = filter;
        this.refresh();
    }

    /**
     * Clear search filter
     */
    clearSearchFilter(): void {
        this.searchFilter = '';
        this.refresh();
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
    }
}
