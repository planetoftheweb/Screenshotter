import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/screenshot', async (req, res) => {
  const { url, width = 1920, height = 1080, fullPage = false } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser;
  try {
    // Validate URL
    new URL(url);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: parseInt(width),
      height: parseInt(height),
      deviceScaleFactor: 1,
    });

    // Parse URL to check for hash/anchor
    const parsedUrl = new URL(url);
    const hash = parsedUrl.hash;

    // Navigate to the URL with a timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait a bit for any animations/lazy loading
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // If there's a hash, scroll to that element
    if (hash) {
      const elementId = hash.slice(1); // Remove the # symbol
      
      // First, try to close any popups/modals that might be blocking
      await page.evaluate(() => {
        // Close common popup/banner patterns
        const closeBtns = document.querySelectorAll('[data-ct="dismiss"], .frb-close, .mw-dismissable-notice-close, button[aria-label="Close"], [class*="close-button"], [class*="dismiss"]');
        closeBtns.forEach(btn => btn.click());
        
        // Remove fixed position elements that might interfere
        const fixedElements = document.querySelectorAll('.fundraiser-banner, #centralNotice, .frb-banner, [class*="cookie-banner"], [class*="popup"]');
        fixedElements.forEach(el => el.remove());
      });
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Try using the browser's native hash navigation
      await page.evaluate((hash) => {
        window.location.hash = '';
        window.location.hash = hash;
      }, hash);
      
      // Wait longer for SPA navigation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Fallback: manually find and scroll to the element
      const scrolled = await page.evaluate((id) => {
        const decodedId = decodeURIComponent(id);
        
        // Convert hash to search phrase (e.g., "cost-to-run" -> "cost to run")
        const searchPhrase = decodedId.replace(/-/g, ' ').toLowerCase().trim();
        // Extract key words (filter out common short words)
        const keyWords = searchPhrase.split(' ').filter(w => w.length > 2);
        
        // Build a list of selectors to try (order matters - most specific first)
        const selectors = [
          `#${CSS.escape(id)}`,
          `#${CSS.escape(decodedId)}`,
          `[id="${id}"]`,
          `[id="${decodedId}"]`,
          `[name="${id}"]`,
          `[name="${decodedId}"]`,
          `[data-anchor="${id}"]`,
          `[data-id="${id}"]`,
          `[data-section="${id}"]`,
          `a[href="#${id}"]`,
          `a[name="${id}"]`,
        ];
        
        let element = null;
        for (const selector of selectors) {
          try {
            element = document.querySelector(selector);
            if (element) break;
          } catch (e) {
            // Invalid selector, continue
          }
        }
        
        // If not found, search by text content in headings
        if (!element) {
          const headingSelectors = 'h1, h2, h3, h4, h5, h6, [role="heading"], [class*="heading"], [class*="title"], [class*="section-title"], [class*="chart-title"]';
          const headings = document.querySelectorAll(headingSelectors);
          
          // First try exact phrase match
          for (const heading of headings) {
            const text = heading.textContent.toLowerCase().trim();
            if (text.includes(searchPhrase)) {
              element = heading;
              break;
            }
          }
          
          // Then try matching key words (at least 3 words must match)
          if (!element && keyWords.length >= 2) {
            for (const heading of headings) {
              const text = heading.textContent.toLowerCase();
              const matchCount = keyWords.filter(w => text.includes(w)).length;
              if (matchCount >= Math.min(3, keyWords.length)) {
                element = heading;
                break;
              }
            }
          }
        }
        
        // Search all text elements for the phrase
        if (!element) {
          const textElements = document.querySelectorAll('p, span, div, section, article, td, th, li, dt, dd, figcaption, label');
          for (const el of textElements) {
            // Only check direct text content to avoid matching parent containers
            const directText = Array.from(el.childNodes)
              .filter(n => n.nodeType === Node.TEXT_NODE)
              .map(n => n.textContent.toLowerCase())
              .join(' ');
            
            if (directText.includes(searchPhrase) || 
                (keyWords.length >= 2 && keyWords.filter(w => directText.includes(w)).length >= Math.min(3, keyWords.length))) {
              element = el;
              break;
            }
          }
        }
        
        // Try finding any element with text that starts with key words
        if (!element && keyWords.length > 0) {
          const firstKeyWords = keyWords.slice(0, 3).join(' ');
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
          while (walker.nextNode()) {
            const text = walker.currentNode.textContent.toLowerCase().trim();
            if (text.startsWith(firstKeyWords) || text.includes(searchPhrase)) {
              element = walker.currentNode.parentElement;
              break;
            }
          }
        }
        
        // Also try finding by ID that contains the search term
        if (!element) {
          const allElements = document.querySelectorAll('[id]');
          for (const el of allElements) {
            if (el.id.toLowerCase().includes(id.toLowerCase().slice(0, 15))) {
              element = el;
              break;
            }
          }
        }
        
        if (element) {
          const rect = element.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          // Scroll with some offset from top for better framing
          window.scrollTo({
            top: scrollTop + rect.top - 50,
            behavior: 'instant'
          });
          return { found: true, text: element.textContent?.slice(0, 50) };
        }
        return { found: false };
      }, elementId);
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      if (scrolled.found) {
        console.log(`✓ Scrolled to element for #${elementId}: "${scrolled.text}"`);
      } else {
        console.log(`⚠ Warning: Could not find anchor element for #${elementId}`);
      }
    }

    // Get page title for better naming (before closing browser)
    const pageTitle = await page.title();

    // Take screenshot
    const screenshotOptions = {
      type: 'png',
      fullPage: fullPage
    };

    if (!fullPage) {
      screenshotOptions.clip = {
        x: 0,
        y: 0,
        width: parseInt(width),
        height: parseInt(height),
      };
    }

    const screenshot = await page.screenshot(screenshotOptions);

    await browser.close();

    // Send the screenshot as base64
    const base64Image = screenshot.toString('base64');
    res.json({
      success: true,
      image: `data:image/png;base64,${base64Image}`,
      width: width,
      height: height,
      title: pageTitle,
      hash: hash || null,
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Screenshot error:', error);
    res.status(500).json({
      error: error.message || 'Failed to capture screenshot',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Screenshot server running on http://localhost:${PORT}`);
});

