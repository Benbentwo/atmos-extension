import * as vscode from 'vscode';
import * as path from 'path';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser } from './stackParser';

/**
 * Provides file decorations for stack files in the Explorer view.
 * Shows the stack name next to stack files in a monospace format.
 * Example: dev.yaml    `plat-use2-dev`
 */
export class AtmosFileDecorationProvider implements vscode.FileDecorationProvider {
    private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    private stackParser: StackParser;
    private decorationCache = new Map<string, vscode.FileDecoration | null>();

    constructor(private configManager: AtmosConfigManager) {
        this.stackParser = new StackParser(configManager.getStacksPath());
    }

    /**
     * Provide file decoration for a given URI
     */
    async provideFileDecoration(
        uri: vscode.Uri,
        token: vscode.CancellationToken
    ): Promise<vscode.FileDecoration | undefined> {
        // Only decorate files, not directories
        if (uri.scheme !== 'file') {
            return undefined;
        }

        const filePath = uri.fsPath;

        // Check cache first
        if (this.decorationCache.has(filePath)) {
            const cached = this.decorationCache.get(filePath);
            return cached || undefined;
        }

        // Check if this is a stack file
        if (!this.configManager.isStackFile(filePath)) {
            this.decorationCache.set(filePath, null);
            return undefined;
        }

        try {
            // Extract stack name from file path and content
            const stackName = await this.getStackName(filePath);
            
            if (!stackName) {
                this.decorationCache.set(filePath, null);
                return undefined;
            }

            // Create decoration with the stack name
            const decoration: vscode.FileDecoration = {
                badge: stackName,
                tooltip: `Stack: ${stackName}`,
                color: new vscode.ThemeColor('descriptionForeground')
            };

            this.decorationCache.set(filePath, decoration);
            return decoration;
        } catch (error) {
            console.error(`Error providing decoration for ${filePath}:`, error);
            this.decorationCache.set(filePath, null);
            return undefined;
        }
    }

    /**
     * Extract stack name from file path and content
     * Uses the pattern defined in atmos.yaml if available
     */
    private async getStackName(filePath: string): Promise<string | null> {
        try {
            // Parse the stack file
            const parsed = await this.stackParser.parseStackFile(filePath);
            
            if (parsed.errors.length > 0) {
                return null;
            }

            // Try to extract stack name from vars
            const vars = parsed.config.vars || {};
            const settings = parsed.config.settings || {};
            
            // Merge vars and settings for pattern calculation
            const allVars: Record<string, any> = {
                ...settings,
                ...vars
            };

            // Try to calculate stack name using pattern from atmos.yaml
            const calculatedName = this.configManager.calculateStackName(allVars);
            if (calculatedName) {
                return calculatedName;
            }

            // Fallback: Build stack name from available metadata
            const namespace = vars.namespace || '';
            const tenant = vars.tenant || '';
            const environment = vars.environment || '';
            const stage = vars.stage || '';
            const region = vars.region || '';

            const parts: string[] = [];
            
            if (namespace) parts.push(namespace);
            if (tenant && tenant !== namespace) parts.push(tenant);
            if (environment) parts.push(environment);
            if (stage && stage !== environment) parts.push(stage);
            if (region) parts.push(region);

            if (parts.length > 0) {
                return parts.join('-');
            }

            // Final fallback: use relative path from stacks directory
            const stacksPath = this.configManager.getStacksPath();
            const relativePath = path.relative(stacksPath, filePath);
            const stackName = relativePath
                .replace(/\\/g, '/')
                .replace(/\.ya?ml$/, '')
                .replace(/\//g, '-');

            return stackName || null;
        } catch (error) {
            console.error(`Error extracting stack name from ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Refresh decorations for a specific file or all files
     */
    refresh(uri?: vscode.Uri): void {
        if (uri) {
            this.decorationCache.delete(uri.fsPath);
            this._onDidChangeFileDecorations.fire(uri);
        } else {
            this.decorationCache.clear();
            this._onDidChangeFileDecorations.fire(undefined);
        }
    }

    /**
     * Clear all cached decorations
     */
    clearCache(): void {
        this.decorationCache.clear();
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this._onDidChangeFileDecorations.dispose();
        this.decorationCache.clear();
    }
}
