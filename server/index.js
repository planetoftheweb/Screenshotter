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

    // PRE-SET CONSENT COOKIES before loading the page
    // This prevents consent popups from ever appearing
    const targetUrl = new URL(url);
    const domain = targetUrl.hostname;
    
    await page.setCookie(
      // Iubenda consent
      { name: '_iub_cs-s85544448', value: '{%22timestamp%22:%222025-01-01T00:00:00.000Z%22%2C%22version%22:%221.0%22%2C%22purposes%22:{%22necessary%22:true%2C%22functionality%22:true%2C%22analytics%22:true%2C%22marketing%22:true}}', domain: domain, path: '/' },
      { name: '_iub_cs-85544448', value: '%7B%22timestamp%22%3A%222025-01-01T00%3A00%3A00.000Z%22%2C%22version%22%3A%221.0%22%2C%22purposes%22%3A%7B%22necessary%22%3Atrue%2C%22functionality%22%3Atrue%2C%22analytics%22%3Atrue%2C%22marketing%22%3Atrue%7D%7D', domain: domain, path: '/' },
      // OneTrust
      { name: 'OptanonAlertBoxClosed', value: '2025-01-01T00:00:00.000Z', domain: domain, path: '/' },
      { name: 'OptanonConsent', value: 'isGpcEnabled=0&datestamp=2025-01-01&version=202301&isIABGlobal=false&hosts=&consentId=consent&interactionCount=1&landingPath=&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1', domain: domain, path: '/' },
      // CookieYes / GDPR Cookie Consent
      { name: 'cookieyes-consent', value: '{%22accept%22:%22yes%22%2C%22consent%22:%22yes%22}', domain: domain, path: '/' },
      // CookieConsent
      { name: 'CookieConsent', value: '{stamp:%27-1%27%2Cnecessary:true%2Cpreferences:true%2Cstatistics:true%2Cmarketing:true%2Cmethod:%27explicit%27%2Cver:1%2Cutc:1700000000000%2Cregion:%27us%27}', domain: domain, path: '/' },
      // Generic GDPR
      { name: 'gdpr_consent', value: 'true', domain: domain, path: '/' },
      { name: 'cookie_consent', value: 'accepted', domain: domain, path: '/' },
      { name: 'cookies_accepted', value: '1', domain: domain, path: '/' },
    );

    // INTERCEPT REQUESTS: Block known popup/consent scripts before they load
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url().toLowerCase();
      
      // List of domains/patterns that typically serve popups, consent banners, etc.
      const blockedPatterns = [
        'iubenda.com',           // Cookie consent (raybo.org uses this)
        'cookielaw.org',         // OneTrust
        'onetrust.com',
        'cookieconsent',
        'cookie-consent',
        'cookiepro.com',
        'trustarc.com',
        'evidon.com',
        'quantcast.com',         // GDPR consent
        'consensu.org',
        'privacy-mgmt',
        'sp-prod.net',           // SourcePoint
        'consentmanager',
        'didomi.io',
        'osano.com',
        'termly.io',
        'cookieyes.com',
        'cookiebot.com',
        'usercentrics',
        'klaro.org',
        'secureprivacy.ai',
        'metomic.io',
        'transcend.io',
        'privacymanager',
        'popup',
        'newsletter-popup',
        'exit-intent',
        'slide-in',
        'optinmonster',          // Lead capture popups
        'sumo.com',
        'sumome.com',
        'privy.com',
        'mailmunch',
        'wisepops',
        'poptin',
        'sleeknote',
        'justuno',
        'unbounce',
        'convertflow',
        'hellobar',
      ];
      
      const shouldBlock = blockedPatterns.some(pattern => url.includes(pattern));
      
      if (shouldBlock) {
        request.abort();
      } else {
        request.continue();
      }
    });

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

    // CLEANUP: Close any popups/modals that might be blocking (Runs for all URLs)
    await page.evaluate(() => {
      // 1. Click "Close" buttons
      const closeSelectors = [
        '[data-ct="dismiss"]', 
        '.frb-close', 
        '.mw-dismissable-notice-close', 
        'button[aria-label="Close"]', 
        'button[aria-label="close"]', 
        'button[aria-label="Dismiss"]',
        '[class*="close-button"]', 
        '[class*="dismiss"]',
        '.modal-close',
        '.popup-close',
        '.iubenda-cs-close-btn' // Iubenda close button
      ];
      const closeBtns = document.querySelectorAll(closeSelectors.join(','));
      closeBtns.forEach(btn => btn.click());
      
      // 2. Click "Accept Cookies" buttons (common blocker)
      const acceptSelectors = [
        '#onetrust-accept-btn-handler',
        '#accept-cookie-notification',
        '.js-accept-cookies',
        '[aria-label="Accept cookies"]',
        '[aria-label="Accept all cookies"]',
        '.iubenda-cs-accept-btn', // Iubenda specific
        '.cc-btn', // CookieConsent
        '.cmp-intro_acceptAll' // Quantcast
      ];
      
      // Click any matching accept buttons
      acceptSelectors.forEach(sel => {
        const btn = document.querySelector(sel);
        if (btn) btn.click();
      });
      
      // Try to find buttons with "Accept" text if selector fails
      const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const acceptBtn = buttons.find(b => {
        const t = b.textContent.toLowerCase().trim();
        return t === 'accept' || t === 'accept all' || t === 'accept cookies' || t === 'i agree' || t === 'got it' || t === 'ok';
      });
      if (acceptBtn) acceptBtn.click();
      
      // 3. Remove fixed position elements that might interfere (Sticky headers/footers/banners)
      const fixedElements = document.querySelectorAll('.fundraiser-banner, #centralNotice, .frb-banner, [class*="cookie-banner"], [class*="popup"], [class*="newsletter-modal"], [id*="newsletter"], .iubenda-cs-banner, [role="alertdialog"], .iubenda-cs-container');
      fixedElements.forEach(el => el.remove());
      
      // 4. Aggressive Popup Killer
      // Remove generic Bootstrap modal elements
      document.querySelectorAll('.modal-backdrop, .modal, .fade.show').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = 'auto'; // Restore scrolling if blocked

      // Remove any fixed/absolute positioned elements with high z-index that are likely popups
      // Excluding common navs/headers (usually at top with small height)
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
          const zIndex = parseInt(style.zIndex);
          if (!isNaN(zIndex) && zIndex > 50) {
            const rect = el.getBoundingClientRect();
            // If it covers a significant portion of the screen (likely a full page overlay)
            if (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.9) {
              el.remove();
              return;
            }
            // If it's a bottom bar (likely cookie/newsletter)
            if (rect.bottom >= window.innerHeight - 10 && rect.height < 300) {
              el.remove();
              return;
            }
            // If it's centered (likely a modal)
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            
            // Check if center is close to screen center
            if (Math.abs(centerX - screenCenterX) < 100 && Math.abs(centerY - screenCenterY) < 100) {
              // But protect the nav (usually top 0)
              if (rect.top > 50) {
                 el.remove();
              }
            }
          }
        }
      });
      
      // Remove any element with role="alertdialog" (like Iubenda's consent notice)
      document.querySelectorAll('[role="alertdialog"]').forEach(el => el.remove());
    });

    // Wait for popups to be dismissed/removed
    await new Promise((resolve) => setTimeout(resolve, 500));

    // If there's a hash, scroll to that element
    if (hash) {
      const elementId = hash.slice(1); // Remove the # symbol
      
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

