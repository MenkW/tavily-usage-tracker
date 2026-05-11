# Tavily Usage Tracker

A VS Code extension that displays your remaining [Tavily](https://tavily.com) API credits directly in the status bar.

## Features

- **Status bar indicator** — choose between a progress bar, remaining/limit numbers, or both
- **Color-coded warnings** — turns yellow at 75 % usage, red at 90 %
- **Hover tooltip** — shows plan name, credits used/remaining, percentage, and a per-type breakdown (Search, Extract, Crawl, Map, Research)
- **Auto-refresh** — polls the Tavily API on a configurable interval (default: every 10 minutes)
- **Click to refresh** — click the status bar item to force an immediate refresh
- **Dashboard link** — open [app.tavily.com](https://app.tavily.com) directly from the tooltip

## Status Bar Display Modes

Controlled by `tavilyUsageTracker.displayMode`:

| Mode | Example |
|---|---|
| `both` (default) | `🌐 Tavily ████████░░ 800/1,000` |
| `bar` | `🌐 Tavily ████████░░` |
| `numbers` | `🌐 Tavily 800/1,000` |

## Installation

Install directly from the pre-built VSIX:

1. In VS Code open **Extensions** (`Ctrl+Shift+X`)
2. Click the `…` menu → **Install from VSIX…**
3. Select `tavily-usage-tracker-1.1.4.vsix`
4. Open **Settings** (`Ctrl+,`), search `tavilyUsageTracker`, and paste your API key

## Configuration

| Setting | Default | Description |
|---|---|---|
| `tavilyUsageTracker.apiKey` | `""` | Your Tavily API key (starts with `tvly-`) |
| `tavilyUsageTracker.pollIntervalMinutes` | `10` | Refresh interval in minutes (1–60) |
| `tavilyUsageTracker.showBreakdown` | `true` | Show per-type breakdown in tooltip |
| `tavilyUsageTracker.diagnosticLogging` | `false` | Log raw API responses to the output channel for troubleshooting |

## Development

```bash
npm install
npm run compile
# Press F5 in VS Code to launch the Extension Development Host
```

## Building the VSIX

```bash
npm install -g @vscode/vsce
vsce package
```

---

## Changelog

### v1.1.4 — 2026-05-11

- **New:** `tavilyUsageTracker.diagnosticLogging` setting (default: `false`). When enabled, the full raw JSON from `api.tavily.com/usage` is written to the **Tavily Usage Tracker** output channel on every refresh. Previously this was always on; it is now opt-in.

### v1.1.3 — 2026-05-11

- **Bugfix:** Status bar was displaying `remaining/limit` (e.g. `717/1,000`) which is the inverse of what the Tavily dashboard shows. Now displays `used/limit` (e.g. `675/1,000`) to match dashboard convention. Remaining credits are still shown in the tooltip.
- **New:** Diagnostic Output channel — every API refresh logs the full raw JSON response from `api.tavily.com/usage`. Open it via **Tavily: Show Diagnostic Log** in the command palette, or click **Show log** in the status bar tooltip. Useful for verifying the numbers the API actually returns.
- **New:** **Show log** link added to the status bar tooltip.

### v1.1.2 — 2026-05-11

- **Bugfix:** Reverted incorrect assumption from v1.1.1. On the free plan `key.limit` is `null` (no per-key cap), causing `key.usage / key.limit` to render as 0/0. The extension now auto-detects the plan type: if `key.limit` is set (paid plan) it uses per-key figures; otherwise it falls back to `account.plan_usage / account.plan_limit` which is what the Tavily dashboard shows on the free plan.
- Tooltip breakdown scope label now reads **"this key"** (paid) or **"account"** (free) accordingly.

### v1.1.1 — 2026-05-11

- **Bugfix (reverted in v1.1.2):** Attempted to switch to `key.usage / key.limit` to match the dashboard. This worked for paid plans but broke the free plan where `key.limit` is `null`.

### v1.1.0 — 2026-04-29

- **New:** Unicode progress bar in the status bar (`████████░░`) showing used vs. remaining credits at a glance
- **New:** `tavilyUsageTracker.displayMode` setting to choose between `bar`, `numbers`, or `both` in the status bar label
- The tooltip always shows full details regardless of the chosen display mode

### v1.0.0 — 2026-04-21

- Initial release
- Status bar item showing remaining/limit credits
- Color-coded background: green (< 75 %), yellow (≥ 75 %), red (≥ 90 %)
- Hover tooltip with plan info, credit totals, and per-type breakdown
- Configurable poll interval and breakdown toggle
- API key stored securely via VS Code secret storage
