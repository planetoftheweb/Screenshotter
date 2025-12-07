import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [pageInfo, setPageInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [resolution, setResolution] = useState({ width: 1920, height: 1080, fullPage: false, label: 'HD (1920 x 1080)' });
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  });
  const [history, setHistory] = useState([]);
  const downloadRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const resolutions = [
    { width: 1920, height: 1080, fullPage: false, label: 'HD (1920 x 1080)' },
    { width: 1080, height: 1920, fullPage: false, label: 'Vertical / Story (1080 x 1920)' },
    { width: 1920, height: 1080, fullPage: true, label: 'Full Page (1920 width)' },
  ];

  const captureScreenshot = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setScreenshot(null);
    setPageInfo(null);

    try {
      // Add protocol if missing
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      const response = await fetch('http://localhost:3001/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: targetUrl,
          width: resolution.width,
          height: resolution.height,
          fullPage: resolution.fullPage
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to capture screenshot');
      }

      setScreenshot(data.image);
      const newPageInfo = { title: data.title, hash: data.hash };
      setPageInfo(newPageInfo);
      
      // Add to history
      setHistory(prev => {
        const newItem = {
          id: Date.now(),
          url: targetUrl,
          screenshot: data.image,
          pageInfo: newPageInfo,
          resolution: resolution,
          timestamp: new Date().toLocaleTimeString()
        };
        // Keep last 5 items
        return [newItem, ...prev].slice(0, 5);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadScreenshot = (imgData = screenshot, info = pageInfo) => {
    if (!imgData) return;
    const link = document.createElement('a');
    link.href = imgData;
    
    // Generate a clean, meaningful filename
    let filename = 'screenshot';
    if (info?.title) {
      // Clean the title: remove special chars, collapse dashes, limit length
      filename = info.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')  // Collapse multiple dashes
        .replace(/^-|-$/g, '') // Remove leading/trailing dashes
        .slice(0, 35);
    }
    
    // Add hash section if present
    if (info?.hash) {
      const hashName = info.hash
        .slice(1)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 20);
      if (hashName) {
        filename += `-${hashName}`;
      }
    }
    
    // Final cleanup
    filename = filename.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'screenshot';
    
    link.download = `${filename}.png`;
    link.click();
  };

  const restoreFromHistory = (item) => {
    setScreenshot(item.screenshot);
    setPageInfo(item.pageInfo);
    setUrl(item.url);
    setResolution(item.resolution);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyToClipboard = async () => {
    if (!screenshot) return;
    try {
      const response = await fetch(screenshot);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="app">
      <div className="gradient-bg"></div>
      <div className="noise"></div>

      <main className="container">
        <header className="header">
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="logo">
            <span className="logo-icon">◈</span>
            <h1>Screenshotter</h1>
          </div>
          <p className="tagline">Capture stunning HD screenshots for your articles</p>
        </header>

        <form onSubmit={captureScreenshot} className="capture-form">
          <div className="input-wrapper">
            <span className="input-icon">🔗</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter any URL (e.g., github.com)"
              className="url-input"
              disabled={loading}
            />
          </div>
          
          <div className="controls-wrapper">
            <select 
              value={resolutions.findIndex(r => r.label === resolution.label)} 
              onChange={(e) => setResolution(resolutions[e.target.value])}
              className="resolution-select"
              disabled={loading}
            >
              {resolutions.map((res, index) => (
                <option key={index} value={index}>
                  {res.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="capture-btn" disabled={loading || !url.trim()} aria-label="Capture">
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            )}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <span>⚠️</span> {error}
          </div>
        )}

        {screenshot && (
          <div className="screenshot-result">
            <div className="screenshot-header">
              <h2>Screenshot Ready</h2>
              <span className="dimensions">
                {resolution.fullPage ? 'Full Page' : `${resolution.width} × ${resolution.height}`}
              </span>
            </div>

            <div className="screenshot-preview">
              <img src={screenshot} alt="Screenshot preview" />
              <div className="screenshot-overlay">
                <button onClick={() => downloadScreenshot()} className="action-btn download">
                  <span>⬇</span> Download PNG
                </button>
                <button onClick={copyToClipboard} className="action-btn copy">
                  <span>{copied ? '✓' : '📋'}</span> {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="history-section">
            <div className="history-header">
              <h3>Recent Captures</h3>
              <button onClick={() => setHistory([])} className="clear-history-btn">Clear</button>
            </div>
            <div className="history-grid">
              {history.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-preview" onClick={() => restoreFromHistory(item)}>
                    <img src={item.screenshot} alt={item.pageInfo?.title || 'Screenshot'} />
                    <div className="history-overlay">
                      <span>Restore</span>
                    </div>
                  </div>
                  <div className="history-info">
                    <span className="history-time">{item.timestamp}</span>
                    <span className="history-res">{item.resolution.label.split('(')[0].trim()}</span>
                  </div>
                  <button 
                    onClick={() => downloadScreenshot(item.screenshot, item.pageInfo)} 
                    className="history-download-btn"
                    title="Download"
                  >
                    ⬇
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="footer">
          <p>HD screenshots optimized for web articles • 1920×1080 resolution</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
