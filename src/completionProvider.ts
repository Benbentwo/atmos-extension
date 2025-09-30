import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AtmosConfigManager } from './atmosConfig';

export class AtmosCompletionProvider implements vscode.CompletionItemProvider {
    private configManager: AtmosConfigManager;

    constructor(configManager: AtmosConfigManager) {
        this.configManager = configManager;
    }

    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | undefined> {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        
        // Component completion
        if (linePrefix.match(/component:\s*["']?[a-zA-Z0-9_/-]*$/)) {
            return this.getComponentCompletions();
        }

        // Import completion
        if (linePrefix.match(/^\s*-\s*["']?[a-zA-Z0-9_/-]*$/)) {
            const fullText = document.getText();
            const beforeCursor = fullText.substring(0, document.offsetAt(position));
            if (beforeCursor.includes('imports:')) {
                return this.getStackImportCompletions();
            }
        }

        // Variable completion (basic)
        if (linePrefix.match(/^\s+[a-zA-Z0-9_]*$/)) {
            return this.getCommonVariableCompletions();
        }

        return undefined;
    }

    private async getComponentCompletions(): Promise<vscode.CompletionItem[]> {
        const componentsPath = this.configManager.getComponentsPath();
        const completions: vscode.CompletionItem[] = [];

        try {
            const components = await this.findComponents(componentsPath);
            
            for (const component of components) {
                const item = new vscode.CompletionItem(component, vscode.CompletionItemKind.Module);
                item.detail = 'Terraform Component';
                item.documentation = new vscode.MarkdownString(`Component: \`${component}\``);
                completions.push(item);
            }
        } catch (error) {
            console.error('Failed to get component completions:', error);
        }

        return completions;
    }

    private async getStackImportCompletions(): Promise<vscode.CompletionItem[]> {
        const stacksPath = this.configManager.getStacksPath();
        const completions: vscode.CompletionItem[] = [];

        try {
            const stacks = await this.findStackFiles(stacksPath);
            
            for (const stack of stacks) {
                const relativePath = path.relative(stacksPath, stack).replace(/\.yaml$/, '');
                const item = new vscode.CompletionItem(relativePath, vscode.CompletionItemKind.File);
                item.detail = 'Stack Import';
                item.documentation = new vscode.MarkdownString(`Import stack: \`${relativePath}\``);
                item.insertText = relativePath;
                completions.push(item);
            }
        } catch (error) {
            console.error('Failed to get stack import completions:', error);
        }

        return completions;
    }

    private getCommonVariableCompletions(): vscode.CompletionItem[] {
        const commonVars = [
            { name: 'namespace', description: 'The namespace for the stack' },
            { name: 'tenant', description: 'The tenant identifier' },
            { name: 'environment', description: 'The environment (e.g., dev, staging, prod)' },
            { name: 'stage', description: 'The stage identifier' },
            { name: 'region', description: 'The cloud region' },
            { name: 'tags', description: 'Resource tags' }
        ];

        return commonVars.map(v => {
            const item = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
            item.detail = v.description;
            return item;
        });
    }

    private async findComponents(componentsPath: string): Promise<string[]> {
        const components: string[] = [];

        try {
            const entries = await fs.promises.readdir(componentsPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    components.push(entry.name);
                }
            }
        } catch (error) {
            // Directory might not exist
        }

        return components;
    }

    private async findStackFiles(stacksPath: string, relativePath: string = ''): Promise<string[]> {
        const stacks: string[] = [];

        try {
            const fullPath = path.join(stacksPath, relativePath);
            const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const entryPath = path.join(fullPath, entry.name);
                
                if (entry.isDirectory()) {
                    const subStacks = await this.findStackFiles(stacksPath, path.join(relativePath, entry.name));
                    stacks.push(...subStacks);
                } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
                    stacks.push(entryPath);
                }
            }
        } catch (error) {
            // Directory might not exist
        }

        return stacks;
    }
}
