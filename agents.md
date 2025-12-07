# Agent Context: Screenshotter v1.0.0

This document provides context and architectural details for AI agents working on the Screenshotter codebase.

## Project Overview

Screenshotter is a full-stack application designed to capture precise, high-quality screenshots of web pages. Its primary differentiators are:

1. **Smart Scrolling**: Robust handling of deep links (URL hashes), ensuring the screenshot captures the intended section even on complex SPAs or sites with broken native scrolling.
2. **Popup Removal**: Aggressive blocking and removal of cookie banners, consent dialogs, and newsletter popups.
3. **Client-Side Cropping**: Full-resolution cropping without server round-trips.

## Architecture

### Frontend (`src/`)
- **Framework**: React 19 + Vite 7
- **Key Component**: `App.jsx` handles all UI, state management, and API calls
- **Styling**: `App.css` uses CSS variables for theming (light/dark mode)
- **State Persistence**: Uses `localStorage` for:
  - Theme preference (`screenshotter-theme`)
  - Recent URLs (`recentUrls`)
  - Screenshot history (`screenshotter-history`)
  - Custom resolutions (`screenshotter-custom-resolutions`)

### Backend (`server/`)
- **Framework**: Express 5
- **Core Engine**: Puppeteer with @sparticuz/chromium (production) or regular Puppeteer (development)
- **Rate Limiting**: express-rate-limit (in-memory)

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/screenshot` | POST | Capture screenshot |
| `/api/limits` | GET | Get rate limit config |

## Key Logic & Heuristics

### Smart Scrolling (`server/index.js`)
Multi-step strategy to locate target content:

1. **Native Hash Navigation**: `window.location.hash = hash`
2. **Selector Fallback**: Tries `#id`, `[id="id"]`, `[name="id"]`, `[data-section="id"]`, etc.
3. **Text Search**: Decodes hash (e.g., `#cost-to-run` → "cost to run") and searches:
   - Headings (`h1`-`h6`) containing the text
   - Elements with partial ID matches
   - Text nodes with keywords

### Popup Removal (`server/index.js`)
Three-layer defense:

1. **Request Interception**: Blocks known popup script domains before they load
2. **Cookie Pre-setting**: Sets consent cookies for Iubenda, OneTrust, CookieYes, etc.
3. **DOM Cleanup**: Removes fixed/sticky elements, modals, `[role="alertdialog"]`

### Rate Limiting
```javascript
const LIMITS = {
  MAX_REQUESTS_PER_MINUTE: 5,
  MAX_REQUESTS_PER_HOUR: 30,
  MAX_URLS_PER_BATCH: 5,
  MAX_WIDTH: 3840,
  MAX_HEIGHT: 2160,
};
```

## UI/UX Standards

### Button Design
All interactive buttons follow icon-only design:
- **Shape**: Rounded square (`border-radius: 14px`)
- **Size**: 54px × 54px for primary actions
- **Content**: Simple SVG icon, no text labels
- **Tooltips**: Use `data-tooltip` attribute for instant CSS tooltips (no JS delay)

### Tooltip Guidelines
- Use `data-tooltip` attribute (not native `title`)
- Parent containers need `overflow: visible`
- Use `z-index` on hover to prevent clipping by siblings

### Screenshot Overlay
- Position: `absolute` (not `fixed`) relative to screenshot container
- Appears on hover over `.screenshot-preview`
- Contains: Download, Crop, Copy, Copy URL buttons

### History Items
- Displays: thumbnail, timestamp, resolution label, action buttons
- URL shown via tooltip on copy button (not as text)
- `z-index: 10` on hover for tooltip visibility

## Development

### Scripts
```bash
npm run dev      # Start both frontend (5173) and backend (3001)
npm run build    # Build frontend to dist/
npm start        # Start production server
```

### Environment Detection
```javascript
const isProduction = process.env.NODE_ENV === 'production';
```
- Production: Uses @sparticuz/chromium
- Development: Uses regular Puppeteer

## Deployment (Render)

### Configuration (`render.yaml`)
```yaml
services:
  - type: web
    name: screenshotter
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
```

### Key Points
- Auto-deploy enabled from `main` branch
- Static files served from `dist/`
- Express 5 requires `/{*splat}` for catch-all routes (not `*`)

## File Structure
```
├── src/
│   ├── App.jsx           # Main React component (~900 lines)
│   ├── App.css           # All styling (~1300 lines)
│   └── main.jsx          # React entry point
├── server/
│   └── index.js          # Express server + Puppeteer (~500 lines)
├── render.yaml           # Render deployment config
├── package.json          # Dependencies and scripts
├── agents.md             # This file
├── CHANGELOG.md          # Version history
└── README.md             # User documentation
```

## Common Issues & Fixes

### "Chrome not found" on Render
- Solution: Use `@sparticuz/chromium` with `puppeteer-core` in production

### Express 5 catch-all route error
- Wrong: `app.get('*', ...)`
- Right: `app.get('/{*splat}', ...)`

### Tooltips clipped by container
- Add `overflow: visible` to parent
- Add `z-index` bump on hover

### Rate limit not persisting
- Current: In-memory (resets on deploy)
- Future: Consider Redis for persistence
