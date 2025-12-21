# Agent Context: Screenshotter v1.2.0

This document provides context and architectural details for AI agents working on the Screenshotter codebase.

## Project Overview

Screenshotter is a full-stack application designed to capture precise, high-quality screenshots of web pages. Its primary differentiators are:

1. **Smart Scrolling**: Robust handling of deep links (URL hashes), ensuring the screenshot captures the intended section even on complex SPAs or sites with broken native scrolling.
2. **Popup Removal**: Aggressive blocking and removal of cookie banners, consent dialogs, and newsletter popups.
3. **Client-Side Cropping**: Full-resolution cropping without server round-trips.
4. **Annotation Layer**: Fabric.js-powered drawing tools for arrows, boxes, text, and blur regions.
5. **Screenshot Queueing**: Queue multiple captures while one is processing.

## Architecture

### Frontend (`src/`)
- **Framework**: React 19 + Vite 7
- **Canvas Library**: Fabric.js 6.x for annotations
- **Key Component**: `App.jsx` handles all UI, state management, and API calls
- **Styling**: `App.css` uses CSS variables for theming (light/dark mode)
- **State Persistence**: Uses `localStorage` for:
  - Theme preference (`theme`)
  - Screenshot mode (`screenshotMode`)
  - Recent URLs (`recentUrls`)
  - Screenshot history (`screenshotter-history`)
  - Custom resolutions (`screenshotter-custom-resolutions`)
  - Admin key (`screenshotter-admin-key`)

### Backend (`server/`)
- **Framework**: Express 5
- **Core Engine**: Puppeteer with @sparticuz/chromium (production) or regular Puppeteer (development)
- **Rate Limiting**: express-rate-limit (in-memory) with admin bypass
- **Memory Optimization**: Persistent browser instance with page cleanup

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/screenshot` | POST | Capture screenshot |
| `/api/limits` | GET | Get rate limit config |

## Key Logic & Heuristics

### Screenshot Queueing (`App.jsx`)
- `queue` state holds pending screenshot requests
- When `loading` is true, new requests are added to queue
- `useEffect` monitors `loading` and `queue` to process next item
- Status bar shows current capture + queued URLs

### Admin Mode (`server/index.js`)
- `ADMIN_KEY` environment variable sets the secret
- `isAdminRequest(req)` checks `x-admin-key` header
- Rate limiters use `skip: isAdminRequest` to bypass limits
- Frontend stores key in localStorage, includes in headers

### Annotation Layer (`App.jsx`)
- Uses Fabric.js Canvas for object manipulation
- `uniformScaling: false` allows non-proportional resizing
- `strokeUniform: true` keeps consistent stroke width
- Blur regions use `fabric.Pattern` for live preview
- Final blur applied via canvas context `filter` property

### Smart Scrolling (`server/index.js`)
Multi-step strategy to locate target content:

1. **Native Hash Navigation**: `window.location.hash = hash`
2. **Selector Fallback**: Tries `#id`, `[id="id"]`, `[name="id"]`, `[data-section="id"]`, etc.
3. **Text Search**: Decodes hash (e.g., `#cost-to-run` → "cost to run") and searches headings and text nodes

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
- **Tooltips**: Use `title` attribute

### Capture Status
- Shows current URL being captured
- Displays queued URLs with accent color
- Animated spinner for loading state
- Queue badge on capture button

### Admin Badge
- Green accent with shield icon
- Appears when admin key is set
- Pulses slowly for visibility
- Tooltip explains keyboard shortcut

### Annotation Controls
- Horizontal toolbar below screenshot
- Tools: Rectangle, Arrow, Text, Blur, Delete
- Blur slider appears when blur region selected

## Development

### Scripts
```bash
npm run dev      # Start both frontend (5173) and backend (3001)
npm run build    # Build frontend to dist/
npm start        # Start production server
```

### Environment Variables
```bash
NODE_ENV=production  # Use @sparticuz/chromium
ADMIN_KEY=secret     # Admin key for rate limit bypass
```

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

### Environment Variables on Render
- `NODE_ENV`: `production`
- `ADMIN_KEY`: Your secret admin key

## File Structure
```
├── src/
│   ├── App.jsx           # Main React component
│   ├── App.css           # All styling
│   └── main.jsx          # React entry point
├── server/
│   └── index.js          # Express server + Puppeteer
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

### Fabric.js non-proportional scaling
- Set `uniformScaling: false` on Canvas
- Set `lockUniScaling: false` on objects

### Blur regions not selectable
- Add `selectable: true`, `evented: true`
- Add `backgroundColor: 'rgba(255,255,255,0.01)'` for hit detection

### Stroke width changes on resize
- Add `strokeUniform: true` to shapes

### Queue not working with keyboard shortcut
- Remove `!loading` check from Ctrl+Enter handler
