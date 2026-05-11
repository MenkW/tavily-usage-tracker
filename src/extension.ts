import * as vscode from 'vscode';
import * as https from 'https';

// ── Types ────────────────────────────────────────────────────────────────────

interface TavilyUsageResponse {
  key: {
    usage: number;
    limit: number | null;
    search_usage: number;
    crawl_usage: number;
    extract_usage: number;
    map_usage: number;
    research_usage: number;
  };
  account: {
    current_plan: string;
    plan_usage: number;
    plan_limit: number | null;
    search_usage: number;
    crawl_usage: number;
    extract_usage: number;
    map_usage: number;
    research_usage: number;
    paygo_usage: number;
    paygo_limit: number | null;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fetchUsage(apiKey: string): Promise<TavilyUsageResponse> {
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
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data) as TavilyUsageResponse);
          } catch {
            reject(new Error('Failed to parse Tavily API response'));
          }
        } else if (res.statusCode === 401) {
          reject(new Error('Invalid Tavily API key'));
        } else {
          reject(new Error(`Tavily API returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err: Error) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Tavily API request timed out'));
    });
    req.end();
  });
}

function fetchRaw(apiKey: string): Promise<string> {
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
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => resolve(data));
    });

    req.on('error', (err: Error) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Tavily API request timed out'));
    });
    req.end();
  });
}

function getThemeColor(used: number, limit: number): vscode.ThemeColor {
  const pct = used / limit;
  if (pct >= 0.9) {
    return new vscode.ThemeColor('statusBarItem.errorBackground');
  }
  if (pct >= 0.75) {
    return new vscode.ThemeColor('statusBarItem.warningBackground');
  }
  return new vscode.ThemeColor('statusBarItem.remoteBackground');
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function buildBar(used: number, limit: number, segments: number = 10): string {
  const filled = limit > 0 ? Math.round((used / limit) * segments) : 0;
  const empty = segments - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ── Extension ────────────────────────────────────────────────────────────────

let statusBarItem: vscode.StatusBarItem;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let lastData: TavilyUsageResponse | undefined;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  // Output channel for diagnostics
  outputChannel = vscode.window.createOutputChannel('Tavily Usage Tracker');
  context.subscriptions.push(outputChannel);

  // Status bar item — placed left of the notifications area (right side)
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    90
  );
  statusBarItem.command = 'tavilyUsageTracker.refresh';
  context.subscriptions.push(statusBarItem);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('tavilyUsageTracker.refresh', async () => {
      await refreshUsage(context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tavilyUsageTracker.openDashboard', () => {
      vscode.env.openExternal(vscode.Uri.parse('https://app.tavily.com'));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tavilyUsageTracker.showLog', () => {
      outputChannel.show();
    })
  );

  // React to configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('tavilyUsageTracker')) {
        restartPolling(context);
      }
    })
  );

  // Initial fetch + start polling
  restartPolling(context);
}

function restartPolling(context: vscode.ExtensionContext): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }

  const config = vscode.workspace.getConfiguration('tavilyUsageTracker');
  const apiKey = config.get<string>('apiKey', '').trim();
  const intervalMinutes = config.get<number>('pollIntervalMinutes', 10);

  if (!apiKey) {
    showNotConfigured();
    return;
  }

  // Immediate first fetch
  refreshUsage(context);

  // Recurring poll
  pollTimer = setInterval(
    () => refreshUsage(context),
    intervalMinutes * 60 * 1000
  );
}

async function refreshUsage(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('tavilyUsageTracker');
  const apiKey = config.get<string>('apiKey', '').trim();
  const showBreakdown = config.get<boolean>('showBreakdown', true);
  const displayMode = config.get<string>('displayMode', 'both');
  const diagnosticLogging = config.get<boolean>('diagnosticLogging', false);

  if (!apiKey) {
    showNotConfigured();
    return;
  }

  showLoading();

  try {
    // Fetch raw response first so we can log it for diagnostics
    const raw = await fetchRaw(apiKey);
    if (diagnosticLogging) {
      const timestamp = new Date().toLocaleString();
      outputChannel.appendLine(`\n[${timestamp}] Raw API response from api.tavily.com/usage:`);
      try {
        outputChannel.appendLine(JSON.stringify(JSON.parse(raw), null, 2));
      } catch {
        outputChannel.appendLine(raw);
      }
    }

    const data = JSON.parse(raw) as TavilyUsageResponse;
    lastData = data;
    renderStatusBar(data, showBreakdown, displayMode);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (diagnosticLogging) {
      outputChannel.appendLine(`\n[${new Date().toLocaleString()}] Error: ${message}`);
    }
    showError(message);
  }
}

function showNotConfigured(): void {
  statusBarItem.text = '$(globe) Tavily: not configured';
  statusBarItem.tooltip = new vscode.MarkdownString(
    '**Tavily Usage Tracker**\n\nNo API key set.\n\n' +
      '[Open Settings](command:workbench.action.openSettings?%5B%22tavilyUsageTracker.apiKey%22%5D)'
  );
  statusBarItem.tooltip.isTrusted = true;
  statusBarItem.backgroundColor = undefined;
  statusBarItem.show();
}

function showLoading(): void {
  statusBarItem.text = '$(sync~spin) Tavily…';
  statusBarItem.tooltip = 'Fetching Tavily usage…';
  statusBarItem.backgroundColor = undefined;
  statusBarItem.show();
}

function showError(message: string): void {
  statusBarItem.text = '$(warning) Tavily: error';
  statusBarItem.tooltip = new vscode.MarkdownString(
    `**Tavily Usage Tracker — Error**\n\n${message}\n\nClick to retry.`
  );
  statusBarItem.backgroundColor = new vscode.ThemeColor(
    'statusBarItem.errorBackground'
  );
  statusBarItem.show();
}

function renderStatusBar(
  data: TavilyUsageResponse,
  showBreakdown: boolean,
  displayMode: string
): void {
  const { key, account } = data;

  // On paid plans key.limit is set → use per-key figures.
  // On the free plan key.limit is null → fall back to account-level figures
  // which is what the Tavily dashboard shows.
  const used = key.limit !== null ? key.usage : account.plan_usage;
  const limit = key.limit ?? account.plan_limit ?? 0;
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;

  // Build status bar label parts
  // Show used/limit (matching dashboard convention), not remaining/limit
  const bar = buildBar(used, limit);
  const numbers = `${formatNumber(used)}/${formatNumber(limit)}`;

  let label: string;
  if (displayMode === 'bar') {
    label = `$(globe) Tavily ${bar}`;
  } else if (displayMode === 'numbers') {
    label = `$(globe) Tavily ${numbers}`;
  } else {
    label = `$(globe) Tavily ${bar} ${numbers}`;
  }
  statusBarItem.text = label;
  statusBarItem.backgroundColor = limit > 0 ? getThemeColor(used, limit) : undefined;

  // Tooltip
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportThemeIcons = true;

  md.appendMarkdown(`**Tavily Usage Tracker**\n\n`);
  md.appendMarkdown(`**Plan:** ${account.current_plan}\n\n`);
  md.appendMarkdown(
    `**Credits used:** ${formatNumber(used)} / ${formatNumber(limit)} (${pct}%)\n\n`
  );
  md.appendMarkdown(`**Remaining:** ${formatNumber(remaining)}\n\n`);

  if (showBreakdown) {
    const breakdown = key.limit !== null ? key : account;
    const scope = key.limit !== null ? 'this key' : 'account';
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`**Breakdown (${scope})**\n\n`);
    md.appendMarkdown(`| Type | Used |\n`);
    md.appendMarkdown(`|---|---|\n`);
    md.appendMarkdown(`| Search | ${formatNumber(breakdown.search_usage)} |\n`);
    md.appendMarkdown(`| Extract | ${formatNumber(breakdown.extract_usage)} |\n`);
    md.appendMarkdown(`| Crawl | ${formatNumber(breakdown.crawl_usage)} |\n`);
    md.appendMarkdown(`| Map | ${formatNumber(breakdown.map_usage)} |\n`);
    md.appendMarkdown(`| Research | ${formatNumber(breakdown.research_usage)} |\n`);
    if (account.paygo_usage > 0) {
      md.appendMarkdown(
        `| Pay-as-you-go | ${formatNumber(account.paygo_usage)} |\n`
      );
    }
    md.appendMarkdown(`\n`);
  }

  md.appendMarkdown(`---\n\n`);
  md.appendMarkdown(
    `[$(refresh) Refresh now](command:tavilyUsageTracker.refresh)` +
      `  ·  [$(link-external) Dashboard](command:tavilyUsageTracker.openDashboard)` +
      `  ·  [$(output) Show log](command:tavilyUsageTracker.showLog)`
  );

  statusBarItem.tooltip = md;
  statusBarItem.show();
}

export function deactivate(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
}
