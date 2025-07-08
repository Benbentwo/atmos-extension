import * as vscode from 'vscode';
import { StackLinkProvider } from './linkProvider';
import { StackHoverProvider } from './hoverProvider';
import { StackTreeProvider } from './stackTree';

export function activate(context: vscode.ExtensionContext) {
    const linkProvider = new StackLinkProvider();
    const hoverProvider = new StackHoverProvider();
    const treeProvider = new StackTreeProvider();

    context.subscriptions.push(
        vscode.languages.registerDocumentLinkProvider({ language: 'yaml' }, linkProvider),
        vscode.languages.registerHoverProvider({ language: 'yaml' }, hoverProvider),
        vscode.window.registerTreeDataProvider('atmos-stacks', treeProvider),
        vscode.commands.registerCommand('cloudposse-atmos.showStackInfo', () => treeProvider.refresh())
    );
}

export function deactivate() {}
