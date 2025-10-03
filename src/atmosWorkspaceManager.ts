import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AtmosConfigManager, AtmosConfig } from './atmosConfig';

export interface AtmosWorkspace {
    id: string;
    name: string;
    rootPath: string;
    configPath: string;
    configManager: AtmosConfigManager;
    config: AtmosConfig | null;
}

export class AtmosWorkspaceManager {
    private workspaces: Map<string, AtmosWorkspace> = new Map();
    private activeWorkspaceId: string | null = null;
    private workspaceFolder: vscode.WorkspaceFolder;
    private onDidChangeActiveWorkspaceEmitter = new vscode.EventEmitter<AtmosWorkspace | null>();
    public readonly onDidChangeActiveWorkspace = this.onDidChangeActiveWorkspaceEmitter.event;

    constructor(workspaceFolder: vscode.WorkspaceFolder) {
        this.workspaceFolder = workspaceFolder;
    }

    /**
     * Discover all atmos.yaml files in the workspace folder
     */
    public async discoverWorkspaces(): Promise<AtmosWorkspace[]> {
        const configFiles = await this.findAtmosConfigs(this.workspaceFolder.uri.fsPath);
        
        console.log(`Found ${configFiles.length} atmos.yaml file(s)`);

        const workspaces: AtmosWorkspace[] = [];

        for (const configPath of configFiles) {
            const workspace = await this.createWorkspace(configPath);
            if (workspace) {
                this.workspaces.set(workspace.id, workspace);
                workspaces.push(workspace);
            }
        }

        // Set first workspace as active if none is set
        if (workspaces.length > 0 && !this.activeWorkspaceId) {
            this.setActiveWorkspace(workspaces[0].id);
        }

        return workspaces;
    }

    /**
     * Recursively find all atmos.yaml files
     */
    private async findAtmosConfigs(dir: string, maxDepth: number = 10, currentDepth: number = 0): Promise<string[]> {
        if (currentDepth >= maxDepth) {
            return [];
        }

        const configs: string[] = [];

        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                // Skip common directories that shouldn't contain atmos configs
                if (entry.isDirectory()) {
                    const skipDirs = ['node_modules', '.git', 'dist', 'out', 'build', '.terraform', 'vendor'];
                    if (skipDirs.includes(entry.name)) {
                        continue;
                    }

                    // Recursively search subdirectories
                    const subConfigs = await this.findAtmosConfigs(fullPath, maxDepth, currentDepth + 1);
                    configs.push(...subConfigs);
                } else if (entry.isFile()) {
                    // Check if this is an atmos config file
                    if (entry.name === 'atmos.yaml' || entry.name === 'atmos.yml') {
                        configs.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${dir}:`, error);
        }

        return configs;
    }

    /**
     * Create a workspace from an atmos.yaml path
     */
    private async createWorkspace(configPath: string): Promise<AtmosWorkspace | null> {
        try {
            const rootPath = path.dirname(configPath);
            const relativePath = path.relative(this.workspaceFolder.uri.fsPath, rootPath);
            
            // Generate a unique ID and friendly name
            const id = this.generateWorkspaceId(configPath);
            const name = relativePath || 'root';

            // Create config manager for this workspace
            const configManager = new AtmosConfigManager(rootPath);
            const config = await configManager.loadConfig();

            const workspace: AtmosWorkspace = {
                id,
                name,
                rootPath,
                configPath,
                configManager,
                config
            };

            return workspace;
        } catch (error) {
            console.error(`Failed to create workspace from ${configPath}:`, error);
            return null;
        }
    }

    /**
     * Generate a unique workspace ID from config path
     */
    private generateWorkspaceId(configPath: string): string {
        const relativePath = path.relative(this.workspaceFolder.uri.fsPath, configPath);
        return relativePath.replace(/[/\\]/g, '_').replace(/\.(yaml|yml)$/, '');
    }

    /**
     * Get workspace that contains the given file path
     */
    public getWorkspaceForFile(filePath: string): AtmosWorkspace | null {
        // Find the workspace whose root path is a parent of the file path
        let bestMatch: AtmosWorkspace | null = null;
        let longestMatch = 0;

        for (const workspace of this.workspaces.values()) {
            if (filePath.startsWith(workspace.rootPath)) {
                const matchLength = workspace.rootPath.length;
                if (matchLength > longestMatch) {
                    longestMatch = matchLength;
                    bestMatch = workspace;
                }
            }
        }

        return bestMatch;
    }

    /**
     * Set the active workspace
     */
    public setActiveWorkspace(workspaceId: string): boolean {
        const workspace = this.workspaces.get(workspaceId);
        if (!workspace) {
            return false;
        }

        if (this.activeWorkspaceId !== workspaceId) {
            this.activeWorkspaceId = workspaceId;
            this.onDidChangeActiveWorkspaceEmitter.fire(workspace);
            console.log(`Active workspace changed to: ${workspace.name}`);
        }

        return true;
    }

    /**
     * Automatically set active workspace based on current file
     */
    public autoSetActiveWorkspace(filePath: string): boolean {
        const workspace = this.getWorkspaceForFile(filePath);
        if (workspace) {
            return this.setActiveWorkspace(workspace.id);
        }
        return false;
    }

    /**
     * Get the currently active workspace
     */
    public getActiveWorkspace(): AtmosWorkspace | null {
        if (!this.activeWorkspaceId) {
            return null;
        }
        return this.workspaces.get(this.activeWorkspaceId) || null;
    }

    /**
     * Get all discovered workspaces
     */
    public getAllWorkspaces(): AtmosWorkspace[] {
        return Array.from(this.workspaces.values());
    }

    /**
     * Get workspace by ID
     */
    public getWorkspace(id: string): AtmosWorkspace | null {
        return this.workspaces.get(id) || null;
    }

    /**
     * Refresh a specific workspace's configuration
     */
    public async refreshWorkspace(workspaceId: string): Promise<boolean> {
        const workspace = this.workspaces.get(workspaceId);
        if (!workspace) {
            return false;
        }

        try {
            const config = await workspace.configManager.loadConfig();
            workspace.config = config;
            
            // Fire change event if this is the active workspace
            if (this.activeWorkspaceId === workspaceId) {
                this.onDidChangeActiveWorkspaceEmitter.fire(workspace);
            }

            return true;
        } catch (error) {
            console.error(`Failed to refresh workspace ${workspaceId}:`, error);
            return false;
        }
    }

    /**
     * Refresh all workspaces
     */
    public async refreshAllWorkspaces(): Promise<void> {
        const refreshPromises = Array.from(this.workspaces.keys()).map(id => 
            this.refreshWorkspace(id)
        );
        await Promise.all(refreshPromises);
    }

    /**
     * Watch for changes to atmos.yaml files
     */
    public watchWorkspaces(context: vscode.ExtensionContext): void {
        // Watch all atmos.yaml files
        const watchers: vscode.FileSystemWatcher[] = [];

        for (const workspace of this.workspaces.values()) {
            const watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(workspace.rootPath, 'atmos.{yaml,yml}')
            );

            watcher.onDidChange(async () => {
                console.log(`Atmos config changed: ${workspace.name}`);
                await this.refreshWorkspace(workspace.id);
                vscode.window.showInformationMessage(
                    `Atmos workspace "${workspace.name}" configuration reloaded`
                );
            });

            watcher.onDidCreate(async () => {
                console.log(`Atmos config created: ${workspace.name}`);
                await this.refreshWorkspace(workspace.id);
            });

            watcher.onDidDelete(() => {
                console.log(`Atmos config deleted: ${workspace.name}`);
                this.workspaces.delete(workspace.id);
                if (this.activeWorkspaceId === workspace.id) {
                    // Switch to another workspace if available
                    const remaining = this.getAllWorkspaces();
                    if (remaining.length > 0) {
                        this.setActiveWorkspace(remaining[0].id);
                    } else {
                        this.activeWorkspaceId = null;
                        this.onDidChangeActiveWorkspaceEmitter.fire(null);
                    }
                }
            });

            watchers.push(watcher);
            context.subscriptions.push(watcher);
        }
    }

    /**
     * Get workspace count
     */
    public getWorkspaceCount(): number {
        return this.workspaces.size;
    }

    /**
     * Check if multiple workspaces exist
     */
    public hasMultipleWorkspaces(): boolean {
        return this.workspaces.size > 1;
    }

    public dispose(): void {
        this.onDidChangeActiveWorkspaceEmitter.dispose();
        this.workspaces.clear();
    }
}
