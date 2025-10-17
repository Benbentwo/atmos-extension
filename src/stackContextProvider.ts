import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser, StackConfig } from './stackParser';

export interface StackContext {
    stackName: string;
    namespace?: string;
    tenant?: string;
    environment?: string;
    stage?: string;
    isValid: boolean;
}

export class StackContextProvider {
    private statusBarItem: vscode.StatusBarItem;
    private configManager: AtmosConfigManager;
    private stackParser: StackParser;
    private currentContext: StackContext | null = null;

    constructor(configManager: AtmosConfigManager) {
        this.configManager = configManager;
        this.stackParser = new StackParser(configManager.getStacksPath());
        
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'atmos.showStackContext';
    }

    public activate(context: vscode.ExtensionContext): void {
        context.subscriptions.push(this.statusBarItem);

        // Update on active editor change
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                this.updateContext(editor);
            })
        );

        // Update on document change
        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(event => {
                if (event.document === vscode.window.activeTextEditor?.document) {
                    this.updateContext(vscode.window.activeTextEditor);
                }
            })
        );

        // Initial update
        this.updateContext(vscode.window.activeTextEditor);
    }

    private async updateContext(editor: vscode.TextEditor | undefined): Promise<void> {
        if (!editor || editor.document.languageId !== 'yaml') {
            this.statusBarItem.hide();
            this.currentContext = null;
            return;
        }

        const filePath = editor.document.uri.fsPath;
        
        // Check if this is a stack file
        if (!this.configManager.isStackFile(filePath)) {
            this.statusBarItem.hide();
            this.currentContext = null;
            return;
        }

        // Parse the stack to get context
        const context = await this.getStackContext(filePath, editor.document);
        
        if (context && context.isValid) {
            this.currentContext = context;
            this.updateStatusBar(context);
            this.statusBarItem.show();
        } else {
            this.statusBarItem.text = '$(warning) Not a valid stack';
            this.statusBarItem.tooltip = 'This file does not appear to be a valid Atmos stack';
            this.statusBarItem.show();
            this.currentContext = null;
        }
    }

    private async getStackContext(filePath: string, document: vscode.TextDocument): Promise<StackContext | null> {
        try {
            const stacksPath = this.configManager.getStacksPath();
            const relativePath = path.relative(stacksPath, filePath);
            const stackName = relativePath.replace(/\.ya?ml$/, '');

            // Parse the stack file and merge all imports to get the full context
            const mergedConfig = await this.mergeStackRecursive(filePath, new Set());
            
            // Extract metadata from vars or settings
            const vars = mergedConfig.vars || {};
            const settings = mergedConfig.settings || {};
            
            // Try to extract namespace, tenant, environment, stage
            const namespace = vars.namespace || settings.namespace;
            const tenant = vars.tenant || settings.tenant;
            const environment = vars.environment || settings.environment;
            const stage = vars.stage || settings.stage;

            // Determine if this is a valid stack
            // A valid stack should have at least some configuration
            const isValid = Boolean(
                Object.keys(vars).length > 0 ||
                Object.keys(settings).length > 0 ||
                (mergedConfig.components?.terraform && Object.keys(mergedConfig.components.terraform).length > 0) ||
                (mergedConfig.terraform && Object.keys(mergedConfig.terraform).length > 0)
            );

            return {
                stackName,
                namespace,
                tenant,
                environment,
                stage,
                isValid
            };
        } catch (error) {
            console.error('Error getting stack context:', error);
            return null;
        }
    }

    /**
     * Recursively merge stack imports to get the full configuration
     */
    private async mergeStackRecursive(stackFilePath: string, visited: Set<string>): Promise<StackConfig> {
        // Prevent circular imports
        if (visited.has(stackFilePath)) {
            return {};
        }
        visited.add(stackFilePath);

        // Check if file exists
        if (!fs.existsSync(stackFilePath)) {
            return {};
        }

        const parsed = await this.stackParser.parseStackFile(stackFilePath);
        
        if (parsed.errors.length > 0) {
            console.warn(`Errors parsing ${stackFilePath}:`, parsed.errors);
        }

        // Start with empty config
        let mergedConfig: StackConfig = {};

        // Process imports first (bottom-up merge)
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

        // Merge current file's config on top
        mergedConfig = this.mergeConfigs(mergedConfig, parsed.config);

        return mergedConfig;
    }

    /**
     * Merge two stack configurations
     */
    private mergeConfigs(base: StackConfig, override: StackConfig): StackConfig {
        const merged: StackConfig = { ...base };

        // Merge vars
        if (override.vars) {
            merged.vars = { ...(merged.vars || {}), ...override.vars };
        }

        // Merge settings
        if (override.settings) {
            merged.settings = { ...(merged.settings || {}), ...override.settings };
        }

        // Merge components (we don't need full component merging for context extraction)
        if (override.components) {
            merged.components = override.components;
        }

        // Handle legacy terraform format
        if (override.terraform) {
            merged.terraform = override.terraform;
        }

        return merged;
    }

    private updateStatusBar(context: StackContext): void {
        // Calculate stack identifier using pattern from atmos.yaml
        const vars: Record<string, any> = {};
        
        if (context.namespace) {
            vars.namespace = context.namespace;
        }
        if (context.tenant) {
            vars.tenant = context.tenant;
        }
        if (context.environment) {
            vars.environment = context.environment;
        }
        if (context.stage) {
            vars.stage = context.stage;
        }
        
        // Try to calculate stack name from pattern
        const calculatedName = this.configManager.calculateStackName(vars);
        
        // Use calculated name if available, otherwise fall back to manual joining
        const stackIdentifier = calculatedName || this.buildFallbackStackName(context);

        this.statusBarItem.text = `$(layers) ${stackIdentifier}`;
        
        // Build detailed tooltip
        const tooltipLines: string[] = [
            `**Stack:** ${context.stackName}`,
        ];
        
        // Show pattern if available
        const pattern = this.configManager.getStackNamePattern();
        if (pattern && calculatedName) {
            tooltipLines.push(`**Calculated Name:** ${calculatedName}`);
            tooltipLines.push(`**Pattern:** \`${pattern}\``);
        }
        
        if (context.namespace) {
            tooltipLines.push(`**Namespace:** ${context.namespace}`);
        }
        if (context.tenant) {
            tooltipLines.push(`**Tenant:** ${context.tenant}`);
        }
        if (context.environment) {
            tooltipLines.push(`**Environment:** ${context.environment}`);
        }
        if (context.stage) {
            tooltipLines.push(`**Stage:** ${context.stage}`);
        }
        
        tooltipLines.push('', '_Click for more options_');
        
        this.statusBarItem.tooltip = new vscode.MarkdownString(tooltipLines.join('\n'));
    }

    /**
     * Fallback method to build stack name when pattern is not available
     */
    private buildFallbackStackName(context: StackContext): string {
        const parts: string[] = [];
        
        if (context.namespace) {
            parts.push(context.namespace);
        }
        if (context.tenant) {
            parts.push(context.tenant);
        }
        if (context.environment) {
            parts.push(context.environment);
        }
        if (context.stage) {
            parts.push(context.stage);
        }
        
        return parts.length > 0 ? parts.join('-') : context.stackName;
    }

    public getCurrentContext(): StackContext | null {
        return this.currentContext;
    }

    public async showStackContextQuickPick(): Promise<void> {
        if (!this.currentContext) {
            vscode.window.showInformationMessage('No stack context available');
            return;
        }

        const context = this.currentContext;
        
        // Build quick pick items
        const items: vscode.QuickPickItem[] = [
            {
                label: '$(info) Stack Information',
                kind: vscode.QuickPickItemKind.Separator
            },
            {
                label: `Stack: ${context.stackName}`,
                description: 'Full stack path'
            }
        ];

        if (context.namespace) {
            items.push({
                label: `Namespace: ${context.namespace}`,
                description: 'Stack namespace'
            });
        }
        if (context.tenant) {
            items.push({
                label: `Tenant: ${context.tenant}`,
                description: 'Stack tenant'
            });
        }
        if (context.environment) {
            items.push({
                label: `Environment: ${context.environment}`,
                description: 'Stack environment'
            });
        }
        if (context.stage) {
            items.push({
                label: `Stage: ${context.stage}`,
                description: 'Stack stage'
            });
        }

        items.push(
            {
                label: '$(tools) Actions',
            },
            {
                label: '$(eye) Preview Component',
                description: 'Show fully rendered component configuration',
                detail: 'View component with all imports resolved'
            },
            {
                label: '$(check) Validate Stack',
                description: 'Run stack validation',
                detail: 'Check for errors and warnings'
            },
            {
                label: '$(file-code) Render Stack',
                description: 'Show rendered stack configuration',
                detail: 'Execute atmos describe command'
            }
        );

        const selected = await vscode.window.showQuickPick(items, {
            title: `Stack Context: ${context.stackName}`,
            placeHolder: 'Select an action'
        });

        if (selected) {
            // Handle action selection
            if (selected.label.includes('Preview Component')) {
                await vscode.commands.executeCommand('atmos.previewComponent');
            } else if (selected.label.includes('Validate Stack')) {
                await vscode.commands.executeCommand('atmos.validateStack');
            } else if (selected.label.includes('Render Stack')) {
                await vscode.commands.executeCommand('atmos.renderStack');
            }
        }
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
