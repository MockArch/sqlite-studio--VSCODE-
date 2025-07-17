import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('SQLite Studio Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('your-publisher-name.sqlite-studio'); // Replace with your actual publisher name
        assert.ok(extension, "Extension 'sqlite-studio' not found.");
    });
    
    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('your-publisher-name.sqlite-studio'); // Replace with your actual publisher name
        if (extension) {
            await extension.activate();
            assert.ok(extension.isActive, "Extension failed to activate.");
        }
    });

    test('Studio commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        const studioCommands = [
            'sqlite-studio.open-studio',
            'sqlite-studio.selectDatabase',
            'sqlite-studio.refresh-explorer'
        ];
        
        studioCommands.forEach(command => {
            assert.ok(commands.includes(command), `Command '${command}' not registered.`);
        });
    });

    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });
});