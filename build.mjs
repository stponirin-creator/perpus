/**
 * build.mjs — Generate PWA (app.js, app.css, sw.js) dari Tema-Blogger.xml.
 * Tidak butuh dependensi: Tailwind sudah ter-inline di tema, jadi tinggal diekstrak.
 * Hasil ditaruh di folder dist/ untuk di-deploy ke GitHub Pages.
 *
 * Env:
 *   API_URL  -> URL Web App /exec (di-inject ke CONFIG.API). Diisi dari repo variable.
 *   GITHUB_SHA -> dipakai untuk versi cache service worker (otomatis dari Actions).
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';

const xml = readFileSync('Tema-Blogger.xml', 'utf8');
const API = (process.env.API_URL || '').trim();
const VER = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 8);

function need(cond, msg) { if (!cond) { console.error('GAGAL: ' + msg); process.exit(1); } }

// 1) CSS Tailwind (sudah ter-inline di antara penanda CDATA)
const tA = xml.indexOf('/*<![CDATA[*/');
const tB = xml.indexOf('/*]]>*/', tA);
need(tA >= 0 && tB >= 0, 'Blok CSS Tailwind tidak ditemukan di tema.');
const tw = xml.slice(tA + '/*<![CDATA[*/'.length, tB).trim();

// 2) CSS kustom (anchor ke blok yang benar, bukan blok Tailwind)
const a = xml.indexOf("body{font-family:'Inter'");
need(a >= 0, 'Blok CSS kustom (body Inter) tidak ditemukan.');
const open = xml.lastIndexOf('<style>', a);
const close = xml.indexOf('</style>', a);
const smallCss = xml.slice(open + '<style>'.length, close).trim();

// 3) JavaScript aplikasi (blok <script> terakhir, antara //<![CDATA[ dan //]]> )
const parts = xml.split('<script>');
let js = parts[parts.length - 1].split('</script>')[0].replace('//<![CDATA[', '').replace('//]]>', '').trim();
need(js.indexOf('function api(') >= 0, 'JS aplikasi tidak ditemukan / tidak utuh.');
// pakai manifest.json statis (bukan data URI dinamis)
js = js.replace(/setLink_\('pwa-manifest','manifest','data:application\/manifest\+json,[\s\S]+?\)\);/, '/* manifest statis (manifest.json) dipakai utk PWA */');
// inject URL Web App
if (API) js = js.replace(/API:\s*'[^']*'/, "API: '" + API + "'");

// 4) Susun dist/
mkdirSync('dist', { recursive: true });
writeFileSync('dist/app.css', tw + '\n\n/* ====== CSS kustom (animasi, dark, skeleton, gradient) ====== */\n' + smallCss + '\n');
writeFileSync('dist/app.js', js + '\n');
['index.html', 'manifest.json', 'icon.svg'].forEach(function (f) {
  need(existsSync(f), 'File ' + f + ' tidak ada di repo.');
  copyFileSync(f, 'dist/' + f);
});
// sw.js: naikkan versi cache otomatis tiap commit
let sw = readFileSync('sw.js', 'utf8').replace(/var CACHE = '[^']*';/, "var CACHE = 'perpus-" + VER + "';");
writeFileSync('dist/sw.js', sw);

console.log('Build PWA selesai.');
console.log('  API_URL di-inject :', API ? 'YA' : 'TIDAK (placeholder tetap — set repo variable API_URL!)');
console.log('  Cache SW          : perpus-' + VER);
console.log('  app.js / app.css  :', js.length, '/', (tw.length + smallCss.length), 'char');
