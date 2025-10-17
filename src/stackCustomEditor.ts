import * as vscode from 'vscode';
import { AtmosConfigManager } from './atmosConfig';
import { StackParser } from './stackParser';
import { AtmosCli } from './atmosCli';
import * as yaml from 'yaml';
import * as path from 'path';

/**
 * Custom editor for Atmos stack files
 * Provides split view with source on left and rendered preview on right
 */
export class StackCustomEditorProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'atmos.stackEditor';

    private stackParser: StackParser;
    private atmosCli: AtmosCli;

    constructor(private configManager: AtmosConfigManager) {
        this.stackParser = new StackParser(configManager.getStacksPath());
        this.atmosCli = new AtmosCli(configManager.getWorkspaceRoot());
    }

    /**
     * Resolve custom text editor
     */
    async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        // Set up webview options
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: []
        };

        // Set initial HTML content
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'refresh':
                    await this.updateWebview(webviewPanel.webview, document);
                    break;
                case 'validate':
                    await this.validateStack(document);
                    break;
                case 'format':
                    await this.formatDocument(document);
                    break;
                case 'showProvenance':
                    await this.updateWebview(webviewPanel.webview, document, message.component, message.stack);
                    break;
            }
        });

        // Update webview when document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(async (e) => {
            if (e.document.uri.toString() === document.uri.toString()) {
                // Debounce updates
                await this.debounce(() => this.updateWebview(webviewPanel.webview, document), 500);
            }
        });

        // Clean up when webview is disposed
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Initial update
        await this.updateWebview(webviewPanel.webview, document);
    }

    /**
     * Get HTML content for the webview
     */
    private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Stack Preview</title>
    <style>
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .container {
            padding: 20px;
            max-width: 100%;
            overflow-x: auto;
        }
        .toolbar {
            display: flex;
            gap: 10px;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            position: sticky;
            top: 0;
            z-index: 100;
            flex-wrap: wrap;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            cursor: pointer;
            border-radius: 2px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .preview {
            padding: 20px;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 10px;
            color: var(--vscode-symbolIcon-namespaceForeground);
        }
        .component {
            margin-bottom: 15px;
            padding: 10px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 3px solid var(--vscode-symbolIcon-packageForeground);
        }
        .component-name {
            font-weight: bold;
            color: var(--vscode-symbolIcon-packageForeground);
        }
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }
        .error {
            color: var(--vscode-errorForeground);
            padding: 10px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 3px;
            margin: 10px 0;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        .import-chain {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 15px;
        }
        .import-chain-item {
            display: inline-block;
            margin-right: 5px;
        }
        .provenance-line {
            font-family: var(--vscode-editor-font-family);
            white-space: pre;
            margin: 0;
            padding: 2px 0;
        }
        .provenance-comment {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        .provenance-symbol {
            font-weight: bold;
            margin-right: 5px;
        }
        .provenance-inherited {
            color: var(--vscode-charts-blue);
        }
        .provenance-defined {
            color: var(--vscode-charts-green);
        }
        .provenance-computed {
            color: var(--vscode-charts-purple);
        }
        .component-selector {
            margin: 10px 0;
        }
        .component-selector select {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 6px;
            border-radius: 2px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        .legend {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 3px;
            font-size: 0.9em;
        }
        .legend-item {
            margin: 3px 0;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button onclick="refresh()">🔄 Refresh</button>
        <button onclick="validate()">✓ Validate</button>
        <button onclick="format()">⚡ Format</button>
    </div>
    <div class="container">
        <div id="content" class="loading">Loading preview...</div>
    </div>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        function refresh() {
            vscode.postMessage({ type: 'refresh' });
        }

        function validate() {
            vscode.postMessage({ type: 'validate' });
        }

        function format() {
            vscode.postMessage({ type: 'format' });
        }
        
        function showProvenance(component, stack) {
            vscode.postMessage({ type: 'showProvenance', component: component, stack: stack });
        }

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'update':
                    document.getElementById('content').innerHTML = message.html;
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Update webview content
     */
    private async updateWebview(
        webview: vscode.Webview, 
        document: vscode.TextDocument,
        selectedComponent?: string,
        selectedStack?: string
    ): Promise<void> {
        try {
            const parsed = await this.stackParser.parseStackFile(document.uri.fsPath);
            
            let html = '';

            // Show errors if any
            if (parsed.errors.length > 0) {
                html += '<div class="error">';
                html += '<strong>Errors:</strong><br>';
                html += parsed.errors.map(e => `• ${e}`).join('<br>');
                html += '</div>';
            }

            // Determine the stack name from the file path
            const stacksPath = this.configManager.getStacksPath();
            const relativePath = path.relative(stacksPath, document.uri.fsPath);
            const stackName = selectedStack || relativePath.replace(/\.ya?ml$/, '');

            // Show components with provenance option
            if (parsed.components.size > 0) {
                html += '<div class="section">';
                html += '<div class="section-title">Components</div>';
                
                // Add component selector
                html += '<div class="component-selector">';
                html += '<label>Select component to view provenance: </label>';
                html += `<select id="componentSelect" onchange="showProvenance(this.value, '${stackName}')">`;
                html += '<option value="">-- Select a component --</option>';
                for (const [name] of parsed.components.entries()) {
                    const selected = name === selectedComponent ? 'selected' : '';
                    html += `<option value="${name}" ${selected}>${name}</option>`;
                }
                html += '</select>';
                html += '</div>';
                
                // If a component is selected, show its provenance
                if (selectedComponent) {
                    html += await this.renderComponentProvenance(selectedComponent, stackName);
                } else {
                    // Show basic component list
                    for (const [name, component] of parsed.components.entries()) {
                        html += '<div class="component">';
                        html += `<div class="component-name">📦 ${name}</div>`;
                        html += `<pre>${this.formatComponent(component)}</pre>`;
                        html += '</div>';
                    }
                }
                
                html += '</div>';
            } else {
                html += '<div class="section">';
                html += '<div class="section-title">No components defined</div>';
                html += '</div>';
            }

            webview.postMessage({ type: 'update', html });
        } catch (error) {
            const errorHtml = `<div class="error">Error parsing stack: ${error}</div>`;
            webview.postMessage({ type: 'update', html: errorHtml });
        }
    }

    /**
     * Render component provenance information
     */
    private async renderComponentProvenance(component: string, stack: string): Promise<string> {
        try {
            const provenance = await this.atmosCli.describeComponentWithProvenance(component, stack);
            
            let html = '<div class="component">';
            html += `<div class="component-name">📦 ${component} (Stack: ${stack})</div>`;
            
            // Add legend
            html += '<div class="legend">';
            html += '<strong>Provenance Legend:</strong><br>';
            html += '<div class="legend-item"><span class="provenance-symbol provenance-defined">●</span> [1] Defined in parent stack</div>';
            html += '<div class="legend-item"><span class="provenance-symbol provenance-inherited">○</span> [N] Inherited/imported (N=2+ levels deep)</div>';
            html += '<div class="legend-item"><span class="provenance-symbol provenance-computed">∴</span> Computed/templated</div>';
            html += '</div>';
            
            // Render provenance lines
            html += '<pre>';
            for (const line of provenance.provenanceLines) {
                const indent = ' '.repeat(line.indent);
                let lineHtml = indent;
                
                if (line.key) {
                    lineHtml += line.key + ':';
                    if (line.value) {
                        lineHtml += ' ' + line.value;
                    }
                } else if (line.value) {
                    lineHtml += line.value;
                }
                
                // Add provenance comment
                if (line.source) {
                    let symbol = '';
                    let cssClass = '';
                    if (line.isComputed) {
                        symbol = '∴';
                        cssClass = 'provenance-computed';
                    } else if (line.isImport) {
                        symbol = '○';
                        cssClass = 'provenance-inherited';
                    } else {
                        symbol = '●';
                        cssClass = 'provenance-defined';
                    }
                    
                    lineHtml += `  <span class="provenance-comment"><span class="provenance-symbol ${cssClass}">${symbol}</span> [${line.sourceLevel}] ${line.source}</span>`;
                }
                
                html += `<div class="provenance-line">${lineHtml}</div>`;
            }
            html += '</pre>';
            html += '</div>';
            
            return html;
        } catch (error) {
            return `<div class="error">Failed to load provenance: ${error}</div>`;
        }
    }

    /**
     * Format component for display
     */
    private formatComponent(component: any): string {
        const formatted: any = {};
        
        if (component.component) {
            formatted.component = component.component;
        }
        if (component.vars) {
            formatted.vars = component.vars;
        }
        if (component.settings) {
            formatted.settings = component.settings;
        }
        if (component.backend) {
            formatted.backend = component.backend;
        }
        if (component.metadata) {
            formatted.metadata = component.metadata;
        }

        return yaml.stringify(formatted);
    }

    /**
     * Validate stack
     */
    private async validateStack(document: vscode.TextDocument): Promise<void> {
        vscode.commands.executeCommand('atmos.validateStack');
    }

    /**
     * Format document
     */
    private async formatDocument(document: vscode.TextDocument): Promise<void> {
        try {
            const text = document.getText();
            const parsed = yaml.parse(text);
            const formatted = yaml.stringify(parsed, { indent: 2 });

            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(text.length)
            );
            edit.replace(document.uri, fullRange, formatted);
            await vscode.workspace.applyEdit(edit);

            vscode.window.showInformationMessage('Stack file formatted');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to format: ${error}`);
        }
    }

    /**
     * Debounce helper
     */
    private debounceTimer: NodeJS.Timeout | undefined;
    private async debounce(fn: () => Promise<void>, delay: number): Promise<void> {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(fn, delay);
    }

    /**
     * Generate nonce for CSP
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
