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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
// ── Helpers ──────────────────────────────────────────────────────────────────
function fetchUsage(apiKey) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.tavily.com',
            path: '/usage',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk.toString()));
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch {
                        reject(new Error('Failed to parse Tavily API response'));
                    }
                }
                else if (res.statusCode === 401) {
                    reject(new Error('Invalid Tavily API key'));
                }
                else {
                    reject(new Error(`Tavily API returned status ${res.statusCode}`));
                }
            });
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Tavily API request timed out'));
        });
        req.end();
    });
}
function getThemeColor(used, limit) {
    const pct = used / limit;
    if (pct >= 0.9) {
        return new vscode.ThemeColor('statusBarItem.errorBackground');
    }
    if (pct >= 0.75) {
        return new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    return new vscode.ThemeColor('statusBarItem.remoteBackground');
}
function formatNumber(n) {
    return n.toLocaleString('en-US');
}
// ── Extension ────────────────────────────────────────────────────────────────
let statusBarItem;
let pollTimer;
let lastData;
function activate(context) {
    // Status bar item — placed left of the notifications area (right side)
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    statusBarItem.command = 'tavilyUsageTracker.refresh';
    context.subscriptions.push(statusBarItem);
    // Commands
    context.subscriptions.push(vscode.commands.registerCommand('tavilyUsageTracker.refresh', async () => {
        await refreshUsage(context);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('tavilyUsageTracker.openDashboard', () => {
        vscode.env.openExternal(vscode.Uri.parse('https://app.tavily.com'));
    }));
    // React to configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('tavilyUsageTracker')) {
            restartPolling(context);
        }
    }));
    // Initial fetch + start polling
    restartPolling(context);
}
function restartPolling(context) {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = undefined;
    }
    const config = vscode.workspace.getConfiguration('tavilyUsageTracker');
    const apiKey = config.get('apiKey', '').trim();
    const intervalMinutes = config.get('pollIntervalMinutes', 10);
    if (!apiKey) {
        showNotConfigured();
        return;
    }
    // Immediate first fetch
    refreshUsage(context);
    // Recurring poll
    pollTimer = setInterval(() => refreshUsage(context), intervalMinutes * 60 * 1000);
}
async function refreshUsage(context) {
    const config = vscode.workspace.getConfiguration('tavilyUsageTracker');
    const apiKey = config.get('apiKey', '').trim();
    const showBreakdown = config.get('showBreakdown', true);
    if (!apiKey) {
        showNotConfigured();
        return;
    }
    showLoading();
    try {
        const data = await fetchUsage(apiKey);
        lastData = data;
        renderStatusBar(data, showBreakdown);
    }
    catch (err) {
        showError(err instanceof Error ? err.message : String(err));
    }
}
function showNotConfigured() {
    statusBarItem.text = '$(globe) Tavily: not configured';
    statusBarItem.tooltip = new vscode.MarkdownString('**Tavily Usage Tracker**\n\nNo API key set.\n\n' +
        '[Open Settings](command:workbench.action.openSettings?%5B%22tavilyUsageTracker.apiKey%22%5D)');
    statusBarItem.tooltip.isTrusted = true;
    statusBarItem.backgroundColor = undefined;
    statusBarItem.show();
}
function showLoading() {
    statusBarItem.text = '$(sync~spin) Tavily…';
    statusBarItem.tooltip = 'Fetching Tavily usage…';
    statusBarItem.backgroundColor = undefined;
    statusBarItem.show();
}
function showError(message) {
    statusBarItem.text = '$(warning) Tavily: error';
    statusBarItem.tooltip = new vscode.MarkdownString(`**Tavily Usage Tracker — Error**\n\n${message}\n\nClick to retry.`);
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    statusBarItem.show();
}
function renderStatusBar(data, showBreakdown) {
    const { account } = data;
    const used = account.plan_usage;
    const limit = account.plan_limit ?? 0;
    const remaining = Math.max(0, limit - used);
    const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
    // Status bar label
    statusBarItem.text = `$(globe) Tavily ${formatNumber(remaining)}/${formatNumber(limit)}`;
    statusBarItem.backgroundColor = limit > 0 ? getThemeColor(used, limit) : undefined;
    // Tooltip
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;
    md.appendMarkdown(`**Tavily Usage Tracker**\n\n`);
    md.appendMarkdown(`**Plan:** ${account.current_plan}\n\n`);
    md.appendMarkdown(`**Credits used:** ${formatNumber(used)} / ${formatNumber(limit)} (${pct}%)\n\n`);
    md.appendMarkdown(`**Remaining:** ${formatNumber(remaining)}\n\n`);
    if (showBreakdown) {
        md.appendMarkdown(`---\n\n`);
        md.appendMarkdown(`**Breakdown**\n\n`);
        md.appendMarkdown(`| Type | Used |\n`);
        md.appendMarkdown(`|---|---|\n`);
        md.appendMarkdown(`| Search | ${formatNumber(account.search_usage)} |\n`);
        md.appendMarkdown(`| Extract | ${formatNumber(account.extract_usage)} |\n`);
        md.appendMarkdown(`| Crawl | ${formatNumber(account.crawl_usage)} |\n`);
        md.appendMarkdown(`| Map | ${formatNumber(account.map_usage)} |\n`);
        md.appendMarkdown(`| Research | ${formatNumber(account.research_usage)} |\n`);
        if (account.paygo_usage > 0) {
            md.appendMarkdown(`| Pay-as-you-go | ${formatNumber(account.paygo_usage)} |\n`);
        }
        md.appendMarkdown(`\n`);
    }
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`[$(refresh) Refresh now](command:tavilyUsageTracker.refresh)` +
        `  ·  [$(link-external) Dashboard](command:tavilyUsageTracker.openDashboard)`);
    statusBarItem.tooltip = md;
    statusBarItem.show();
}
function deactivate() {
    if (pollTimer) {
        clearInterval(pollTimer);
    }
}
//# sourceMappingURL=extension.js.map