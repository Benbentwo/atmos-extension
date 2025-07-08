import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';

export interface AtmosConfig {
    basePath: string;
    stacksPath: string;
}

export function loadAtmosConfig(workspaceFolder: vscode.WorkspaceFolder | undefined): AtmosConfig | undefined {
    if (!workspaceFolder) {
        return undefined;
    }
    const configPath = path.join(workspaceFolder.uri.fsPath, 'atmos.yaml');
    if (!fs.existsSync(configPath)) {
        return undefined;
    }
    const content = fs.readFileSync(configPath, 'utf8');
    const data = parse(content) as any;
    const basePath = data?.['base_path'] || workspaceFolder.uri.fsPath;
    const stacksPath = path.resolve(workspaceFolder.uri.fsPath, data?.['stacks']?.['base_path'] || 'stacks');
    return { basePath, stacksPath };
}

export function listStacks(config: AtmosConfig): string[] {
    if (!fs.existsSync(config.stacksPath)) {
        return [];
    }
    return fs.readdirSync(config.stacksPath).filter(f => f.endsWith('.yaml'));
}

export function resolveStackPath(config: AtmosConfig, stackRef: string): string | undefined {
    const file = path.join(config.stacksPath, stackRef);
    if (fs.existsSync(file)) {
        return file;
    }
    if (fs.existsSync(file + '.yaml')) {
        return file + '.yaml';
    }
    return undefined;
}
