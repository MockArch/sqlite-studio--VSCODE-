import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseExplorerProvider, DatabaseTreeItem } from './sidebar';
import { MainWebviewPanel } from './main-webview';
import { StateManager } from './state-manager';

export function activate(context: vscode.ExtensionContext) {
    StateManager.initialize(context);

    const databaseExplorer = new DatabaseExplorerProvider();
    vscode.window.registerTreeDataProvider('sqlite-studio-sidebar', databaseExplorer);

    StateManager.onDidDatabasesChange(() => databaseExplorer.refresh());
    StateManager.onDidActiveDbChange(() => {
        databaseExplorer.refresh();
        if (MainWebviewPanel.currentPanel) {
            MainWebviewPanel.currentPanel.sendMessage({
                command: 'update-db-list',
                databases: StateManager.getDatabases(),
                activeDb: StateManager.getActiveDatabase()
            });
        }
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('sqlite-studio.refreshExplorer', () => databaseExplorer.refresh()),
        vscode.commands.registerCommand('sqlite-studio.openStudio', () => MainWebviewPanel.createOrShow()),
        
        vscode.commands.registerCommand('sqlite-studio.addDatabase', async () => {
            const selectedFiles = await vscode.window.showOpenDialog({
                canSelectFiles: true, canSelectFolders: false, canSelectMany: false,
                openLabel: 'Add SQLite Database',
                filters: { 'SQLite Database': ['db', 'sqlite', 'sqlite3', 'db3'] }
            });
            if (selectedFiles && selectedFiles.length > 0) {
                StateManager.addDatabase(selectedFiles[0].fsPath);
            }
        }),

        vscode.commands.registerCommand('sqlite-studio.removeDatabase', async (item: DatabaseTreeItem) => {
            const confirmation = await vscode.window.showWarningMessage(
                `Are you sure you want to remove the database '${path.basename(item.dbPath)}'? This does not delete the file.`,
                { modal: true },
                'Remove'
            );
            if (confirmation === 'Remove') {
                StateManager.removeDatabase(item.dbPath);
            }
        }),

        vscode.commands.registerCommand('sqlite-studio.viewTable', (item: DatabaseTreeItem) => {
            StateManager.setActiveDatabase(item.dbPath);
            MainWebviewPanel.createOrShow();
            setTimeout(() => {
                const query = `SELECT * FROM "${item.label}";`;
                MainWebviewPanel.currentPanel?.sendMessage({
                    command: 'set-query-and-run',
                    query: query
                });
            }, 250);
        }),

        vscode.commands.registerCommand('sqlite-studio.clearHistory', () => {
            StateManager.clearQueryHistory();
            if (MainWebviewPanel.currentPanel) {
                MainWebviewPanel.currentPanel.sendMessage({ command: 'history-updated', history: [] });
            }
            vscode.window.showInformationMessage('Query history cleared.');
        })
    );
}

export function deactivate() {}