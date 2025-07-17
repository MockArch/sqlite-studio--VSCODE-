
---
 A powerful, developer-friendly SQLite database manager directly inside Visual Studio Code.
SQLite Studio provides a beautiful and intuitive interface to connect to, query, and manage multiple SQLite databases without ever leaving your editor. 

## ✨ Features

-   **Modern, Polished UI**: A beautiful and responsive interface built with Tailwind CSS that respects your VS Code theme.
-   **Multi-Database Management**: Connect to and seamlessly switch between multiple SQLite databases in your workspace using a dedicated explorer or an in-editor dropdown.
-   **Powerful Database Explorer**:
    -   🗂️ View all connected databases in the sidebar.
    -   👀 Expand tables to see their schema, including column names and data types.
    -   🔢 Instantly see the number of rows for each table.
    -   🖱️ One-click to view table data or remove a database connection.
-   **Advanced Query Editor**:
    -   ✍️ Write your queries in a dedicated, resizable editor panel.
    -   🎯 **Run Selected Query**: Highlight a portion of your script and execute only that part.
    -   🛡️ **Automatic Limiting**: `SELECT` queries are automatically limited to 100 rows to ensure performance, with a clear notification.
-   **Professional Results Grid**:
    -   📊 View query results in a clean, easy-to-read table.
    -   ⏱️ See query metadata, including execution time and the number of rows returned.
-   **Full Query History**:
    -   📜 Every query you run is automatically saved to the History tab.
    -   🔄 View, search, and re-run previous queries with a single click.

## 🚀 Installation & Getting Started

### From the Marketplace

1.  Open the **Extensions** sidebar in VS Code (`Ctrl+Shift+X`).
2.  Search for `SQLite Studio`.
3.  Click **Install**.
4.  Click the **database icon** in the activity bar to open the SQLite Studio explorer.

### Quick Start

1.  In the SQLite Studio sidebar, click the **`+`** (Add Database) icon to add your first SQLite file.
2.  The main **SQLite Studio** editor will open automatically.
3.  The added database will be set as active. You can switch between databases using the **Active Database** dropdown.
4.  Write a query in the editor panel and click **Run Query** (or press `Ctrl+Enter` / `Cmd+Enter`).

## 📸 Screenshots

| Database Explorer                                                                                                      | Query History                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Browse schemas, view column types, and see row counts at a glance.                                                     | Never lose a query. View, search, and re-run any query you've executed.                                    |
| <!-- ACTION: Replace with screenshot of sidebar --> <img src="./images/screenshot-sidebar.png" alt="Database Explorer"> | <!-- ACTION: Replace with screenshot of history tab --> <img src="./images/screenshot-history.png" alt="Query History"> |

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

### Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/vscode-sqlite-studio.git
    cd vscode-sqlite-studio
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Perform a clean compile:**
    ```bash
    npm run compile
    ```
    > **Note:** If you encounter issues, a clean rebuild is often the solution. Delete the `out` and `node_modules` directories, then run `npm install` and `npm run compile` again.

4.  **Start the extension:**
    -   Press `F5` in VS Code to open a new **Extension Development Host** window.
    -   This new window will be running your local version of the extension.

### How to Contribute

1.  **Open an Issue:** Before starting major work, please [open an issue](https://github.com/your-username/vscode-sqlite-studio/issues) to discuss your proposed changes.
2.  **Fork the Repository**
3.  **Create your Feature Branch** (`git checkout -b feature/AmazingFeature`)
4.  **Commit your Changes** (`git commit -m 'feat: Add some AmazingFeature'`)
5.  **Push to the Branch** (`git push origin feature/AmazingFeature`)
6.  **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.