import * as vscode from 'vscode';

const DB_LIST_KEY = 'sqlite-studio.databaseList';
const ACTIVE_DB_KEY = 'sqlite-studio.activeDatabase';
const HISTORY_KEY = 'sqlite-studio.queryHistory';

export interface HistoryItem {
    query: string;
    timestamp: number;
}

export class StateManager {
    private static context: vscode.ExtensionContext;
    private static _onDidDatabasesChange = new vscode.EventEmitter<void>();
    public static readonly onDidDatabasesChange = this._onDidDatabasesChange.event;
    private static _onDidActiveDbChange = new vscode.EventEmitter<void>();
    public static readonly onDidActiveDbChange = this._onDidActiveDbChange.event;

    public static initialize(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static getDatabases(): string[] {
        return this.context.globalState.get<string[]>(DB_LIST_KEY, []);
    }

    public static addDatabase(dbPath: string) {
        const databases = this.getDatabases();
        if (!databases.includes(dbPath)) {
            databases.push(dbPath);
            this.context.globalState.update(DB_LIST_KEY, databases);
            this._onDidDatabasesChange.fire();
            if (!this.getActiveDatabase()) {
                this.setActiveDatabase(dbPath);
            }
        }
    }

    public static removeDatabase(dbPath: string) {
        let databases = this.getDatabases();
        databases = databases.filter(p => p !== dbPath);
        this.context.globalState.update(DB_LIST_KEY, databases);
        this._onDidDatabasesChange.fire();
        if (this.getActiveDatabase() === dbPath) {
            this.setActiveDatabase(databases.length > 0 ? databases[0] : undefined);
        }
    }

    public static getActiveDatabase(): string | undefined {
        return this.context.globalState.get<string>(ACTIVE_DB_KEY);
    }

    public static setActiveDatabase(dbPath: string | undefined) {
        if (this.getActiveDatabase() !== dbPath) {
            this.context.globalState.update(ACTIVE_DB_KEY, dbPath);
            this._onDidActiveDbChange.fire();
        }
    }

    // --- History Methods ---
    public static getQueryHistory(): HistoryItem[] {
        return this.context.workspaceState.get<HistoryItem[]>(HISTORY_KEY, []);
    }

    public static addToHistory(query: string) {
        if (!query.trim()) return;
        const history = this.getQueryHistory();
        const newEntry: HistoryItem = { query, timestamp: Date.now() };
        // Avoid adding consecutive duplicates
        if (history.length > 0 && history[0].query === query) {
            return;
        }
        history.unshift(newEntry); // Add to the beginning
        // Keep history to a reasonable size
        if (history.length > 100) {
            history.pop();
        }
        this.context.workspaceState.update(HISTORY_KEY, history);
    }

    public static clearQueryHistory() {
        this.context.workspaceState.update(HISTORY_KEY, []);
    }
}