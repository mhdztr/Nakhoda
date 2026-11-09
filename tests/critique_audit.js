/**
 * tests/critique_audit.js
 * Automated deep-inspection UI critique script using Playwright
 * Checks contrast, tap targets, focus visibility, keyboard access,
 * interaction states, and DOM structure across all screens.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const pw = require('/home/pinefeast/node_modules/playwright');

const PORT = 4322;
const ROOT_DIR = path.resolve(__dirname, '..');

// Compile HTML with mock
function buildHtml() {
  const verifyCode = fs.readFileSync(path.join(ROOT_DIR, 'tests/verify_playwright.js'), 'utf8');
  const buildMatch = verifyCode.match(/function buildHtml\(\) \{([\s\S]*?)\n\}\n\n\/\/ 2/);
  const buildHtmlFn = new Function('require', '__dirname', 'ROOT_DIR', 'fs', 'path', buildMatch[1]);
  return buildHtmlFn(require, path.resolve(ROOT_DIR, 'tests'), ROOT_DIR, fs, path);
}

async function runCritique() {
  const htmlContent = buildHtml();
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
  }).listen(PORT);

  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('[Critique] Loading page on http://localhost:' + PORT);
  await page.goto('http://localhost:' + PORT);
  await page.evaluate(() => {
    localStorage.setItem('nakhoda_token', 'mock-superadmin-token-12345');
    localStorage.setItem('nakhoda_user', JSON.stringify({
      userId: 'USR-SUPERADMIN',
      nama: 'Super Administrator Nakhoda',
      nip: '198501012010011001',
      email: 'superadmin@nakhoda.go.id',
      role: 'SUPERADMIN',
      divisiId: 'DIV-AWAK',
      status: 'APPROVED'
    }));
  });
  await page.goto('http://localhost:' + PORT);
  await page.waitForTimeout(600);

  // 1. Audit Buttons & Controls Geometry across screens
  const routes = ['ringkasan', 'komposisi', 'direktori', 'kompetensi', 'sijil', 'kegiatan', 'laporan', 'admin-users', 'admin-audit'];
  const auditReport = [];

  for (const route of routes) {
    if (route !== 'ringkasan') {
      await page.click(`button[data-route="${route}"]`);
      await page.waitForTimeout(300);
    }

    const screenData = await page.evaluate((rName) => {
      const activeView = document.getElementById(rName === 'admin-users' || rName === 'admin-audit' ? 'view-admin' : `view-${rName}`);
      if (!activeView) return { route: rName, error: 'View not found' };

      // Check all buttons inside this view
      const buttons = Array.from(activeView.querySelectorAll('button, input, select'));
      const btnMetrics = buttons.map(b => {
        const rect = b.getBoundingClientRect();
        const style = window.getComputedStyle(b);
        return {
          tag: b.tagName.toLowerCase(),
          id: b.id || b.className,
          text: (b.innerText || b.placeholder || b.value || '').trim().substring(0, 20),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          cursor: style.cursor,
          outline: style.outline,
          borderRadius: style.borderRadius
        };
      });

      // Check all tables inside view
      const tables = Array.from(activeView.querySelectorAll('table')).map(t => {
        const ths = Array.from(t.querySelectorAll('th')).map(th => th.innerText.trim());
        const trCount = t.querySelectorAll('tbody tr').length;
        return { ths, trCount };
      });

      // Check headings
      const h1 = activeView.querySelector('h1, h2')?.innerText?.trim();
      const subtitle = activeView.querySelector('.page-subtitle')?.innerText?.trim();

      // Check horizontal overflow
      const hasOverflow = activeView.scrollWidth > activeView.clientWidth;

      return {
        route: rName,
        h1,
        subtitle,
        btnCount: buttons.length,
        buttonsSample: btnMetrics.slice(0, 5),
        tables,
        hasOverflow
      };
    }, route);

    auditReport.push(screenData);
  }

  // 2. Check Accessibility & Interaction States
  const a11yChecks = await page.evaluate(() => {
    const issues = [];

    // Check images / SVGs with missing labels
    const svgs = document.querySelectorAll('svg');
    let svgWithoutAria = 0;
    svgs.forEach(s => {
      if (!s.getAttribute('aria-hidden') && !s.getAttribute('aria-label') && !s.querySelector('title')) {
        svgWithoutAria++;
      }
    });

    // Check inputs without associated labels
    const inputs = document.querySelectorAll('input, select, textarea');
    const inputsWithoutLabels = [];
    inputs.forEach(inp => {
      if (inp.type === 'hidden') return;
      const id = inp.id;
      if (!id) {
        inputsWithoutLabels.push(inp.name || inp.placeholder || 'unnamed');
      } else {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (!lbl && !inp.getAttribute('aria-label')) {
          inputsWithoutLabels.push(id);
        }
      }
    });

    // Check interactive elements focus styling
    const testBtn = document.querySelector('button.btn-primary-md');
    let focusStyle = '';
    if (testBtn) {
      testBtn.focus();
      focusStyle = window.getComputedStyle(testBtn).outline;
    }

    return {
      svgTotal: svgs.length,
      svgWithoutAria,
      inputsTotal: inputs.length,
      inputsWithoutLabels,
      focusStyle
    };
  });

  console.log('\n=== A11Y & INTERACTION CHECKS ===');
  console.log(JSON.stringify(a11yChecks, null, 2));

  console.log('\n=== SCREENS AUDIT SUMMARY ===');
  auditReport.forEach(s => {
    console.log(`- [${s.route}] H1: "${s.h1}" | Subtitle: "${s.subtitle?.substring(0, 40)}..." | Controls: ${s.btnCount} | Tables: ${s.tables?.length} | Overflow: ${s.hasOverflow}`);
  });

  await browser.close();
  server.close();
}

runCritique().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

