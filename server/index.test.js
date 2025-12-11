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
});
