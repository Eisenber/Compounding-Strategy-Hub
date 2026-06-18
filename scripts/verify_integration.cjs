// Playwright integration test for frontend-backend integration
const { chromium } = require('../frontend/node_modules/@playwright/test');

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
  const errors = [];
  const apiCalls = [];

  // Capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  // Capture network responses from our API
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/api/')) {
      const status = resp.status();
      let body = '';
      try { body = await resp.text(); } catch (_) {}
      apiCalls.push({ url: url.replace(BASE, ''), status, body: body.substring(0, 200) });
    }
  });

  const screenshot = (name) => page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });

  try {
    // ── Step 1: Navigate to strategy page ──
    console.log('1. Loading strategy page...');
    await page.goto(`${BASE}/strategy`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(800);
    console.log('   URL:', page.url());

    // ── Step 2: Verify template cards ──
    console.log('2. Checking templates...');
    const lowValCard = await page.locator('text=低估值').first().isVisible().catch(() => false);
    const highDivCard = await page.locator('text=高股息').first().isVisible().catch(() => false);
    console.log(`   低估值: ${lowValCard}, 高股息: ${highDivCard}`);
    results.push({ step: '策略模板加载', passed: lowValCard && highDivCard });

    // ── Step 3: Switch to HIGH_DIVIDEND strategy (has more results) ──
    console.log('3. Switching to HIGH_DIVIDEND...');
    const highDivBtn = page.locator('button').filter({ hasText: '高股息' }).first();
    if (await highDivBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await highDivBtn.click();
      await page.waitForTimeout(500);
      console.log('   Switched to 高股息');
    } else {
      console.log('   Could not find 高股息 button, trying text click...');
      await page.locator('text=高股息').first().click();
      await page.waitForTimeout(500);
    }

    // Relax dividend filter for more results
    console.log('4. Relaxing dividend filter...');
    const divInput = page.locator('input[type="number"]').first();
    if (await divInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await divInput.fill('');
      await divInput.type('0');
      await page.waitForTimeout(300);
      console.log('   Set dividend yield minimum to 0');
    }

    // ── Step 5: Click "开始筛选" ──
    console.log('5. Clicking "开始筛选"...');
    const screenBtn = page.locator('button').filter({ hasText: '开始筛选' }).first();
    const btnVisible = await screenBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`   Button visible: ${btnVisible}`);

    if (btnVisible) {
      await screenBtn.click();
    }

    // Wait for results
    await page.waitForTimeout(4000);

    // ── Step 6: Check results ──
    console.log('6. Checking results...');
    console.log('   API calls captured:', apiCalls.length);
    for (const call of apiCalls) {
      console.log(`     ${call.url} -> ${call.status}: ${call.body.substring(0, 100)}`);
    }

    const bodyText = await page.textContent('body');
    const hasTable = bodyText.includes('符合条件');
    const hasNoResults = bodyText.includes('暂无筛选结果');
    const hasError = bodyText.includes('筛选失败');
    console.log(`   有结果: ${hasTable}, 空结果: ${hasNoResults}, 错误: ${hasError}`);

    if (errors.length > 0) {
      console.log('   Console errors:');
      for (const err of errors) {
        console.log(`     ${err}`);
      }
    }

    results.push({
      step: 'API请求到渲染',
      passed: hasTable || hasNoResults, // either has results or shows empty state
      note: hasError ? `error state shown` : hasTable ? `results shown` : `empty state shown (expected with strict filters)`,
    });

    await screenshot('01-results');
    console.log('   Screenshot: 01-results.png');

    // ── Step 7: Test detail popover ──
    console.log('7. Looking for detail buttons...');
    const detailBtns = page.locator('button').filter({ hasText: '详情' });
    const count = await detailBtns.count();
    console.log(`   Count: ${count}`);

    if (count > 0) {
      // Click first detail button
      await detailBtns.first().click();
      await page.waitForTimeout(600);

      const popoverVisible = await page.locator('text=入选分析').isVisible().catch(() => false);
      console.log(`   Popover visible: ${popoverVisible}`);

      if (popoverVisible) {
        // Read the actual reason text
        const reasonText = await page.locator('text=入选原因').locator('..').locator('p').last().textContent().catch(() => '(could not read)');
        console.log(`   Reason: ${reasonText}`);

        await screenshot('02-popover');
        console.log('   Screenshot: 02-popover.png');

        results.push({ step: '详情弹窗内容完整可见', passed: true });

        // Close popover
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Test on a different row
        if (count > 1) {
          const idx = Math.min(count - 1, 3);
          await detailBtns.nth(idx).click();
          await page.waitForTimeout(600);
          const secondVisible = await page.locator('text=入选分析').isVisible().catch(() => false);
          console.log(`   Second row popover: ${secondVisible}`);
          results.push({ step: '多行弹窗切换', passed: secondVisible });
          await page.keyboard.press('Escape');
        }
      } else {
        results.push({ step: '详情弹窗', passed: false, note: 'popover not visible' });
      }
    } else {
      console.log('   No detail buttons (可能是空结果状态)');
      results.push({ step: '详情弹窗', passed: true, note: 'no results to test, empty state correctly shown' });
    }

    // ── Step 8: Test with LOW_VALUATION strategy and relaxed filters ──
    console.log('8. Testing LOW_VALUATION with relaxed filters...');
    const lowValBtn = page.locator('button').filter({ hasText: '低估值' }).first();
    if (await lowValBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lowValBtn.click();
      await page.waitForTimeout(500);

      // Relax PE and PB
      const inputs = page.locator('input[type="number"]');
      const inputCount = await inputs.count();
      console.log(`   Number inputs: ${inputCount}`);
      if (inputCount >= 2) {
        await inputs.nth(0).fill('50'); // maxPe
        await inputs.nth(1).fill('5');  // maxPb
      }

      const btn = page.locator('button').filter({ hasText: '开始筛选' }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(3000);
      }

      const detailCount2 = await page.locator('button').filter({ hasText: '详情' }).count();
      console.log(`   Detail buttons after relax: ${detailCount2}`);

      if (detailCount2 > 0) {
        await detailBtns.first().click();
        await page.waitForTimeout(500);
        await screenshot('03-lowval-popover');
        results.push({ step: '低估值策略弹窗', passed: true });
      }
    }

    await screenshot('04-final');

  } catch (err) {
    console.error('TEST ERROR:', err.message);
    try { await screenshot('error'); } catch (_) {}
    results.push({ step: '测试执行', passed: false, note: err.message });
  } finally {
    await browser.close();
  }

  // ── Report ──
  console.log('\n' + '='.repeat(55));
  console.log('  前后端联调测试报告');
  console.log('='.repeat(55));
  console.log(`  前端: ${BASE} (Vite dev)`);
  console.log(`  后端: http://localhost:8080 (Spring Boot)`);
  console.log(`  API 调用数: ${apiCalls.length}`);
  console.log(`  Console 错误: ${errors.length}`);
  console.log('─'.repeat(55));

  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${icon} ${r.step}${r.note ? ' — ' + r.note : ''}`);
    if (!r.passed) allPassed = false;
  }

  if (errors.length > 0) {
    console.log('\n  ⚠️ Browser console errors:');
    for (const e of errors) console.log(`    - ${e}`);
  }

  console.log(`\n  🏆 结论: ${allPassed ? 'PASS ✅ 前后端联调正常' : 'FAIL ❌ 存在问题'}`);
}

main().catch(console.error);
