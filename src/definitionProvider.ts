import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser } from './stackParser';

export class AtmosDefinitionProvider implements vscode.DefinitionProvider {
    private configManager: AtmosConfigManager;
    private stackParser: StackParser;

    constructor(configManager: AtmosConfigManager) {
        this.configManager = configManager;
        this.stackParser = new StackParser(configManager.getStacksPath());
    }

    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }

        const line = document.lineAt(position.line).text;
        const offset = document.offsetAt(position);
        const content = document.getText();

        // Check if we're on a component reference
        const componentName = this.stackParser.extractComponentAtPosition(content, offset);
        if (componentName) {
            return this.getComponentDefinition(componentName);
        }

        // Check if we're on an import path
        const importPath = this.stackParser.extractImportAtPosition(content, offset);
        if (importPath) {
            return this.getImportDefinition(document.uri.fsPath, importPath);
        }

        return undefined;
    }

    private async getComponentDefinition(componentName: string): Promise<vscode.Location | undefined> {
        const componentsPath = this.configManager.getComponentsPath();
        const componentPath = path.join(componentsPath, componentName);

        // Check if component directory exists
        if (!fs.existsSync(componentPath)) {
            return undefined;
        }

        // Look for main.tf or variables.tf
        const possibleFiles = ['main.tf', 'variables.tf', 'versions.tf'];
        
        for (const file of possibleFiles) {
            const filePath = path.join(componentPath, file);
            if (fs.existsSync(filePath)) {
                const uri = vscode.Uri.file(filePath);
                return new vscode.Location(uri, new vscode.Position(0, 0));
            }
        }

        // If no specific file found, just open the directory
        const uri = vscode.Uri.file(componentPath);
        return new vscode.Location(uri, new vscode.Position(0, 0));
    }

    private async getImportDefinition(currentFilePath: string, importPath: string): Promise<vscode.Location | undefined> {
        const resolvedPath = this.stackParser.resolveImportPath(currentFilePath, importPath);

        if (fs.existsSync(resolvedPath)) {
            const uri = vscode.Uri.file(resolvedPath);
            return new vscode.Location(uri, new vscode.Position(0, 0));
        }

        return undefined;
    }
}
