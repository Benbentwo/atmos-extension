import * as vscode from 'vscode';
import { AtmosConfigManager } from './atmosConfig';

/**
 * Token types for semantic highlighting
 */
export enum AtmosTokenType {
    ComponentName = 0,
    VariableReference = 1,
    ImportPath = 2,
    TemplateExpression = 3,
    FunctionCall = 4,
    Keyword = 5
}

/**
 * Token modifiers for semantic highlighting
 */
export enum AtmosTokenModifier {
    Declaration = 0,
    Definition = 1,
    Readonly = 2,
    Deprecated = 3
}

/**
 * Provides semantic tokens for Atmos stack files
 * Enables semantic highlighting for components, variables, templates, etc.
 */
export class AtmosSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    constructor(private configManager: AtmosConfigManager) {}

    /**
     * Get legend for semantic tokens
     */
    static getLegend(): vscode.SemanticTokensLegend {
        const tokenTypes = [
            'component',
            'variable',
            'import',
            'template',
            'function',
            'keyword'
        ];

        const tokenModifiers = [
            'declaration',
            'definition',
            'readonly',
            'deprecated'
        ];

        return new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
    }

    /**
     * Provide semantic tokens for document
     */
    async provideDocumentSemanticTokens(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.SemanticTokens> {
        // Only provide tokens for stack files
        if (!this.configManager.isStackFile(document.uri.fsPath)) {
            return new vscode.SemanticTokens(new Uint32Array());
        }

        const tokensBuilder = new vscode.SemanticTokensBuilder(AtmosSemanticTokensProvider.getLegend());
        const text = document.getText();
        const lines = text.split('\n');

        let inComponents = false;
        let inTerraform = false;
        let inImports = false;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];

            // Track context
            if (line.match(/^imports:/)) {
                inImports = true;
                this.addKeywordToken(tokensBuilder, lineIndex, line, 'imports');
                continue;
            } else if (line.match(/^components:/)) {
                inComponents = true;
                inImports = false;
                this.addKeywordToken(tokensBuilder, lineIndex, line, 'components');
                continue;
            } else if (line.match(/^vars:/)) {
                inImports = false;
                this.addKeywordToken(tokensBuilder, lineIndex, line, 'vars');
                continue;
            } else if (line.match(/^settings:/)) {
                inImports = false;
                this.addKeywordToken(tokensBuilder, lineIndex, line, 'settings');
                continue;
            } else if (line.match(/^[a-zA-Z]/)) {
                inImports = false;
                inComponents = false;
                inTerraform = false;
            }

            if (inComponents && line.match(/^\s{2}terraform:/)) {
                inTerraform = true;
                this.addKeywordToken(tokensBuilder, lineIndex, line, 'terraform');
                continue;
            }

            // Highlight imports
            if (inImports) {
                const importMatch = line.match(/^\s*-\s*(.+)$/);
                if (importMatch) {
                    const importPath = importMatch[1].trim();
                    const startChar = line.indexOf(importPath);
                    tokensBuilder.push(
                        lineIndex,
                        startChar,
                        importPath.length,
                        AtmosTokenType.ImportPath,
                        0
                    );
                }
            }

            // Highlight component names
            if (inTerraform) {
                const componentMatch = line.match(/^\s{4}([a-zA-Z0-9_-]+):/);
                if (componentMatch) {
                    const componentName = componentMatch[1];
                    const startChar = line.indexOf(componentName);
                    tokensBuilder.push(
                        lineIndex,
                        startChar,
                        componentName.length,
                        AtmosTokenType.ComponentName,
                        1 << AtmosTokenModifier.Declaration
                    );
                }
            }

            // Highlight template expressions
            const templateMatches = line.matchAll(/\{\{([^}]+)\}\}/g);
            for (const match of templateMatches) {
                const startChar = match.index || 0;
                const length = match[0].length;
                tokensBuilder.push(
                    lineIndex,
                    startChar,
                    length,
                    AtmosTokenType.TemplateExpression,
                    0
                );

                // Highlight function calls within templates
                const functionMatch = match[1].match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
                if (functionMatch) {
                    const funcName = functionMatch[1];
                    const funcStartChar = startChar + match[1].indexOf(funcName);
                    tokensBuilder.push(
                        lineIndex,
                        funcStartChar,
                        funcName.length,
                        AtmosTokenType.FunctionCall,
                        0
                    );
                }
            }

            // Highlight variable references (e.g., .vars.namespace)
            const varMatches = line.matchAll(/\.vars\.([a-zA-Z0-9_]+)/g);
            for (const match of varMatches) {
                const startChar = (match.index || 0) + 6; // Skip ".vars."
                const varName = match[1];
                tokensBuilder.push(
                    lineIndex,
                    startChar,
                    varName.length,
                    AtmosTokenType.VariableReference,
                    0
                );
            }

            // Highlight component references
            const componentRefMatch = line.match(/component:\s*["']?([a-zA-Z0-9_/-]+)["']?/);
            if (componentRefMatch) {
                const componentName = componentRefMatch[1];
                const startChar = line.indexOf(componentName);
                tokensBuilder.push(
                    lineIndex,
                    startChar,
                    componentName.length,
                    AtmosTokenType.ComponentName,
                    1 << AtmosTokenModifier.Definition
                );
            }
        }

        return tokensBuilder.build();
    }

    /**
     * Add token for a keyword
     */
    private addKeywordToken(
        builder: vscode.SemanticTokensBuilder,
        line: number,
        text: string,
        keyword: string
    ): void {
        const startChar = text.indexOf(keyword);
        if (startChar >= 0) {
            builder.push(
                line,
                startChar,
                keyword.length,
                AtmosTokenType.Keyword,
                0
            );
        }
    }
}
