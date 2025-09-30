import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';

export interface AtmosConfig {
    basePath: string;
    stacksPath: string;
    componentsPath: string;
    workflowsPath?: string;
    schemas?: {
        atmos?: string;
        jsonschema?: string;
    };
    stacks?: {
        name_pattern?: string;
        name_template?: string;
    };
}

export class AtmosConfigManager {
    private config: AtmosConfig | null = null;
    private configPath: string | null = null;
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    public async loadConfig(): Promise<AtmosConfig | null> {
        const configPath = this.findAtmosConfig();
        if (!configPath) {
            return null;
        }

        this.configPath = configPath;
        
        try {
            const content = await fs.promises.readFile(configPath, 'utf-8');
            const parsed = yaml.parse(content);
            
            this.config = {
                basePath: parsed.base_path || path.dirname(configPath),
                stacksPath: parsed.stacks?.base_path || 'stacks',
                componentsPath: parsed.components?.terraform?.base_path || 'components/terraform',
                workflowsPath: parsed.workflows?.base_path,
                schemas: parsed.schemas,
                stacks: parsed.stacks
            };

            return this.config;
        } catch (error) {
            console.error('Failed to parse atmos.yaml:', error);
            return null;
        }
    }

    public getConfig(): AtmosConfig | null {
        return this.config;
    }

    public getStacksPath(): string {
        if (!this.config) {
            return path.join(this.workspaceRoot, 'stacks');
        }
        return path.join(this.workspaceRoot, this.config.basePath, this.config.stacksPath);
    }

    public getComponentsPath(): string {
        if (!this.config) {
            return path.join(this.workspaceRoot, 'components', 'terraform');
        }
        return path.join(this.workspaceRoot, this.config.basePath, this.config.componentsPath);
    }

    public isStackFile(filePath: string): boolean {
        const stacksPath = this.getStacksPath();
        return filePath.startsWith(stacksPath) && filePath.endsWith('.yaml');
    }

    private findAtmosConfig(): string | null {
        const possiblePaths = [
            path.join(this.workspaceRoot, 'atmos.yaml'),
            path.join(this.workspaceRoot, 'atmos.yml'),
            path.join(this.workspaceRoot, '.atmos.yaml'),
            path.join(this.workspaceRoot, '.atmos.yml')
        ];

        for (const configPath of possiblePaths) {
            if (fs.existsSync(configPath)) {
                return configPath;
            }
        }

        return null;
    }

    public async watchConfig(callback: () => void): Promise<vscode.Disposable> {
        if (!this.configPath) {
            return new vscode.Disposable(() => {});
        }

        const watcher = vscode.workspace.createFileSystemWatcher(this.configPath);
        
        watcher.onDidChange(async () => {
            await this.loadConfig();
            callback();
        });

        return watcher;
    }
}
