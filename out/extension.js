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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const sidebar_1 = require("./sidebar");
const main_webview_1 = require("./main-webview");
const state_manager_1 = require("./state-manager");
function activate(context) {
    state_manager_1.StateManager.initialize(context);
    const databaseExplorer = new sidebar_1.DatabaseExplorerProvider();
    vscode.window.registerTreeDataProvider('sqlite-studio-sidebar', databaseExplorer);
    state_manager_1.StateManager.onDidDatabasesChange(() => databaseExplorer.refresh());
    state_manager_1.StateManager.onDidActiveDbChange(() => {
        databaseExplorer.refresh();
        if (main_webview_1.MainWebviewPanel.currentPanel) {
            main_webview_1.MainWebviewPanel.currentPanel.sendMessage({
                command: 'update-db-list',
                databases: state_manager_1.StateManager.getDatabases(),
                activeDb: state_manager_1.StateManager.getActiveDatabase()
            });
        }
    });
    context.subscriptions.push(vscode.commands.registerCommand('sqlite-studio.refreshExplorer', () => databaseExplorer.refresh()), vscode.commands.registerCommand('sqlite-studio.openStudio', () => main_webview_1.MainWebviewPanel.createOrShow()), vscode.commands.registerCommand('sqlite-studio.addDatabase', () => __awaiter(this, void 0, void 0, function* () {
        const selectedFiles = yield vscode.window.showOpenDialog({
            canSelectFiles: true, canSelectFolders: false, canSelectMany: false,
            openLabel: 'Add SQLite Database',
            filters: { 'SQLite Database': ['db', 'sqlite', 'sqlite3', 'db3'] }
        });
        if (selectedFiles && selectedFiles.length > 0) {
            state_manager_1.StateManager.addDatabase(selectedFiles[0].fsPath);
        }
    })), vscode.commands.registerCommand('sqlite-studio.removeDatabase', (item) => __awaiter(this, void 0, void 0, function* () {
        const confirmation = yield vscode.window.showWarningMessage(`Are you sure you want to remove the database '${path.basename(item.dbPath)}'? This does not delete the file.`, { modal: true }, 'Remove');
        if (confirmation === 'Remove') {
            state_manager_1.StateManager.removeDatabase(item.dbPath);
        }
    })), vscode.commands.registerCommand('sqlite-studio.viewTable', (item) => {
        state_manager_1.StateManager.setActiveDatabase(item.dbPath);
        main_webview_1.MainWebviewPanel.createOrShow();
        setTimeout(() => {
            var _a;
            const query = `SELECT * FROM "${item.label}";`;
            (_a = main_webview_1.MainWebviewPanel.currentPanel) === null || _a === void 0 ? void 0 : _a.sendMessage({
                command: 'set-query-and-run',
                query: query
            });
        }, 250);
    }), vscode.commands.registerCommand('sqlite-studio.clearHistory', () => {
        state_manager_1.StateManager.clearQueryHistory();
        if (main_webview_1.MainWebviewPanel.currentPanel) {
            main_webview_1.MainWebviewPanel.currentPanel.sendMessage({ command: 'history-updated', history: [] });
        }
        vscode.window.showInformationMessage('Query history cleared.');
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map