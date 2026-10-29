#!/usr/bin/env node
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  console.error('用法: node scripts/render.mjs <项目.json> <输出目录>');
  process.exit(2);
}
const input = path.resolve(inputArg), output = path.resolve(outputArg);
const project = JSON.parse(await readFile(input, 'utf8'));
if (!Array.isArray(project.pages) || project.pages.length === 0) throw Error('项目 JSON 必须包含非空 pages 数组。');
const relativeImage = value => {
  if (typeof value !== 'string' || !value) return undefined;
  if (/^(data:|file:|https?:)/.test(value)) return value;
  const bundled = path.resolve(root, value);
  return pathToFileURL(existsSync(bundled) ? bundled : path.resolve(path.dirname(input), value)).href;
};
project.avatar = relativeImage(project.avatar);
project.pages = project.pages.map(p => ({
  title: String(p.title || ''), body: String(p.body || ''),
  visual: ['steps','tool','skill','image','none'].includes(p.visual) ? p.visual : 'none',
  highlightColor: /^#[0-9a-f]{6}$/i.test(p.highlightColor || '') ? p.highlightColor : '#fce1ed',
  image: relativeImage(p.image),
  imageFit: ['cover-top','cover-center'].includes(p.imageFit) ? p.imageFit : 'contain',
  middleImage: relativeImage(p.middleImage),
  middleImageFit: ['cover-top','cover-center'].includes(p.middleImageFit) ? p.middleImageFit : 'contain',
  steps: Array.isArray(p.steps) ? p.steps.slice(0,3).map(row=>[String(row[0]||''),String(row[1]||'')]) : undefined
}));
const candidates = [process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
  'google-chrome','chromium','chrome',
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES,'Google','Chrome','Application','chrome.exe')
].filter(Boolean);
const chrome = candidates.find(c => spawnSync(c,['--version'],{stdio:'ignore'}).status===0);
if (!chrome) throw Error('找不到 Chrome/Chromium。请安装浏览器，或设置 CHROME_PATH。');
await mkdir(output,{recursive:true});
let html = await readFile(path.join(root,'index.html'),'utf8');
const style = '<style>.editor,.preview-head{display:none!important}.app{display:block!important}.preview-area{padding:0!important;display:block!important}canvas{width:1080px!important;height:1440px!important;border:0!important;box-shadow:none!important}body{background:white!important}</style>';
// Escape script delimiters in user-authored copy before embedding JSON.
const safeProject = JSON.stringify(project).replaceAll('<','\\u003c');
html = html.replace('<script src="app.js"></script>', `${style}<script>window.SHP_PROJECT=${safeProject};window.SHP_PAGE=0;</script><script src="app.js"></script>`);
const temp = path.join(root,`.render-${process.pid}.html`);
try {
  for(let i=0;i<project.pages.length;i++) {
    const pageHtml=html.replace('window.SHP_PAGE=0;',`window.SHP_PAGE=${i};`);
    await writeFile(temp,pageHtml);
    const target=path.join(output,`page-${String(i+1).padStart(2,'0')}.png`);
    const run=spawnSync(chrome,['--headless','--disable-gpu','--hide-scrollbars','--no-first-run','--no-default-browser-check','--allow-file-access-from-files','--window-size=1080,1440','--force-device-scale-factor=1','--virtual-time-budget=3000',`--screenshot=${target}`,pathToFileURL(temp).href],{encoding:'utf8',maxBuffer:2_000_000});
    if(run.status!==0 || !existsSync(target)) throw Error(`第 ${i+1} 页渲染失败：${run.stderr?.slice(-500)||'未知错误'}`);
    console.log(target);
  }
} finally { await rm(temp,{force:true}); }
