# Agent Context: Screenshotter v1.2.0

This document provides context and architectural details for AI agents working on the Screenshotter codebase.

## Project Overview

Screenshotter is a full-stack application designed to capture precise, high-quality screenshots of web pages. Its primary differentiators are:

1. **Smart Scrolling**: Robust handling of deep links (URL hashes), ensuring the screenshot captures the intended section even on complex SPAs or sites with broken native scrolling.
2. **Popup Removal**: Aggressive blocking and removal of cookie banners, consent dialogs, and newsletter popups.
3. **Annotation Layer**: Built-in editing tools (Text, Arrows, Boxes, Blur) using Fabric.js for high-fidelity markups.
4. **Client-Side Cropping**: Full-resolution cropping without server round-trips.

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
- **Memory Optimization**: Uses a persistent browser instance with specific flags (`--disable-dev-shm-usage`, etc.) to stay within Render's free tier limits.

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

### Annotation Layer (`src/App.jsx`)
Powered by Fabric.js for object-oriented canvas manipulation:
- **Pure Blur Logic**: Uses a two-pass approach. First, a frosted-glass preview pattern is used for real-time editing. During the final save, a real Gaussian blur filter is applied to the original image context within the clipped regions defined by the blur boxes.
- **Non-Proportional Scaling**: Enabled via `uniformScaling: false` on the Fabric canvas.
- **Persistence**: Annotated images are saved back to history as new base64 strings.

## UI/UX Standards

### Button Design
All interactive buttons follow icon-only design:
- **Shape**: Rounded square (`border-radius: 14px`)
- **Size**: 54px × 54px for primary actions, 32px for top navigation
- **Content**: Simple SVG icon, no text labels
- **Tooltips**: Use `data-tooltip` attribute for instant CSS tooltips (no JS delay)

### Layout & Navigation
- **Fixed Top Bar**: Ensures navigation is always accessible and doesn't overlap the capture preview.
- **Animated Logo**: Uses SVG filters (glow) and CSS keyframes (scanline, pulse) for a "capture" aesthetic.

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
│   ├── App.jsx           # Main React component (~1400 lines)
│   ├── App.css           # All styling (~1550 lines)
│   └── main.jsx          # React entry point
├── server/
│   └── index.js          # Express server + Puppeteer (~600 lines)
├── render.yaml           # Render deployment config
├── package.json          # Dependencies and scripts
├── agents.md             # This file
├── CHANGELOG.md          # Version history
└── README.md             # User documentation
```

## Common Issues & Fixes

### "Chrome not found" on Render
- Solution: Use `@sparticuz/chromium` with `puppeteer-core` in production

### Render Memory Limits (Free Tier)
- Solution: Use a persistent browser instance instead of launching a new one per request. Ensure `page.close()` is called in a `finally` block or via timeout.

### Fabric.js Scaling Aspect Ratio
- Solution: Set `uniformScaling: false` on the `fabric.Canvas` instance to allow stretching boxes.
