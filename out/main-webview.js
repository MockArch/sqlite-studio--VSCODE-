"use strict";
// src/main-webview.ts
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
exports.MainWebviewPanel = void 0;
const vscode = __importStar(require("vscode"));
const sqlite3 = __importStar(require("sqlite3"));
const state_manager_1 = require("./state-manager");
const PAGE_SIZE = 100; // Define page size for pagination
class MainWebviewPanel {
    constructor(panel) {
        this._disposables = [];
        this._currentQuery = '';
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
        this._panel.webview.onDidReceiveMessage(message => this.handleMessage(message), null, this._disposables);
    }
    static createOrShow() {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (MainWebviewPanel.currentPanel) {
            MainWebviewPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('sqliteStudio', 'SQLite Studio', column || vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        MainWebviewPanel.currentPanel = new MainWebviewPanel(panel);
    }
    sendMessage(message) { this._panel.webview.postMessage(message); }
    dispose() {
        MainWebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    handleMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbPath = state_manager_1.StateManager.getActiveDatabase();
            if (message.command === 'webview-ready') {
                this.sendMessage({
                    command: 'update-state',
                    databases: state_manager_1.StateManager.getDatabases(),
                    activeDb: state_manager_1.StateManager.getActiveDatabase(),
                    history: state_manager_1.StateManager.getQueryHistory()
                });
                return;
            }
            if (!dbPath && !['add-database', 'change-active-db'].includes(message.command)) {
                this.sendMessage({ command: 'query-error', error: 'No active database selected.' });
                return;
            }
            switch (message.command) {
                case 'run-query':
                    try {
                        const queryToRun = message.query;
                        this._currentQuery = queryToRun;
                        if (message.offset === 0) { // Only add to history on the first page load of a query
                            state_manager_1.StateManager.addToHistory(queryToRun);
                            this.sendMessage({ command: 'history-updated', history: state_manager_1.StateManager.getQueryHistory() });
                        }
                        const startTime = performance.now();
                        const result = yield this.executeQuery(dbPath, queryToRun, message.offset);
                        const endTime = performance.now();
                        const duration = (endTime - startTime).toFixed(2);
                        if (result.isSelect) {
                            this.sendMessage({
                                command: 'query-result',
                                data: result.data,
                                totalRows: result.totalRows,
                                duration: duration,
                                query: this._currentQuery,
                                notification: result.notification
                            });
                        }
                        else {
                            this.sendMessage({ command: 'update-result', changes: result.data, notification: result.notification, duration: duration });
                        }
                    }
                    catch (error) {
                        this.sendMessage({ command: 'query-error', error: error.message });
                    }
                    break;
                case 'set-query-and-run':
                    this.sendMessage({ command: 'set-query-text', text: message.query });
                    try {
                        const startTime = performance.now();
                        this._currentQuery = message.query;
                        const result = yield this.executeQuery(dbPath, message.query, 0);
                        const endTime = performance.now();
                        const duration = (endTime - startTime).toFixed(2);
                        if (result.isSelect) {
                            this.sendMessage({
                                command: 'query-result',
                                data: result.data,
                                totalRows: result.totalRows,
                                duration: duration,
                                query: this._currentQuery,
                                notification: result.notification
                            });
                        }
                    }
                    catch (error) {
                        this.sendMessage({ command: 'query-error', error: error.message });
                    }
                    break;
                case 'change-active-db':
                    state_manager_1.StateManager.setActiveDatabase(message.dbPath);
                    break;
                case 'add-database':
                    vscode.commands.executeCommand('sqlite-studio.addDatabase');
                    break;
            }
        });
    }
    // --- FIX (Corrected): Replaced faulty async/await with stable callback serialization ---
    executeQuery(dbPath, query, offset) {
        return new Promise((resolve, reject) => {
            query = query.trim().replace(/;+\s*$/, '').trim();
            if (!query) {
                return reject(new Error("Query is empty."));
            }
            const isSelectQuery = /^\s*select/i.test(query);
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
                if (err) {
                    return reject(new Error(`DB Connection Error: ${err.message}`));
                }
            });
            // Use serialize to guarantee sequential execution of the database commands
            db.serialize(() => {
                if (isSelectQuery) {
                    const countQuery = `SELECT COUNT(*) as count FROM (${query.replace(/;\s*$/, '')})`;
                    let totalRows;
                    let notification = '';
                    // Step 1: Get the total row count for pagination
                    db.get(countQuery, (err, row) => {
                        if (err || !row) {
                            notification = "Note: Could not determine total rows for pagination.";
                            totalRows = undefined;
                        }
                        else {
                            totalRows = row.count;
                        }
                        // Step 2: Get the paginated data. This runs *after* the count is complete.
                        const paginatedQuery = `${query} LIMIT ${PAGE_SIZE} OFFSET ${offset}`;
                        db.all(paginatedQuery, (err, rows) => {
                            // Step 3: Close the database and resolve the promise with all our data.
                            db.close((closeErr) => {
                                if (closeErr)
                                    return reject(closeErr);
                                if (err)
                                    return reject(err);
                                // If count failed, we can't show full pagination.
                                // We'll set totalRows to undefined so the UI can hide the controls.
                                const effectiveTotalRows = (typeof totalRows === 'number') ? totalRows : undefined;
                                resolve({
                                    data: rows,
                                    notification: notification,
                                    isSelect: true,
                                    totalRows: effectiveTotalRows
                                });
                            });
                        });
                    });
                }
                else { // For non-SELECT queries (INSERT, UPDATE, etc.)
                    db.run(query, function (err) {
                        const changes = this.changes;
                        db.close((closeErr) => {
                            if (closeErr)
                                return reject(closeErr);
                            if (err)
                                return reject(err);
                            resolve({ data: changes, notification: 'Query executed successfully.', isSelect: false });
                        });
                    });
                }
            });
        });
    }
    _getHtmlForWebview(webview) {
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SQLite Studio</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
              :root {
                  --color-background: var(--vscode-editor-background);
                  --color-foreground: var(--vscode-editor-foreground);
                  --color-input-background: var(--vscode-input-background);
                  --color-input-border: var(--vscode-input-border);
                  --color-button-primary-background: var(--vscode-button-background);
                  --color-button-primary-foreground: var(--vscode-button-foreground);
                  --color-panel-border: var(--vscode-panel-border);
                  --color-header-background: var(--vscode-sideBar-background);
                  --color-tab-active-background: var(--vscode-tab-activeBackground);
                  --color-tab-inactive-background: var(--vscode-tab-inactiveBackground);
                  --color-list-hover-background: var(--vscode-list-hoverBackground);
                  --color-error-foreground: var(--vscode-editorError-foreground);
                  --color-description-foreground: var(--vscode-descriptionForeground);
                  --font-family: var(--vscode-font-family);
                  --font-mono: var(--vscode-editor-font-family);
              }
              tailwind.config = {
                theme: {
                    extend: {
                        colors: {
                            background: 'var(--color-background)', foreground: 'var(--color-foreground)',
                            input: 'var(--color-input-background)', 'input-border': 'var(--color-input-border)',
                            'button-primary': 'var(--color-button-primary-background)', 'button-primary-foreground': 'var(--color-button-primary-foreground)',
                            'panel-border': 'var(--color-panel-border)', header: 'var(--color-header-background)',
                            'tab-active': 'var(--color-tab-active-background)', 'tab-inactive': 'var(--color-tab-inactive-background)',
                            'list-hover': 'var(--color-list-hover-background)', error: 'var(--color-error-foreground)',
                            description: 'var(--color-description-foreground)',
                        }
                    },
                    fontFamily: { sans: 'var(--font-family)', mono: 'var(--font-mono)', }
                }
              }
              body { scrollbar-width: thin; scrollbar-color: var(--color-panel-border) var(--color-background); }
              ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: var(--color-background); }
              ::-webkit-scrollbar-thumb { background-color: var(--color-panel-border); border-radius: 4px; }
              #query-input { color: var(--color-foreground); background-color: var(--color-input-background); }
              .pagination-btn {
                padding: 2px 8px; border-radius: 4px; background-color: var(--color-button-primary-background);
                color: var(--color-button-primary-foreground); font-size: 11px; margin: 0 1px; cursor: pointer; border: none;
              }
              .pagination-btn.active { background-color: var(--vscode-list-activeSelectionBackground); font-weight: bold; }
              .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
              .pagination-ellipsis { margin: 0 4px; color: var(--color-description-foreground); }
          </style>
      </head>
      <body class="bg-background text-foreground font-sans flex flex-col h-screen overflow-hidden">
        
          <div class="flex items-center p-2 gap-4 border-b border-panel-border bg-header flex-shrink-0">
              <div class="flex items-center gap-2">
                  <label for="db-selector" class="text-sm">Active Database:</label>
                  <select id="db-selector" class="text-sm rounded border border-input-border bg-input py-1 px-2"></select>
              </div>
              <button id="run-query-btn" class="flex items-center gap-2 bg-button-primary text-button-primary-foreground text-sm font-medium rounded px-3 py-1 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  Run Query
              </button>
          </div>

          <div class="split-panes flex flex-col flex-grow min-h-0">
              <div class="query-pane h-2/5 min-h-[80px]">
                  <textarea id="query-input" spellcheck="false" class="w-full h-full p-2 border-none font-mono resize-none focus:outline-none"></textarea>
              </div>
              <div id="resizer" class="h-1.5 bg-panel-border cursor-row-resize flex-shrink-0"></div>
              <div class="results-pane flex-grow flex flex-col min-h-[100px]">
                  <div class="results-header flex border-b border-panel-border flex-shrink-0">
                      <button class="tab-button active text-sm px-4 py-2 border-none outline-none bg-tab-active" data-tab="results">Results</button>
                      <button class="tab-button text-sm px-4 py-2 border-none outline-none bg-tab-inactive" data-tab="history">History</button>
                  </div>
                  <div class="tab-content-wrapper flex-grow relative overflow-auto">
                      <div id="results-panel" class="tab-panel w-full h-full">
                          <div class="placeholder flex items-center justify-center h-full text-description"><p>Run a query to see results here.</p></div>
                      </div>
                      <div id="history-panel" class="tab-panel w-full h-full hidden">
                          <div id="history-list"></div>
                      </div>
                      <div id="loader-overlay" class="absolute inset-0 bg-background/70 justify-center items-center hidden"><div class="w-8 h-8 border-4 border-description border-t-button-primary rounded-full animate-spin"></div></div>
                  </div>
                  <div id="results-footer" class="p-1 px-3 border-t border-panel-border text-xs text-description flex justify-between items-center flex-shrink-0">
                      <span id="status-text">Ready Sir!!!!!!</span>
                      <div id="pagination-controls" class="flex items-center gap-1"></div>
                  </div>
              </div>
          </div>
          
          <script>
            const App = {
                vscode: acquireVsCodeApi(),
                elements: {
                    dbSelector: document.getElementById('db-selector'),
                    runBtn: document.getElementById('run-query-btn'),
                    queryInput: document.getElementById('query-input'),
                    resultsPanel: document.getElementById('results-panel'),
                    historyList: document.getElementById('history-list'),
                    tabButtons: document.querySelectorAll('.tab-button'),
                    loader: document.getElementById('loader-overlay'),
                    resizer: document.getElementById('resizer'),
                    queryPane: document.querySelector('.query-pane'),
                    statusText: document.getElementById('status-text'),
                    paginationControls: document.getElementById('pagination-controls'),
                },
                state: {
                    hasActiveDb: false,
                    currentPage: 1,
                    totalRows: 0,
                    currentQuery: '',
                    pageSize: ${PAGE_SIZE},
                },
                init() {
                    this.addEventListeners();
                    this.vscode.postMessage({ command: 'webview-ready' });
                },
                addEventListeners() {
                    this.elements.runBtn.addEventListener('click', () => this.runQuery());
                    this.elements.dbSelector.addEventListener('change', (e) => this.changeActiveDb(e.target.value));
                    this.elements.paginationControls.addEventListener('click', (e) => {
                        const button = e.target.closest('.pagination-btn');
                        if (button && !button.disabled) {
                            this.loadPage(parseInt(button.dataset.page, 10));
                        }
                    });
                    this.elements.queryInput.addEventListener('keydown', (e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            this.runQuery();
                        }
                    });
                    this.elements.tabButtons.forEach(button => button.addEventListener('click', () => this.switchTab(button)));
                    this.elements.historyList.addEventListener('click', (e) => this.useHistoryItem(e));
                    
                    let isResizing = false;
                    this.elements.resizer.addEventListener('mousedown', () => { isResizing = true; });
                    document.addEventListener('mousemove', (e) => {
                        if (!isResizing) return;
                        const newHeight = e.clientY - this.elements.queryPane.getBoundingClientRect().top;
                        if (newHeight > 80 && newHeight < window.innerHeight - 150) {
                            this.elements.queryPane.style.height = \`\${newHeight}px\`;
                        }
                    });
                    document.addEventListener('mouseup', () => { isResizing = false; });
                },
                runQuery() {
                    const query = this.elements.queryInput.value;
                    const selection = window.getSelection().toString();
                    if (query.trim() && this.state.hasActiveDb) {
                        this.state.currentQuery = selection || query;
                        this.loadPage(1); // Always start from page 1 for a new query
                    }
                },
                loadPage(page) {
                    this.showLoader(true);
                    this.state.currentPage = page;
                    const offset = (page - 1) * this.state.pageSize;
                    this.vscode.postMessage({ command: 'run-query', query: this.state.currentQuery, offset: offset });
                },
                changeActiveDb(dbPath) {
                    this.vscode.postMessage({ command: 'change-active-db', dbPath });
                },
                switchTab(button) {
                    this.elements.tabButtons.forEach(btn => {
                        btn.classList.remove('active', 'bg-tab-active');
                        btn.classList.add('bg-tab-inactive');
                    });
                    button.classList.add('active', 'bg-tab-active');
                    button.classList.remove('bg-tab-inactive');
                    this.elements.resultsPanel.classList.toggle('hidden', button.dataset.tab !== 'results');
                    document.getElementById('history-panel').classList.toggle('hidden', button.dataset.tab !== 'history');
                },
                useHistoryItem(event) {
                    const item = event.target.closest('.history-item');
                    if (item) {
                        this.elements.queryInput.value = item.dataset.query;
                        this.switchTab(document.querySelector('.tab-button[data-tab="results"]'));
                    }
                },
                showLoader(show) {
                    this.elements.loader.style.display = show ? 'flex' : 'none';
                },
                updateDbSelector(databases, activeDb) {
                    this.elements.dbSelector.innerHTML = '';
                    if (databases.length === 0) {
                        this.elements.dbSelector.innerHTML = '<option>No databases found</option>';
                        this.elements.dbSelector.disabled = true; this.state.hasActiveDb = false;
                    } else {
                        databases.forEach(db => {
                            const option = new Option(db.split(/[\\\\/]/).pop(), db);
                            this.elements.dbSelector.add(option);
                        });
                        this.elements.dbSelector.disabled = false;
                        this.elements.dbSelector.value = activeDb || databases[0]; this.state.hasActiveDb = true;
                    }
                    this.elements.runBtn.disabled = !this.state.hasActiveDb;
                },
                renderResults(data, totalRows, query, duration, notification) {
                    this.state.totalRows = totalRows;
                    this.state.currentQuery = query;
                    const numRows = data.length;
                    const startRow = (this.state.currentPage - 1) * this.state.pageSize + 1;
                    const endRow = startRow + numRows - 1;

                    let status = \`Showing \${numRows > 0 ? numRows : 0} rows (\${duration}ms)\`;
                    if(typeof totalRows === 'number') {
                         status = \`Showing rows \${numRows > 0 ? startRow : 0}-\${endRow} of \${totalRows} (\${duration}ms)\`;
                    }
                    if (notification) {
                        status += \` | \${notification}\`;
                    }
                    this.elements.statusText.textContent = status;
                    
                    this.renderPagination();

                    if (numRows === 0) {
                        this.elements.resultsPanel.innerHTML = '<div class="placeholder flex items-center justify-center h-full"><p>Query returned no results.</p></div>';
                        return;
                    }
                    
                    let table = '<table class="w-full text-left text-sm"><thead><tr class="bg-header">';
                    Object.keys(data[0]).forEach(key => table += \`<th class="p-2 border-r border-panel-border font-medium sticky top-0 bg-header z-10">\${key}</th>\`);
                    table += '</tr></thead><tbody>';
                    data.forEach((row, index) => {
                        table += \`<tr class="\${index % 2 === 0 ? '' : 'bg-list-hover'}">\`;
                        Object.values(row).forEach(val => table += \`<td class="p-2 border-r border-panel-border">\${val === null ? '<i class="text-description">NULL</i>' : String(val).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')}</td>\`);
                        table += '</tr>';
                    });
                    table += '</tbody></table>';
                    this.elements.resultsPanel.innerHTML = table;
                    this.elements.resultsPanel.scrollTop = 0;
                },
                renderPagination() {
                    const totalRows = this.state.totalRows;
                    if (typeof totalRows !== 'number') { // Hide pagination if total is unknown
                        this.elements.paginationControls.innerHTML = '';
                        return;
                    }
                    
                    const totalPages = Math.ceil(totalRows / this.state.pageSize);
                    const currentPage = this.state.currentPage;
                    this.elements.paginationControls.innerHTML = '';

                    if (totalPages <= 1) return;

                    let html = \`<button class="pagination-btn" data-page="\${currentPage - 1}" \${currentPage === 1 ? 'disabled' : ''}><</button>\`;
                    
                    const maxButtons = 7;
                    let startPage, endPage;
                    if (totalPages <= maxButtons) {
                        startPage = 1; endPage = totalPages;
                    } else {
                        const maxPagesBeforeCurrent = Math.floor((maxButtons - 3) / 2);
                        const maxPagesAfterCurrent = Math.ceil((maxButtons - 3) / 2);
                        if (currentPage <= maxPagesBeforeCurrent + 1) {
                            startPage = 1; endPage = maxButtons - 2;
                        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                            startPage = totalPages - (maxButtons - 3); endPage = totalPages;
                        } else {
                            startPage = currentPage - maxPagesBeforeCurrent; endPage = currentPage + maxPagesAfterCurrent;
                        }
                    }

                    if (startPage > 1) {
                        html += '<button class="pagination-btn" data-page="1">1</button>';
                        if (startPage > 2) html += '<span class="pagination-ellipsis">...</span>';
                    }

                    for (let i = startPage; i <= endPage; i++) {
                        html += \`<button class="pagination-btn \${i === currentPage ? 'active' : ''}" data-page="\${i}">\${i}</button>\`;
                    }
                    
                    if (endPage < totalPages) {
                        if (endPage < totalPages - 1) html += '<span class="pagination-ellipsis">...</span>';
                        html += \`<button class="pagination-btn" data-page="\${totalPages}">\${totalPages}</button>\`;
                    }

                    html += \`<button class="pagination-btn" data-page="\${currentPage + 1}" \${currentPage === totalPages ? 'disabled' : ''}>></button>\`;
                    this.elements.paginationControls.innerHTML = html;
                },
                renderHistory(history) {
                    this.elements.historyList.innerHTML = '';
                    if (history.length === 0) {
                        this.elements.historyList.innerHTML = '<div class="p-2 text-description">No query history yet.</div>';
                        return;
                    }
                    const gridContainer = document.createElement('div');
                    history.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'history-item grid grid-cols-[1fr_auto] items-center gap-4 hover:bg-list-hover p-2 border-b border-panel-border cursor-pointer';
                        div.dataset.query = item.query;
                        div.innerHTML = \`<div class="history-query font-mono text-sm truncate" title="\${item.query}">\${item.query}</div><div class="history-date text-xs text-description">\${new Date(item.timestamp).toLocaleString()}</div>\`;
                        gridContainer.appendChild(div);
                    });
                    this.elements.historyList.appendChild(gridContainer);
                },
                handleMessage(message) {
                    this.showLoader(false);
                    switch (message.command) {
                        case 'update-state':
                            this.updateDbSelector(message.databases, message.activeDb);
                            this.renderHistory(message.history);
                            if (!message.activeDb && message.databases.length > 0) {
                                this.changeActiveDb(message.databases[0]);
                            }
                            break;
                        case 'query-result':
                            this.renderResults(message.data, message.totalRows, message.query, message.duration, message.notification);
                            this.switchTab(document.querySelector('.tab-button[data-tab="results"]'));
                            break;
                        case 'update-result':
                            this.elements.paginationControls.innerHTML = '';
                            this.elements.statusText.textContent = \`Success: \${message.notification} (\${message.changes} rows affected) in \${message.duration}ms.\`;
                            this.elements.resultsPanel.innerHTML = \`<div class="placeholder flex items-center justify-center h-full"><p>\${message.notification} (\${message.changes} rows affected)</p></div>\`;
                            this.switchTab(document.querySelector('.tab-button[data-tab="results"]'));
                            break;
                        case 'query-error':
                            this.elements.paginationControls.innerHTML = '';
                            this.elements.statusText.textContent = 'Error executing query.';
                            this.elements.resultsPanel.innerHTML = \`<div class="p-4 text-error"><h3 class="font-bold mb-2">Query Failed</h3><pre class="text-xs whitespace-pre-wrap">\${message.error}</pre></div>\`;
                            this.switchTab(document.querySelector('.tab-button[data-tab="results"]'));
                            break;
                        case 'history-updated': this.renderHistory(message.history); break;
                        case 'set-query-text': this.elements.queryInput.value = message.text; break;
                    }
                }
            };
            
            window.addEventListener('message', event => App.handleMessage(event.data));
            document.addEventListener('DOMContentLoaded', () => App.init());
          </script>
      </body>
      </html>`;
    }
}
exports.MainWebviewPanel = MainWebviewPanel;
//# sourceMappingURL=main-webview.js.map