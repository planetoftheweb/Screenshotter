# Screenshotter

![Screenshotter Interface](screenshot.png)

A powerful web-based tool for capturing professional screenshots of websites. Built with React 19 and Puppeteer, it features intelligent scrolling to capture specific page sections, automatic popup removal, client-side cropping, and persistent history.

**Live Demo**: [screenshotter.onrender.com](https://screenshotter.onrender.com)

## Features

### 📸 Screenshot Capture
- **Multiple Resolutions**: HD (1920×1080), Vertical/Stories (1080×1920), Full Page capture
- **Custom Sizes**: Define and save your own screenshot dimensions (up to 4K)
- **Batch Processing**: Capture multiple URLs at once (comma or line-separated)
- **Smart Scrolling**: Automatically navigate to URL hashtags and anchors, even on SPAs
- **Color Scheme Control**: Capture screenshots in light mode, dark mode, or system default

### 🧹 Automatic Cleanup
- **Popup Removal**: Blocks cookie banners, newsletter popups, and consent dialogs
- **Request Interception**: Prevents popup scripts from loading (Iubenda, OneTrust, CookieBot, etc.)
- **DOM Cleanup**: Removes fixed overlays and modals before capture

### ✂️ Post-Capture Tools
- **Client-Side Cropping**: Crop any screenshot to focus on a specific area at full resolution
- **Annotation Layer**: Add arrows, boxes, and text using Fabric.js canvas
- **Pure Blur Tool**: Blur sensitive information with adjustable strength
- **Download Options**: Download individual screenshots or batch download all as ZIP
- **Copy to Clipboard**: One-click copy for easy sharing
- **URL Retention**: Copy the original URL back for reference

### ⚡ Screenshot Queueing
- **Queue While Processing**: Submit new URLs while a capture is in progress
- **Visual Status**: See current capture and queued URLs in real-time
- **Queue Badge**: Button shows count of pending screenshots
- **Keyboard Shortcuts**: Ctrl/Cmd+Enter works even during loading

### 💾 Persistence
- **Screenshot History**: Last 10 captures saved in local storage
- **Custom Resolutions**: Your custom sizes are remembered
- **Theme Preference**: Light/dark mode preference persists
- **Screenshot Mode**: Color scheme preference (light/dark/system) is saved
- **Recent URLs**: Quick access to previously captured URLs
- **Admin Key**: Rate limit bypass key persists

### 🎨 Modern UI
- **Light/Dark Mode**: Toggle between themes
- **Instant Tooltips**: Hover over any button for instant help
- **Responsive Design**: Works on desktop and mobile
- **Keyboard Shortcuts**: 
  - ⌘/Ctrl + Enter: Capture screenshot (or add to queue)
  - Ctrl + Shift + A: Set admin key

### 🔐 Admin Mode
- **Rate Limit Bypass**: Admins can bypass all rate limits
- **Visual Indicator**: Green "ADMIN" badge when active
- **Environment Variable**: Set `ADMIN_KEY` on server

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7 |
| Backend | Node.js, Express 5 |
| Automation | Puppeteer, @sparticuz/chromium |
| Libraries | react-image-crop, Fabric.js, jszip, express-rate-limit |
| Deployment | Render |

## Installation

```bash
# Clone the repository
git clone https://github.com/planetoftheweb/Screenshotter.git
cd Screenshotter

# Install dependencies
npm install

# Start development server
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## Usage

### Basic Capture
1. Enter a URL in the input field
2. Select a resolution from the dropdown
3. (Optional) Toggle screenshot color scheme mode (system/light/dark)
4. Press ⌘/Ctrl + Enter or click the capture button

### Screenshot Color Scheme
Click the screenshot mode button in the top-right navigation to cycle through:
- **System**: Uses the website's default color scheme
- **Light**: Forces light mode for screenshot capture
- **Dark**: Forces dark mode for screenshot capture

Your preference is saved and will apply to all future screenshots.

### Batch Capture
Enter multiple URLs separated by commas or newlines:
```
example.com
another-site.com/page
third-site.com/#section
```

### Capture Specific Sections
Use URL hashtags to capture specific page sections:
```
example.com/#pricing
example.com/#features
```

### Cropping
1. Capture a screenshot
2. Click the crop button
3. Drag to select the area you want
4. Click confirm to save the cropped version

### Annotations & Blurring
1. Capture a screenshot
2. Click the annotate button
3. Use the toolbar to add rectangles, arrows, text, or blur regions
4. Drag corners to resize (non-proportional)
5. Click delete to remove selected annotation
6. Adjust blur strength with slider when blur is selected
7. Click save to apply annotations

### Screenshot Queue
1. Start a capture
2. While loading, enter another URL
3. Press Ctrl/Cmd+Enter to add to queue
4. Status bar shows current capture and queued URLs
5. Captures process automatically in order

## Project Structure

```
├── src/
│   ├── App.jsx       # Main React component
│   ├── App.css       # Styling (CSS variables for theming)
│   └── main.jsx      # React entry point
├── server/
│   └── index.js      # Express server + Puppeteer logic
├── render.yaml       # Render deployment config
├── agents.md         # AI agent context
├── CHANGELOG.md      # Version history
└── README.md         # This file
```

## Deployment

### Deploy to Render

1. Fork this repository
2. Create a new Web Service on [Render](https://render.com)
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and configure everything

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `10000` (Render default) |
| `ADMIN_KEY` | Admin key for rate limit bypass | (none) |

## Rate Limits

To prevent abuse, the API has built-in rate limiting with proper IPv6 support:

| Limit | Value |
|-------|-------|
| Requests per minute | 5 per IP |
| Requests per hour | 30 per IP |
| URLs per batch | 5 max |
| Max resolution | 3840×2160 (4K) |

**IPv6 Support**: Rate limiting uses `ipKeyGenerator` from express-rate-limit, which properly handles IPv6 subnet masking to prevent circumvention while maintaining privacy.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/screenshot` | POST | Capture a screenshot |
| `/api/limits` | GET | Get current rate limit configuration |

### POST /api/screenshot

```json
{
  "url": "https://example.com",
  "width": 1920,
  "height": 1080,
  "fullPage": false
}
```

## License

MIT - See [LICENSE](LICENSE) file for details

## Author

Ray Villalobos ([@planetoftheweb](https://github.com/planetoftheweb))
