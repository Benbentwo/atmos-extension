import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser } from './stackParser';

export class AtmosHoverProvider implements vscode.HoverProvider {
    private configManager: AtmosConfigManager;
    private stackParser: StackParser;

    constructor(configManager: AtmosConfigManager) {
        this.configManager = configManager;
        this.stackParser = new StackParser(configManager.getStacksPath());
    }

    public async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | undefined> {
        const offset = document.offsetAt(position);
        const content = document.getText();

        // Check if we're hovering over a component
        const componentName = this.stackParser.extractComponentAtPosition(content, offset);
        if (componentName) {
            return this.getComponentHover(componentName);
        }

        // Check if we're hovering over an import
        const importPath = this.stackParser.extractImportAtPosition(content, offset);
        if (importPath) {
            return this.getImportHover(document.uri.fsPath, importPath);
        }

        return undefined;
    }

    private async getComponentHover(componentName: string): Promise<vscode.Hover | undefined> {
        const componentsPath = this.configManager.getComponentsPath();
        const componentPath = path.join(componentsPath, componentName);

        if (!fs.existsSync(componentPath)) {
            return new vscode.Hover(new vscode.MarkdownString(`⚠️ Component \`${componentName}\` not found`));
        }

        const markdown = new vscode.MarkdownString();
        markdown.appendMarkdown(`### Terraform Component\n\n`);
        markdown.appendMarkdown(`**Component:** \`${componentName}\`\n\n`);
        markdown.appendMarkdown(`**Path:** \`${componentPath}\`\n\n`);

        // Try to read component description from README or variables.tf
        const readmePath = path.join(componentPath, 'README.md');
        if (fs.existsSync(readmePath)) {
            try {
                const readme = await fs.promises.readFile(readmePath, 'utf-8');
                const firstParagraph = readme.split('\n\n')[0];
                markdown.appendMarkdown(`${firstParagraph}\n\n`);
            } catch (error) {
                // Ignore
            }
        }

        markdown.appendMarkdown(`[Open Component](${vscode.Uri.file(componentPath)})`);

        return new vscode.Hover(markdown);
    }

    private async getImportHover(currentFilePath: string, importPath: string): Promise<vscode.Hover | undefined> {
        const resolvedPath = this.stackParser.resolveImportPath(currentFilePath, importPath);

        const markdown = new vscode.MarkdownString();
        markdown.appendMarkdown(`### Stack Import\n\n`);
        markdown.appendMarkdown(`**Import:** \`${importPath}\`\n\n`);

        if (fs.existsSync(resolvedPath)) {
            markdown.appendMarkdown(`**Resolved Path:** \`${resolvedPath}\`\n\n`);
            markdown.appendMarkdown(`[Open Stack](${vscode.Uri.file(resolvedPath)})`);
        } else {
            markdown.appendMarkdown(`⚠️ **Stack file not found:** \`${resolvedPath}\``);
        }

        return new vscode.Hover(markdown);
    }
}
