# Agent Context: Screenshotter

This document provides context and architectural details for AI agents working on the Screenshotter codebase.

## Project Overview

Screenshotter is a full-stack application designed to capture precise, high-quality screenshots of web pages. Its primary differentiator is its robust handling of deep links (URL hashes), ensuring the screenshot captures the intended section even on complex Single Page Applications (SPAs) or sites with broken native scrolling.

## Architecture

### Frontend (`src/`)
- **Framework**: React + Vite.
- **Key Component**: `App.jsx` handles the UI, state management, and API calls.
- **Filename Logic**: The frontend is responsible for generating the download filename. It cleans the page title and hash (if present) to create a user-friendly string (e.g., converting spaces to dashes, removing special characters).
- **State Persistence**: Uses `localStorage` for theme preference, recent URLs, screenshot history (up to 10 items), and custom resolutions.

### Backend (`server/`)
- **Framework**: Express.js.
- **Core Engine**: Puppeteer (Chrome).
- **Endpoint**: `POST /api/screenshot`.

## Key Logic & Heuristics

### Smart Scrolling (`server/index.js`)
The most complex part of the application is the scrolling logic in `server/index.js`. It employs a multi-step strategy to locate the target content:

1.  **Popup Cleanup**: Before attempting to scroll, it executes a script to close common overlays (cookie banners, newsletter popups) that might obstruct the view.
2.  **Native Scroll**: Attempts `window.location.hash` navigation.
3.  **Selector Fallback**: If native scroll fails, it tries a list of standard ID and attribute selectors (e.g., `[id="target"]`, `[name="target"]`, `[data-section="target"]`).
4.  **Text Search (Deep Fallback)**: If selectors fail, it decodes the hash (e.g., `#cost-to-run` -> "cost to run") and searches the DOM for:
    - Headings (`h1`-`h6`) containing the text.
    - Elements with partial ID matches.
    - Text nodes containing the keywords.
    - This fuzzy matching allows it to find sections even when the ID doesn't exactly match the hash.

### Popup Removal (`server/index.js`)
The backend implements aggressive popup blocking:

1.  **Request Interception**: Blocks requests to known cookie consent and popup script domains (Iubenda, OneTrust, CookieBot, OptinMonster, etc.).
2.  **Cookie Pre-setting**: Sets consent cookies for common providers before page load.
3.  **DOM Cleanup**: Removes fixed/sticky elements, modals, and elements with `role="alertdialog"`.
4.  **Heuristic Removal**: Identifies and removes any fixed/sticky elements covering significant screen area.

### Image Processing
- **Viewport**: Configurable (default 1920×1080), supports custom dimensions.
- **Format**: PNG (Base64 encoded for transfer).
- **Timing**: Includes explicit waits to ensure animations and lazy-loaded content settle before capture.

## UI/UX Standards

### Button Design
All primary action buttons follow a consistent "icon-only" design language:

- **Shape**: Rounded square (`border-radius: 14px`).
- **Size**: 54px × 54px for primary actions.
- **Content**: Simple SVG icon centered in the button. No text labels.
- **Tooltips**: Use `data-tooltip` attribute for instant CSS-based tooltips (no delay). Tooltips appear above buttons by default.
- **Theme**:
  - Primary actions (e.g., Capture, Download): Filled accent color (`var(--accent)`).
  - Secondary actions (e.g., Copy, Cancel, Navigation): Card background (`var(--bg-card)`) with subtle border.

### Tooltip Guidelines
- Use `data-tooltip` attribute instead of native `title` for instant hover response.
- Tooltips should be concise (2-4 words typically).
- Ensure parent containers have `overflow: visible` to prevent tooltip clipping.
- Use `z-index` management on hover states to ensure tooltips appear above sibling elements.

### Screenshot Overlay
- Action buttons for the main screenshot appear in a floating overlay at the bottom of the screenshot container.
- Use `position: absolute` (not `fixed`) relative to the screenshot container to stay within bounds on long screenshots.
- Overlay is visible on hover over the screenshot preview area.

### History Items
- Each history item displays: thumbnail, timestamp, resolution label, and action buttons.
- URL is accessible via tooltip on the copy/link button (not displayed as text).
- Items use `z-index` on hover to ensure tooltips appear above adjacent cards.

## Custom Resolutions
- Users can add custom resolutions via a modal accessible from the size dropdown.
- Custom sizes are persisted in `localStorage` under `screenshotter-custom-resolutions`.
- Default values (1920×1080) are used if width/height inputs are left empty.
- Custom sizes appear in a separate section of the dropdown with edit/delete capabilities.

## Development Scripts
- `npm run dev`: Uses `concurrently` to launch both the Vite dev server and the Express API.
- `npm run build`: Builds the frontend to the `docs/` folder for GitHub Pages deployment.

## File Structure
```
├── src/
│   ├── App.jsx       # Main React component
│   ├── App.css       # All styling (CSS variables for theming)
│   └── main.jsx      # React entry point
├── server/
│   └── index.js      # Express server + Puppeteer logic
├── docs/             # Production build output
├── agents.md         # This file
└── README.md         # User-facing documentation
```
