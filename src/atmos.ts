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
    const basePath = path.resolve(workspaceFolder.uri.fsPath, data?.['base_path'] || '.');
    const stacksBase = data?.['stacks']?.['base_path'] || 'stacks';
    const stacksPath = path.resolve(basePath, stacksBase);
    return { basePath, stacksPath };
}

export function listStacks(config: AtmosConfig): string[] {
    if (!fs.existsSync(config.stacksPath)) {
        return [];
    }
    const results: string[] = [];
    const walk = (dir: string, rel: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            const relative = path.join(rel, entry.name);
            if (entry.isDirectory()) {
                walk(full, relative);
            } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
                results.push(relative);
            }
        }
    };
    walk(config.stacksPath, '');
    return results;
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
