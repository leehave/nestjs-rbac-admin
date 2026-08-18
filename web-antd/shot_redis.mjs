import { chromium } from 'playwright-core';

const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMTBmNzAwMzljYjRhNGM2YTgwNzNmOGY2MmE4YTY2ZWYiLCJ1c2VySWQiOiIxIiwiaWF0IjoxNzg1OTE1NDIzLCJleHAiOjE3ODU5MjI2MjN9.B4WgGIMfZMLom7i6up0W_NOWm6pC4s0FKHgUFHINA8k';
const BASE = 'http://127.0.0.1:5173';
const OUT = '/Users/lizhixiang/.codex/visualizations/2026/08/05/019fcffa-0c45-7cf0-b25c-16048082a300';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Seed token before app boots, then navigate.
await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.evaluate((jwt) => {
  localStorage.setItem('token', JSON.stringify({ state: { token: jwt }, version: 0 }));
}, JWT);

await page.goto(BASE + '/monitor/redis', { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => console.log('nav err', e.message));

// Give lazy data/procard a moment to paint.
await page.waitForTimeout(2500);
await page.screenshot({ path: OUT + '/redis_desktop.png', fullPage: true });

// Also capture just the main content area for a tighter look.
const url = page.url();
const title = await page.title();
console.log('URL:', url, '| title:', title);
// dump a bit of the DOM to confirm ProCard titles rendered
const texts = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.ant-pro-card')).slice(0, 8).map((el) => (el.textContent || '').trim().slice(0, 40));
});
console.log('cards:', JSON.stringify(texts));

await browser.close();
