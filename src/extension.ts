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
import { StackViewerProvider } from './stackViewerProvider';
// Advanced Providers
import { AtmosFileDecorationProvider } from './fileDecorationProvider';
import { ExplorerTreeProvider } from './explorerTreeProvider';
import { ComponentsViewProvider } from './componentsViewProvider';
import { StackCustomEditorProvider } from './stackCustomEditor';
import { AtmosDocumentSymbolProvider } from './documentSymbolProvider';
import { AtmosSemanticTokensProvider } from './semanticTokensProvider';

let workspaceManager: AtmosWorkspaceManager;
let workspaceSwitcher: WorkspaceSwitcher;
let configManager: AtmosConfigManager;
let diagnosticsProvider: AtmosDiagnosticsProvider;
let stackContextProvider: StackContextProvider;
let componentPreviewProvider: ComponentPreviewProvider;
let stackViewerProvider: StackViewerProvider;
// Advanced Providers
let fileDecorationProvider: AtmosFileDecorationProvider;
let explorerTreeProvider: ExplorerTreeProvider;
let componentsViewProvider: ComponentsViewProvider;

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

	// Initialize stack viewer provider
	stackViewerProvider = new StackViewerProvider(configManager);
	const stackViewerTreeView = vscode.window.createTreeView('atmosStackViewer', {
		treeDataProvider: stackViewerProvider,
		showCollapseAll: true
	});
	context.subscriptions.push(stackViewerTreeView);

	// Initialize file decoration provider
	fileDecorationProvider = new AtmosFileDecorationProvider(configManager);
	context.subscriptions.push(
		vscode.window.registerFileDecorationProvider(fileDecorationProvider)
	);

	// Initialize explorer tree provider
	explorerTreeProvider = new ExplorerTreeProvider(configManager);
	context.subscriptions.push(explorerTreeProvider);

	// Initialize components view provider
	componentsViewProvider = new ComponentsViewProvider(configManager);
	const componentsTreeView = vscode.window.createTreeView('atmosComponents', {
		treeDataProvider: componentsViewProvider,
		showCollapseAll: true
	});
	context.subscriptions.push(componentsTreeView);

	// Initialize custom editor provider
	const customEditorProvider = new StackCustomEditorProvider(configManager);
	context.subscriptions.push(
		vscode.window.registerCustomEditorProvider(
			StackCustomEditorProvider.viewType,
			customEditorProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		)
	);

	// Update components view when active editor changes
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(async (editor) => {
			if (editor && editor.document.languageId === 'yaml') {
				const filePath = editor.document.uri.fsPath;
				if (configManager.isStackFile(filePath)) {
					await componentsViewProvider.updateStackFile(filePath);
				} else {
					await componentsViewProvider.updateStackFile(undefined);
				}
			} else {
				await componentsViewProvider.updateStackFile(undefined);
			}
		})
	);

	// Initialize components view with current file if it's a stack file
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor && activeEditor.document.languageId === 'yaml') {
		const filePath = activeEditor.document.uri.fsPath;
		if (configManager.isStackFile(filePath)) {
			await componentsViewProvider.updateStackFile(filePath);
		}
	}

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
			stackViewerProvider = new StackViewerProvider(configManager);

			// Re-validate all open documents
			for (const document of vscode.workspace.textDocuments) {
				if (document.languageId === 'yaml') {
					diagnosticsProvider.validateDocument(document);
				}
			}

			// Reload stacks in the stack viewer
			stackViewerProvider.reloadStacks();
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

	// Register document symbol provider
	context.subscriptions.push(
		vscode.languages.registerDocumentSymbolProvider(
			yamlSelector,
			new AtmosDocumentSymbolProvider(configManager)
		)
	);

	// Register semantic tokens provider
	context.subscriptions.push(
		vscode.languages.registerDocumentSemanticTokensProvider(
			yamlSelector,
			new AtmosSemanticTokensProvider(configManager),
			AtmosSemanticTokensProvider.getLegend()
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

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.stackViewer.refresh', async () => {
			await stackViewerProvider.reloadStacks();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.stackViewer.openComponent', async (filePath: string, componentName: string) => {
			try {
				const uri = vscode.Uri.file(filePath);
				const document = await vscode.workspace.openTextDocument(uri);
				const editor = await vscode.window.showTextDocument(document);
				
				// Find the component definition in the file
				const text = document.getText();
				const lines = text.split('\n');
				
				// Look for the component name in the components.terraform section
				// Component names can be like "eks/dev" so we need to handle the full path
				const componentKey = componentName.split('/').pop() || componentName;
				
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					// Match component definition like "  eks/dev:" or "  vpc:"
					const match = line.match(/^\s+([a-zA-Z0-9_\-\/]+):\s*$/);
					if (match && match[1] === componentName) {
						// Found the component, navigate to it
						const position = new vscode.Position(i, 0);
						editor.selection = new vscode.Selection(position, position);
						editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
						break;
					}
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to open component: ${error}`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.stackViewer.openFile', async (filePath: string) => {
			try {
				const uri = vscode.Uri.file(filePath);
				const document = await vscode.workspace.openTextDocument(uri);
				await vscode.window.showTextDocument(document);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to open file: ${error}`);
			}
		})
	);

	// Register explorer commands
	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.explorer.openComponent', async (filePath: string, componentName: string, lineNumber: number) => {
			try {
				const uri = vscode.Uri.file(filePath);
				const document = await vscode.workspace.openTextDocument(uri);
				const editor = await vscode.window.showTextDocument(document);
				if (lineNumber !== undefined) {
					const position = new vscode.Position(lineNumber, 0);
					editor.selection = new vscode.Selection(position, position);
					editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to open component: ${error}`);
			}
		})
	);

	// Register components view commands
	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.componentsView.openComponent', async (filePath: string, componentName: string) => {
			try {
				const uri = vscode.Uri.file(filePath);
				const document = await vscode.workspace.openTextDocument(uri);
				await vscode.window.showTextDocument(document);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to open component: ${error}`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.componentsView.refresh', async () => {
			componentsViewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('atmos.componentsView.search', async () => {
			const filter = await vscode.window.showInputBox({
				prompt: 'Search components',
				placeHolder: 'Enter component name...'
			});
			if (filter !== undefined) {
				componentsViewProvider.setSearchFilter(filter);
			}
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
	// Stack viewer provider doesn't need explicit disposal
	// as it's managed by the tree view subscription
}
