import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from './index.js';

describe('Screenshot API', () => {
  it('should reject requests without URL', async () => {
    const res = await request(app)
      .post('/api/screenshot')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('URL is required');
  });

  // Note: We are running against the real Puppeteer here.
  // This ensures that we don't call deprecated APIs like page.emulateMedia.
  // However, this might be slow or fail in environments without Chrome installed.
  // For a robust CI, we would usually mock puppeteer, but here we explicitly
  // want to catch "function does not exist" on the real library.
  
  it('should capture a screenshot (dry run / basic check)', async () => {
    // We'll use a simple fast-loading page or specific "colorScheme" options to trigger that logic
    const res = await request(app)
      .post('/api/screenshot')
      .send({
        url: 'https://example.com',
        width: 800,
        height: 600,
        colorScheme: 'dark' // This triggers the logic that was crashing
      });

    // If the server crashes with TypeError, this will fail with 500 or connection refused
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.image).toBeDefined();
  }, 20000); // 20s timeout for real browser interaction

  it('should reject resolution exceeding limits', async () => {
    const res = await request(app)
      .post('/api/screenshot')
      .send({
        url: 'https://example.com',
        width: 5000,
        height: 5000
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exceeds maximum/);
  });

  it('should include rate limit headers', async () => {
    // Send a request that fails validation gracefully (missing URL)
    // This returns 400 but should still have rate limit headers
    const res = await request(app)
      .post('/api/screenshot')
      .send({}); // missing URL
    
    // Express-rate-limit (standardHeaders: true) adds these headers
    // Note: Node http client lowercases headers
    // standardHeaders uses 'ratelimit-*' (draft-7) or just 'ratelimit' fields?
    // Let's check for 'ratelimit-limit' which is the modern standard
    const limit = res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'];
    const remaining = res.headers['ratelimit-remaining'] || res.headers['x-ratelimit-remaining'];
    
    expect(limit).toBeDefined();
    expect(remaining).toBeDefined();
  });

  // Note: We don't have explicit zoom validation logic in server/index.js currently,
  // the code just parses it: const zoomLevel = parseInt(zoom) || 130;
  // If we wanted to validate zoom, we would add that logic and a test here.
  // For now, let's verify that sending a zoom parameter doesn't crash the server.
  
  it('should handle zoom parameter without crashing', async () => {
    const res = await request(app)
      .post('/api/screenshot')
      .send({
        url: 'https://example.com',
        zoom: 200
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  }, 20000);

  it('should handle fullPage parameter without crashing', async () => {
    const res = await request(app)
      .post('/api/screenshot')
      .send({
        url: 'https://example.com',
        fullPage: true
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  }, 20000);
});

