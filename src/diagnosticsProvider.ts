import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import * as https from 'https';
import * as http from 'http';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser } from './stackParser';

export class AtmosDiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private configManager: AtmosConfigManager;
    private stackParser: StackParser;
    private schemaCache: Map<string, any> = new Map();

    constructor(configManager: AtmosConfigManager) {
        this.configManager = configManager;
        this.stackParser = new StackParser(configManager.getStacksPath());
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('atmos');
    }

    public async validateDocument(document: vscode.TextDocument): Promise<void> {
        // Check if validation is enabled
        const validationEnabled = vscode.workspace.getConfiguration('atmos').get('validation.enabled', true);
        if (!validationEnabled) {
            return;
        }

        if (!this.configManager.isStackFile(document.uri.fsPath)) {
            return;
        }

        const diagnostics: vscode.Diagnostic[] = [];
        const content = document.getText();

        // Validate YAML syntax
        let parsedYaml: any;
        try {
            parsedYaml = yaml.parse(content);
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

        // Validate against JSON schema if available
        await this.validateAgainstSchema(content, parsedYaml, diagnostics);

        // Validate Atmos schema - check for invalid top-level keys
        this.validateAtmosSchema(content, parsedYaml, diagnostics);

        // Parse the stack
        const parsed = await this.stackParser.parseStackFile(document.uri.fsPath);

        // Validate component references
        const componentsPath = this.configManager.getComponentsPath();
        for (const [componentName, component] of parsed.components) {
            // Check metadata.component first, then component field, then fall back to componentName
            const actualComponentName = component.metadata?.component || component.component || componentName;
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

    private async validateAgainstSchema(content: string, parsedYaml: any, diagnostics: vscode.Diagnostic[]): Promise<void> {
        try {
            const schemaPath = this.configManager.getManifestSchemaPath();
            const schema = await this.loadSchema(schemaPath);
            
            if (!schema) {
                return; // Schema not available, skip validation
            }

            // Basic schema validation - check for required properties and types
            // Note: Full JSON Schema validation would require a library like ajv
            // For now, we'll do basic validation
            if (schema.required && Array.isArray(schema.required)) {
                for (const requiredKey of schema.required) {
                    if (!(requiredKey in parsedYaml)) {
                        diagnostics.push(new vscode.Diagnostic(
                            new vscode.Range(0, 0, 0, 0),
                            `Missing required property: ${requiredKey}`,
                            vscode.DiagnosticSeverity.Error
                        ));
                    }
                }
            }
        } catch (error) {
            // Silently fail schema validation if there's an error
            console.error('Schema validation error:', error);
        }
    }

    private async loadSchema(schemaPath: string): Promise<any> {
        // Check cache first
        if (this.schemaCache.has(schemaPath)) {
            return this.schemaCache.get(schemaPath);
        }

        try {
            let schemaContent: string;

            if (schemaPath.startsWith('http://') || schemaPath.startsWith('https://')) {
                // Load from URL
                schemaContent = await this.fetchSchema(schemaPath);
            } else {
                // Load from file
                if (!fs.existsSync(schemaPath)) {
                    return null;
                }
                schemaContent = await fs.promises.readFile(schemaPath, 'utf-8');
            }

            const schema = JSON.parse(schemaContent);
            this.schemaCache.set(schemaPath, schema);
            return schema;
        } catch (error) {
            console.error('Failed to load schema:', error);
            return null;
        }
    }

    private fetchSchema(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https://') ? https : http;
            
            client.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve(data);
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    private validateAtmosSchema(content: string, parsedYaml: any, diagnostics: vscode.Diagnostic[]): void {
        if (!parsedYaml || typeof parsedYaml !== 'object') {
            return;
        }

        // Define valid top-level keys for Atmos stack files
        const validTopLevelKeys = new Set([
            'import',
            'vars',
            'settings',
            'env',
            'backend',
            'backend_type',
            'remote_state_backend',
            'remote_state_backend_type',
            'components',
            'terraform',
            'helmfile',
            'workflows',
            'metadata',
            'overrides'
        ]);

        // Common typos and their corrections
        const commonTypos: Record<string, string> = {
            'imports': 'import',
            'variable': 'vars',
            'variables': 'vars',
            'setting': 'settings',
            'component': 'components',
            'workflow': 'workflows'
        };

        // Check each top-level key
        for (const key of Object.keys(parsedYaml)) {
            if (!validTopLevelKeys.has(key)) {
                const position = this.findTopLevelKeyPosition(content, key);
                if (position) {
                    let message = `Invalid top-level key '${key}'`;
                    
                    // Suggest correction if it's a known typo
                    if (commonTypos[key]) {
                        message = `Invalid key '${key}'. Did you mean '${commonTypos[key]}'?`;
                    }
                    
                    diagnostics.push(new vscode.Diagnostic(
                        position,
                        message,
                        vscode.DiagnosticSeverity.Error
                    ));
                }
            }
        }
    }

    private findTopLevelKeyPosition(content: string, key: string): vscode.Range | null {
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip comment lines
            if (line.trim().startsWith('#')) {
                continue;
            }
            
            // Match top-level keys (no leading whitespace or minimal indentation)
            const match = line.match(new RegExp(`^(\\s*)(${this.escapeRegex(key)}):\\s*`));
            if (match) {
                // Check if this is truly a top-level key (no indentation or minimal indentation)
                const indentation = match[1];
                if (indentation.length === 0) {
                    const startCol = match[1].length;
                    const endCol = startCol + match[2].length;
                    return new vscode.Range(
                        new vscode.Position(i, startCol),
                        new vscode.Position(i, endCol)
                    );
                }
            }
        }
        
        return null;
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
