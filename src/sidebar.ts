import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';
import { StateManager } from './state-manager';

export class DatabaseTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly dbPath: string,
        public readonly contextValue?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = this.dbPath;
    }
}

export class DatabaseExplorerProvider implements vscode.TreeDataProvider<DatabaseTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DatabaseTreeItem | undefined | void> = new vscode.EventEmitter();
    readonly onDidChangeTreeData: vscode.Event<DatabaseTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DatabaseTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DatabaseTreeItem): Promise<DatabaseTreeItem[]> {
        if (element) {
            switch (element.contextValue) {
                case 'database':
                    return this.getTables(element.dbPath);
                case 'table':
                    return this.getColumns(element.dbPath, element.label as string);
                default:
                    return [];
            }
        }
        
        const databases = StateManager.getDatabases();
        if (databases.length === 0) {
            return [new DatabaseTreeItem('No databases. Click [+] to add one.', vscode.TreeItemCollapsibleState.None, '')];
        }

        return databases.map(dbPath => {
            const isActive = dbPath === StateManager.getActiveDatabase();
            const item = new DatabaseTreeItem(
                path.basename(dbPath), vscode.TreeItemCollapsibleState.Collapsed, dbPath, 'database'
            );
            item.description = isActive ? ' (Active)' : '';
            item.iconPath = new vscode.ThemeIcon('database');
            return item;
        });
    }

    private async getTables(dbPath: string): Promise<DatabaseTreeItem[]> {
        return new Promise<DatabaseTreeItem[]>((resolve) => {
            if (!fs.existsSync(dbPath)) {
                return resolve([new DatabaseTreeItem('Error: Database file not found', vscode.TreeItemCollapsibleState.None, dbPath)]);
            }

            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, async (err) => {
                if (err) return resolve([new DatabaseTreeItem('Error opening database', vscode.TreeItemCollapsibleState.None, dbPath)]);
                
                db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], async (err, tables: any[]) => {
                    if (err) {
                        db.close();
                        return resolve([new DatabaseTreeItem('Error reading tables', vscode.TreeItemCollapsibleState.None, dbPath)]);
                    }
                    
                    const tableItems = await Promise.all(tables.map(async (table) => {
                        const rowCount = await this.getTableRowCount(db, table.name);
                        const item = new DatabaseTreeItem(table.name, vscode.TreeItemCollapsibleState.Collapsed, dbPath, 'table');
                        item.description = `(${rowCount} rows)`;
                        return item;
                    }));
                    
                    db.close();
                    resolve(tableItems);
                });
            });
        });
    }

    private getTableRowCount(db: sqlite3.Database, tableName: string): Promise<number> {
        return new Promise((resolve) => {
            db.get(`SELECT COUNT(*) as count FROM "${tableName}"`, (err, row: any) => {
                if (err || !row) resolve(0);
                else resolve(row.count);
            });
        });
    }

    private async getColumns(dbPath: string, tableName: string): Promise<DatabaseTreeItem[]> {
        return new Promise<DatabaseTreeItem[]>((resolve) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) return resolve([]);
                
                db.all(`PRAGMA table_info("${tableName}")`, [], (err, columns: any[]) => {
                    db.close();
                    if (err) return resolve([]);
                    resolve(columns.map(col => {
                        const item = new DatabaseTreeItem(
                            `${col.name}: ${col.type}`, vscode.TreeItemCollapsibleState.None, dbPath, 'column'
                        );
                        item.iconPath = new vscode.ThemeIcon('symbol-field');
                        item.description = col.pk ? 'PRIMARY KEY' : '';
                        return item;
                    }));
                });
            });
        });
    }
}