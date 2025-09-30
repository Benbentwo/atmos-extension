import * as vscode from 'vscode';
import { AtmosConfigManager } from './atmosConfig';
import { AtmosCompletionProvider } from './completionProvider';
import { AtmosDefinitionProvider } from './definitionProvider';
import { AtmosHoverProvider } from './hoverProvider';
import { AtmosDiagnosticsProvider } from './diagnosticsProvider';

let configManager: AtmosConfigManager;
let diagnosticsProvider: AtmosDiagnosticsProvider;

export async function activate(context: vscode.ExtensionContext) {
	console.log('Activating Atmos extension...');

	// Get workspace folder
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		console.log('No workspace folder found');
		return;
	}

	// Initialize config manager
	configManager = new AtmosConfigManager(workspaceFolder.uri.fsPath);
	const config = await configManager.loadConfig();

	if (!config) {
		vscode.window.showInformationMessage(
			'Atmos configuration (atmos.yaml) not found. Some features may be limited.'
		);
	} else {
		console.log('Atmos configuration loaded:', config);
	}

	// Initialize diagnostics provider
	diagnosticsProvider = new AtmosDiagnosticsProvider(configManager);

	// Register language features for YAML files
	const yamlSelector: vscode.DocumentSelector = { 
		scheme: 'file', 
		language: 'yaml' 
	};

	// Register completion provider
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			yamlSelector,
			new AtmosCompletionProvider(configManager),
			':', '/', '-', '"', "'"
		)
	);

	// Register definition provider
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider(
			yamlSelector,
			new AtmosDefinitionProvider(configManager)
		)
	);

	// Register hover provider
	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			yamlSelector,
			new AtmosHoverProvider(configManager)
		)
	);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.renderStack', async () => {
			await renderStackCommand();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.validateStack', async () => {
			await validateStackCommand();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.openAtmosConfig', async () => {
			await openAtmosConfigCommand();
		})
	);

	// Validate on document open and change
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(async (document) => {
			if (document.languageId === 'yaml') {
				await diagnosticsProvider.validateDocument(document);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(async (event) => {
			if (event.document.languageId === 'yaml') {
				await diagnosticsProvider.validateDocument(event.document);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(async (document) => {
			if (document.languageId === 'yaml') {
				await diagnosticsProvider.validateDocument(document);
			}
		})
	);

	// Validate all open documents
	for (const document of vscode.workspace.textDocuments) {
		if (document.languageId === 'yaml') {
			await diagnosticsProvider.validateDocument(document);
		}
	}

	// Watch for config changes
	const configWatcher = await configManager.watchConfig(async () => {
		vscode.window.showInformationMessage('Atmos configuration reloaded');
		// Re-validate all documents
		for (const document of vscode.workspace.textDocuments) {
			if (document.languageId === 'yaml') {
				await diagnosticsProvider.validateDocument(document);
			}
		}
	});
	context.subscriptions.push(configWatcher);

	console.log('Atmos extension activated successfully');
}

async function renderStackCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage('No active editor');
		return;
	}

	const document = editor.document;
	if (!configManager.isStackFile(document.uri.fsPath)) {
		vscode.window.showErrorMessage('Current file is not a stack file');
		return;
	}

	// Get stack name from file path
	const stacksPath = configManager.getStacksPath();
	const relativePath = document.uri.fsPath.replace(stacksPath + '/', '').replace('.yaml', '');

	const terminal = vscode.window.createTerminal('Atmos');
	terminal.show();
	terminal.sendText(`atmos describe component ${relativePath} --format yaml`);
}

async function validateStackCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage('No active editor');
		return;
	}

	await diagnosticsProvider.validateDocument(editor.document);
	vscode.window.showInformationMessage('Stack validation complete');
}

async function openAtmosConfigCommand() {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		return;
	}

	const config = configManager.getConfig();
	if (!config) {
		vscode.window.showErrorMessage('Atmos configuration not found');
		return;
	}

	const configPath = vscode.Uri.file(`${workspaceFolder.uri.fsPath}/atmos.yaml`);
	const document = await vscode.workspace.openTextDocument(configPath);
	await vscode.window.showTextDocument(document);
}

export function deactivate() {
	if (diagnosticsProvider) {
		diagnosticsProvider.dispose();
	}
}
