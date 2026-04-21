# Tavily Usage Tracker

A VS Code extension that displays your remaining [Tavily](https://tavily.com) API credits directly in the status bar.

## Features

- **Status bar indicator** — shows remaining / total credits at a glance
- **Color-coded warnings** — turns yellow at 75 % usage, red at 90 %
- **Hover tooltip** — shows plan name, credits used/remaining, and a per-type breakdown (Search, Extract, Crawl, Map, Research)
- **Auto-refresh** — polls the Tavily API on a configurable interval (default: every 10 minutes)
- **Click to refresh** — click the status bar item to force an immediate refresh
- **Dashboard link** — open [app.tavily.com](https://app.tavily.com) directly from the tooltip

## Installation

Install directly from the pre-built VSIX:

1. In VS Code open **Extensions** (`Ctrl+Shift+X`)
2. Click the `…` menu → **Install from VSIX…**
3. Select `tavily-usage-tracker-1.0.0.vsix`
4. Open **Settings** (`Ctrl+,`), search `tavilyUsageTracker`, and paste your API key

## Configuration

| Setting | Default | Description |
|---|---|---|
| `tavilyUsageTracker.apiKey` | `""` | Your Tavily API key (starts with `tvly-`) |
| `tavilyUsageTracker.pollIntervalMinutes` | `10` | Refresh interval in minutes (1–60) |
| `tavilyUsageTracker.showBreakdown` | `true` | Show per-type breakdown in tooltip |

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
