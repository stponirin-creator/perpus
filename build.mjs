/**
 * build.mjs — Generate PWA (app.js, app.css, sw.js, manifest, index) dari Tema-Blogger.xml.
 * Tidak butuh dependensi (Tailwind sudah ter-inline di tema, tinggal diekstrak).
 * Nama aplikasi (manifest + judul iOS) diambil OTOMATIS dari API (nama sekolah di Pengaturan).
 * Hasil ditaruh di folder dist/ untuk di-deploy ke GitHub Pages.
 *
 * Env:
 *   API_URL    -> URL Web App /exec (di-inject ke CONFIG.API & dipakai ambil nama sekolah).
 *   GITHUB_SHA -> dipakai untuk versi cache service worker (otomatis dari Actions).
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';

const xml = readFileSync('Tema-Blogger.xml', 'utf8');
const API = (process.env.API_URL || '').trim();
const VER = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 8);

function need(cond, msg) { if (!cond) { console.error('GAGAL: ' + msg); process.exit(1); } }
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ---- Ambil nama sekolah dari API (opsional; fallback bila gagal) ----
let school = '';
if (API) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'opacInfo', data: {} }),
      redirect: 'follow',
      signal: ctrl.signal
    });
    clearTimeout(t);
    const j = await res.json();
    if (j && j.ok && j.data && j.data.nama_sekolah) school = String(j.data.nama_sekolah).trim();
    console.log('Nama sekolah dari API:', school || '(kosong)');
  } catch (e) {
    console.log('Peringatan: gagal ambil nama sekolah (' + e.message + '), pakai default.');
  }
}
// Nama aplikasi gabungan: "Perpustakaan <nama sekolah>"
const appName = school ? ('Perpustakaan ' + school) : 'Perpustakaan Sekolah';
const shortName = 'Perpustakaan';

// ---- 1) CSS Tailwind (sudah ter-inline) ----
const tA = xml.indexOf('/*<![CDATA[*/');
const tB = xml.indexOf('/*]]>*/', tA);
need(tA >= 0 && tB >= 0, 'Blok CSS Tailwind tidak ditemukan di tema.');
const tw = xml.slice(tA + '/*<![CDATA[*/'.length, tB).trim();

// ---- 2) CSS kustom ----
const a = xml.indexOf("body{font-family:'Inter'");
need(a >= 0, 'Blok CSS kustom (body Inter) tidak ditemukan.');
const smallCss = xml.slice(xml.lastIndexOf('<style>', a) + '<style>'.length, xml.indexOf('</style>', a)).trim();

// ---- 3) JavaScript aplikasi ----
const parts = xml.split('<script>');
let js = parts[parts.length - 1].split('</script>')[0].replace('//<![CDATA[', '').replace('//]]>', '').trim();
need(js.indexOf('function api(') >= 0, 'JS aplikasi tidak ditemukan / tidak utuh.');
js = js.replace(/setLink_\('pwa-manifest','manifest','data:application\/manifest\+json,[\s\S]+?\)\);/, '/* manifest statis (manifest.json) dipakai utk PWA */');
if (API) js = js.replace(/API:\s*'[^']*'/, "API: '" + API + "'");

// ---- 4) Susun dist/ ----
mkdirSync('dist', { recursive: true });
writeFileSync('dist/app.css', tw + '\n\n/* ====== CSS kustom (animasi, dark, skeleton, gradient) ====== */\n' + smallCss + '\n');
writeFileSync('dist/app.js', js + '\n');
copyFileSync('icon.svg', 'dist/icon.svg');

// manifest.json: nama aplikasi = nama sekolah
const man = JSON.parse(readFileSync('manifest.json', 'utf8'));
man.name = appName;
man.short_name = shortName;
writeFileSync('dist/manifest.json', JSON.stringify(man, null, 2));

// index.html: judul iOS & <title> = nama sekolah
let html = readFileSync('index.html', 'utf8');
html = html.replace(/(name="apple-mobile-web-app-title"\s+content=")[^"]*(")/, '$1' + escHtml(appName) + '$2');
html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escHtml(appName) + '</title>');
writeFileSync('dist/index.html', html);

// sw.js: versi cache otomatis tiap commit
let sw = readFileSync('sw.js', 'utf8').replace(/var CACHE = '[^']*';/, "var CACHE = 'perpus-" + VER + "';");
writeFileSync('dist/sw.js', sw);

console.log('Build PWA selesai.');
console.log('  Nama aplikasi    :', appName, '| short:', shortName);
console.log('  API_URL inject   :', API ? 'YA' : 'TIDAK');
console.log('  Cache SW         : perpus-' + VER);
