# Changelog

All notable changes to Screenshotter will be documented in this file.

## [1.2.0] - 2025-12-20

### Added
- **Screenshot Queueing**: Submit new screenshot requests while one is processing.
  - URLs are queued and processed automatically in order.
  - Visual status bar shows current capture and queued URLs.
  - Queue badge on capture button shows total pending count.
  - Ctrl/Cmd+Enter now works while loading to add to queue.

- **Admin Mode**: Bypass rate limits for power users.
  - Set `ADMIN_KEY` environment variable on server.
  - Press `Ctrl+Shift+A` in the app to enter admin key.
  - Green "ADMIN" badge appears in header when active.
  - All rate limits are skipped for admin requests.

- **Capture Status Indicator**: Real-time feedback during captures.
  - Shows "Capturing [URL]..." with animated spinner.
  - Displays queued URLs with count.
  - Purple accent styling for queue information.

- **Annotation Layer**: Add arrows, boxes, and text to screenshots using Fabric.js.
  - Annotations remain editable and deletable.
  - Non-proportional resizing (corners resize freely).
  - Consistent stroke width with `strokeUniform`.

- **Pure Blur Tool**: Blur sensitive information with adjustable strength.
  - Live preview using pattern-based frosted glass effect.
  - Blur strength slider (5-30px) when blur region is selected.
  - Transparent blur (no colored overlay).
  - Blur regions are fully selectable and editable.

### Changed
- Keyboard shortcut (Ctrl/Cmd+Enter) now works during loading to queue additional URLs.
- Enhanced visual feedback with queue badge showing pending count.
- Refactored layout to fixed top navigation bar.
- Animated logo with scan effect and capture corners.
- Memory optimization with persistent browser instance.

## [1.1.0] - 2025-12-10

### Added
- **Zoom Control**: Added a zoom slider (25% - 300%) to control the scale of the captured page.
- **Screenshot Color Scheme Control**: New toggle button to capture screenshots in light mode, dark mode, or system default.

### Changed
- **Screenshot color enforcement**: Server now aggressively forces the requested color scheme.
- **Textarea shortcuts**: URL input now handles Cmd/Ctrl+A for select-all while preserving Cmd/Ctrl+Enter to capture.
- **Navigation Reliability**: Changed Puppeteer navigation wait condition to `networkidle0` and increased post-load delay.

## [1.0.0] - 2025-12-07

### 🎉 Initial Release

#### Features
- **Screenshot Capture**: Multiple preset resolutions, custom sizes, batch processing, full page support
- **Smart Scrolling**: URL hashtag navigation, automatic element detection, SPA-compatible
- **Popup Removal**: Request interception, consent cookies, DOM cleanup
- **Post-Capture Tools**: Client-side cropping, download as PNG, copy to clipboard, batch ZIP download
- **User Interface**: Light/dark mode, instant tooltips, responsive layout
- **Persistence**: Screenshot history, custom resolutions, theme preference, recent URLs
- **Rate Limiting**: 5/min, 30/hour per IP with IPv6 support
- **Deployment**: Render configuration with @sparticuz/chromium

### Tech Stack
- React 19.2, Vite 7.2, Express 5.2, Puppeteer 24.32

---

## Future Roadmap

- [ ] User authentication (API keys)
- [ ] PostgreSQL for user data persistence
- [ ] Redis for distributed rate limiting
- [ ] Scheduled screenshots
- [ ] Webhook notifications
- [ ] PDF export option
- [ ] Screenshot comparison/diff
