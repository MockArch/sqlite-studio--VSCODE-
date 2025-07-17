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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseExplorerProvider = exports.DatabaseTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const sqlite3 = __importStar(require("sqlite3"));
const state_manager_1 = require("./state-manager");
class DatabaseTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, dbPath, contextValue) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.dbPath = dbPath;
        this.contextValue = contextValue;
        this.tooltip = this.dbPath;
    }
}
exports.DatabaseTreeItem = DatabaseTreeItem;
class DatabaseExplorerProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (element) {
                switch (element.contextValue) {
                    case 'database':
                        return this.getTables(element.dbPath);
                    case 'table':
                        return this.getColumns(element.dbPath, element.label);
                    default:
                        return [];
                }
            }
            const databases = state_manager_1.StateManager.getDatabases();
            if (databases.length === 0) {
                return [new DatabaseTreeItem('No databases. Click [+] to add one.', vscode.TreeItemCollapsibleState.None, '')];
            }
            return databases.map(dbPath => {
                const isActive = dbPath === state_manager_1.StateManager.getActiveDatabase();
                const item = new DatabaseTreeItem(path.basename(dbPath), vscode.TreeItemCollapsibleState.Collapsed, dbPath, 'database');
                item.description = isActive ? ' (Active)' : '';
                item.iconPath = new vscode.ThemeIcon('database');
                return item;
            });
        });
    }
    getTables(dbPath) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                if (!fs.existsSync(dbPath)) {
                    return resolve([new DatabaseTreeItem('Error: Database file not found', vscode.TreeItemCollapsibleState.None, dbPath)]);
                }
                const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => __awaiter(this, void 0, void 0, function* () {
                    if (err)
                        return resolve([new DatabaseTreeItem('Error opening database', vscode.TreeItemCollapsibleState.None, dbPath)]);
                    db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => __awaiter(this, void 0, void 0, function* () {
                        if (err) {
                            db.close();
                            return resolve([new DatabaseTreeItem('Error reading tables', vscode.TreeItemCollapsibleState.None, dbPath)]);
                        }
                        const tableItems = yield Promise.all(tables.map((table) => __awaiter(this, void 0, void 0, function* () {
                            const rowCount = yield this.getTableRowCount(db, table.name);
                            const item = new DatabaseTreeItem(table.name, vscode.TreeItemCollapsibleState.Collapsed, dbPath, 'table');
                            item.description = `(${rowCount} rows)`;
                            return item;
                        })));
                        db.close();
                        resolve(tableItems);
                    }));
                }));
            });
        });
    }
    getTableRowCount(db, tableName) {
        return new Promise((resolve) => {
            db.get(`SELECT COUNT(*) as count FROM "${tableName}"`, (err, row) => {
                if (err || !row)
                    resolve(0);
                else
                    resolve(row.count);
            });
        });
    }
    getColumns(dbPath, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                    if (err)
                        return resolve([]);
                    db.all(`PRAGMA table_info("${tableName}")`, [], (err, columns) => {
                        db.close();
                        if (err)
                            return resolve([]);
                        resolve(columns.map(col => {
                            const item = new DatabaseTreeItem(`${col.name}: ${col.type}`, vscode.TreeItemCollapsibleState.None, dbPath, 'column');
                            item.iconPath = new vscode.ThemeIcon('symbol-field');
                            item.description = col.pk ? 'PRIMARY KEY' : '';
                            return item;
                        }));
                    });
                });
            });
        });
    }
}
exports.DatabaseExplorerProvider = DatabaseExplorerProvider;
//# sourceMappingURL=sidebar.js.map