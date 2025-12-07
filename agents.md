# Agent Context: Screenshotter

This document provides context and architectural details for AI agents working on the Screenshotter codebase.

## Project Overview

Screenshotter is a full-stack application designed to capture precise, high-quality screenshots of web pages. Its primary differentiator is its robust handling of deep links (URL hashes), ensuring the screenshot captures the intended section even on complex Single Page Applications (SPAs) or sites with broken native scrolling.

## Architecture

### Frontend (`src/`)
- **Framework**: React + Vite.
- **Key Component**: `App.jsx` handles the UI, state management, and API calls.
- **Filename Logic**: The frontend is responsible for generating the download filename. It cleans the page title and hash (if present) to create a user-friendly string (e.g., converting spaces to dashes, removing special characters).

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

### Image Processing
- **Viewport**: Fixed at 1920x1080.
- **Format**: PNG (Base64 encoded for transfer).
- **Timing**: Includes explicit waits to ensure animations and lazy-loaded content settle before capture.

## Development Scripts
- `npm run dev`: Uses `concurrently` to launch both the Vite dev server and the Express API.

