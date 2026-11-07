// 冒烟测试：遍历所有设备、视图、演示的每一步，检查控制台报错、横向滚动、英文模式漏翻。
// 用法：node tests/smoke.js [--quick] [--file path/to/page.html]
//   --quick  只跑默认风格
//   --file   测试指定页面（默认仓库根目录的 index.html）
// 依赖 Playwright（开发环境预装）。说明见 docs/test-plan.md。
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const fi = args.indexOf('--file');
const FILE = path.resolve(fi >= 0 ? args[fi + 1] : path.join(__dirname, '..', 'index.html'));
const URL = 'file://' + FILE;
const VIEWPORTS = [{ width: 1400, height: 860 }, { width: 390, height: 844 }];
const CJK = /[一-龥]/;

// 英文模式下允许出现中文的位置：命令行输出、品牌、语言按钮、术语对照副标题、页面声明
const CJK_OK = '#out,.en,#langbtn,.brand,header,.note';

async function stepAll(p, wait) {
  const nf = await p.evaluate(() => currentFlows().length);
  for (let f = 0; f < nf; f++) {
    const n = await p.evaluate(f => currentFlows()[f].steps.length, f);
    for (let s = 0; s < n; s++) {
      await p.evaluate(([f, s]) => { if (!A || A.fi !== f) playFlow(f, 0); jump(s); }, [f, s]);
      await p.waitForTimeout(wait);
    }
  }
}

function cjkLeft(p) {
  return p.evaluate(ok => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const e = n.parentElement;
      if (/[一-龥]/.test(n.textContent) && !e.closest(ok) && !e.closest('script,style') && !e.closest('#info'))
        out.push(n.textContent.trim().slice(0, 40));
    }
    for (const e of document.querySelectorAll('#info *'))
      if (!e.closest('.en') && !e.children.length && /[一-龥]/.test(e.textContent)) out.push('info: ' + e.textContent.slice(0, 40));
    return out;
  }, CJK_OK);
}

(async () => {
  const b = await chromium.launch();
  let fail = false;
  for (const lang of ['zh', 'en']) for (const vp of VIEWPORTS) {
    const p = await b.newPage({ viewport: vp });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL);
    await p.waitForTimeout(500);
    await p.evaluate(l => setLang(l), lang);
    const allSkins = await p.evaluate(() => SKINS.map(s => s[0]));
    const skins = QUICK ? allSkins.slice(0, 1) : allSkins;
    const devs = await p.evaluate(() => Object.keys(DEVS));
    const cjk = new Set();
    let hscroll = false;
    for (const d of devs) {
      await p.evaluate(d => setDev(d), d);
      await p.waitForTimeout(200);
      const dms = await p.evaluate(() => demos().map(x => x.id));
      const slots = await p.evaluate(() => dv().slots.filter(s => s.type).map(s => s.n));
      for (const s of skins) {
        await p.evaluate(s => setSkin(s), s);
        for (const v of [{ k: 'chassis' }, ...slots.map(n => ({ k: 'board', n }))]) {
          await p.evaluate(v => go(v), v);
          await p.waitForTimeout(20);
        }
        for (const v of [{ k: 'chassis' }, { k: 'board', n: 1 }]) {
          await p.evaluate(v => go(v), v);
          await p.waitForTimeout(200);
          await stepAll(p, 20);
        }
        for (const id of dms) {
          await p.evaluate(id => go({ k: 'topo', d: id }), id);
          await p.waitForTimeout(200);
          await stepAll(p, 20);
          if (lang === 'en' && s === allSkins[0]) (await cjkLeft(p)).forEach(x => cjk.add(`${d}/${id}: ${x}`));
        }
      }
      hscroll = hscroll || await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    }
    const ok = !errs.length && !hscroll && !cjk.size;
    fail = fail || !ok;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${lang} ${vp.width}px  skins=${skins.length} errors=${errs.length} hscroll=${hscroll} untranslated=${cjk.size}`);
    errs.slice(0, 5).forEach(e => console.log('     error: ' + e));
    [...cjk].slice(0, 10).forEach(x => console.log('     zh: ' + x));
    await p.close();
  }
  await b.close();
  console.log(fail ? 'FAIL' : 'PASS');
  process.exit(fail ? 1 : 0);
})();
