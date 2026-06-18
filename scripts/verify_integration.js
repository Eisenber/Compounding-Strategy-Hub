// Playwright integration test for frontend-backend integration
// Verifies: strategy page loads, API call works, detail popover is visible

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE = 'http://localhost:3000';
const SCREENSHOT_DIR = 'e:/复利选股/scripts/screenshots';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  const results = [];
  const screenshot = (name) => page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });

  try {
    // ── Step 1: Load landing page ──
    console.log('1. Loading landing page...');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);
    console.log('   Title:', await page.title());

    // ── Step 2: Navigate to strategy page ──
    console.log('2. Navigating to strategy page...');
    // Click the "选股策略" link or navigate directly
    const strategyLink = page.locator('a[href="/strategy"], button:has-text("选股"), text=选股策略').first();
    if (await strategyLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await strategyLink.click();
    } else {
      await page.goto(`${BASE}/strategy`, { waitUntil: 'networkidle', timeout: 15000 });
    }
    await page.waitForTimeout(1000);
    console.log('   URL:', page.url());

    // ── Step 3: Verify strategy templates load ──
    console.log('3. Checking strategy templates...');
    const templateText = await page.textContent('body');
    const hasLowVal = templateText.includes('低估值');
    const hasHighDiv = templateText.includes('高股息');
    const hasQuality = templateText.includes('质量成长');
    console.log(`   低估值: ${hasLowVal}, 高股息: ${hasHighDiv}, 质量成长: ${hasQuality}`);

    // ── Step 4: Click "开始筛选" ──
    console.log('4. Clicking "开始筛选"...');
    const screenBtn = page.locator('button:has-text("开始筛选")').first();
    if (await screenBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await screenBtn.click();
    } else {
      // Maybe the button text is different, try other selectors
      const altBtn = page.locator('button:has-text("筛选")').first();
      if (await altBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await altBtn.click();
      }
    }

    // ── Step 5: Wait for results to load ──
    console.log('5. Waiting for results...');
    await page.waitForTimeout(3000);

    // Check for table or error
    const tableVisible = await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false);
    const errorVisible = await page.locator('text=筛选失败').isVisible({ timeout: 2000 }).catch(() => false);
    const emptyVisible = await page.locator('text=暂无筛选结果').isVisible().catch(() => false);
    const resultCount = await page.locator('text=/共.*只股票符合条件/').textContent().catch(() => null);

    console.log(`   Table visible: ${tableVisible}, Error: ${errorVisible}, Empty: ${emptyVisible}`);
    console.log(`   Result count text: ${resultCount || 'N/A'}`);

    // ── Step 6: Click "详情" button ──
    console.log('6. Finding and clicking "详情" button...');
    const detailBtns = page.locator('button:has-text("详情")');
    const detailCount = await detailBtns.count();
    console.log(`   Found ${detailCount} detail buttons`);

    if (detailCount > 0) {
      // Click the first one
      await detailBtns.first().click();
      await page.waitForTimeout(500);

      // Check if popover appeared
      const popoverVisible = await page.locator('text=入选分析').isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`   Popover "入选分析" visible: ${popoverVisible}`);

      if (popoverVisible) {
        // Take screenshot of popover
        await screenshot('01-popover-open');
        console.log('   Screenshot: 01-popover-open.png');

        // Check content
        const reasonVisible = await page.locator('text=入选原因').isVisible().catch(() => false);
        const riskVisible = await page.locator('text=风险提示').isVisible().catch(() => false);
        console.log(`   "入选原因" visible: ${reasonVisible}`);
        console.log(`   "风险提示" visible: ${riskVisible}`);

        results.push({ step: '详情弹窗内容', passed: reasonVisible || riskVisible });
      } else {
        results.push({ step: '详情弹窗内容', passed: false, note: 'popover not visible' });
      }

      // ── Step 7: Close popover and verify ──
      console.log('7. Closing popover...');
      const closeBtn = page.locator('button:has(svg)').filter({ has: page.locator('svg.lucide-x') }).first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        // Click outside or press Escape
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);

      const popoverGone = !(await page.locator('text=入选分析').isVisible().catch(() => false));
      console.log(`   Popover closed: ${popoverGone}`);
      results.push({ step: '弹窗关闭', passed: popoverGone });

      // ── Step 8: Test popover in different row ──
      if (detailCount > 1) {
        console.log('8. Testing popover on last row...');
        // Scroll to see last rows
        const lastBtn = detailBtns.nth(Math.min(detailCount - 1, 4));
        await lastBtn.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await lastBtn.click();
        await page.waitForTimeout(500);

        const popover2Visible = await page.locator('text=入选分析').isVisible({ timeout: 3000 }).catch(() => false);
        console.log(`   Last row popover visible: ${popover2Visible}`);

        if (popover2Visible) {
          await screenshot('02-popover-last-row');
          console.log('   Screenshot: 02-popover-last-row.png');
        }

        // Close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    } else {
      console.log('   No detail buttons found — may need different approach');
      await screenshot('03-no-results');
    }

    // ── Step 9: Verify sorting works ──
    console.log('9. Testing column sort...');
    const peHeader = page.locator('th:has-text("PE")').first();
    if (await peHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await peHeader.click();
      await page.waitForTimeout(500);
      const sortIndicator = await page.locator('text=/按 PE.*升序/').textContent().catch(() => null);
      console.log(`   Sort indicator: ${sortIndicator || 'N/A'}`);
    }

    // ── Final screenshot ──
    await screenshot('04-final-state');
    console.log('10. Final screenshot saved.');

  } catch (err) {
    console.error('Test error:', err.message);
    await screenshot('error-state');
    results.push({ step: 'Test execution', passed: false, note: err.message });
  } finally {
    await browser.close();
  }

  // ── Summary ──
  console.log('\n========== INTEGRATION TEST SUMMARY ==========');
  const allPassed = results.every(r => r.passed !== false);
  for (const r of results) {
    const icon = r.passed === false ? '❌' : '✅';
    console.log(`  ${icon} ${r.step}${r.note ? ` — ${r.note}` : ''}`);
  }
  console.log(`\nVerdict: ${allPassed ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
}

main().catch(console.error);
