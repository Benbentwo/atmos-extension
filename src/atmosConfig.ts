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
        atmos?: {
            manifest?: string;
        };
        jsonschema?: {
            base_path?: string;
        };
        opa?: {
            base_path?: string;
        };
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

    public getWorkspaceRoot(): string {
        return this.workspaceRoot;
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

    public getManifestSchemaPath(): string {
        const defaultSchema = 'https://atmos.tools/schemas/atmos/atmos-manifest/1.0/atmos-manifest.json';
        
        if (!this.config?.schemas?.atmos?.manifest) {
            return defaultSchema;
        }

        const manifestPath = this.config.schemas.atmos.manifest;
        
        // If it's a URL, return as-is
        if (manifestPath.startsWith('http://') || manifestPath.startsWith('https://')) {
            return manifestPath;
        }

        // If it's a relative path, resolve it relative to workspace root
        return path.join(this.workspaceRoot, this.config.basePath, manifestPath);
    }

    /**
     * Get the stack name pattern from atmos.yaml
     * Supports both name_pattern and name_template formats
     */
    public getStackNamePattern(): string | null {
        if (!this.config?.stacks) {
            return null;
        }
        
        // Prefer name_pattern over name_template
        return this.config.stacks.name_pattern || this.config.stacks.name_template || null;
    }

    /**
     * Calculate stack name from pattern using provided variables
     * Supports both {var} and {{.var}} template formats
     */
    public calculateStackName(vars: Record<string, any>): string | null {
        const pattern = this.getStackNamePattern();
        if (!pattern) {
            return null;
        }

        let result = pattern;
        
        // Replace {var} format
        result = result.replace(/\{(\w+)\}/g, (match, varName) => {
            return vars[varName] !== undefined ? String(vars[varName]) : match;
        });
        
        // Replace {{.var}} format (Go template style)
        result = result.replace(/\{\{\.(\w+)\}\}/g, (match, varName) => {
            return vars[varName] !== undefined ? String(vars[varName]) : match;
        });
        
        // If no replacements were made, return null
        if (result === pattern || result.includes('{') || result.includes('{{')) {
            return null;
        }
        
        return result;
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
                // Resolve symlinks to get the real path
                try {
                    const realPath = fs.realpathSync(configPath);
                    const stats = fs.lstatSync(configPath);
                    if (stats.isSymbolicLink()) {
                        console.log(`Found symlinked atmos.yaml at ${configPath}, resolving to ${realPath}`);
                    }
                    return realPath;
                } catch (error) {
                    console.error(`Error resolving path ${configPath}:`, error);
                    continue;
                }
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
