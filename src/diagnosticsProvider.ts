import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser } from './stackParser';

export class AtmosDiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private configManager: AtmosConfigManager;
    private stackParser: StackParser;

    constructor(configManager: AtmosConfigManager) {
        this.configManager = configManager;
        this.stackParser = new StackParser(configManager.getStacksPath());
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('atmos');
    }

    public async validateDocument(document: vscode.TextDocument): Promise<void> {
        if (!this.configManager.isStackFile(document.uri.fsPath)) {
            return;
        }

        const diagnostics: vscode.Diagnostic[] = [];
        const content = document.getText();

        // Validate YAML syntax
        try {
            yaml.parse(content);
        } catch (error: any) {
            const line = error.linePos?.[0]?.line || 0;
            const col = error.linePos?.[0]?.col || 0;
            const range = new vscode.Range(
                new vscode.Position(line - 1, col - 1),
                new vscode.Position(line - 1, col)
            );
            diagnostics.push(new vscode.Diagnostic(
                range,
                `YAML syntax error: ${error.message}`,
                vscode.DiagnosticSeverity.Error
            ));
            this.diagnosticCollection.set(document.uri, diagnostics);
            return;
        }

        // Parse the stack
        const parsed = await this.stackParser.parseStackFile(document.uri.fsPath);

        // Validate component references
        const componentsPath = this.configManager.getComponentsPath();
        for (const [componentName, component] of parsed.components) {
            const actualComponentName = component.component || componentName;
            const componentPath = path.join(componentsPath, actualComponentName);
            
            if (!fs.existsSync(componentPath)) {
                const position = this.findComponentPosition(content, componentName);
                if (position) {
                    diagnostics.push(new vscode.Diagnostic(
                        position,
                        `Component '${actualComponentName}' not found in ${componentsPath}`,
                        vscode.DiagnosticSeverity.Warning
                    ));
                }
            }
        }

        // Validate import paths
        for (const importPath of parsed.imports) {
            const resolvedPath = this.stackParser.resolveImportPath(document.uri.fsPath, importPath);
            
            if (!fs.existsSync(resolvedPath)) {
                const position = this.findImportPosition(content, importPath);
                if (position) {
                    diagnostics.push(new vscode.Diagnostic(
                        position,
                        `Import file '${importPath}' not found`,
                        vscode.DiagnosticSeverity.Error
                    ));
                }
            }
        }

        // Check for circular imports (basic check)
        const circularImports = await this.detectCircularImports(document.uri.fsPath, new Set());
        if (circularImports.length > 0) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 0),
                `Circular import detected: ${circularImports.join(' -> ')}`,
                vscode.DiagnosticSeverity.Error
            ));
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private findComponentPosition(content: string, componentName: string): vscode.Range | null {
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(new RegExp(`^\\s*(${componentName}):\\s*$`));
            if (match) {
                const startCol = line.indexOf(match[1]);
                return new vscode.Range(
                    new vscode.Position(i, startCol),
                    new vscode.Position(i, startCol + match[1].length)
                );
            }
            
            // Also check component: references
            const componentMatch = line.match(/component:\s*["']?([a-zA-Z0-9_/-]+)["']?/);
            if (componentMatch && componentMatch[1] === componentName) {
                const startCol = line.indexOf(componentMatch[1]);
                return new vscode.Range(
                    new vscode.Position(i, startCol),
                    new vscode.Position(i, startCol + componentMatch[1].length)
                );
            }
        }
        
        return null;
    }

    private findImportPosition(content: string, importPath: string): vscode.Range | null {
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes(importPath)) {
                const startCol = line.indexOf(importPath);
                return new vscode.Range(
                    new vscode.Position(i, startCol),
                    new vscode.Position(i, startCol + importPath.length)
                );
            }
        }
        
        return null;
    }

    private async detectCircularImports(
        filePath: string,
        visited: Set<string>,
        chain: string[] = []
    ): Promise<string[]> {
        if (visited.has(filePath)) {
            return [...chain, filePath];
        }

        visited.add(filePath);
        chain.push(filePath);

        try {
            const parsed = await this.stackParser.parseStackFile(filePath);
            
            for (const importPath of parsed.imports) {
                const resolvedPath = this.stackParser.resolveImportPath(filePath, importPath);
                if (fs.existsSync(resolvedPath)) {
                    const circular = await this.detectCircularImports(resolvedPath, new Set(visited), [...chain]);
                    if (circular.length > 0) {
                        return circular;
                    }
                }
            }
        } catch (error) {
            // Ignore parsing errors
        }

        return [];
    }

    public clear(): void {
        this.diagnosticCollection.clear();
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}
