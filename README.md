# harness-os-ui

The OS desktop environment for harness.os — a React app that runs in the browser and presents a real OS experience connected to a local distribution.

## What it is

- **Shell**: Desktop with floating panels, Dock, Tray, Boot sequence, Notifications
- **Apps**: Knowledge Manager, Session Monitor, Cortex (learnings + decisions), Terminal (CLI), Agents, Settings, Theory
- **Server**: Express + WebSocket + chokidar watching `HARNESS_PATH` for live updates
- **test-harness/**: Mock company.os distribution — 9 knowledge chunks, 2 rules, 2 workflows, 3 agents, 3 decisions, 3 learnings

## Quick start (company machine — test distribution)

```bash
# 1. Clone and install
git clone https://github.com/marcowilliam/harness-os-ui.git
cd harness-os-ui
npm install

# 2. Start the server (uses test-harness/ as the distribution)
HARNESS_PATH=./test-harness npx tsx server/index.ts

# 3. In a separate terminal, start the UI
npm run dev
```

Open http://localhost:5173 — you'll see the company.os distribution (dark green brand).

## Running against a real distribution

```bash
# Point HARNESS_PATH at your actual distribution
HARNESS_PATH=/path/to/your/company.os npx tsx server/index.ts
```

## Project structure

```
server/          # Express + WebSocket server
src/
  shell/         # OS shell: Desktop, Dock, Tray, Notifications, Boot
  apps/          # Individual OS apps (knowledge, sessions, cortex, terminal, agents, settings, theory)
  api/           # TanStack Query hooks + WebSocket client
  lib/           # types.ts, design-system.ts
  store.ts       # Zustand global OS state
test-harness/    # Mock company.os distribution (safe for git, no real data)
```

## Distribution brand

The UI adapts to each distribution via CSS variables read from the server's `HARNESS_PATH/harness.yaml`. The `brand` section sets the color scheme — company.os uses dark green, marco.os uses indigo.

## Tech

React 19 · Vite · TypeScript · Tailwind CSS v4 · TanStack Query · Zustand · Express · chokidar
