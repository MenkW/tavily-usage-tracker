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
3. Select `tavily-usage-tracker-1.1.0.vsix`
4. Open **Settings** (`Ctrl+,`), search `tavilyUsageTracker`, and paste your API key

## Configuration

| Setting | Default | Description |
|---|---|---|
| `tavilyUsageTracker.apiKey` | `""` | Your Tavily API key (starts with `tvly-`) |
| `tavilyUsageTracker.pollIntervalMinutes` | `10` | Refresh interval in minutes (1–60) |
| `tavilyUsageTracker.showBreakdown` | `true` | Show per-type breakdown in tooltip |
| `tavilyUsageTracker.displayMode` | `"both"` | Status bar display: `"both"`, `"bar"`, or `"numbers"` |

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
