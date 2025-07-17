"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateManager = void 0;
const vscode = __importStar(require("vscode"));
const DB_LIST_KEY = 'sqlite-studio.databaseList';
const ACTIVE_DB_KEY = 'sqlite-studio.activeDatabase';
const HISTORY_KEY = 'sqlite-studio.queryHistory';
class StateManager {
    static initialize(context) {
        this.context = context;
    }
    static getDatabases() {
        return this.context.globalState.get(DB_LIST_KEY, []);
    }
    static addDatabase(dbPath) {
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
    static removeDatabase(dbPath) {
        let databases = this.getDatabases();
        databases = databases.filter(p => p !== dbPath);
        this.context.globalState.update(DB_LIST_KEY, databases);
        this._onDidDatabasesChange.fire();
        if (this.getActiveDatabase() === dbPath) {
            this.setActiveDatabase(databases.length > 0 ? databases[0] : undefined);
        }
    }
    static getActiveDatabase() {
        return this.context.globalState.get(ACTIVE_DB_KEY);
    }
    static setActiveDatabase(dbPath) {
        if (this.getActiveDatabase() !== dbPath) {
            this.context.globalState.update(ACTIVE_DB_KEY, dbPath);
            this._onDidActiveDbChange.fire();
        }
    }
    // --- History Methods ---
    static getQueryHistory() {
        return this.context.workspaceState.get(HISTORY_KEY, []);
    }
    static addToHistory(query) {
        if (!query.trim())
            return;
        const history = this.getQueryHistory();
        const newEntry = { query, timestamp: Date.now() };
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
    static clearQueryHistory() {
        this.context.workspaceState.update(HISTORY_KEY, []);
    }
}
exports.StateManager = StateManager;
_a = StateManager;
StateManager._onDidDatabasesChange = new vscode.EventEmitter();
StateManager.onDidDatabasesChange = _a._onDidDatabasesChange.event;
StateManager._onDidActiveDbChange = new vscode.EventEmitter();
StateManager.onDidActiveDbChange = _a._onDidActiveDbChange.event;
//# sourceMappingURL=state-manager.js.map