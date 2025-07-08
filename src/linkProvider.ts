import * as vscode from 'vscode';
import { loadAtmosConfig, resolveStackPath } from './atmos';

export class StackLinkProvider implements vscode.DocumentLinkProvider {
    provideDocumentLinks(document: vscode.TextDocument): vscode.ProviderResult<vscode.DocumentLink[]> {
        if (document.languageId !== 'yaml') {
            return [];
        }
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const config = loadAtmosConfig(workspaceFolder);
        if (!config) {
            return [];
        }
        const links: vscode.DocumentLink[] = [];
        for (let line = 0; line < document.lineCount; line++) {
            const text = document.lineAt(line).text;
            const match = text.match(/\bimport:\s*(.*)/);
            if (match && match[1]) {
                const stackRef = match[1].trim().replace(/^['"]|['"]$/g, '');
                const target = resolveStackPath(config, stackRef);
                if (target) {
                    const start = new vscode.Position(line, text.indexOf(match[1]));
                    const end = start.translate(0, match[1].length);
                    const uri = vscode.Uri.file(target);
                    links.push(new vscode.DocumentLink(new vscode.Range(start, end), uri));
                }
            }
        }
        return links;
    }
}
