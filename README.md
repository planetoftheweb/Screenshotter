# Screenshotter

A powerful web-based tool for generating high-definition (1920x1080) screenshots of websites. It features intelligent scrolling capabilities to capture specific sections of a page and generates clean, SEO-friendly filenames.

## Features

- **HD Quality**: Captures screenshots at 1920x1080 resolution, optimized for articles and presentations.
- **Multiple Resolutions**: Support for Vertical (Stories/Reels), Laptop, and Full Page screenshots.
- **Smart Scrolling**: 
  - Supports URL hashtags (e.g., `example.com/#section`).
  - Automatically handles pages where native browser scrolling is broken.
  - Intelligently searches for headlines and text content if ID anchors are missing.
  - Auto-dismisses common popups, cookie banners, and overlays before capturing.
- **Clean Filenames**: Automatically generates readable filenames based on the page title and section header (e.g., `page-title-section-name.png`).
- **Modern Stack**: Built with React 19, Vite, and Puppeteer.

## Tech Stack

- **Frontend**: React, Vite
- **Backend**: Node.js, Express
- **Automation**: Puppeteer (Headless Chrome)
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

Enter a URL in the input field (optionally with a hashtag for a specific section) and click "Capture Screenshot".

## Project Structure

- `src/`: React frontend application.
- `server/`: Express backend with Puppeteer logic.
- `server/index.js`: Core screenshot and scrolling logic.
