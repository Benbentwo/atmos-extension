import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface StackComponent {
    component: string;
    vars?: Record<string, any>;
    settings?: Record<string, any>;
    backend?: Record<string, any>;
    backend_type?: string;
    remote_state_backend?: Record<string, any>;
    remote_state_backend_type?: string;
    metadata?: Record<string, any>;
}

export interface StackConfig {
    imports?: string[];
    vars?: Record<string, any>;
    settings?: Record<string, any>;
    backend?: Record<string, any>;
    backend_type?: string;
    components?: {
        terraform?: Record<string, StackComponent>;
        helmfile?: Record<string, any>;
    };
    terraform?: Record<string, StackComponent>;
    helmfile?: Record<string, any>;
}

export interface ParsedStack {
    filePath: string;
    config: StackConfig;
    imports: string[];
    components: Map<string, StackComponent>;
    errors: string[];
}

export class StackParser {
    private stacksBasePath: string;

    constructor(stacksBasePath: string) {
        this.stacksBasePath = stacksBasePath;
    }

    public async parseStackFile(filePath: string): Promise<ParsedStack> {
        const errors: string[] = [];
        const imports: string[] = [];
        const components = new Map<string, StackComponent>();

        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const config = yaml.parse(content) as StackConfig;

            // Extract imports
            if (config.imports && Array.isArray(config.imports)) {
                imports.push(...config.imports);
            }

            // Extract components from both locations (legacy and new format)
            const terraformComponents = config.components?.terraform || config.terraform || {};
            
            for (const [name, component] of Object.entries(terraformComponents)) {
                if (component && typeof component === 'object') {
                    components.set(name, component as StackComponent);
                }
            }

            return {
                filePath,
                config,
                imports,
                components,
                errors
            };
        } catch (error) {
            errors.push(`Failed to parse stack file: ${error}`);
            return {
                filePath,
                config: {},
                imports,
                components,
                errors
            };
        }
    }

    public resolveImportPath(currentFilePath: string, importPath: string): string {
        // Remove leading slash if present
        const cleanImportPath = importPath.startsWith('/') ? importPath.slice(1) : importPath;
        
        // If import path doesn't have extension, add .yaml
        const importWithExt = cleanImportPath.endsWith('.yaml') || cleanImportPath.endsWith('.yml')
            ? cleanImportPath
            : `${cleanImportPath}.yaml`;

        return path.join(this.stacksBasePath, importWithExt);
    }

    public async getComponentReferences(componentName: string, stackFiles: string[]): Promise<string[]> {
        const references: string[] = [];

        for (const stackFile of stackFiles) {
            const parsed = await this.parseStackFile(stackFile);
            if (parsed.components.has(componentName)) {
                references.push(stackFile);
            }
        }

        return references;
    }

    public extractComponentAtPosition(content: string, position: number): string | null {
        const lines = content.split('\n');
        let currentPos = 0;
        
        for (const line of lines) {
            const lineEnd = currentPos + line.length + 1; // +1 for newline
            
            if (position >= currentPos && position <= lineEnd) {
                // Check if we're in a component definition
                const componentMatch = line.match(/^\s*([a-zA-Z0-9_-]+):\s*$/);
                if (componentMatch) {
                    return componentMatch[1];
                }
                
                // Check if we're on a component: line
                const componentRefMatch = line.match(/component:\s*["']?([a-zA-Z0-9_/-]+)["']?/);
                if (componentRefMatch) {
                    return componentRefMatch[1];
                }
            }
            
            currentPos = lineEnd;
        }
        
        return null;
    }

    public extractImportAtPosition(content: string, position: number): string | null {
        const lines = content.split('\n');
        let currentPos = 0;
        let inImports = false;
        
        for (const line of lines) {
            const lineEnd = currentPos + line.length + 1;
            
            if (line.trim().startsWith('imports:')) {
                inImports = true;
            } else if (inImports && line.match(/^[a-zA-Z]/)) {
                inImports = false;
            }
            
            if (position >= currentPos && position <= lineEnd && inImports) {
                const importMatch = line.match(/^\s*-\s*["']?([^"'\s]+)["']?/);
                if (importMatch) {
                    return importMatch[1];
                }
            }
            
            currentPos = lineEnd;
        }
        
        return null;
    }
}
