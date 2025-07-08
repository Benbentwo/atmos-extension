import * as vscode from 'vscode';
import { loadAtmosConfig } from './atmos';

export class StackHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
        const line = document.lineAt(position.line).text;
        const componentMatch = line.match(/component:\s*(.*)/);
        if (componentMatch && componentMatch[1]) {
            const component = componentMatch[1].trim();
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            const config = loadAtmosConfig(workspaceFolder);
            if (!config) {
                return;
            }
            const md = new vscode.MarkdownString(`**Component**: ${component}`);
            md.isTrusted = true;
            return new vscode.Hover(md);
        }
        return;
    }
}
