# Changelog

All notable changes to Screenshotter will be documented in this file.

## [1.2.0] - 2025-12-20

### Added
- **Annotation Layer**: Integrated Fabric.js to allow drawing directly on captured screenshots.
  - **Tools**: Added Rectangle, Arrow, and Text annotation tools.
  - **Editable Layer**: Annotations remain fully movable, resizable (non-proportionally), and deletable until applied.
  - **Pure Blur Tool**: Added a privacy blur tool that uses a "frosted glass" preview and applies a real Gaussian blur to the final image.
  - **Blur Strength Control**: Added a contextual slider to adjust the intensity of the blur for each box.
- **Top Navigation Refactor**: Moved the sidebar icons to a sleek, fixed top bar to prevent UI overlap on smaller screens.
- **Improved Branding**: Updated the main logo with a vibrant gradient design and animated "capture scanline" artifacts.
- **Scroll-to-History Logic**: The "Recent Captures" button now intelligently hides itself when the history section is already visible on screen.

### Fixed
- **Render Memory Issues**: Optimized backend Puppeteer logic with a persistent browser instance and memory-saving flags to prevent intermittent failures on Render's free tier.
- **Logo Visuals**: Removed a mismatched artifact in the logo corners for a cleaner, symmetrical look.
- **Scaling Behavior**: Fixed annotation scaling to allow free-form resizing (non-proportional) via corner handles.

## [1.1.0] - 2025-12-10

### Added
- **Zoom Control**: Added a zoom slider (25% - 300%) to control the scale of the captured page.
  - Improves readability or captures more content.
  - Uses device scaling for zoom-in (fidelity) and viewport expansion for zoom-out (coverage).
- **Screenshot Color Scheme Control**: New toggle button to capture screenshots in light mode, dark mode, or system default.
  - Three modes: System (default), Light, Dark.
  - Mode preference persists in localStorage.
  - Uses Puppeteer's `emulateMediaFeatures` and aggressive DOM overrides to enforce the scheme.
  - Attempts to auto-click site-specific theme toggles.

### Changed
- **Screenshot color enforcement**: Server now aggressively forces the requested color scheme (emulated media, meta `color-scheme`, class/data-attribute overrides, mutation observer) and attempts to auto-toggle site theme switches before capturing.
- **Textarea shortcuts**: URL input now handles Cmd/Ctrl+A for select-all while preserving Cmd/Ctrl+Enter to capture.
- **Navigation Reliability**: Changed Puppeteer navigation wait condition to `networkidle0` and increased post-load delay to 3s to fix iframe rendering issues (Issue #8).

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

