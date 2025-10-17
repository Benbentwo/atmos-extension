import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'yaml';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser, StackConfig, StackComponent } from './stackParser';

export interface RenderedComponent {
    componentName: string;
    stackName: string;
    config: any;
    sources: Map<string, string>; // Maps config path to source file
}

export class ComponentPreviewProvider {
    private configManager: AtmosConfigManager;
    private stackParser: StackParser;
    private outputChannel: vscode.OutputChannel;

    constructor(configManager: AtmosConfigManager) {
        this.configManager = configManager;
        this.stackParser = new StackParser(configManager.getStacksPath());
        this.outputChannel = vscode.window.createOutputChannel('Atmos Component Preview');
    }

    public async previewComponent(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const document = editor.document;
        if (!this.configManager.isStackFile(document.uri.fsPath)) {
            vscode.window.showErrorMessage('Current file is not a stack file');
            return;
        }

        // Parse the current stack to get available components
        const parsed = await this.stackParser.parseStackFile(document.uri.fsPath);
        
        if (parsed.components.size === 0) {
            vscode.window.showInformationMessage('No components found in this stack');
            return;
        }

        // Let user select a component
        const componentNames = Array.from(parsed.components.keys());
        const selectedComponent = await vscode.window.showQuickPick(componentNames, {
            placeHolder: 'Select a component to preview',
            title: 'Preview Component'
        });

        if (!selectedComponent) {
            return;
        }

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Rendering component: ${selectedComponent}`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Resolving imports...' });
            
            // Render the component
            const rendered = await this.renderComponent(
                document.uri.fsPath,
                selectedComponent
            );

            progress.report({ increment: 50, message: 'Generating preview...' });

            // Show the preview
            await this.showPreview(rendered);

            progress.report({ increment: 100, message: 'Done!' });
        });
    }

    private async renderComponent(
        stackFilePath: string,
        componentName: string
    ): Promise<RenderedComponent> {
        const stacksPath = this.configManager.getStacksPath();
        const relativePath = path.relative(stacksPath, stackFilePath);
        const stackName = relativePath.replace(/\.ya?ml$/, '');

        // Deep merge the stack configuration
        const mergedConfig = await this.deepMergeStack(stackFilePath);
        
        // Extract the specific component
        const components = mergedConfig.components?.terraform || mergedConfig.terraform || {};
        const componentConfig = components[componentName];

        if (!componentConfig) {
            throw new Error(`Component ${componentName} not found in merged configuration`);
        }

        // Build the complete component configuration
        const fullConfig = {
            vars: {
                ...(mergedConfig.vars || {}),
                ...(componentConfig.vars || {})
            },
            settings: {
                ...(mergedConfig.settings || {}),
                ...(componentConfig.settings || {})
            },
            backend: componentConfig.backend || mergedConfig.backend,
            backend_type: componentConfig.backend_type || mergedConfig.backend_type,
            remote_state_backend: componentConfig.remote_state_backend,
            remote_state_backend_type: componentConfig.remote_state_backend_type,
            metadata: componentConfig.metadata,
            component: componentConfig.component || componentName
        };

        return {
            componentName,
            stackName,
            config: fullConfig,
            sources: new Map() // TODO: Track source attribution
        };
    }

    private async deepMergeStack(stackFilePath: string): Promise<StackConfig> {
        const visited = new Set<string>();
        return await this.mergeStackRecursive(stackFilePath, visited);
    }

    private async mergeStackRecursive(
        stackFilePath: string,
        visited: Set<string>
    ): Promise<StackConfig> {
        // Prevent circular imports
        if (visited.has(stackFilePath)) {
            return {};
        }
        visited.add(stackFilePath);

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

        // Merge components
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

        // Handle legacy terraform format
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

        // Merge helmfile components
        if (override.components?.helmfile) {
            if (!merged.components) {
                merged.components = {};
            }
            merged.components.helmfile = {
                ...(merged.components?.helmfile || {}),
                ...override.components.helmfile
            };
        }

        return merged;
    }

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

    private async showPreview(rendered: RenderedComponent): Promise<void> {
        // Create a new document with the rendered YAML
        const yamlContent = yaml.stringify(rendered.config, {
            indent: 2,
            lineWidth: 0
        });

        const header = [
            `# Component Preview: ${rendered.componentName}`,
            `# Stack: ${rendered.stackName}`,
            `# Generated: ${new Date().toISOString()}`,
            `#`,
            `# This is a fully rendered view with all imports resolved.`,
            `# This preview is read-only.`,
            ``,
            ``
        ].join('\n');

        const fullContent = header + yamlContent;

        // Create and show the document
        const doc = await vscode.workspace.openTextDocument({
            content: fullContent,
            language: 'yaml'
        });

        const editor = await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: true,
            preserveFocus: false
        });

        // Make it read-only by showing a message if they try to edit
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document === doc) {
                vscode.window.showWarningMessage(
                    'This is a preview document. Changes will not be saved.',
                    'OK'
                );
            }
        });

        // Log to output channel
        this.outputChannel.clear();
        this.outputChannel.appendLine(`Component Preview: ${rendered.componentName}`);
        this.outputChannel.appendLine(`Stack: ${rendered.stackName}`);
        this.outputChannel.appendLine(`Generated: ${new Date().toISOString()}`);
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('Configuration:');
        this.outputChannel.appendLine(yamlContent);
    }

    public async exportRenderedComponent(): Promise<void> {
        vscode.window.showInformationMessage(
            'Export functionality coming soon!',
            'OK'
        );
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
