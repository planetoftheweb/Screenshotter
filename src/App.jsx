import { useState, useRef, useEffect, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import JSZip from 'jszip';
import * as fabric from 'fabric';
import 'react-image-crop/dist/ReactCrop.css';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [pageInfo, setPageInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState([]);
  const [captureStatus, setCaptureStatus] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [resolution, setResolution] = useState({ width: 1920, height: 1080, fullPage: false, label: 'HD • 1920×1080' });
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  });
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('screenshotter-admin-key') || '');
  const [screenshotMode, setScreenshotMode] = useState(() => {
    const savedMode = localStorage.getItem('screenshotMode');
    return savedMode === 'light' || savedMode === 'dark' ? savedMode : 'light';
  });
  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem('history');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [recentUrls, setRecentUrls] = useState(() => {
    const saved = localStorage.getItem('recentUrls');
    return saved ? JSON.parse(saved) : [];
  });
  const [customResolutions, setCustomResolutions] = useState(() => {
    const saved = localStorage.getItem('customResolutions');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [newCustomRes, setNewCustomRes] = useState({ width: '', height: '', label: '' });
  const [editingResolution, setEditingResolution] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [crop, setCrop] = useState();
  const [showHelp, setShowHelp] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [showResDropdown, setShowResDropdown] = useState(false);
  const [blurStrength, setBlurStrength] = useState(10);
  const [hasBlurSelected, setHasBlurSelected] = useState(false);
  const [blurredBase64, setBlurredBase64] = useState(null);
  const imgRef = useRef(null);
  const downloadRef = useRef(null);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  const historySectionRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const canvasRef = useRef(null);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(56, textarea.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [url]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowResDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHistoryVisible(entry.isIntersecting);
      },
      { 
        threshold: 0.1,
        rootMargin: '0px'
      }
    );

    if (historySectionRef.current) {
      observer.observe(historySectionRef.current);
    }

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [history.length]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Admin key shortcut (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        const key = prompt('Enter admin key (leave empty to remove):');
        if (key !== null) {
          if (key.trim()) {
            localStorage.setItem('screenshotter-admin-key', key.trim());
            setAdminKey(key.trim());
          } else {
            localStorage.removeItem('screenshotter-admin-key');
            setAdminKey('');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('screenshotMode', screenshotMode);
  }, [screenshotMode]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleScreenshotMode = () => {
    setScreenshotMode(prev => {
      return prev === 'light' ? 'dark' : 'light';
    });
  };

  const getScreenshotModeTooltip = () => {
    return screenshotMode === 'light' ? 'Screenshot Mode: Light Mode' : 'Screenshot Mode: Dark Mode';
  };

  useEffect(() => {
    localStorage.setItem('customResolutions', JSON.stringify(customResolutions));
  }, [customResolutions]);

  const defaultResolutions = [
    { width: 1920, height: 1080, fullPage: false, label: 'HD' },
    { width: 1080, height: 1920, fullPage: false, label: 'Vertical' },
    { width: 1920, height: 1080, fullPage: true, label: 'Full Page' },
  ];

  const resolutions = [...defaultResolutions, ...customResolutions];

  const addCustomResolution = (e) => {
    e.preventDefault();
    
    // Use defaults if not provided
    const width = parseInt(newCustomRes.width) || 1920;
    const height = parseInt(newCustomRes.height) || 1080;
    const label = newCustomRes.label || `Custom • ${width}×${height}`;

    if (editingResolution) {
      // Update existing resolution
      setCustomResolutions(prev => prev.map(r => 
        r.id === editingResolution.id 
          ? { ...r, width, height, label }
          : r
      ));
      // Update current selection if it was the edited one
      if (resolution.id === editingResolution.id) {
        setResolution({ ...resolution, width, height, label });
      }
      setEditingResolution(null);
    } else {
      // Add new resolution
      const newRes = { width, height, fullPage: false, label, isCustom: true, id: Date.now() };
      setCustomResolutions(prev => [...prev, newRes]);
      setResolution(newRes);
    }
    
    setNewCustomRes({ width: '', height: '', label: '' });
    setShowCustomModal(false);
  };

  const startEditResolution = (res, e) => {
    e.stopPropagation();
    setEditingResolution(res);
    setNewCustomRes({ width: res.width.toString(), height: res.height.toString(), label: res.label });
    setShowCustomModal(true);
  };

  const handleResolutionChange = (e) => {
    const value = e.target.value;
    if (value === 'add-custom') {
      setEditingResolution(null);
      setNewCustomRes({ width: '', height: '', label: '' });
      setShowCustomModal(true);
    } else {
      setResolution(resolutions[parseInt(value)]);
    }
  };

  const selectResolution = (res) => {
    setResolution(res);
    setShowResDropdown(false);
  };

  const openAddCustom = () => {
    setEditingResolution(null);
    setNewCustomRes({ width: '', height: '', label: '' });
    setShowCustomModal(true);
    setShowResDropdown(false);
  };

  const getResolutionIcon = (res) => {
    if (res.fullPage) {
      // Full page - document icon
      return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>;
    }
    if (res.height > res.width) {
      // Vertical - phone icon
      return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>;
    }
    if (res.isCustom) {
      // Custom - sliders icon
      return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>;
    }
    // HD/Landscape - monitor icon
    return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;
  };

  const getResolutionDescription = (res) => {
    if (res.fullPage) return 'Capture entire scrollable page';
    if (res.height > res.width) return `Perfect for mobile & stories • ${res.width}×${res.height}`;
    if (res.width === 1920 && res.height === 1080 && !res.isCustom) return `Standard HD resolution • ${res.width}×${res.height}`;
    return `${res.width}×${res.height} pixels`;
  };

  const deleteCustomResolution = (id, e) => {
    e.stopPropagation();
    setCustomResolutions(prev => prev.filter(r => r.id !== id));
    // If current resolution is the deleted one, revert to default
    if (resolution.id === id) {
      setResolution(defaultResolutions[0]);
    }
  };

  const MAX_RECENT_URLS = 10;

  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('recentUrls', JSON.stringify(recentUrls));
  }, [recentUrls]);

  const MAX_URLS_PER_BATCH = 5;

  const captureScreenshot = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Split input by newlines or commas
    let targets = url.split(/[\n,]+/).map(u => u.trim()).filter(u => u);
    
    if (targets.length === 0) return;

    // Limit batch size
    if (targets.length > MAX_URLS_PER_BATCH) {
      setError(`Maximum ${MAX_URLS_PER_BATCH} URLs per batch. Processing first ${MAX_URLS_PER_BATCH} only.`);
      targets = targets.slice(0, MAX_URLS_PER_BATCH);
    }

    // If already loading, add to queue instead
    if (loading) {
      setQueue(prev => [...prev, ...targets.map(t => ({ url: t, resolution: { ...resolution }, screenshotMode }))]);
      setUrl('');
      return;
    }

    setLoading(true);
    if (targets.length <= MAX_URLS_PER_BATCH) setError(null);
    setScreenshot(null);
    setPageInfo(null);

    let successCount = 0;
    
    for (const targetUrlRaw of targets) {
      // Update status for current URL
      setCaptureStatus(`Capturing ${targetUrlRaw}...`);
      try {
        // Add protocol if missing
        let targetUrl = targetUrlRaw;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = 'https://' + targetUrl;
        }

        const response = await fetch('/api/screenshot', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(adminKey && { 'x-admin-key': adminKey })
          },
          body: JSON.stringify({ 
            url: targetUrl,
            width: resolution.width,
            height: resolution.height,
            fullPage: resolution.fullPage,
            colorScheme: screenshotMode
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle rate limiting specifically
          if (response.status === 429) {
            const retryAfter = data.retryAfter || 60;
            setError(`Rate limit reached. Please wait ${retryAfter < 60 ? retryAfter + ' seconds' : Math.ceil(retryAfter / 60) + ' minute(s)'} before trying again.`);
            setLoading(false);
            return; // Stop processing on rate limit
          }
          console.error(`Failed to capture ${targetUrl}:`, data.error);
          continue; // Skip to next URL
        }

        // Only set the main screenshot if it's the last one or the only one
        setScreenshot(data.image);
        const newPageInfo = { title: data.title, hash: data.hash };
        setPageInfo(newPageInfo);
        
        // Add to history
        setHistory(prev => {
          const newItem = {
            id: Date.now() + Math.random(), // Ensure unique ID for rapid batch
            url: targetUrl,
            screenshot: data.image,
            pageInfo: newPageInfo,
            resolution: resolution,
            timestamp: new Date().toLocaleTimeString()
          };
          return [newItem, ...prev].slice(0, 10); // Increased limit for batching
        });

        // Update recent URLs
        setRecentUrls(prev => {
          const newUrls = [targetUrl, ...prev.filter(u => u !== targetUrl)].slice(0, MAX_RECENT_URLS);
          return newUrls;
        });

        successCount++;
        
      } catch (err) {
        console.error(`Error processing ${targetUrlRaw}:`, err);
      }
    }

    if (successCount === 0) {
      setError('Failed to capture screenshots. Check console for details.');
    } else if (successCount < targets.length) {
      setError(`Captured ${successCount} of ${targets.length} screenshots.`);
    }

    setCaptureStatus('');
    setLoading(false);
  };

  // Process queued URLs after current batch completes
  useEffect(() => {
    if (!loading && queue.length > 0) {
      const processQueue = async () => {
        const nextItem = queue[0];
        setQueue(prev => prev.slice(1));
        
        // Process the queued item
        setLoading(true);
        setError(null);
        
        try {
          let targetUrl = nextItem.url;
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
          }
          
          setCaptureStatus(`Capturing ${targetUrl}...`);

          const response = await fetch('/api/screenshot', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(adminKey && { 'x-admin-key': adminKey })
            },
            body: JSON.stringify({ 
              url: targetUrl,
              width: nextItem.resolution.width,
              height: nextItem.resolution.height,
              fullPage: nextItem.resolution.fullPage,
              colorScheme: nextItem.screenshotMode
            }),
          });

          const data = await response.json();

          if (response.ok) {
            setScreenshot(data.image);
            const newPageInfo = { title: data.title, hash: data.hash };
            setPageInfo(newPageInfo);
            
            setHistory(prev => {
              const newItem = {
                id: Date.now(),
                url: targetUrl,
                screenshot: data.image,
                pageInfo: newPageInfo,
                resolution: nextItem.resolution,
                timestamp: new Date().toLocaleTimeString()
              };
              return [newItem, ...prev].slice(0, 10);
            });

            setRecentUrls(prev => {
              const newUrls = [targetUrl, ...prev.filter(u => u !== targetUrl)].slice(0, MAX_RECENT_URLS);
              return newUrls;
            });
          } else if (response.status === 429) {
            const retryAfter = data.retryAfter || 60;
            setError(`Rate limit reached. Please wait ${retryAfter < 60 ? retryAfter + ' seconds' : Math.ceil(retryAfter / 60) + ' minute(s)'} before trying again.`);
            // Re-queue the failed item
            setQueue(prev => [nextItem, ...prev]);
          } else {
            setError(`Failed to capture ${targetUrl}: ${data.error}`);
          }
        } catch (err) {
          console.error('Queue processing error:', err);
          setError('Failed to process queued screenshot.');
        }
        
        setCaptureStatus('');
        setLoading(false);
      };
      
      processQueue();
    }
  }, [loading, queue]);

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

  const deleteFromHistory = (id, e) => {
    e.stopPropagation(); // Prevent triggering restore
    
    // Check if the deleted item is currently displayed
    const itemToDelete = history.find(item => item.id === id);
    if (itemToDelete && itemToDelete.screenshot === screenshot) {
      setScreenshot(null);
      setPageInfo(null);
      setIsCropping(false);
    }
    
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const downloadAllHistory = async () => {
    if (history.length === 0) return;
    
    const zip = new JSZip();
    const nameCounts = {};
    
    history.forEach((item) => {
      const imgData = item.screenshot.split(',')[1];
      
      let baseName = 'screenshot';
      if (item.pageInfo?.title) {
        baseName = item.pageInfo.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
      }
      // If empty after cleaning
      if (!baseName) baseName = 'screenshot';

      let filename = baseName;
      if (nameCounts[baseName]) {
        filename = `${baseName}-${nameCounts[baseName]}`;
        nameCounts[baseName]++;
      } else {
        nameCounts[baseName] = 1;
      }
      
      zip.file(`${filename}.png`, imgData, { base64: true });
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'screenshots.zip';
    link.click();
  };

  const restoreFromHistory = (item) => {
    setScreenshot(item.screenshot);
    setPageInfo(item.pageInfo);
    setUrl(item.url);
    setResolution(item.resolution);
    setIsCropping(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToHistory = () => {
    const historySection = document.getElementById('recent-captures');
    if (historySection) {
      historySection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  function onImageLoad(e) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        16 / 9,
        width,
        height
      ),
      width,
      height
    )
    setCrop(crop)
  }

  const performCrop = async () => {
    if (!imgRef.current || !crop) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Set canvas size to the cropped area size
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the cropped image
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    // Get the new image as base64
    const croppedBase64 = canvas.toDataURL('image/png');
    
    // Update state
    setScreenshot(croppedBase64);
    setIsCropping(false);
    
    // Add to history
    setHistory(prev => {
      const newItem = {
        id: Date.now(),
        url: url,
        screenshot: croppedBase64,
        pageInfo: pageInfo,
        resolution: { ...resolution, label: 'Cropped' },
        timestamp: new Date().toLocaleTimeString()
      };
      return [newItem, ...prev].slice(0, 5);
    });
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

  const copyUrlToClipboard = async (urlToCopy) => {
    try {
      await navigator.clipboard.writeText(urlToCopy || url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // ===================
  // ANNOTATION LOGIC
  // ===================
  
  const initFabric = useCallback(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: imgRef.current.clientWidth,
      height: imgRef.current.clientHeight,
      selection: true,
      uniformScaling: false,
    });

    // Track blur object selection for slider visibility
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      if (obj?.isBlur) {
        setHasBlurSelected(true);
        setBlurStrength(obj.blurLevel || 10);
      } else {
        setHasBlurSelected(false);
      }
    });
    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      if (obj?.isBlur) {
        setHasBlurSelected(true);
        setBlurStrength(obj.blurLevel || 10);
      } else {
        setHasBlurSelected(false);
      }
    });
    canvas.on('selection:cleared', () => {
      setHasBlurSelected(false);
    });

    fabricCanvasRef.current = canvas;
  }, []);

  useEffect(() => {
    if (isAnnotating && !fabricCanvasRef.current && imgRef.current) {
      initFabric();
    }
    
    return () => {
      if (!isAnnotating && fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [isAnnotating, initFabric]);

  // Generate blurred version of screenshot for live preview
  useEffect(() => {
    if (!screenshot || !isAnnotating) {
      setBlurredBase64(null);
      return;
    }
    
    const generateBlurredVersion = async () => {
      const img = new Image();
      img.src = screenshot;
      await new Promise(resolve => img.onload = resolve);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.filter = `blur(${blurStrength}px)`;
      ctx.drawImage(img, 0, 0);
      setBlurredBase64(canvas.toDataURL('image/png'));
    };
    
    generateBlurredVersion();
  }, [screenshot, isAnnotating, blurStrength]);

  // Update blur strength on selected blur object
  useEffect(() => {
    if (!fabricCanvasRef.current || !hasBlurSelected) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (activeObj?.isBlur) {
      activeObj.blurLevel = blurStrength;
      fabricCanvasRef.current.renderAll();
    }
  }, [blurStrength, hasBlurSelected]);

  const addRect = () => {
    if (!fabricCanvasRef.current) return;
    const rect = new fabric.Rect({
      left: 50,
      top: 50,
      fill: 'transparent',
      stroke: '#ff0000',
      strokeWidth: 4,
      strokeUniform: true,
      width: 100,
      height: 100,
      cornerColor: 'white',
      cornerStrokeColor: '#ff0000',
      transparentCorners: false,
      cornerStyle: 'circle',
    });
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
  };

  const addArrow = () => {
    if (!fabricCanvasRef.current) return;
    
    // Simple arrow implementation using a Path
    const path = new fabric.Path('M 0 0 L 50 0 M 50 0 L 40 -10 M 50 0 L 40 10', {
      left: 100,
      top: 100,
      stroke: '#ff0000',
      strokeWidth: 4,
      strokeUniform: true,
      fill: 'transparent',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      scaleX: 2,
      scaleY: 2,
    });
    
    fabricCanvasRef.current.add(path);
    fabricCanvasRef.current.setActiveObject(path);
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.IText('Double click to edit', {
      left: 100,
      top: 150,
      fontFamily: 'Outfit',
      fontSize: 24,
      fill: '#ff0000',
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
  };

  const addRedact = () => {
    if (!fabricCanvasRef.current) return;
    const rect = new fabric.Rect({
      left: 150,
      top: 150,
      fill: '#000000',
      width: 150,
      height: 50,
      cornerColor: 'white',
      cornerStrokeColor: '#000000',
      transparentCorners: false,
      cornerStyle: 'circle',
    });
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
  };

  const addBlur = () => {
    if (!fabricCanvasRef.current || !blurredBase64) return;
    
    // Create blur box with frosted glass effect using blurred image pattern
    const img = new Image();
    img.src = blurredBase64;
    img.onload = () => {
      const pattern = new fabric.Pattern({
        source: img,
        repeat: 'no-repeat',
      });
      
      const rect = new fabric.Rect({
        left: 100,
        top: 100,
        width: 200,
        height: 80,
        fill: pattern,
        stroke: 'rgba(255, 255, 255, 0.5)',
        strokeWidth: 2,
        strokeUniform: true,
        cornerColor: 'white',
        cornerStrokeColor: '#6366f1',
        transparentCorners: false,
        cornerStyle: 'circle',
        isBlur: true,
        blurLevel: blurStrength,
        // Ensure object is selectable
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockUniScaling: false,
        objectCaching: false,
        // Add a very light background for hit detection
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
      });
      
      // Align pattern with image position
      const alignPattern = () => {
        if (rect.fill && rect.fill.offsetX !== undefined) {
          rect.fill.offsetX = -rect.left;
          rect.fill.offsetY = -rect.top;
        }
      };
      
      rect.on('moving', alignPattern);
      rect.on('scaling', () => {
        alignPattern();
      });
      rect.on('modified', alignPattern);
      
      alignPattern();
      fabricCanvasRef.current.add(rect);
      fabricCanvasRef.current.setActiveObject(rect);
      fabricCanvasRef.current.renderAll();
    };
  };

  const deleteSelected = () => {
    if (!fabricCanvasRef.current) return;
    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    fabricCanvasRef.current.remove(...activeObjects);
    fabricCanvasRef.current.discardActiveObject();
    fabricCanvasRef.current.renderAll();
  };

  const saveAnnotations = async () => {
    if (!fabricCanvasRef.current || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const image = imgRef.current;
    
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // 1. Draw original image
    ctx.drawImage(image, 0, 0);

    // 2. Apply blur regions first (before other annotations)
    const objects = fabricCanvasRef.current.getObjects();
    for (const obj of objects) {
      if (obj.isBlur) {
        const blurAmount = (obj.blurLevel || 10) * scaleX;
        const x = obj.left * scaleX;
        const y = obj.top * scaleY;
        const w = obj.width * obj.scaleX * scaleX;
        const h = obj.height * obj.scaleY * scaleY;
        
        // Save context, clip to blur region, apply blur, draw image
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.filter = `blur(${blurAmount}px)`;
        ctx.drawImage(image, 0, 0);
        ctx.restore();
        
        // Hide blur objects so they don't render in annotation overlay
        obj.visible = false;
      }
    }

    // 3. Draw non-blur annotations
    const dataUrl = fabricCanvasRef.current.toDataURL({
      format: 'png',
      multiplier: scaleX,
    });

    const annotationImage = new Image();
    annotationImage.src = dataUrl;
    await new Promise(resolve => annotationImage.onload = resolve);
    
    ctx.drawImage(annotationImage, 0, 0);
    
    // Restore blur object visibility
    for (const obj of objects) {
      if (obj.isBlur) obj.visible = true;
    }

    const finalImage = canvas.toDataURL('image/png');
    setScreenshot(finalImage);
    setIsAnnotating(false);
    
    // Add to history
    setHistory(prev => {
      const newItem = {
        id: Date.now(),
        url: url,
        screenshot: finalImage,
        pageInfo: pageInfo,
        resolution: { ...resolution, label: 'Annotated' },
        timestamp: new Date().toLocaleTimeString()
      };
      return [newItem, ...prev].slice(0, 5);
    });
  };

  return (
    <div className="app">
      <div className="gradient-bg"></div>
      <div className="noise"></div>

      <header className="top-bar">
        <div className="top-bar-container">
          <div className="logo" onClick={scrollToTop} style={{ cursor: 'pointer' }}>
            <svg className="logo-icon-svg" width="32" height="32" viewBox="0 0 3600 3600" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="50%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#db2777" />
                </linearGradient>
                <linearGradient id="logo-gradient-2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="logo-glow">
                  <feGaussianBlur stdDeviation="80" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path 
                d="m3298.1 327.38h-2996.2c-166.36 0-301.92 135.56-301.92 302.06v2341.3c0 166.5 135.56 301.92 301.92 301.92h2996c166.5 0 302.06-135.56 302.06-302.06v-2341.1c0-166.5-135.56-302.06-301.92-302.06z" 
                fill="url(#logo-gradient-1)" 
              />
              {/* Capture Corners */}
              <g stroke="white" strokeWidth="120" strokeLinecap="round" opacity="0.9">
                <path d="M600 800h-200v200" fill="none" />
                <path d="M3000 800h200v200" fill="none" />
                <path d="M600 2800h-200v-200" fill="none" />
                <path d="M3000 2800h200v-200" fill="none" />
              </g>
              {/* Selection Line */}
              <rect x="800" y="1000" width="2000" height="1600" fill="none" stroke="white" strokeWidth="60" strokeDasharray="160,160" opacity="0.6" />
              {/* Scanline */}
              <rect className="logo-scanline" x="300" y="327" width="3000" height="150" fill="white" opacity="0.4" filter="url(#logo-glow)" />
              <path 
                d="m1800 1200c-331.37 0-600 268.63-600 600s268.63 600 600 600 600-268.63 600-600-268.63-600-600-600zm0 1000c-220.91 0-400-179.09-400-400s179.09-400 400-400 400 179.09 400 400-179.09 400-400 400z" 
                fill="url(#logo-gradient-2)" 
              />
            </svg>
            <h1 className="logo-text">Screenshotter</h1>
          </div>

          <div className="top-nav">
            <a 
              href="https://github.com/planetoftheweb/Screenshotter" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="action-btn" 
              title="GitHub Repository"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
            <button onClick={() => setShowHelp(true)} className="action-btn" title="Help & Tutorial">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </button>
            {adminKey && (
              <span className="admin-badge" title="Admin Mode Active (Ctrl+Shift+A to toggle)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                ADMIN
              </span>
            )}
            <button onClick={toggleTheme} className="theme-toggle action-btn" title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            {showScrollTop && (
              <button onClick={scrollToTop} className="action-btn" title="Scroll to Top">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </button>
            )}
            {history.length > 0 && !historyVisible && (
              <button onClick={scrollToHistory} className="action-btn" title="Scroll to Recent Captures">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container" id="top">
        <div className="hero-section">
          <p className="tagline">Capture, Crop, and Organize Professional Screenshots for Your Content</p>
        </div>

        {showHelp && (
          <div className="help-overlay" onClick={() => setShowHelp(false)}>
            <div className="help-modal" onClick={e => e.stopPropagation()}>
              <button className="close-help-btn" onClick={() => setShowHelp(false)}>×</button>
              <h2>How to Use Screenshotter</h2>
              <div className="help-content">
                <div className="help-step">
                  <div className="step-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  </div>
                  <div>
                    <h3>Enter URLs</h3>
                    <p>Paste one or more URLs (one per line) into the input box. Add hashtags (e.g., #pricing) to target specific sections.</p>
                  </div>
                </div>
                <div className="help-step">
                  <div className="step-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </div>
                  <div>
                    <h3>Capture</h3>
                    <p>Click the capture button. We'll handle scrolling, popups, and waiting for content to load.</p>
                  </div>
                </div>
                <div className="help-step">
                  <div className="step-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></svg>
                  </div>
                  <div>
                    <h3>Refine</h3>
                    <p>Use the crop tool to zoom in on details. Your original screenshot is saved in history.</p>
                  </div>
                </div>
                <div className="help-step">
                  <div className="step-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  </div>
                  <div>
                    <h3>Download</h3>
                    <p>Download individual images or grab everything as a ZIP file from the history section.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCustomModal && (
          <div className="help-overlay" onClick={() => { setShowCustomModal(false); setEditingResolution(null); setNewCustomRes({ width: '', height: '', label: '' }); }}>
            <div className="help-modal custom-res-modal" onClick={e => e.stopPropagation()}>
              <button className="close-help-btn" onClick={() => { setShowCustomModal(false); setEditingResolution(null); setNewCustomRes({ width: '', height: '', label: '' }); }}>×</button>
              <h2>{editingResolution ? 'Edit Custom Size' : 'Add Custom Size'}</h2>
              
              <form onSubmit={addCustomResolution} className="custom-res-form">
                <div className="res-inputs">
                  <div className="input-group">
                    <label>Width (px)</label>
                    <input 
                      type="number" 
                      value={newCustomRes.width}
                      onChange={(e) => setNewCustomRes({...newCustomRes, width: e.target.value})}
                      placeholder="1920"
                      min="100"
                      max="7680"
                    />
                  </div>
                  <div className="input-group">
                    <label>Height (px)</label>
                    <input 
                      type="number" 
                      value={newCustomRes.height}
                      onChange={(e) => setNewCustomRes({...newCustomRes, height: e.target.value})}
                      placeholder="1080"
                      min="100"
                      max="7680"
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Label</label>
                  <input 
                    type="text" 
                    value={newCustomRes.label}
                    onChange={(e) => setNewCustomRes({...newCustomRes, label: e.target.value})}
                    placeholder="My Custom Size"
                  />
                </div>
                <button type="submit" className="action-btn download full-width">
                  {editingResolution ? 'Save Changes' : 'Add Size'}
                </button>
              </form>

              {customResolutions.length > 0 && (
                <div className="custom-res-list">
                  <h3>Saved Sizes</h3>
                  {customResolutions.map(res => (
                    <div key={res.id} className="custom-res-item">
                      <span>{res.label}</span>
                      <div className="custom-res-actions">
                        <button 
                          onClick={(e) => startEditResolution(res, e)}
                          className="edit-item-btn"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button 
                          onClick={(e) => deleteCustomResolution(res.id, e)}
                          className="delete-item-btn static"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={captureScreenshot} className="capture-form">
          <div className="input-wrapper">
            <span className="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </span>
            <textarea
              ref={textareaRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                const isMod = e.metaKey || e.ctrlKey;
                if (isMod && e.key.toLowerCase() === 'a') {
                  e.preventDefault();
                  e.target.select();
                  return;
                }
                if (e.key === 'Enter' && isMod && url.trim()) {
                  e.preventDefault();
                  captureScreenshot(e);
                }
              }}
              placeholder="Enter URLs • ⌘/Ctrl+Enter to capture"
              className="url-input"
              rows={1}
            />
          </div>
          
          <div className="controls-wrapper" ref={dropdownRef}>
            <button 
              type="button"
              className="resolution-dropdown-trigger"
              onClick={() => setShowResDropdown(!showResDropdown)}
              disabled={loading}
            >
              <span className="res-icon">{getResolutionIcon(resolution)}</span>
              <span className="res-label">{resolution.label}</span>
              <svg className="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            
            {showResDropdown && (
              <div className="resolution-dropdown">
                <div className="dropdown-section">
                  <div className="dropdown-section-label">Presets</div>
                  {defaultResolutions.map((res) => (
                    <button
                      key={res.label}
                      type="button"
                      className={`dropdown-item ${resolution.label === res.label ? 'active' : ''}`}
                      onClick={() => selectResolution(res)}
                    >
                      <span className="item-icon">{getResolutionIcon(res)}</span>
                      <span className="item-content">
                        <span className="item-label">{res.label}</span>
                        <span className="item-desc">{getResolutionDescription(res)}</span>
                      </span>
                    </button>
                  ))}
                </div>
                
                {customResolutions.length > 0 && (
                  <>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-section">
                      <div className="dropdown-section-label">Custom Sizes</div>
                      {customResolutions.map((res) => (
                        <div key={res.id} className={`dropdown-item-wrapper ${resolution.label === res.label ? 'active' : ''}`}>
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => selectResolution(res)}
                          >
                            <span className="item-icon">{getResolutionIcon(res)}</span>
                            <span className="item-content">
                              <span className="item-label">{res.label}</span>
                              <span className="item-desc">{res.width}×{res.height}</span>
                            </span>
                          </button>
                          <div className="item-actions">
                            <button
                              type="button"
                              className="item-action-btn"
                              onClick={(e) => { e.stopPropagation(); startEditResolution(res, e); setShowResDropdown(false); }}
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button
                              type="button"
                              className="item-action-btn delete"
                              onClick={(e) => { e.stopPropagation(); deleteCustomResolution(res.id, e); }}
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                <div className="dropdown-divider"></div>
                <button
                  type="button"
                  className="dropdown-item add-custom"
                  onClick={openAddCustom}
                >
                  <span className="item-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </span>
                  <span className="item-content">
                    <span className="item-label">Add Custom Size</span>
                    <span className="item-desc">Create your own resolution</span>
                  </span>
                </button>
              </div>
            )}
            <button 
              type="button" 
              onClick={toggleScreenshotMode} 
              className="action-btn" 
              title={getScreenshotModeTooltip()}
              style={{ 
                height: '54px', 
                width: '54px', 
                minHeight: '54px', 
                minWidth: '54px', 
                maxHeight: '54px', 
                maxWidth: '54px',
                alignSelf: 'center'
              }}
            >
              {screenshotMode === 'light' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: 'block', margin: '0 auto' }}
                >
                  {/* Sun icon (matches theme toggle) */}
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: 'block', margin: '0 auto' }}
                >
                  {/* Moon icon (matches theme toggle) */}
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>

          <button type="submit" className="capture-btn" disabled={!url.trim()} aria-label={loading ? "Add to Queue" : "Capture"}>
            {loading ? (
              queue.length > 0 ? (
                <span className="queue-badge">{queue.length + 1}</span>
              ) : (
                <span className="spinner"></span>
              )
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            )}
          </button>
        </form>

        {(captureStatus || queue.length > 0) && (
          <div className="capture-status">
            <span className="status-spinner"></span>
            <span className="status-text">
              {captureStatus}
              {queue.length > 0 && (
                <span className="queue-info">
                  {' • '}{queue.length} queued: {queue.map(q => q.url).slice(0, 3).join(', ')}{queue.length > 3 ? '...' : ''}
                </span>
              )}
            </span>
          </div>
        )}

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
              {isCropping ? (
                <div className="crop-container">
                  <ReactCrop crop={crop} onChange={(c) => setCrop(c)}>
                    <img ref={imgRef} src={screenshot} onLoad={onImageLoad} alt="Screenshot to crop" />
                  </ReactCrop>
                  <div className="crop-controls">
                    <button onClick={performCrop} className="action-btn download" title="Confirm Crop">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button onClick={() => setIsCropping(false)} className="action-btn" title="Cancel">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </div>
              ) : isAnnotating ? (
                <div className="annotation-container">
                  <img ref={imgRef} src={screenshot} alt="Screenshot to annotate" className="annotation-img" />
                  <div className="canvas-wrapper">
                    <canvas ref={canvasRef} />
                  </div>
                  <div className="annotation-controls">
                    <button onClick={addRect} className="action-btn" title="Add Rectangle">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                    </button>
                    <button onClick={addArrow} className="action-btn" title="Add Arrow">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                    <button onClick={addText} className="action-btn" title="Add Text">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
                    </button>
                    <button onClick={addBlur} className="action-btn" title="Add Blur Region">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg>
                    </button>
                    <button onClick={deleteSelected} className="action-btn delete" title="Delete Selected">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    {hasBlurSelected && (
                      <div className="blur-control">
                        <span className="control-label">Blur</span>
                        <input
                          type="range"
                          min="2"
                          max="30"
                          value={blurStrength}
                          onChange={(e) => setBlurStrength(parseInt(e.target.value))}
                          className="blur-slider"
                        />
                      </div>
                    )}
                    <div className="divider-v"></div>
                    <button onClick={saveAnnotations} className="action-btn download" title="Apply Annotations">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button onClick={() => setIsAnnotating(false)} className="action-btn" title="Cancel">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <img src={screenshot} alt="Screenshot preview" />
                  <div className="screenshot-overlay">
                    <button onClick={() => downloadScreenshot()} className="action-btn download" title="Download PNG">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                  <button onClick={() => setIsCropping(true)} className="action-btn copy" title="Crop Image">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                    </svg>
                  </button>
                  <button onClick={() => setIsAnnotating(true)} className="action-btn copy" title="Annotate Image">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                    <button onClick={copyToClipboard} className="action-btn copy" title={copied ? 'Copied!' : 'Copy to Clipboard'}>
                      {copied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                    <button onClick={() => copyUrlToClipboard()} className="action-btn copy" title={urlCopied ? 'URL Copied!' : 'Copy URL'}>
                      {urlCopied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div id="recent-captures" ref={historySectionRef} className="history-section">
            <div className="history-header">
              <h3>Recent Captures</h3>
              <div className="history-actions">
                <button onClick={downloadAllHistory} className="action-btn" title="Download All">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
                <button onClick={() => setHistory([])} className="action-btn" title="Clear History">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
            <div className="history-grid">
              {history.map((item) => (
                <div key={item.id} className="history-item">
                  <button 
                    onClick={(e) => deleteFromHistory(item.id, e)} 
                    className="delete-item-btn"
                    title="Delete"
                  >
                    ×
                  </button>
                  <div className="history-preview" onClick={() => restoreFromHistory(item)}>
                    <img src={item.screenshot} alt={item.pageInfo?.title || 'Screenshot'} />
                    <div className="history-overlay">
                      <span>Restore</span>
                    </div>
                  </div>
                  <div className="history-info">
                    <span className="history-time">{item.timestamp}</span>
                    <span className="history-res">{item.resolution.label.split('•')[0].trim()}</span>
                  </div>
                  <div className="history-item-actions">
                    <button 
                      onClick={(e) => { e.stopPropagation(); copyUrlToClipboard(item.url); }}
                      className="history-action-btn"
                      data-tooltip={item.url}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </button>
                    <button 
                      onClick={() => downloadScreenshot(item.screenshot, item.pageInfo)} 
                      className="history-action-btn"
                      data-tooltip="Download"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="footer">
          <p>Professional screenshots optimized for web articles and social media</p>
          <p className="rate-limit-info">Rate limit: 5 screenshots/min • 30/hour • Max 5 URLs per batch</p>
          <div className="footer-links">
            <a 
              href="https://github.com/planetoftheweb/Screenshotter" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer-link"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '6px' }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              View on GitHub
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
