# Changelog #1.3.5

Added Dynamic Pagination: Implemented a full, numbered pagination system in the results view. The extension now displays page numbers (< 1 2 3 ... N >), allowing for efficient navigation through large datasets without loading all results into memory at once.
Implemented 1 GiB File Size Limit: Introduced a check to prevent opening SQLite database files larger than 1 GiB. If a user attempts to add an oversized file, the extension will now gracefully display an error message instead of freezing or crashing.
Fixed Critical Webview Lifecycle Bug: Resolved the "Webview is disposed" error that occurred when reopening the editor window. The webview's lifecycle is now correctly managed, ensuring the editor can be closed and reopened reliably without errors.
Stabilized Pagination Display: Corrected a persistent bug where the pagination controls failed to appear. A race condition in the database query execution was fixed, guaranteeing that the total row count is now retrieved reliably, allowing the pagination UI to render consistently.
Refactored Core Logic for Reliability: Removed unstable setTimeout calls and refactored the query execution flow to be more robust. Initial queries are now passed directly to the webview upon creation, improving startup reliability and code maintainability.


