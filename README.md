# Screenshotter

![Screenshotter Interface](screenshot.png)

A powerful web-based tool for capturing professional screenshots of websites. It features intelligent scrolling to capture specific sections, automatic popup removal, client-side cropping, and session-based history management.

## Features

- **Multiple Resolutions**: HD (1920×1080), Vertical/Stories (1080×1920), Full Page capture, plus custom user-defined sizes.
- **Smart Scrolling**: 
  - Supports URL hashtags (e.g., `example.com/#section`).
  - Automatically handles pages where native browser scrolling is broken.
  - Intelligently searches for headlines and text content if ID anchors are missing.
- **Automatic Popup Removal**: Blocks and removes cookie banners, newsletter popups, and consent dialogs before capturing.
- **Client-Side Cropping**: Crop any screenshot to focus on a specific area at full resolution.
- **Batch Processing**: Enter multiple URLs (comma or line-separated) to capture them all at once.
- **Screenshot History**: Persists recent captures in local storage with restore, download, and delete options.
- **Custom Resolutions**: Define and save your own screenshot dimensions.
- **Clean Filenames**: Automatically generates readable filenames based on the page title and section header.
- **Light/Dark Mode**: Toggle between themes with preference saved locally.
- **Modern Stack**: Built with React 19, Vite, and Puppeteer.

## Tech Stack

- **Frontend**: React, Vite
- **Backend**: Node.js, Express
- **Automation**: Puppeteer (Headless Chrome)
- **Libraries**: react-image-crop (cropping), jszip (batch downloads)
- **Utilities**: Concurrently (for running both servers)

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Start the development server (runs both frontend and backend):

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

### Keyboard Shortcuts

- **⌘/Ctrl + Enter**: Capture screenshot(s) from the URL input

### Tips

- Enter multiple URLs separated by commas or newlines for batch capture
- Use URL hashtags (e.g., `#section-name`) to capture specific page sections
- Click any history item to restore it to the main view
- Hover over buttons to see tooltips explaining their function

## Project Structure

- `src/`: React frontend application
- `server/`: Express backend with Puppeteer logic
- `server/index.js`: Core screenshot and scrolling logic
- `render.yaml`: Render deployment configuration

## Deployment

This app is deployed on [Render](https://render.com). The `render.yaml` file contains the deployment configuration.

To deploy your own instance:
1. Fork this repository
2. Create a new Web Service on Render
3. Connect your GitHub repo — Render will auto-detect `render.yaml`

### Rate Limits

To prevent abuse, the API has rate limiting:
- **5 requests per minute** per IP
- **30 requests per hour** per IP
- **Max 5 URLs** per batch request
- **Max resolution**: 3840×2160 (4K)
