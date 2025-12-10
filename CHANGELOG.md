# Changelog

All notable changes to Screenshotter will be documented in this file.

## [Unreleased]

### Added
- **Screenshot Color Scheme Control**: New toggle button to capture screenshots in light mode, dark mode, or system default
  - Three modes: System (default), Light, Dark
  - Mode preference persists in localStorage
  - Uses Puppeteer's `emulateMediaFeatures` to set `prefers-color-scheme`
  - Independent from UI theme preference

### Changed
- **Screenshot color enforcement**: Server now aggressively forces the requested color scheme (emulated media, meta `color-scheme`, class/data-attribute overrides, mutation observer) and attempts to auto-toggle site theme switches before capturing.
- **Textarea shortcuts**: URL input now handles Cmd/Ctrl+A for select-all while preserving Cmd/Ctrl+Enter to capture.
- **Zoom behavior**: Zoom now uses device scale for zoom-in and expanded viewport for zoom-out to make captures at different zoom levels visibly differ.

## [1.0.0] - 2025-12-07

### 🎉 Initial Release

#### Features
- **Screenshot Capture**
  - Multiple preset resolutions (HD, Vertical, Full Page)
  - Custom user-defined resolutions with persistence
  - Batch URL processing (up to 5 URLs per request)
  - Full page screenshot support

- **Smart Scrolling**
  - URL hashtag navigation (e.g., `#section-name`)
  - Automatic element detection for broken anchors
  - Text-based search fallback for missing IDs
  - SPA-compatible navigation

- **Popup Removal**
  - Request interception for cookie/consent scripts
  - Pre-set consent cookies for major providers
  - DOM cleanup for fixed/sticky overlays
  - Support for Iubenda, OneTrust, CookieBot, and more

- **Post-Capture Tools**
  - Client-side cropping with react-image-crop
  - Download as PNG
  - Copy to clipboard
  - Batch download as ZIP (jszip)
  - URL retention for reference

- **User Interface**
  - Light/dark mode toggle
  - Instant CSS tooltips (no delay)
  - Icon-only button design
  - Responsive layout
  - Help overlay tutorial

- **Persistence**
  - Screenshot history (10 items) in localStorage
  - Custom resolutions in localStorage
  - Theme preference in localStorage
  - Recent URLs in localStorage

- **Rate Limiting**
  - 5 requests per minute per IP
  - 30 requests per hour per IP
  - Max 5 URLs per batch
  - Max 4K resolution (3840×2160)
  - IPv6 subnet masking for proper IPv6 rate limiting (fixes ERR_ERL_KEY_GEN_IPV6)

- **Deployment**
  - Render deployment configuration
  - @sparticuz/chromium for cloud Puppeteer
  - Express 5 compatibility

### Tech Stack
- React 19.2
- Vite 7.2
- Express 5.2
- Puppeteer 24.32
- @sparticuz/chromium 143.0

---

## Future Roadmap

- [ ] User authentication (API keys)
- [ ] PostgreSQL for user data persistence
- [ ] Redis for distributed rate limiting
- [ ] Scheduled screenshots
- [ ] Webhook notifications
- [ ] PDF export option
- [ ] Screenshot comparison/diff

