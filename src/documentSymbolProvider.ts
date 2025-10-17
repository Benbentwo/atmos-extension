import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { AtmosConfigManager } from './atmosConfig';

/**
 * Provides document symbols for Atmos stack files
 * Shows outline view with imports, components, variables, and settings
 */
export class AtmosDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    constructor(private configManager: AtmosConfigManager) {}

    async provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentSymbol[]> {
        // Only provide symbols for stack files
        if (!this.configManager.isStackFile(document.uri.fsPath)) {
            return [];
        }

        try {
            const text = document.getText();
            const parsed = yaml.parse(text);

            if (!parsed || typeof parsed !== 'object') {
                return [];
            }

            const symbols: vscode.DocumentSymbol[] = [];

            // Add imports section
            if (parsed.imports && Array.isArray(parsed.imports)) {
                const importsSymbol = this.createImportsSymbol(document, parsed.imports);
                if (importsSymbol) {
                    symbols.push(importsSymbol);
                }
            }

            // Add vars section
            if (parsed.vars && typeof parsed.vars === 'object') {
                const varsSymbol = this.createVarsSymbol(document, parsed.vars);
                if (varsSymbol) {
                    symbols.push(varsSymbol);
                }
            }

            // Add settings section
            if (parsed.settings && typeof parsed.settings === 'object') {
                const settingsSymbol = this.createSettingsSymbol(document, parsed.settings);
                if (settingsSymbol) {
                    symbols.push(settingsSymbol);
                }
            }

            // Add components section
            if (parsed.components) {
                const componentsSymbol = this.createComponentsSymbol(document, parsed.components);
                if (componentsSymbol) {
                    symbols.push(componentsSymbol);
                }
            }

            // Add backend section
            if (parsed.backend && typeof parsed.backend === 'object') {
                const backendSymbol = this.createBackendSymbol(document, parsed.backend);
                if (backendSymbol) {
                    symbols.push(backendSymbol);
                }
            }

            return symbols;
        } catch (error) {
            console.error('Error providing document symbols:', error);
            return [];
        }
    }

    /**
     * Create symbol for imports section
     */
    private createImportsSymbol(document: vscode.TextDocument, imports: string[]): vscode.DocumentSymbol | null {
        const range = this.findRangeForKey(document, 'imports');
        if (!range) {
            return null;
        }

        const symbol = new vscode.DocumentSymbol(
            'imports',
            `${imports.length} import(s)`,
            vscode.SymbolKind.Namespace,
            range,
            range
        );

        // Add child symbols for each import
        imports.forEach((imp, index) => {
            const importRange = this.findRangeForArrayItem(document, 'imports', index);
            if (importRange) {
                symbol.children.push(new vscode.DocumentSymbol(
                    imp,
                    'import',
                    vscode.SymbolKind.File,
                    importRange,
                    importRange
                ));
            }
        });

        return symbol;
    }

    /**
     * Create symbol for vars section
     */
    private createVarsSymbol(document: vscode.TextDocument, vars: Record<string, any>): vscode.DocumentSymbol | null {
        const range = this.findRangeForKey(document, 'vars');
        if (!range) {
            return null;
        }

        const symbol = new vscode.DocumentSymbol(
            'vars',
            `${Object.keys(vars).length} variable(s)`,
            vscode.SymbolKind.Struct,
            range,
            range
        );

        // Add child symbols for each variable
        for (const [key, value] of Object.entries(vars)) {
            const varRange = this.findRangeForNestedKey(document, 'vars', key);
            if (varRange) {
                const valueType = Array.isArray(value) ? 'array' : typeof value;
                symbol.children.push(new vscode.DocumentSymbol(
                    key,
                    valueType,
                    vscode.SymbolKind.Variable,
                    varRange,
                    varRange
                ));
            }
        }

        return symbol;
    }

    /**
     * Create symbol for settings section
     */
    private createSettingsSymbol(document: vscode.TextDocument, settings: Record<string, any>): vscode.DocumentSymbol | null {
        const range = this.findRangeForKey(document, 'settings');
        if (!range) {
            return null;
        }

        const symbol = new vscode.DocumentSymbol(
            'settings',
            `${Object.keys(settings).length} setting(s)`,
            vscode.SymbolKind.Property,
            range,
            range
        );

        // Add child symbols for each setting
        for (const [key, value] of Object.entries(settings)) {
            const settingRange = this.findRangeForNestedKey(document, 'settings', key);
            if (settingRange) {
                symbol.children.push(new vscode.DocumentSymbol(
                    key,
                    typeof value,
                    vscode.SymbolKind.Property,
                    settingRange,
                    settingRange
                ));
            }
        }

        return symbol;
    }

    /**
     * Create symbol for components section
     */
    private createComponentsSymbol(document: vscode.TextDocument, components: any): vscode.DocumentSymbol | null {
        const range = this.findRangeForKey(document, 'components');
        if (!range) {
            return null;
        }

        const symbol = new vscode.DocumentSymbol(
            'components',
            '',
            vscode.SymbolKind.Module,
            range,
            range
        );

        // Add terraform components
        if (components.terraform && typeof components.terraform === 'object') {
            const terraformRange = this.findRangeForNestedKey(document, 'components', 'terraform');
            if (terraformRange) {
                const terraformSymbol = new vscode.DocumentSymbol(
                    'terraform',
                    `${Object.keys(components.terraform).length} component(s)`,
                    vscode.SymbolKind.Package,
                    terraformRange,
                    terraformRange
                );

                // Add each terraform component
                for (const [name, component] of Object.entries(components.terraform)) {
                    const componentRange = this.findComponentRange(document, name);
                    if (componentRange) {
                        const componentType = (component as any)?.component || 'unknown';
                        terraformSymbol.children.push(new vscode.DocumentSymbol(
                            name,
                            componentType,
                            vscode.SymbolKind.Class,
                            componentRange,
                            componentRange
                        ));
                    }
                }

                symbol.children.push(terraformSymbol);
            }
        }

        // Add helmfile components
        if (components.helmfile && typeof components.helmfile === 'object') {
            const helmfileRange = this.findRangeForNestedKey(document, 'components', 'helmfile');
            if (helmfileRange) {
                const helmfileSymbol = new vscode.DocumentSymbol(
                    'helmfile',
                    `${Object.keys(components.helmfile).length} component(s)`,
                    vscode.SymbolKind.Package,
                    helmfileRange,
                    helmfileRange
                );

                symbol.children.push(helmfileSymbol);
            }
        }

        return symbol;
    }

    /**
     * Create symbol for backend section
     */
    private createBackendSymbol(document: vscode.TextDocument, backend: Record<string, any>): vscode.DocumentSymbol | null {
        const range = this.findRangeForKey(document, 'backend');
        if (!range) {
            return null;
        }

        return new vscode.DocumentSymbol(
            'backend',
            `${Object.keys(backend).length} setting(s)`,
            vscode.SymbolKind.Interface,
            range,
            range
        );
    }

    /**
     * Find range for a top-level key
     */
    private findRangeForKey(document: vscode.TextDocument, key: string): vscode.Range | null {
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(new RegExp(`^${key}:`))) {
                const startPos = new vscode.Position(i, 0);
                
                // Find end of section
                let endLine = i;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].match(/^[a-zA-Z]/)) {
                        break;
                    }
                    endLine = j;
                }

                const endPos = new vscode.Position(endLine, lines[endLine].length);
                return new vscode.Range(startPos, endPos);
            }
        }

        return null;
    }

    /**
     * Find range for a nested key
     */
    private findRangeForNestedKey(document: vscode.TextDocument, parentKey: string, childKey: string): vscode.Range | null {
        const text = document.getText();
        const lines = text.split('\n');

        let inParent = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.match(new RegExp(`^${parentKey}:`))) {
                inParent = true;
                continue;
            }

            if (inParent && line.match(/^[a-zA-Z]/)) {
                break;
            }

            if (inParent && line.match(new RegExp(`^\\s+${childKey}:`))) {
                const startPos = new vscode.Position(i, 0);
                const endPos = new vscode.Position(i, line.length);
                return new vscode.Range(startPos, endPos);
            }
        }

        return null;
    }

    /**
     * Find range for an array item
     */
    private findRangeForArrayItem(document: vscode.TextDocument, parentKey: string, index: number): vscode.Range | null {
        const text = document.getText();
        const lines = text.split('\n');

        let inParent = false;
        let currentIndex = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.match(new RegExp(`^${parentKey}:`))) {
                inParent = true;
                continue;
            }

            if (inParent && line.match(/^[a-zA-Z]/)) {
                break;
            }

            if (inParent && line.match(/^\s+-\s/)) {
                currentIndex++;
                if (currentIndex === index) {
                    const startPos = new vscode.Position(i, 0);
                    const endPos = new vscode.Position(i, line.length);
                    return new vscode.Range(startPos, endPos);
                }
            }
        }

        return null;
    }

    /**
     * Find range for a component
     */
    private findComponentRange(document: vscode.TextDocument, componentName: string): vscode.Range | null {
        const text = document.getText();
        const lines = text.split('\n');

        let inComponents = false;
        let inTerraform = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.match(/^components:/)) {
                inComponents = true;
                continue;
            }

            if (inComponents && line.match(/^\s{2}terraform:/)) {
                inTerraform = true;
                continue;
            }

            if (inTerraform && line.match(new RegExp(`^\\s{4}${componentName}:`))) {
                const startPos = new vscode.Position(i, 0);
                
                // Find end of component
                let endLine = i;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].match(/^\s{4}[a-zA-Z]/) || lines[j].match(/^\s{0,2}[a-zA-Z]/)) {
                        break;
                    }
                    if (lines[j].trim().length > 0) {
                        endLine = j;
                    }
                }

                const endPos = new vscode.Position(endLine, lines[endLine].length);
                return new vscode.Range(startPos, endPos);
            }
        }

        return null;
    }
}
