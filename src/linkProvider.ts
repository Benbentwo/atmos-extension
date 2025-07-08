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
        let inImportBlock = false;
        let importIndent = 0;
        for (let line = 0; line < document.lineCount; line++) {
            const text = document.lineAt(line).text;
            const blockStart = text.match(/^(\s*)import:\s*(.*)$/);
            if (blockStart) {
                const rest = blockStart[2].trim();
                if (rest) {
                    const stackRef = rest.replace(/^['"]|['"]$/g, '');
                    const target = resolveStackPath(config, stackRef);
                    if (target) {
                        const startCol = text.indexOf(rest);
                        const start = new vscode.Position(line, startCol);
                        const end = start.translate(0, rest.length);
                        links.push(new vscode.DocumentLink(new vscode.Range(start, end), vscode.Uri.file(target)));
                    }
                    inImportBlock = false;
                } else {
                    inImportBlock = true;
                    importIndent = blockStart[1].length;
                }
                continue;
            }
            if (inImportBlock) {
                const indent = text.search(/\S/);
                if (indent <= importIndent || indent === -1) {
                    inImportBlock = false;
                }
                const item = text.match(/^\s*-\s*(.+)$/);
                if (item) {
                    const stackRef = item[1].trim().replace(/^['"]|['"]$/g, '');
                    const target = resolveStackPath(config, stackRef);
                    if (target) {
                        const startCol = text.indexOf(item[1]);
                        const start = new vscode.Position(line, startCol);
                        const end = start.translate(0, item[1].length);
                        links.push(new vscode.DocumentLink(new vscode.Range(start, end), vscode.Uri.file(target)));
                    }
                }
            }
        }
        return links;
    }
}
