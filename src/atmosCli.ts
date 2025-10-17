import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Interface for stack information from atmos list stacks
 */
export interface AtmosStack {
    stack: string;
    [key: string]: any;
}

/**
 * Interface for component provenance information
 */
export interface ComponentProvenance {
    stack: string;
    component: string;
    content: string;
    provenanceLines: ProvenanceLine[];
}

/**
 * Interface for a single line in provenance output
 */
export interface ProvenanceLine {
    line: string;
    indent: number;
    key?: string;
    value?: string;
    source?: string;
    sourceLevel?: number;
    isImport?: boolean;
    isComputed?: boolean;
}

/**
 * Utility class for executing Atmos CLI commands
 */
export class AtmosCli {
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Execute atmos list stacks command
     * Returns a list of all stacks
     */
    async listStacks(): Promise<AtmosStack[]> {
        try {
            const { stdout } = await execAsync('atmos list stacks', {
                cwd: this.workspaceRoot,
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });

            // Parse plain text output (one stack per line)
            const stacks = stdout
                .trim()
                .split('\n')
                .filter(line => line.trim().length > 0)
                .map(stack => ({ stack: stack.trim() }));

            return stacks;
        } catch (error) {
            console.error('Failed to list stacks:', error);
            throw new Error(`Failed to list stacks: ${error}`);
        }
    }

    /**
     * Execute atmos describe component with provenance flag
     * Returns the provenance information for a component in a stack
     */
    async describeComponentWithProvenance(
        component: string,
        stack: string
    ): Promise<ComponentProvenance> {
        try {
            const { stdout } = await execAsync(
                `atmos describe component ${component} --provenance -s ${stack}`,
                {
                    cwd: this.workspaceRoot,
                    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
                }
            );

            return this.parseProvenanceOutput(stdout, component, stack);
        } catch (error) {
            console.error('Failed to describe component:', error);
            throw new Error(`Failed to describe component: ${error}`);
        }
    }

    /**
     * Execute atmos describe component without provenance
     * Returns the merged configuration for a component in a stack
     */
    async describeComponent(component: string, stack: string): Promise<any> {
        try {
            const { stdout } = await execAsync(
                `atmos describe component ${component} -s ${stack} --format json`,
                {
                    cwd: this.workspaceRoot,
                    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
                }
            );

            return JSON.parse(stdout);
        } catch (error) {
            console.error('Failed to describe component:', error);
            throw new Error(`Failed to describe component: ${error}`);
        }
    }

    /**
     * Parse provenance output from atmos describe component --provenance
     */
    private parseProvenanceOutput(
        output: string,
        component: string,
        stack: string
    ): ComponentProvenance {
        const lines = output.split('\n');
        const provenanceLines: ProvenanceLine[] = [];

        for (const line of lines) {
            // Skip empty lines
            if (line.trim() === '') {
                continue;
            }

            // Skip legend lines (start with #)
            if (line.trim().startsWith('#')) {
                continue;
            }

            const indent = line.search(/\S/);
            const trimmedLine = line.trim();

            // Parse provenance comment at end of line
            let source: string | undefined;
            let sourceLevel: number | undefined;
            let isImport = false;
            let isComputed = false;

            const provenanceMatch = trimmedLine.match(/\s+#\s+([○●∴])\s+\[(\d+)\]\s+(.+)$/);
            if (provenanceMatch) {
                const symbol = provenanceMatch[1];
                sourceLevel = parseInt(provenanceMatch[2], 10);
                source = provenanceMatch[3];

                if (symbol === '●') {
                    // Defined in parent stack
                    isImport = false;
                } else if (symbol === '○') {
                    // Inherited/imported
                    isImport = true;
                } else if (symbol === '∴') {
                    // Computed/templated
                    isComputed = true;
                }
            }

            // Extract key and value
            let key: string | undefined;
            let value: string | undefined;

            if (trimmedLine.includes(':')) {
                const colonIndex = trimmedLine.indexOf(':');
                key = trimmedLine.substring(0, colonIndex).trim();
                const afterColon = trimmedLine.substring(colonIndex + 1).trim();
                
                // Remove provenance comment from value
                if (provenanceMatch) {
                    const commentIndex = afterColon.lastIndexOf('#');
                    value = afterColon.substring(0, commentIndex).trim();
                } else {
                    value = afterColon;
                }
            } else if (trimmedLine.startsWith('-')) {
                // Array item
                value = trimmedLine.substring(1).trim();
                if (provenanceMatch) {
                    const commentIndex = value.lastIndexOf('#');
                    value = value.substring(0, commentIndex).trim();
                }
            }

            provenanceLines.push({
                line: line,
                indent,
                key,
                value,
                source,
                sourceLevel,
                isImport,
                isComputed
            });
        }

        return {
            stack,
            component,
            content: output,
            provenanceLines
        };
    }

    /**
     * Get the list of stack files that define a specific stack
     * Uses atmos list instances and atmos describe component to get actual stack files
     */
    async getStackFiles(stack: string): Promise<Array<{ file: string; components: string[] }>> {
        try {
            // Get all instances for this stack
            const { stdout } = await execAsync(
                `atmos list instances -s ${stack} --format json`,
                {
                    cwd: this.workspaceRoot,
                    maxBuffer: 10 * 1024 * 1024
                }
            );

            // Parse CSV output (Component,Stack format)
            const lines = stdout.trim().split('\n');
            if (lines.length <= 1) {
                // No instances or only header
                return [];
            }

            // Skip header and get components
            const components = lines.slice(1).map(line => {
                const [component] = line.split(',');
                return component.trim();
            });

            // For each component, get its stack file
            const fileMap = new Map<string, string[]>();
            
            for (const component of components) {
                try {
                    const { stdout: describeOutput } = await execAsync(
                        `atmos describe component ${component} -s ${stack} --format json`,
                        {
                            cwd: this.workspaceRoot,
                            maxBuffer: 10 * 1024 * 1024
                        }
                    );

                    const componentData = JSON.parse(describeOutput);
                    const stackFile = componentData.atmos_stack_file;

                    if (stackFile) {
                        if (!fileMap.has(stackFile)) {
                            fileMap.set(stackFile, []);
                        }
                        fileMap.get(stackFile)!.push(component);
                    }
                } catch (error) {
                    console.error(`Failed to describe component ${component}:`, error);
                    continue;
                }
            }

            // Convert map to array
            return Array.from(fileMap.entries()).map(([file, components]) => ({
                file,
                components
            }));
        } catch (error) {
            console.error('Failed to get stack files:', error);
            return [];
        }
    }
}
