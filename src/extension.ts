import * as vscode from 'vscode';
import { AtmosConfigManager } from './atmosConfig';
import { AtmosCompletionProvider } from './completionProvider';
import { AtmosDefinitionProvider } from './definitionProvider';
import { AtmosHoverProvider } from './hoverProvider';
import { AtmosDiagnosticsProvider } from './diagnosticsProvider';
import { StackContextProvider } from './stackContextProvider';
import { ComponentPreviewProvider } from './componentPreviewProvider';
import { AtmosWorkspaceManager } from './atmosWorkspaceManager';
import { WorkspaceSwitcher } from './workspaceSwitcher';

let workspaceManager: AtmosWorkspaceManager;
let workspaceSwitcher: WorkspaceSwitcher;
let configManager: AtmosConfigManager;
let diagnosticsProvider: AtmosDiagnosticsProvider;
let stackContextProvider: StackContextProvider;
let componentPreviewProvider: ComponentPreviewProvider;

export async function activate(context: vscode.ExtensionContext) {
	console.log('Activating Atmos extension...');

	// Get workspace folder
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		console.log('No workspace folder found');
		return;
	}

	// Initialize workspace manager and discover all atmos.yaml files
	workspaceManager = new AtmosWorkspaceManager(workspaceFolder);
	const workspaces = await workspaceManager.discoverWorkspaces();

	if (workspaces.length === 0) {
		vscode.window.showInformationMessage(
			'No Atmos configuration (atmos.yaml) found. Some features may be limited.'
		);
		return;
	}

	console.log(`Discovered ${workspaces.length} Atmos workspace(s)`);

	// Initialize workspace switcher
	workspaceSwitcher = new WorkspaceSwitcher(workspaceManager);
	workspaceSwitcher.activate(context);

	// Watch for workspace changes
	workspaceManager.watchWorkspaces(context);

	// Get active workspace config manager
	const activeWorkspace = workspaceManager.getActiveWorkspace();
	if (!activeWorkspace) {
		console.log('No active workspace');
		return;
	}

	configManager = activeWorkspace.configManager;

	// Initialize diagnostics provider
	diagnosticsProvider = new AtmosDiagnosticsProvider(configManager);

	// Initialize stack context provider
	stackContextProvider = new StackContextProvider(configManager);
	stackContextProvider.activate(context);

	// Initialize component preview provider
	componentPreviewProvider = new ComponentPreviewProvider(configManager);

	// Listen for workspace changes and update providers
	workspaceManager.onDidChangeActiveWorkspace((workspace) => {
		if (workspace) {
			console.log(`Workspace changed to: ${workspace.name}`);
			configManager = workspace.configManager;
			
			// Update providers with new config manager
			diagnosticsProvider = new AtmosDiagnosticsProvider(configManager);
			stackContextProvider = new StackContextProvider(configManager);
			stackContextProvider.activate(context);
			componentPreviewProvider = new ComponentPreviewProvider(configManager);

			// Re-validate all open documents
			for (const document of vscode.workspace.textDocuments) {
				if (document.languageId === 'yaml') {
					diagnosticsProvider.validateDocument(document);
				}
			}
		}
	});

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

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.showStackContext', async () => {
			await stackContextProvider.showStackContextQuickPick();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.previewComponent', async () => {
			await componentPreviewProvider.previewComponent();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.switchWorkspace', async () => {
			await workspaceSwitcher.showWorkspaceSwitcher();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.showWorkspaceInfo', async () => {
			await workspaceSwitcher.showWorkspaceInfo();
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
	if (workspaceManager) {
		workspaceManager.dispose();
	}
	if (workspaceSwitcher) {
		workspaceSwitcher.dispose();
	}
	if (diagnosticsProvider) {
		diagnosticsProvider.dispose();
	}
	if (stackContextProvider) {
		stackContextProvider.dispose();
	}
	if (componentPreviewProvider) {
		componentPreviewProvider.dispose();
	}
}
