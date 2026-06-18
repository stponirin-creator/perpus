/* ======================================================================
   KONFIGURASI  -> GANTI DENGAN URL WEB APP /exec ANDA
   ====================================================================== */
var CONFIG = {
  API: 'https://script.google.com/macros/s/AKfycbwJniXjn_ga1r_fxIMo0svRNjLH82n9gZytoHUIgRKp90Kw9aSz5VqkQegVThIkZMh5/exec'
};

/* Tangkap error apa pun supaya halaman tidak "blank" diam-diam:
   tampilkan pesannya di layar agar mudah didiagnosis. */
window.onerror = function (msg, src, line) {
  var a = document.getElementById('app');
  if (a && a.getAttribute('data-ok') !== '1') {
    a.innerHTML = '<div style="padding:24px;font-family:monospace;color:#b91c1c;line-height:1.6">'+
      '<b>Terjadi error JavaScript:</b><br>'+ msg +'<br>baris: '+ line +
      '<br><br>Cek: (1) CONFIG.API sudah diisi URL /exec? (2) buka Console (F12) untuk detail.</div>';
  }
  return false;
};

/* ============================ STATE ================================= */
var state = {
  token: localStorage.getItem('lib_token') || '',
  user: JSON.parse(localStorage.getItem('lib_user') || 'null'),
  info: { nama_sekolah: 'Perpustakaan Sekolah', logo_url: '' }
};

/* ===================== API HELPER (text/plain) ====================== */
/* Memakai Content-Type text/plain => request "sederhana" => TANPA preflight
   CORS, sehingga bisa memanggil Web App GAS langsung dari Blogger. */
function api(action, data) {
  return fetch(CONFIG.API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: action, token: state.token, data: data || {} }),
    redirect: 'follow'
  }).then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res.ok) throw new Error(res.error || 'Terjadi kesalahan.');
      return res.data;
    });
}

/* ============================ UTIL ================================== */
function el(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
/* Ubah URL Google Drive (uc?export=view / file/d/...) menjadi endpoint thumbnail
   yang masih bisa ditampilkan di <img>. URL non-Drive dikembalikan apa adanya. */
function driveImg(u){
  if(!u) return '';
  u=String(u);
  if(u.indexOf('drive.google.com')===-1) return u;
  var m=u.match(/[-\w]{25,}/);
  return m ? 'https://drive.google.com/thumbnail?id='+m[0]+'&sz=w1000' : u;
}
function rupiah(n){ return 'Rp ' + (parseInt(n,10)||0).toLocaleString('id-ID'); }
function tgl(d){ if(!d) return '-'; var t=new Date(d); if(isNaN(t)) return '-';
  var b=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return t.getDate()+' '+b[t.getMonth()]+' '+t.getFullYear(); }
function go(h){ location.hash = h; }

/* ===================== DARK MODE ================================== */
function darkOn(){ return localStorage.getItem('lib_dark')==='1'; }
function applyDark(){ document.body.classList.toggle('dark', darkOn()); }
function toggleDark(){
  localStorage.setItem('lib_dark', darkOn()?'0':'1');
  applyDark();
  [].forEach.call(document.querySelectorAll('.dark-toggle'), function(b){ b.innerHTML=darkIcon(); b.title=darkOn()?'Mode terang':'Mode gelap'; });
}
function darkIcon(){ return darkOn()?'☀️':'🌙'; }
function darkBtn(cls){ return '<button onclick="toggleDark()" title="'+(darkOn()?'Mode terang':'Mode gelap')+'" class="dark-toggle '+(cls||'')+'">'+darkIcon()+'</button>'; }

/* ===================== PWA (pasang ke layar utama) ================ */
function setLink_(id, rel, href){
  var l=document.getElementById(id);
  if(!l){ l=document.createElement('link'); l.id=id; l.rel=rel; document.head.appendChild(l); }
  l.setAttribute('href', href);
}
/* ikon default (kalau logo sekolah belum diisi): kotak emerald + huruf P */
function iconDefault(){
  try{
    var c=document.createElement('canvas'); c.width=512; c.height=512; var x=c.getContext('2d');
    x.fillStyle='#0f3d33'; x.fillRect(0,0,512,512);
    x.fillStyle='#10b981'; x.beginPath(); x.arc(256,256,210,0,Math.PI*2); x.fill();
    x.fillStyle='#ffffff'; x.font='bold 300px Inter,Arial,sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('P',256,286);
    return c.toDataURL('image/png');
  }catch(e){ return ''; }
}
function setupPWA(){
  var nama=(state.info && state.info.nama_sekolah) || 'Perpustakaan';
  var ikon=(state.info && state.info.logo_url) ? driveImg(state.info.logo_url) : iconDefault();
  var base=location.origin + '/';
  var manifest={
    name: nama + ' — Perpustakaan', short_name: 'Perpus',
    start_url: base, scope: base, display: 'standalone', orientation: 'portrait',
    background_color: '#0f3d33', theme_color: '#0f3d33',
    icons: ikon ? [{src:ikon,sizes:'192x192',type:'image/png'},{src:ikon,sizes:'512x512',type:'image/png'}] : []
  };
  /* manifest statis (manifest.json) dipakai utk PWA */
  if(ikon) setLink_('pwa-apple-icon','apple-touch-icon',ikon);
}
var _pwaPrompt=null;
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); _pwaPrompt=e; var b=el('btn-pasang'); if(b) b.classList.remove('hidden'); });
window.addEventListener('appinstalled', function(){ var b=el('btn-pasang'); if(b) b.classList.add('hidden'); });
function pasangPWA(){
  if(!_pwaPrompt){ toast('Pakai menu browser: "Tambah ke Layar Utama".'); return; }
  _pwaPrompt.prompt();
  _pwaPrompt.userChoice.then(function(){ _pwaPrompt=null; var b=el('btn-pasang'); if(b) b.classList.add('hidden'); });
}

function toast(msg, ok){
  var w = el('toast-wrap');
  var d = document.createElement('div');
  d.className = 'toast px-4 py-3 rounded-xl shadow-soft text-sm font-medium text-white '+(ok===false?'bg-rose-600':'bg-emerald-600');
  d.textContent = msg;
  w.appendChild(d);
  setTimeout(function(){ d.style.opacity='0'; setTimeout(function(){ d.remove(); },300); }, 3200);
}

function loading(on){
  var x = el('loader');
  if(on){ if(!x){ var d=document.createElement('div'); d.id='loader';
    d.className='fixed inset-0 z-50 flex items-center justify-center bg-white/60 no-print';
    d.innerHTML='<div class="w-10 h-10 border-4 border-platinum-200 border-t-emerald-600 rounded-full spin"></div>';
    document.body.appendChild(d);} }
  else if(x){ x.remove(); }
}

/* ===================== SKELETON LOADING ============================ */
function skelBar(w,h){ return '<div class="skel" style="width:'+(w||'100%')+';height:'+(h||12)+'px;border-radius:7px"></div>'; }
function skelTable(cols, rows){
  rows=rows||6; cols=cols||5;
  var body='';
  for(var r=0;r<rows;r++){
    var tds='';
    for(var c=0;c<cols;c++){ var w=(c===0?'45%':(c===cols-1?'55%':'80%')); tds+='<td class="px-4 py-3">'+skelBar(w)+'</td>'; }
    body+='<tr>'+tds+'</tr>';
  }
  return '<div class="bg-white rounded-2xl shadow-soft overflow-hidden border border-platinum-100"><table class="w-full"><tbody class="divide-y divide-platinum-100">'+body+'</tbody></table></div>';
}
function skelStat(n){
  var s=''; for(var i=0;i<(n||4);i++){
    s+='<div class="bg-white rounded-2xl shadow-soft p-5 border border-platinum-100">'+
      '<div class="flex items-center justify-between">'+skelBar('45%',12)+'<div class="skel" style="width:44px;height:44px;border-radius:12px"></div></div>'+
      '<div class="mt-4">'+skelBar('60%',26)+'</div></div>';
  } return s;
}
function skelKartu(n){
  var s=''; for(var i=0;i<(n||8);i++){
    s+='<div class="bg-white rounded-2xl shadow-soft overflow-hidden border border-platinum-100">'+
      '<div class="skel" style="height:208px"></div>'+
      '<div class="p-4">'+skelBar('90%',12)+'<div style="height:8px"></div>'+skelBar('60%',12)+'<div style="height:10px"></div>'+skelBar('40%',10)+'</div></div>';
  } return s;
}

function modal(html){
  el('modal-wrap').innerHTML =
    '<div class="fixed inset-0 z-40 bg-platinum-900/40 flex items-start md:items-center justify-center p-4 overflow-auto no-print" onclick="if(event.target===this)closeModal()">'+
    '<div class="bg-white w-full max-w-lg rounded-2xl shadow-soft fade my-8">'+html+'</div></div>';
}
function closeModal(){ el('modal-wrap').innerHTML=''; }

/* ===================== AUTOCOMPLETE / FILTER ID ==================== */
/* Bantu petugas: ketik nama/judul -> muncul saran -> klik untuk isi ID.
   kind: 'member' (cari di Member) atau 'buku' (cari di Buku). */
var _acTimer;
function acSearch(kind, inputId){
  clearTimeout(_acTimer);
  var inp = el(inputId), box = el(inputId+'-ac');
  if(!inp||!box) return;
  var q = inp.value.trim();
  if(q.length<1){ box.classList.remove('show'); box.innerHTML=''; return; }
  _acTimer = setTimeout(function(){
    var action='bukuList', payload={cari:q};
    if(kind==='member'){ action='memberList'; }
    else if(kind==='eksemplar'){ action='eksemplarCari'; payload={cari:q,status:'Tersedia'}; }
    else if(kind==='eksemplarKembali'){ action='eksemplarCari'; payload={cari:q,status:'Dipinjam'}; }
    api(action, payload).then(function(rows){
      rows = (rows||[]).slice(0,8);
      if(!rows.length){ box.innerHTML='<div class="ac-item" style="color:#9caaab">Tidak ada hasil</div>'; box.classList.add('show'); return; }
      box.innerHTML = rows.map(function(r){
        if(kind==='member'){
          return '<div class="ac-item" onmousedown="acPick(\''+inputId+'\',\''+r.id_member+'\')">'+
            '<b>'+esc(r.nama)+'</b> <span style="color:#9caaab">'+esc(r.id_member)+'</span>'+
            '<div style="font-size:11px;color:#9caaab">'+esc(r.status)+' · '+esc(r.kelas_jabatan||'-')+'</div></div>';
        }
        if(kind==='eksemplar' || kind==='eksemplarKembali'){
          var info = kind==='eksemplarKembali' ? 'Dipinjam: '+esc(r.peminjam||'-') : 'Tersedia · Rak '+esc(r.rak||'-');
          return '<div class="ac-item" onmousedown="acPick(\''+inputId+'\',\''+r.id_eksemplar+'\')">'+
            '<b>'+esc(r.judul)+'</b> <span style="color:#9caaab;font-family:monospace">'+esc(r.id_eksemplar)+'</span>'+
            '<div style="font-size:11px;color:#9caaab">'+esc(r.pengarang||'-')+' · '+info+'</div></div>';
        }
        var av = r.stok_tersedia>0?'<span style="color:#059669">Tersedia '+r.stok_tersedia+'</span>':'<span style="color:#e11d48">Stok kosong</span>';
        return '<div class="ac-item" onmousedown="acPick(\''+inputId+'\',\''+r.id_buku+'\')">'+
          '<b>'+esc(r.judul)+'</b> <span style="color:#9caaab">'+esc(r.id_buku)+'</span>'+
          '<div style="font-size:11px;color:#9caaab">'+esc(r.pengarang||'-')+' · '+av+'</div></div>';
      }).join('');
      box.classList.add('show');
    }).catch(function(){});
  }, 220);
}
function acPick(inputId, id){
  var inp = el(inputId); if(inp) inp.value = id;
  var box = el(inputId+'-ac'); if(box) box.classList.remove('show');
  if(inputId==='pj-member'){ var n=el('pj-buku'); if(n) setTimeout(function(){ n.focus(); },10); }
}
function acHide(inputId){ setTimeout(function(){ var b=el(inputId+'-ac'); if(b) b.classList.remove('show'); }, 150); }

/* ============================ ICONS ================================= */
var ICON = {
  book:'<path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2V5Z"/><path d="M17 3v16"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5A5 5 0 0 1 21 19"/>',
  swap:'<path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/>',
  cash:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  print:'<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M8 17h8v4H8z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  key:'<circle cx="8" cy="14" r="4"/><path d="M10.8 11.2 21 1"/><path d="M16 6l3 3M14 8l2 2"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
function svg(p, cls){ return '<svg class="'+(cls||'w-5 h-5')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; }

/* ======================================================================
   ROUTER
   ====================================================================== */
function router(){
  var h = location.hash.replace('#','') || '/';
  var parts = h.split('/').filter(Boolean); // contoh: ['admin','buku']
  window.scrollTo(0,0);

  // area admin butuh login
  if(parts[0]==='admin'){
    if(!state.token){ go('/login'); return; }
    var sub = parts[1] || 'dashboard';
    renderAdmin(sub, parts[2]);
    return;
  }
  if(h==='/login'){ renderLogin(); return; }
  if(parts[0]==='buku' && parts[1]){ renderOpacDetail(parts[1]); return; }
  renderOpac();
}
window.addEventListener('hashchange', router);

/* ======================================================================
   PORTAL PUBLIK (OPAC)
   ====================================================================== */
function shellPublic(content){
  el('app').innerHTML =
  '<header class="bg-white/70 backdrop-blur-md border-b border-platinum-200/60 sticky top-0 z-30 no-print">'+
    '<div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">'+
      '<a href="#/" class="flex items-center gap-3 min-w-0">'+
        (state.info.logo_url?'<img src="'+esc(driveImg(state.info.logo_url))+'" class="w-9 h-9 rounded-xl object-cover ring-1 ring-platinum-200 shrink-0"/>':'<div class="w-9 h-9 rounded-xl bg-emerald-600 text-white grid place-items-center shadow-sm shrink-0">'+svg(ICON.book)+'</div>')+
        '<div class="min-w-0"><div class="font-bold text-platinum-900 leading-tight tracking-tight truncate">'+esc(state.info.nama_sekolah)+'</div><div class="text-[11px] text-emerald-700/70 uppercase tracking-wider">Katalog Online</div></div>'+
      '</a>'+
      '<div class="flex items-center gap-2">'+
        darkBtn('w-9 h-9 rounded-xl grid place-items-center hover:bg-platinum-100 text-lg leading-none transition')+
        '<a href="#/login" class="inline-flex items-center gap-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-sm transition active:scale-95">'+svg(ICON.out,'w-4 h-4')+'<span class="hidden sm:inline">Masuk Petugas</span></a>'+
      '</div>'+
    '</div>'+
  '</header>'+
  '<main class="fade">'+content+'</main>'+
  '<footer class="border-t border-platinum-200/70 mt-20 py-10 text-center text-sm text-platinum-500 no-print">© '+new Date().getFullYear()+' '+esc(state.info.nama_sekolah)+' · Sistem Perpustakaan Sekolah</footer>';
}

function kartuBuku(b){
  var cover = b.cover_url ? '<img src="'+esc(driveImg(b.cover_url))+'" class="w-full h-52 object-cover group-hover:scale-105 transition duration-300" onerror="this.style.display=\'none\'"/>'
    : '<div class="w-full h-52 bg-gradient-to-br from-platinum-100 to-platinum-200 grid place-items-center text-platinum-400">'+svg(ICON.book,'w-10 h-10')+'</div>';
  var badge = b.stok_tersedia>0 ? '<span class="text-[11px] font-semibold text-emerald-700 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full shadow-sm">● Tersedia</span>'
    : '<span class="text-[11px] font-semibold text-rose-600 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full shadow-sm">● Dipinjam</span>';
  return '<a href="#/buku/'+esc(b.id_buku)+'" class="group bg-white rounded-2xl shadow-soft hover:shadow-xl overflow-hidden hover:-translate-y-1 transition border border-platinum-100 block">'+
    '<div class="relative overflow-hidden">'+cover+'<div class="absolute top-2.5 right-2.5">'+badge+'</div></div>'+
    '<div class="p-4">'+
      '<div class="font-semibold text-platinum-900 line-clamp-2 group-hover:text-emerald-700 leading-snug">'+esc(b.judul)+'</div>'+
      '<div class="text-sm text-platinum-500 mt-1 line-clamp-1">'+esc(b.pengarang||'-')+'</div>'+
      '<div class="mt-3 flex items-center gap-2 text-[11px] text-platinum-400"><span class="bg-platinum-50 px-2 py-0.5 rounded-md">'+esc(b.kategori||'Umum')+'</span><span>'+esc(b.tahun||'')+'</span></div>'+
    '</div></a>';
}

function renderOpac(){
  shellPublic(
    '<section class="hero-prem text-white relative overflow-hidden">'+
      '<div class="max-w-6xl mx-auto px-4 py-20 md:py-24 text-center relative">'+
        '<span class="inline-flex items-center gap-2 text-xs font-semibold bg-white/10 text-emerald-100 px-3 py-1 rounded-full ring-1 ring-white/15 mb-5">'+svg(ICON.book,'w-4 h-4')+esc(state.info.nama_sekolah)+'</span>'+
        '<h1 class="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">Jelajahi Koleksi <span class="text-emerald-300">Perpustakaan</span></h1>'+
        '<p class="mt-4 text-emerald-100/90 max-w-xl mx-auto text-lg">Cari ribuan judul buku &amp; cek ketersediaan real-time — tanpa perlu login.</p>'+
        '<div class="mt-8 max-w-xl mx-auto flex gap-2 bg-white/10 p-2 rounded-2xl ring-1 ring-white/15 backdrop-blur">'+
          '<input id="opac-q" placeholder="Cari judul, pengarang, kategori..." class="flex-1 min-w-0 px-4 py-3 rounded-xl text-platinum-900 outline-none" onkeydown="if(event.key===\'Enter\')opacSearch()"/>'+
          '<button onclick="opacSearch()" class="shrink-0 px-5 sm:px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl shadow-sm transition active:scale-95">Cari</button>'+
        '</div>'+
      '</div>'+
    '</section>'+
    '<div class="max-w-6xl mx-auto px-4">'+
      '<div id="opac-hasil"></div>'+
      '<section class="mt-12"><h2 class="text-xl font-bold text-platinum-900 mb-4">📚 Buku Terbaru</h2><div id="opac-terbaru" class="grid grid-cols-2 md:grid-cols-4 gap-4">'+skelKartu(4)+'</div></section>'+
      '<section class="mt-12"><h2 class="text-xl font-bold text-platinum-900 mb-4">🔥 Sering Dipinjam</h2><div id="opac-populer" class="grid grid-cols-2 md:grid-cols-4 gap-4">'+skelKartu(4)+'</div></section>'+
    '</div>'
  );
  api('opacTerbaru',{limit:8}).then(function(r){ el('opac-terbaru').innerHTML = r.length?r.map(kartuBuku).join(''):'<p class="text-platinum-400">Belum ada data.</p>'; }).catch(function(){});
  api('opacPopuler',{limit:8}).then(function(r){ el('opac-populer').innerHTML = r.length?r.map(kartuBuku).join(''):'<p class="text-platinum-400">Belum ada data.</p>'; }).catch(function(){});
}

function opacSearch(){
  var q = el('opac-q').value.trim();
  var box = el('opac-hasil');
  box.innerHTML = '<h2 class="text-xl font-bold text-platinum-900 mt-10 mb-4">Mencari…</h2><div class="grid grid-cols-2 md:grid-cols-4 gap-4">'+skelKartu(4)+'</div>';
  api('opacCari',{q:q}).then(function(r){
    if(!r.length){ box.innerHTML='<div class="py-8 text-center text-platinum-400">Tidak ada hasil untuk "'+esc(q)+'".</div>'; return; }
    box.innerHTML = '<h2 class="text-xl font-bold text-platinum-900 mt-10 mb-4">Hasil Pencarian ('+r.length+')</h2>'+
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-4">'+r.map(kartuBuku).join('')+'</div>';
  }).catch(function(e){ box.innerHTML='<div class="py-8 text-center text-rose-500">'+esc(e.message)+'</div>'; });
}

function renderOpacDetail(id){
  shellPublic('<div class="max-w-3xl mx-auto px-4 py-10" id="detail">'+
    '<div class="bg-white rounded-2xl shadow-soft border border-platinum-100 p-6 md:p-8 grid md:grid-cols-3 gap-8">'+
      '<div class="skel" style="height:288px;border-radius:12px"></div>'+
      '<div class="md:col-span-2 space-y-3">'+skelBar('70%',26)+skelBar('40%',14)+'<div style="height:8px"></div>'+skelBar('35%',26)+skelBar('100%',64)+'</div>'+
    '</div></div>');
  api('opacDetail',{id_buku:id}).then(function(b){
    if(!b){ el('detail').innerHTML='Buku tidak ditemukan.'; return; }
    var cover = b.cover_url?'<img src="'+esc(driveImg(b.cover_url))+'" class="w-full rounded-xl shadow-prem"/>':'<div class="w-full h-72 bg-gradient-to-br from-platinum-100 to-platinum-200 rounded-xl grid place-items-center text-platinum-400">'+svg(ICON.book,'w-12 h-12')+'</div>';
    el('detail').innerHTML =
      '<a href="#/" class="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-sm font-medium">&larr; Kembali ke katalog</a>'+
      '<div class="bg-white rounded-2xl shadow-soft border border-platinum-100 p-6 md:p-8 grid md:grid-cols-3 gap-8 mt-4">'+
        '<div>'+cover+'</div>'+
        '<div class="md:col-span-2">'+
          '<h1 class="text-2xl md:text-3xl font-extrabold text-platinum-900 tracking-tight">'+esc(b.judul)+'</h1>'+
          '<p class="text-platinum-500 mt-1">oleh '+esc(b.pengarang||'-')+'</p>'+
          '<div class="mt-4">'+(b.stok_tersedia>0?'<span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold ring-1 ring-emerald-100">● Tersedia ('+b.stok_tersedia+' eks.)</span>':'<span class="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-sm font-semibold ring-1 ring-rose-100">● Sedang dipinjam</span>')+'</div>'+
          '<dl class="mt-6 grid grid-cols-2 gap-4 text-sm">'+
            row('Penerbit',b.penerbit)+row('Tahun',b.tahun)+row('Kategori',b.kategori)+row('Kode',b.id_buku)+
          '</dl>'+
        '</div>'+
      '</div>';
  });
  function row(k,v){ return '<div class="bg-platinum-50/60 rounded-xl px-3 py-2"><dt class="text-platinum-400 text-xs uppercase tracking-wide">'+k+'</dt><dd class="font-semibold text-platinum-800 mt-0.5">'+esc(v||'-')+'</dd></div>'; }
}

/* ======================================================================
   LOGIN
   ====================================================================== */
function renderLogin(){
  el('app').innerHTML =
  '<div class="login-prem min-h-screen grid place-items-center px-4">'+
    '<div class="w-full max-w-sm fade">'+
      '<div class="bg-white rounded-2xl shadow-prem border border-platinum-100 p-8">'+
        '<div class="w-14 h-14 rounded-2xl bg-emerald-600 text-white grid place-items-center mx-auto shadow-prem">'+svg(ICON.book,'w-7 h-7')+'</div>'+
        '<h1 class="text-xl font-bold text-center mt-4 text-platinum-900 tracking-tight">Masuk Petugas</h1>'+
        '<p class="text-center text-sm text-platinum-500 mb-6">'+esc(state.info.nama_sekolah||'Sistem Manajemen Perpustakaan')+'</p>'+
        '<label class="text-xs font-medium text-platinum-500">Username</label>'+
        '<input id="lg-user" placeholder="Username" class="w-full mt-1 mb-3 px-4 py-3 rounded-xl border border-platinum-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"/>'+
        '<label class="text-xs font-medium text-platinum-500">Password</label>'+
        '<input id="lg-pass" type="password" placeholder="Password" class="w-full mt-1 mb-5 px-4 py-3 rounded-xl border border-platinum-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition" onkeydown="if(event.key===\'Enter\')doLogin()"/>'+
        '<button onclick="doLogin()" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm hover:shadow transition active:scale-95">Masuk</button>'+
        '<a href="#/" class="block text-center text-sm text-platinum-500 mt-5 hover:text-emerald-700">&larr; Lihat katalog publik</a>'+
      '</div>'+
      '<p class="text-center text-xs text-platinum-400 mt-4">© '+new Date().getFullYear()+' · Sistem Perpustakaan Sekolah</p>'+
    '</div>'+
  '</div>';
}
function doLogin(){
  var u=el('lg-user').value.trim(), p=el('lg-pass').value;
  if(!u||!p){ toast('Isi username & password',false); return; }
  loading(true);
  api('login',{username:u,password:p}).then(function(d){
    state.token=d.token; state.user=d.user;
    localStorage.setItem('lib_token',d.token);
    localStorage.setItem('lib_user',JSON.stringify(d.user));
    loading(false); toast('Selamat datang, '+d.user.nama); go('/admin/dashboard');
  }).catch(function(e){ loading(false); toast(e.message,false); });
}
function doLogout(){ api('logout',{}).catch(function(){}); state.token=''; state.user=null; localStorage.removeItem('lib_token'); localStorage.removeItem('lib_user'); go('/'); }

function formUbahPassword(){
  modal(
    '<div class="p-6"><div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">Ubah Password</h3><button onclick="closeModal()" class="text-platinum-400 text-xl">&times;</button></div>'+
    '<p class="text-sm text-platinum-500 mb-4">Akun: <b>'+esc(state.user?state.user.username:'')+'</b></p>'+
    '<label class="text-xs text-platinum-500">Password Lama</label>'+
    '<input id="pw-lama" type="password" class="w-full mb-3 px-4 py-2.5 rounded-xl border border-platinum-200 mt-1 outline-none focus:border-emerald-500"/>'+
    '<label class="text-xs text-platinum-500">Password Baru (min. 6 karakter)</label>'+
    '<input id="pw-baru" type="password" class="w-full mb-3 px-4 py-2.5 rounded-xl border border-platinum-200 mt-1 outline-none focus:border-emerald-500"/>'+
    '<label class="text-xs text-platinum-500">Ulangi Password Baru</label>'+
    '<input id="pw-baru2" type="password" class="w-full mb-4 px-4 py-2.5 rounded-xl border border-platinum-200 mt-1 outline-none focus:border-emerald-500" onkeydown="if(event.key===\'Enter\')doUbahPassword()"/>'+
    '<div class="flex gap-2">'+btn('Simpan','doUbahPassword()','flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl')+btn('Batal','closeModal()','px-4 py-2.5 bg-platinum-100 rounded-xl')+'</div></div>');
}
function doUbahPassword(){
  var lama=el('pw-lama').value, baru=el('pw-baru').value, baru2=el('pw-baru2').value;
  if(!lama||!baru){ toast('Lengkapi semua kolom',false); return; }
  if(baru.length<6){ toast('Password baru minimal 6 karakter',false); return; }
  if(baru!==baru2){ toast('Konfirmasi password tidak cocok',false); return; }
  loading(true);
  api('ubahPassword',{lama:lama,baru:baru}).then(function(r){ loading(false); closeModal(); toast(r.pesan); })
    .catch(function(e){ loading(false); toast(e.message,false); });
}

/* ======================================================================
   SHELL ADMIN (sidebar)
   ====================================================================== */
var MENU = [
  ['dashboard','Dashboard',ICON.home],
  ['buku','Buku',ICON.book],
  ['member','Member',ICON.users],
  ['pinjam','Peminjaman',ICON.swap],
  ['kembali','Pengembalian',ICON.swap],
  ['sirkulasi','Riwayat',ICON.swap],
  ['denda','Denda',ICON.cash],
  ['cetak','Cetak',ICON.print],
  ['user','User',ICON.key],
  ['settings','Pengaturan',ICON.gear]
];
function shellAdmin(active, content){
  var isAdmin = state.user && state.user.role==='Admin';
  var nav = MENU.filter(function(m){ return !((m[0]==='settings'||m[0]==='user') && !isAdmin); }).map(function(m){
    var on = m[0]===active;
    return '<a href="#/admin/'+m[0]+'" class="nav-link flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium '+(on?'bg-emerald-500 text-white shadow-prem':'text-emerald-50/80 hover:bg-white/10 hover:text-white')+'">'+svg(m[2])+m[1]+'</a>';
  }).join('');
  var footerLink = function(onclick,icon,label,danger){
    return '<button onclick="'+onclick+'" class="nav-link w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium '+(danger?'text-rose-200 hover:bg-rose-500/20 hover:text-white':'text-emerald-50/80 hover:bg-white/10 hover:text-white')+'">'+svg(icon)+label+'</button>';
  };
  el('app').innerHTML =
  '<div class="flex min-h-screen">'+
    '<div id="sidebar-bd" onclick="closeSidebar()" class="hidden fixed inset-0 bg-black/50 z-30 md:hidden no-print"></div>'+
    '<aside id="sidebar" class="sidebar-prem w-64 shrink-0 flex flex-col no-print fixed md:static inset-y-0 left-0 z-40 -translate-x-full md:translate-x-0 transition-transform duration-300">'+
      '<div class="flex items-center gap-3 px-5 h-16 border-b border-white/10">'+
        '<div class="w-9 h-9 rounded-xl bg-emerald-500 text-white grid place-items-center shadow-prem">'+svg(ICON.book)+'</div>'+
        '<div class="min-w-0"><div class="font-bold text-white text-sm leading-tight tracking-tight truncate">Perpustakaan</div><div class="text-[11px] text-emerald-300/80 uppercase tracking-wider">'+esc(state.user?state.user.role:'')+'</div></div>'+
        '<button onclick="closeSidebar()" class="md:hidden ml-auto text-white/70 hover:text-white text-2xl leading-none px-1">&times;</button>'+
      '</div>'+
      '<nav class="space-y-1 flex-1 p-3 overflow-y-auto">'+nav+'</nav>'+
      '<div class="p-3 border-t border-white/10 space-y-1">'+
        footerLink('window.open(\'#/\',\'_blank\')',ICON.home,'Lihat OPAC')+
        footerLink('formUbahPassword()',ICON.key,'Ubah Password')+
        footerLink('doLogout()',ICON.out,'Keluar',true)+
      '</div>'+
    '</aside>'+
    '<div class="flex-1 min-w-0">'+
      '<header class="bg-white/80 backdrop-blur-md border-b border-platinum-200/70 h-16 flex items-center justify-between px-3 md:px-6 sticky top-0 z-20 no-print">'+
        '<div class="flex items-center gap-2 min-w-0">'+
          '<button onclick="openSidebar()" class="md:hidden w-10 h-10 rounded-xl grid place-items-center hover:bg-platinum-100 text-platinum-700 transition">'+svg(ICON.menu,'w-6 h-6')+'</button>'+
          '<h1 class="font-bold text-platinum-900 capitalize text-lg tracking-tight truncate">'+active+'</h1>'+
        '</div>'+
        '<div class="flex items-center gap-1 sm:gap-2">'+
          darkBtn('w-10 h-10 rounded-xl grid place-items-center hover:bg-platinum-100 text-lg leading-none transition')+
          '<div class="flex items-center gap-2 sm:pl-1"><div class="w-9 h-9 rounded-full bg-emerald-600 text-white grid place-items-center text-sm font-bold">'+esc((state.user&&state.user.nama?state.user.nama:'?').charAt(0).toUpperCase())+'</div><span class="text-sm text-platinum-700 font-medium hidden sm:inline">'+esc(state.user?state.user.nama:'')+'</span></div>'+
        '</div>'+
      '</header>'+
      '<main class="p-4 md:p-6 pb-24 md:pb-6 fade">'+content+'</main>'+
    '</div>'+
    bottomNav(active)+
  '</div>';
}
/* Bottom navigation bar — hanya tampil di HP (md:hidden). Menu utama harian + tombol Menu (drawer). */
function bottomNav(active){
  var items=[['dashboard','Beranda',ICON.home],['pinjam','Pinjam',ICON.swap],['kembali','Kembali',ICON.swap],['sirkulasi','Riwayat',ICON.clock]];
  var li=items.map(function(m){
    var on=m[0]===active;
    return '<a href="#/admin/'+m[0]+'" class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 '+(on?'text-emerald-600':'text-platinum-500')+'">'+svg(m[2],'w-5 h-5')+'<span class="text-[10px] font-medium">'+m[1]+'</span></a>';
  }).join('');
  return '<nav class="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-platinum-200 flex no-print" style="padding-bottom:env(safe-area-inset-bottom)">'+li+
    '<button onclick="openSidebar()" class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-platinum-500">'+svg(ICON.menu,'w-5 h-5')+'<span class="text-[10px] font-medium">Menu</span></button>'+
  '</nav>';
}
function openSidebar(){ var s=el('sidebar'),b=el('sidebar-bd'); if(s){ s.classList.remove('-translate-x-full'); s.classList.add('translate-x-0'); } if(b) b.classList.remove('hidden'); }
function closeSidebar(){ var s=el('sidebar'),b=el('sidebar-bd'); if(s){ s.classList.add('-translate-x-full'); s.classList.remove('translate-x-0'); } if(b) b.classList.add('hidden'); }

function renderAdmin(sub, arg){
  var map = { dashboard:viewDashboard, buku:viewBuku, member:viewMember, pinjam:viewPinjam, kembali:viewKembali, sirkulasi:viewSirkulasi, denda:viewDenda, cetak:viewCetak, user:viewUser, settings:viewSettings };
  (map[sub]||viewDashboard)(arg);
}

/* ---- komponen kecil ---- */
function statCard(label,val,icon,warna){
  var bg=warna.split(' ')[0];
  return '<div class="relative bg-white rounded-2xl shadow-soft p-5 overflow-hidden border border-platinum-100 hover:-translate-y-0.5 hover:shadow-lg transition">'+
    '<div class="stat-blob '+bg+'"></div>'+
    '<div class="relative flex items-center justify-between"><span class="text-platinum-500 text-sm font-medium">'+label+'</span>'+
    '<span class="w-11 h-11 rounded-xl grid place-items-center '+warna+'">'+svg(icon)+'</span></div>'+
    '<div class="relative text-3xl font-extrabold text-platinum-900 mt-3 tracking-tight">'+val+'</div></div>';
}
function tableWrap(head, bodyHtml){
  return '<div class="bg-white rounded-2xl shadow-soft overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-sm">'+
    '<thead class="bg-platinum-50 text-platinum-500 text-left"><tr>'+head.map(function(h){return '<th class="px-4 py-3 font-semibold whitespace-nowrap">'+h+'</th>';}).join('')+'</tr></thead>'+
    '<tbody class="divide-y divide-platinum-100">'+bodyHtml+'</tbody></table></div></div>';
}
function btn(label,onclick,cls){ return '<button onclick="'+onclick+'" class="'+(cls||'px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition active:scale-95')+'">'+label+'</button>'; }

/* ======================================================================
   DASHBOARD
   ====================================================================== */
function viewDashboard(){
  shellAdmin('dashboard','<div id="dash"><div class="grid grid-cols-2 lg:grid-cols-4 gap-4">'+skelStat(4)+'</div><div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">'+skelStat(4)+'</div></div>');
  api('dashboard',{}).then(function(d){
    var jt = d.jatuh_tempo_dekat.map(function(x){return '<tr><td class="px-4 py-2">'+esc(x.nama)+'</td><td class="px-4 py-2">'+esc(x.judul)+'</td><td class="px-4 py-2 text-amber-600">'+tgl(x.jatuh_tempo)+'</td></tr>';}).join('')||'<tr><td colspan="3" class="px-4 py-3 text-platinum-400">Tidak ada.</td></tr>';
    var tl = d.terlambat_list.map(function(x){return '<tr><td class="px-4 py-2">'+esc(x.nama)+'</td><td class="px-4 py-2">'+esc(x.judul)+'</td><td class="px-4 py-2 text-rose-600">'+tgl(x.jatuh_tempo)+'</td></tr>';}).join('')||'<tr><td colspan="3" class="px-4 py-3 text-platinum-400">Tidak ada.</td></tr>';
    el('dash').innerHTML =
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">'+
        statCard('Judul Buku',d.total_judul,ICON.book,'bg-emerald-50 text-emerald-600')+
        statCard('Total Member',d.total_member,ICON.users,'bg-blue-50 text-blue-600')+
        statCard('Sedang Dipinjam',d.sedang_dipinjam,ICON.swap,'bg-amber-50 text-amber-600')+
        statCard('Terlambat',d.terlambat,ICON.swap,'bg-rose-50 text-rose-600')+
      '</div>'+
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">'+
        statCard('Eksemplar',d.total_eksemplar,ICON.book,'bg-platinum-100 text-platinum-600')+
        statCard('Siswa',d.total_siswa,ICON.users,'bg-emerald-50 text-emerald-600')+
        statCard('Guru',d.total_guru,ICON.users,'bg-blue-50 text-blue-600')+
        statCard('Denda Belum Bayar',rupiah(d.denda_belum),ICON.cash,'bg-rose-50 text-rose-600')+
      '</div>'+
      '<div class="grid lg:grid-cols-2 gap-4 mt-6">'+
        '<div><h3 class="font-bold text-platinum-800 mb-2">⏰ Akan Jatuh Tempo</h3>'+tableWrap(['Member','Buku','Jatuh Tempo'],jt)+'</div>'+
        '<div><h3 class="font-bold text-platinum-800 mb-2">⚠️ Terlambat</h3>'+tableWrap(['Member','Buku','Jatuh Tempo'],tl)+'</div>'+
      '</div>';
  }).catch(function(e){ el('dash').innerHTML='<p class="text-rose-500">'+esc(e.message)+'</p>'; });
}

/* ======================================================================
   BUKU
   ====================================================================== */
function viewBuku(){
  shellAdmin('buku',
    '<div class="flex flex-wrap gap-3 items-center justify-between mb-4">'+
      '<input id="buku-cari" placeholder="Cari buku..." class="px-4 py-2.5 rounded-xl border border-platinum-200 outline-none focus:border-emerald-500 w-full sm:w-64" oninput="loadBuku()"/>'+
      '<div class="flex gap-2">'+btn('⬇ Export','eksporData(\'buku\')','px-4 py-2 bg-white border border-platinum-300 text-platinum-700 hover:bg-platinum-50 text-sm font-semibold rounded-xl')+btn('⬆ Import','formImport(\'buku\')','px-4 py-2 bg-platinum-800 hover:bg-platinum-900 text-white text-sm font-semibold rounded-xl shadow-sm')+btn('+ Tambah Buku','formBuku()')+'</div>'+
    '</div><div id="buku-list">'+skelTable(6,6)+'</div>');
  loadBuku();
}
function loadBuku(){
  var q = el('buku-cari')?el('buku-cari').value:'';
  api('bukuList',{cari:q}).then(function(rows){
    var isAdmin = state.user.role==='Admin';
    var body = rows.map(function(b){
      return '<tr class="hover:bg-platinum-50">'+
        '<td class="px-4 py-3 font-mono text-xs">'+esc(b.id_buku)+'</td>'+
        '<td class="px-4 py-3"><div class="font-medium text-platinum-900">'+esc(b.judul)+'</div><div class="text-xs text-platinum-400">'+esc(b.pengarang||'')+'</div></td>'+
        '<td class="px-4 py-3">'+esc(b.kategori||'-')+'</td>'+
        '<td class="px-4 py-3">'+esc(b.rak||'-')+'</td>'+
        '<td class="px-4 py-3"><span class="'+(b.stok_tersedia>0?'text-emerald-700':'text-rose-600')+' font-semibold">'+b.stok_tersedia+'</span>/'+b.stok_total+'</td>'+
        '<td class="px-4 py-3 text-right whitespace-nowrap">'+
          '<button onclick="lihatEksemplar(\''+b.id_buku+'\')" class="text-blue-600 hover:underline text-sm mr-3">Eksemplar</button>'+
          '<button onclick=\'formBuku('+JSON.stringify(JSON.stringify(b))+')\' class="text-emerald-700 hover:underline text-sm mr-3">Edit</button>'+
          (isAdmin?'<button onclick="hapusBuku(\''+b.id_buku+'\')" class="text-rose-600 hover:underline text-sm">Hapus</button>':'')+
        '</td></tr>';
    }).join('') || '<tr><td colspan="6" class="px-4 py-8 text-center text-platinum-400">Belum ada buku.</td></tr>';
    el('buku-list').innerHTML = tableWrap(['Kode','Judul','Kategori','Rak','Stok','Aksi'],body);
  }).catch(function(e){ toast(e.message,false); });
}
function formBuku(json){
  var b = json?JSON.parse(json):{};
  modal(
    '<div class="p-6"><div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">'+(b.id_buku?'Edit':'Tambah')+' Buku</h3><button onclick="closeModal()" class="text-platinum-400 text-xl">&times;</button></div>'+
    '<div class="grid grid-cols-2 gap-3">'+
      inp('bk-judul','Judul *',b.judul,'col-span-2')+
      inp('bk-pengarang','Pengarang',b.pengarang)+inp('bk-isbn','ISBN',b.isbn)+
      inp('bk-penerbit','Penerbit',b.penerbit)+inp('bk-tahun','Tahun',b.tahun)+
      inp('bk-kategori','Kategori',b.kategori)+inp('bk-rak','Lokasi Rak',b.rak)+
      inp('bk-stok','Jumlah Eksemplar (stok total)',b.stok_total||1,'col-span-2','number')+
      '<div class="col-span-2"><label class="text-xs text-platinum-500">Cover Buku</label><input id="bk-cover" type="file" accept="image/*" class="w-full text-sm mt-1"/>'+(b.cover_url?'<img src="'+esc(driveImg(b.cover_url))+'" class="h-16 mt-2 rounded"/>':'')+'</div>'+
    '</div>'+
    '<input type="hidden" id="bk-id" value="'+esc(b.id_buku||'')+'"/><input type="hidden" id="bk-coverurl" value="'+esc(b.cover_url||'')+'"/>'+
    '<div class="flex gap-2 mt-5">'+btn('Simpan','simpanBuku()','flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl')+btn('Batal','closeModal()','px-4 py-2.5 bg-platinum-100 rounded-xl')+'</div></div>');
}
function simpanBuku(){
  var d = { id_buku:el('bk-id').value, judul:el('bk-judul').value.trim(), pengarang:el('bk-pengarang').value,
    isbn:el('bk-isbn').value, penerbit:el('bk-penerbit').value, tahun:el('bk-tahun').value,
    kategori:el('bk-kategori').value, rak:el('bk-rak').value, stok_total:el('bk-stok').value, cover_url:el('bk-coverurl').value };
  if(!d.judul){ toast('Judul wajib diisi',false); return; }
  var f = el('bk-cover').files[0];
  loading(true);
  var prep = f ? uploadFile(f,'cover').then(function(url){ d.cover_url=url; }) : Promise.resolve();
  prep.then(function(){ return api('bukuSimpan',d); }).then(function(r){ loading(false); closeModal(); toast(r.pesan); loadBuku(); })
    .catch(function(e){ loading(false); toast(e.message,false); });
}
function hapusBuku(id){ konfirmasi('Hapus buku ini?',function(){ api('bukuHapus',{id_buku:id}).then(function(r){ toast(r.pesan); loadBuku(); }).catch(function(e){ toast(e.message,false); }); }); }
function lihatEksemplar(id){
  loading(true);
  api('eksemplarList',{id_buku:id}).then(function(d){ loading(false);
    _eksLast={ judul:d.judul, rows:d.eksemplar };
    var tersedia = d.eksemplar.filter(function(e){return e.status!=='Dipinjam';}).length;
    var rowsH = d.eksemplar.map(function(e){
      var badge = e.status==='Dipinjam'?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700';
      return '<tr class="border-t border-platinum-100">'+
        '<td class="px-3 py-2 font-mono">'+esc(e.id_eksemplar)+'</td>'+
        '<td class="px-3 py-2"><span class="px-2 py-0.5 rounded-full text-xs '+badge+'">'+esc(e.status)+'</span></td>'+
        '<td class="px-3 py-2">'+(e.peminjam?esc(e.peminjam):'-')+'</td>'+
        '<td class="px-3 py-2">'+(e.jatuh_tempo?tgl(e.jatuh_tempo):'-')+'</td></tr>';
    }).join('') || '<tr><td colspan="4" class="px-3 py-3 text-platinum-400">Belum ada eksemplar.</td></tr>';
    modal('<div class="p-6"><div class="flex items-center justify-between mb-1"><h3 class="font-bold text-lg">Eksemplar Buku</h3><div class="flex items-center gap-3"><button onclick="eksporEksemplar()" class="text-sm text-emerald-700 hover:underline">⬇ Export</button><button onclick="closeModal()" class="text-platinum-400 text-xl">&times;</button></div></div>'+
      '<p class="text-sm text-platinum-500 mb-3">'+esc(d.judul)+' — <b>'+tersedia+'</b> tersedia dari '+d.eksemplar.length+'</p>'+
      '<div class="overflow-auto max-h-96 border border-platinum-100 rounded-xl"><table class="w-full text-sm"><thead class="bg-platinum-50 text-platinum-500 text-left"><tr><th class="px-3 py-2">Kode Eksemplar</th><th class="px-3 py-2">Status</th><th class="px-3 py-2">Peminjam</th><th class="px-3 py-2">Jatuh Tempo</th></tr></thead><tbody>'+rowsH+'</tbody></table></div></div>');
  }).catch(function(e){ loading(false); toast(e.message,false); });
}

/* ======================================================================
   MEMBER
   ====================================================================== */
function viewMember(){
  shellAdmin('member',
    '<div class="flex flex-wrap gap-3 items-center justify-between mb-4">'+
      '<div class="flex gap-2 w-full sm:w-auto"><input id="mb-cari" placeholder="Cari member..." class="flex-1 sm:flex-none sm:w-56 px-4 py-2.5 rounded-xl border border-platinum-200 outline-none focus:border-emerald-500" oninput="loadMember()"/>'+
      '<select id="mb-filter" onchange="loadMember()" class="px-3 py-2.5 rounded-xl border border-platinum-200"><option value="">Semua</option><option>Siswa</option><option>Guru</option></select></div>'+
      '<div class="flex gap-2">'+btn('⬇ Export','eksporData(\'member\')','px-4 py-2 bg-white border border-platinum-300 text-platinum-700 hover:bg-platinum-50 text-sm font-semibold rounded-xl')+btn('⬆ Import','formImport(\'member\')','px-4 py-2 bg-platinum-800 hover:bg-platinum-900 text-white text-sm font-semibold rounded-xl shadow-sm')+btn('+ Tambah Member','formMember()')+'</div>'+
    '</div><div id="member-list">'+skelTable(6,6)+'</div>');
  loadMember();
}
function loadMember(){
  api('memberList',{cari:el('mb-cari')?el('mb-cari').value:'', status:el('mb-filter')?el('mb-filter').value:''}).then(function(rows){
    var isAdmin = state.user.role==='Admin';
    var body = rows.map(function(m){
      return '<tr class="hover:bg-platinum-50">'+
        '<td class="px-4 py-3 font-mono text-xs">'+esc(m.id_member)+'</td>'+
        '<td class="px-4 py-3"><div class="font-medium text-platinum-900">'+esc(m.nama)+'</div><div class="text-xs text-platinum-400">'+esc(m.nis_nip||'')+'</div></td>'+
        '<td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs '+(m.status==='Guru'?'bg-blue-50 text-blue-700':'bg-emerald-50 text-emerald-700')+'">'+esc(m.status)+'</span></td>'+
        '<td class="px-4 py-3">'+esc(m.kelas_jabatan||'-')+'</td>'+
        '<td class="px-4 py-3">'+esc(m.no_wa||'-')+'</td>'+
        '<td class="px-4 py-3 text-right whitespace-nowrap">'+
          '<button onclick=\'formMember('+JSON.stringify(JSON.stringify(m))+')\' class="text-emerald-700 hover:underline text-sm mr-3">Edit</button>'+
          (isAdmin?'<button onclick="hapusMember(\''+m.id_member+'\')" class="text-rose-600 hover:underline text-sm">Hapus</button>':'')+
        '</td></tr>';
    }).join('') || '<tr><td colspan="6" class="px-4 py-8 text-center text-platinum-400">Belum ada member.</td></tr>';
    el('member-list').innerHTML = tableWrap(['ID','Nama','Status','Kelas/Jabatan','WhatsApp','Aksi'],body);
  }).catch(function(e){ toast(e.message,false); });
}
function formMember(json){
  var m = json?JSON.parse(json):{status:'Siswa'};
  modal(
    '<div class="p-6"><div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">'+(m.id_member?'Edit':'Tambah')+' Member</h3><button onclick="closeModal()" class="text-platinum-400 text-xl">&times;</button></div>'+
    '<div class="grid grid-cols-2 gap-3">'+
      '<div class="col-span-2"><label class="text-xs text-platinum-500">Status</label><select id="mb-status" class="w-full px-3 py-2.5 rounded-xl border border-platinum-200 mt-1"><option '+(m.status==='Siswa'?'selected':'')+'>Siswa</option><option '+(m.status==='Guru'?'selected':'')+'>Guru</option></select></div>'+
      inp('mb-nama','Nama *',m.nama,'col-span-2')+
      inp('mb-nisnip','NIS / NIP',m.nis_nip)+inp('mb-kelas','Kelas / Jabatan',m.kelas_jabatan)+
      '<div><label class="text-xs text-platinum-500">Jenis Kelamin</label><select id="mb-jk" class="w-full px-3 py-2.5 rounded-xl border border-platinum-200 mt-1"><option '+(m.jenis_kelamin==='L'?'selected':'')+'>L</option><option '+(m.jenis_kelamin==='P'?'selected':'')+'>P</option></select></div>'+
      inp('mb-wa','No. WhatsApp',m.no_wa)+inp('mb-tahun','Tahun Masuk',m.tahun_masuk)+
      '<div class="col-span-2"><label class="text-xs text-platinum-500">Foto</label><input id="mb-foto" type="file" accept="image/*" class="w-full text-sm mt-1"/>'+(m.foto_url?'<img src="'+esc(driveImg(m.foto_url))+'" class="h-16 mt-2 rounded"/>':'')+'</div>'+
    '</div>'+
    '<input type="hidden" id="mb-id" value="'+esc(m.id_member||'')+'"/><input type="hidden" id="mb-fotourl" value="'+esc(m.foto_url||'')+'"/>'+
    '<div class="flex gap-2 mt-5">'+btn('Simpan','simpanMember()','flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl')+btn('Batal','closeModal()','px-4 py-2.5 bg-platinum-100 rounded-xl')+'</div></div>');
}
function simpanMember(){
  var d = { id_member:el('mb-id').value, nama:el('mb-nama').value.trim(), status:el('mb-status').value,
    nis_nip:el('mb-nisnip').value, kelas_jabatan:el('mb-kelas').value, jenis_kelamin:el('mb-jk').value,
    no_wa:el('mb-wa').value, tahun_masuk:el('mb-tahun').value, foto_url:el('mb-fotourl').value };
  if(!d.nama){ toast('Nama wajib diisi',false); return; }
  var f = el('mb-foto').files[0];
  loading(true);
  var prep = f ? uploadFile(f,'foto').then(function(url){ d.foto_url=url; }) : Promise.resolve();
  prep.then(function(){ return api('memberSimpan',d); }).then(function(r){ loading(false); closeModal(); toast(r.pesan); loadMember(); })
    .catch(function(e){ loading(false); toast(e.message,false); });
}
function hapusMember(id){ konfirmasi('Hapus member ini?',function(){ api('memberHapus',{id_member:id}).then(function(r){ toast(r.pesan); loadMember(); }).catch(function(e){ toast(e.message,false); }); }); }

/* ---------- IMPORT DATA DARI FILE (.xlsx / .csv) ---------- */
var _imporRows=[];
var IMPORT_CFG = {
  member: {
    judul:'Import Member', action:'memberImport', wajib:'nama', template:'template-import-member',
    kolom:[['nama','Nama'],['status','Status'],['nis_nip','NIS/NIP'],['kelas_jabatan','Kelas/Jabatan']],
    header:['nama','status','nis_nip','kelas_jabatan','jenis_kelamin','no_wa','tahun_masuk'],
    contoh:[['Budi Santoso','Siswa','12345','X IPA 1','L','081234567890','2024'],
            ['Siti Aminah','Siswa','12346','X IPA 1','P','081234567891','2024'],
            ['Ahmad Hidayat','Guru','198001012005011001','Matematika','L','081234567892','']],
    peta:{ nama:['nama'], status:['status'], nis_nip:['nis_nip','nis','nip'], kelas_jabatan:['kelas_jabatan','kelas','jabatan'], jenis_kelamin:['jenis_kelamin','jk'], no_wa:['no_wa','wa','whatsapp'], tahun_masuk:['tahun_masuk','tahun'] },
    list:'memberList', file:'data-member',
    ekspor:[['id_member','ID'],['nama','Nama'],['status','Status'],['nis_nip','NIS/NIP'],['kelas_jabatan','Kelas/Jabatan'],['jenis_kelamin','JK'],['no_wa','No WA'],['tahun_masuk','Tahun Masuk'],['aktif','Aktif','aktif']]
  },
  buku: {
    judul:'Import Buku', action:'bukuImport', wajib:'judul', template:'template-import-buku',
    kolom:[['judul','Judul'],['pengarang','Pengarang'],['kategori','Kategori'],['stok_total','Stok']],
    header:['judul','isbn','pengarang','penerbit','tahun','kategori','rak','stok_total'],
    contoh:[['Matematika Kelas X','9786020000011','Tim Penulis','Erlangga','2023','510','R-01','5'],
            ['Sejarah Indonesia','9786020000022','Sardiman','Grafindo','2022','959.8','R-02','3']],
    peta:{ judul:['judul'], isbn:['isbn'], pengarang:['pengarang','penulis'], penerbit:['penerbit'], tahun:['tahun','tahun_terbit'], kategori:['kategori','klasifikasi','ddc'], rak:['rak','lokasi','lokasi_rak'], stok_total:['stok_total','stok','jumlah','jumlah_eksemplar','eksemplar'] },
    list:'bukuList', file:'data-buku',
    ekspor:[['id_buku','ID'],['isbn','ISBN'],['judul','Judul'],['pengarang','Pengarang'],['penerbit','Penerbit'],['tahun','Tahun'],['kategori','Kategori'],['rak','Rak'],['stok_total','Stok Total'],['stok_tersedia','Tersedia']]
  }
};
function formImport(jenis){
  _imporRows=[];
  var cfg=IMPORT_CFG[jenis];
  modal('<div class="p-6"><div class="flex items-center justify-between mb-3"><h3 class="font-bold text-lg">'+cfg.judul+' dari File</h3><button onclick="closeModal()" class="text-platinum-400 text-xl">&times;</button></div>'+
    '<ol class="text-sm text-platinum-600 list-decimal ml-5 mb-3 space-y-1">'+
      '<li>Unduh template, isi datanya (baris judul kolom jangan diubah).</li>'+
      '<li>Pilih file <b>.xlsx</b> (Excel langsung) atau <b>.csv</b> di bawah.</li>'+
      '<li>Cek pratinjau, klik <b>Proses Import</b>.</li></ol>'+
    '<div class="flex gap-4 mb-3 text-sm">'+
      '<button onclick="unduhTemplate(\''+jenis+'\',\'xlsx\')" class="text-emerald-700 hover:underline">⬇ Template .xlsx</button>'+
      '<button onclick="unduhTemplate(\''+jenis+'\',\'csv\')" class="text-emerald-700 hover:underline">⬇ Template .csv</button>'+
    '</div>'+
    '<input id="imp-file" type="file" accept=".xlsx,.xls,.csv" class="w-full text-sm mb-3 block" onchange="previewImport(\''+jenis+'\')"/>'+
    '<div id="imp-preview" class="text-sm"></div>'+
    '<div class="flex gap-2 mt-4"><button id="imp-btn" onclick="prosesImport(\''+jenis+'\')" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl opacity-50 pointer-events-none">Proses Import</button>'+btn('Batal','closeModal()','px-4 py-2.5 bg-platinum-100 rounded-xl')+'</div></div>');
}
function unduhTemplate(jenis, fmt){
  var cfg=IMPORT_CFG[jenis];
  var aoa=[cfg.header].concat(cfg.contoh);
  if(fmt==='xlsx' && typeof XLSX!=='undefined'){
    var ws=XLSX.utils.aoa_to_sheet(aoa);
    var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, cfg.template+'.xlsx');
    return;
  }
  var csv=aoa.map(function(r){ return r.map(function(c){ var s=String(c); return /[",;\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }).join(','); }).join('\n');
  var blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=cfg.template+'.csv';
  document.body.appendChild(a); a.click(); a.remove();
}
function parseCSV(text, delim){
  text=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  var rows=[],cur=[],field='',inQ=false,i=0;
  while(i<text.length){
    var c=text.charAt(i);
    if(inQ){
      if(c==='"'){ if(text.charAt(i+1)==='"'){ field+='"'; i++; } else inQ=false; }
      else field+=c;
    } else {
      if(c==='"') inQ=true;
      else if(c===delim){ cur.push(field); field=''; }
      else if(c==='\n'){ cur.push(field); rows.push(cur); cur=[]; field=''; }
      else field+=c;
    }
    i++;
  }
  if(field!==''||cur.length){ cur.push(field); rows.push(cur); }
  return rows.filter(function(r){ return r.some(function(x){ return String(x).trim()!==''; }); });
}
/* Baca file -> grid (array of arrays). Pakai SheetJS utk .xlsx, fallback CSV utk .csv. */
function bacaFileGrid(file, cb){
  var rd=new FileReader();
  var nama=String(file.name||'').toLowerCase();
  if(typeof XLSX!=='undefined' && /\.(xlsx|xls)$/.test(nama)){
    rd.onload=function(){ try{ var wb=XLSX.read(new Uint8Array(rd.result),{type:'array'}); var ws=wb.Sheets[wb.SheetNames[0]]; cb(XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false})); }catch(e){ cb(null,e.message); } };
    rd.readAsArrayBuffer(file);
  } else {
    rd.onload=function(){ try{ var t=String(rd.result).replace(/^﻿/,''); var fl=(t.split(/\r?\n/)[0])||''; var d=(fl.split(';').length>fl.split(',').length)?';':','; cb(parseCSV(t,d)); }catch(e){ cb(null,e.message); } };
    rd.readAsText(file);
  }
}
/* Map grid -> array objek sesuai peta {field:[alias,...]}. Lewati baris kosong. */
function gridKeObjek(grid, peta){
  if(!grid || grid.length<2) return [];
  var head=grid[0].map(function(h){ return String(h).trim().toLowerCase().replace(/\s+/g,'_'); });
  function col(row,aliases){ for(var i=0;i<aliases.length;i++){ var idx=head.indexOf(aliases[i]); if(idx>=0) return (row[idx]!=null?String(row[idx]):''); } return ''; }
  var out=[];
  for(var r=1;r<grid.length;r++){
    var row=grid[r]; if(!row) continue;
    var o={}, ada=false;
    for(var key in peta){ var v=String(col(row,peta[key])).trim(); o[key]=v; if(v) ada=true; }
    if(ada) out.push(o);
  }
  return out;
}
function previewImport(jenis){
  var cfg=IMPORT_CFG[jenis];
  var f=el('imp-file').files[0]; if(!f) return;
  var box=el('imp-preview'), bt=el('imp-btn');
  box.innerHTML='<span class="text-platinum-400">Membaca file…</span>';
  bacaFileGrid(f, function(grid, err){
    if(err || !grid){ box.innerHTML='<div class="text-rose-600">Gagal membaca file: '+esc(err||'format tidak dikenal')+'</div>'; bt.classList.add('opacity-50','pointer-events-none'); return; }
    var rows=gridKeObjek(grid, cfg.peta).filter(function(o){ return String(o[cfg.wajib]||'').trim()!==''; });
    _imporRows=rows;
    if(!rows.length){ box.innerHTML='<div class="text-rose-600">Tidak ada baris valid. Pastikan ada kolom "'+cfg.wajib+'".</div>'; bt.classList.add('opacity-50','pointer-events-none'); return; }
    var th=cfg.kolom.map(function(k){ return '<th class="px-2 py-1 text-left">'+k[1]+'</th>'; }).join('');
    var tb=rows.slice(0,5).map(function(o){ return '<tr class="border-t border-platinum-100">'+cfg.kolom.map(function(k){ return '<td class="px-2 py-1">'+esc(o[k[0]]||'')+'</td>'; }).join('')+'</tr>'; }).join('');
    box.innerHTML='<div class="mb-1 text-platinum-600">Terbaca <b>'+rows.length+'</b> baris. Pratinjau:</div>'+
      '<div class="border border-platinum-100 rounded-xl overflow-auto max-h-48"><table class="w-full"><thead class="bg-platinum-50 text-platinum-500"><tr>'+th+'</tr></thead><tbody>'+tb+'</tbody></table></div>'+
      (rows.length>5?'<div class="text-xs text-platinum-400 mt-1">…dan '+(rows.length-5)+' baris lainnya</div>':'');
    bt.classList.remove('opacity-50','pointer-events-none');
  });
}
function prosesImport(jenis){
  var cfg=IMPORT_CFG[jenis];
  if(!_imporRows.length){ toast('Tidak ada data untuk diimpor',false); return; }
  loading(true);
  api(cfg.action,{rows:_imporRows}).then(function(r){ loading(false); closeModal(); toast(r.pesan);
    if(r.errors&&r.errors.length) console.log('Import - baris gagal:',r.errors);
    if(jenis==='member') loadMember(); else loadBuku();
  }).catch(function(e){ loading(false); toast(e.message,false); });
}

/* ---------- EXPORT DATA KE .xlsx ---------- */
function tglFile_(){ var d=new Date(); function p(n){ return ('0'+n).slice(-2); } return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes()); }
/* kolom = [key, label, type?]  type: 'tgl' | 'aktif' */
function selEkspor_(k, v){
  var t=k[2];
  if(t==='tgl') return v?tgl(v):'';
  if(t==='aktif') return (v===false||v==='FALSE')?'Tidak':'Ya';
  return (v==null)?'':v;
}
function eksporXlsx(kolom, rows, sheet, file){
  if(typeof XLSX==='undefined'){ toast('Library Excel belum termuat, coba lagi sebentar.',false); return; }
  rows=rows||[];
  if(!rows.length){ toast('Belum ada data untuk diekspor',false); return; }
  var header=kolom.map(function(k){ return k[1]; });
  var aoa=[header].concat(rows.map(function(o){ return kolom.map(function(k){ return selEkspor_(k, o[k[0]]); }); }));
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheet);
  var nama=file+'-'+tglFile_()+'.xlsx';
  XLSX.writeFile(wb, nama);
  toast('Berhasil ekspor '+rows.length+' baris ke '+nama);
}
/* Export Member/Buku — MENGHORMATI filter & pencarian yang sedang aktif. */
function eksporData(jenis){
  var cfg=IMPORT_CFG[jenis];
  var payload = (jenis==='member')
    ? { cari: el('mb-cari')?el('mb-cari').value:'', status: el('mb-filter')?el('mb-filter').value:'' }
    : { cari: el('buku-cari')?el('buku-cari').value:'' };
  loading(true);
  api(cfg.list, payload).then(function(rows){ loading(false); eksporXlsx(cfg.ekspor, rows, cfg.judul, cfg.file); })
    .catch(function(e){ loading(false); toast(e.message,false); });
}
var KOL_SIRKULASI=[['id_transaksi','Transaksi'],['nama_member','Member'],['judul','Buku'],['id_buku','Eksemplar'],['tgl_pinjam','Pinjam','tgl'],['jatuh_tempo','Jatuh Tempo','tgl'],['tgl_kembali','Kembali','tgl'],['status','Status'],['denda','Denda'],['status_denda','Status Denda'],['petugas','Petugas']];
var KOL_DENDA=[['id_transaksi','Transaksi'],['nama_member','Member'],['judul','Buku'],['id_buku','Eksemplar'],['denda','Denda'],['status_denda','Status']];
var KOL_EKS=[['id_eksemplar','Kode Eksemplar'],['status','Status'],['peminjam','Peminjam'],['jatuh_tempo','Jatuh Tempo','tgl']];
function eksporSirkulasi(){
  loading(true);
  api('sirkulasiList',{cari:el('sk-cari')?el('sk-cari').value:'', status:el('sk-status')?el('sk-status').value:''})
    .then(function(rows){ loading(false); eksporXlsx(KOL_SIRKULASI, rows, 'Sirkulasi', 'data-sirkulasi'); })
    .catch(function(e){ loading(false); toast(e.message,false); });
}
function eksporDenda(){
  loading(true);
  api('dendaList',{status_denda:el('dn-status')?el('dn-status').value:''})
    .then(function(rows){ loading(false); eksporXlsx(KOL_DENDA, rows, 'Denda', 'data-denda'); })
    .catch(function(e){ loading(false); toast(e.message,false); });
}
var _eksLast={judul:'',rows:[]};
function eksporEksemplar(){
  if(!_eksLast.rows.length){ toast('Tidak ada data eksemplar',false); return; }
  eksporXlsx(KOL_EKS, _eksLast.rows, 'Eksemplar', 'eksemplar-'+String(_eksLast.judul||'').replace(/[^a-zA-Z0-9]+/g,'_').slice(0,30));
}

/* ======================================================================
   PEMINJAMAN
   ====================================================================== */
function viewPinjam(){
  shellAdmin('pinjam',
    '<div class="max-w-lg bg-white rounded-2xl shadow-soft p-6">'+
      '<h3 class="font-bold text-lg mb-1">Peminjaman Buku</h3><p class="text-sm text-platinum-500 mb-5">Scan ID, atau ketik nama/judul lalu pilih dari daftar.</p>'+
      '<label class="text-xs text-platinum-500">ID Member <span class="text-platinum-400">— ketik nama untuk mencari</span></label>'+
      '<div class="relative mb-3">'+
        '<input id="pj-member" placeholder="cth: SW0001 atau ketik nama" autocomplete="off" class="w-full px-4 py-3 rounded-xl border border-platinum-200 outline-none focus:border-emerald-500 font-mono" oninput="acSearch(\'member\',\'pj-member\')" onblur="acHide(\'pj-member\')" onkeydown="if(event.key===\'Enter\'){acHide(\'pj-member\');el(\'pj-buku\').focus()}"/>'+
        '<div id="pj-member-ac" class="ac-box"></div>'+
      '</div>'+
      '<label class="text-xs text-platinum-500">Eksemplar Buku <span class="text-platinum-400">— ketik judul, pilih eksemplar yang tersedia</span></label>'+
      '<div class="relative mb-4">'+
        '<input id="pj-buku" placeholder="cth: BK0001-02 atau ketik judul" autocomplete="off" class="w-full px-4 py-3 rounded-xl border border-platinum-200 outline-none focus:border-emerald-500 font-mono" oninput="acSearch(\'eksemplar\',\'pj-buku\')" onblur="acHide(\'pj-buku\')" onkeydown="if(event.key===\'Enter\'){acHide(\'pj-buku\');doPinjam()}"/>'+
        '<div id="pj-buku-ac" class="ac-box"></div>'+
      '</div>'+
      btn('Proses Pinjam','doPinjam()','w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl')+
      '<div id="pj-hasil" class="mt-4"></div>'+
    '</div>');
  setTimeout(function(){ var x=el('pj-member'); if(x)x.focus(); },100);
}
function doPinjam(){
  var idm=el('pj-member').value.trim(), idb=el('pj-buku').value.trim();
  if(!idm||!idb){ toast('Lengkapi ID member & kode buku',false); return; }
  loading(true);
  api('pinjam',{id_member:idm,id_buku:idb}).then(function(r){ loading(false);
    el('pj-hasil').innerHTML='<div class="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm">✓ '+esc(r.pesan)+'</div>';
    el('pj-member').value=''; el('pj-buku').value=''; el('pj-member').focus(); toast('Peminjaman berhasil');
  }).catch(function(e){ loading(false); el('pj-hasil').innerHTML='<div class="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">✗ '+esc(e.message)+'</div>'; });
}

/* ======================================================================
   PENGEMBALIAN
   ====================================================================== */
function viewKembali(){
  shellAdmin('kembali',
    '<div class="max-w-lg bg-white rounded-2xl shadow-soft p-6">'+
      '<h3 class="font-bold text-lg mb-1">Pengembalian Buku</h3><p class="text-sm text-platinum-500 mb-5">Scan kode transaksi/buku, atau ketik judul lalu pilih dari daftar.</p>'+
      '<div class="relative mb-4">'+
        '<input id="kb-input" placeholder="Kode transaksi / eksemplar / ketik judul yang dipinjam" autocomplete="off" class="w-full px-4 py-3 rounded-xl border border-platinum-200 outline-none focus:border-emerald-500 font-mono" oninput="acSearch(\'eksemplarKembali\',\'kb-input\')" onblur="acHide(\'kb-input\')" onkeydown="if(event.key===\'Enter\'){acHide(\'kb-input\');doKembali()}"/>'+
        '<div id="kb-input-ac" class="ac-box"></div>'+
      '</div>'+
      btn('Proses Kembali','doKembali()','w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl')+
      '<div id="kb-hasil" class="mt-4"></div>'+
    '</div>');
  setTimeout(function(){ var x=el('kb-input'); if(x)x.focus(); },100);
}
function doKembali(){
  var v=el('kb-input').value.trim();
  if(!v){ toast('Masukkan kode',false); return; }
  var d = v.toUpperCase().indexOf('TRX')===0 ? {id_transaksi:v} : {id_buku:v};
  loading(true);
  api('kembali',d).then(function(r){ loading(false);
    var warna = r.denda>0?'bg-amber-50 text-amber-800':'bg-emerald-50 text-emerald-800';
    el('kb-hasil').innerHTML='<div class="p-4 rounded-xl '+warna+' text-sm">'+esc(r.pesan)+'</div>';
    el('kb-input').value=''; el('kb-input').focus(); toast('Pengembalian diproses');
  }).catch(function(e){ loading(false); el('kb-hasil').innerHTML='<div class="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">✗ '+esc(e.message)+'</div>'; });
}

/* ======================================================================
   SIRKULASI / RIWAYAT
   ====================================================================== */
function viewSirkulasi(){
  shellAdmin('sirkulasi',
    '<div class="flex flex-wrap gap-2 mb-4">'+
      '<input id="sk-cari" placeholder="Cari..." class="px-4 py-2.5 rounded-xl border border-platinum-200 w-56" oninput="loadSirkulasi()"/>'+
      '<select id="sk-status" onchange="loadSirkulasi()" class="px-3 py-2.5 rounded-xl border border-platinum-200"><option value="">Semua status</option><option>Dipinjam</option><option>Terlambat</option><option>Dikembalikan</option></select>'+
      btn('⬇ Export','eksporSirkulasi()','px-4 py-2.5 bg-white border border-platinum-300 text-platinum-700 hover:bg-platinum-50 text-sm font-semibold rounded-xl')+
    '</div><div id="sk-list">'+skelTable(8,6)+'</div>');
  loadSirkulasi();
}
function loadSirkulasi(){
  api('sirkulasiList',{cari:el('sk-cari')?el('sk-cari').value:'', status:el('sk-status')?el('sk-status').value:''}).then(function(rows){
    var body = rows.map(function(t){
      var badge = {'Dipinjam':'bg-amber-50 text-amber-700','Terlambat':'bg-rose-50 text-rose-700','Dikembalikan':'bg-emerald-50 text-emerald-700'}[t.status]||'';
      var aksi='';
      if(t.status==='Dipinjam'||t.status==='Terlambat'){
        aksi='<button onclick="kirimReminder(\''+t.id_transaksi+'\')" class="text-emerald-700 hover:underline mr-2">WA</button>'+
             '<button onclick="perpanjang(\''+t.id_transaksi+'\')" class="text-blue-600 hover:underline">Perpanjang</button>';
      }
      return '<tr class="hover:bg-platinum-50">'+
        '<td class="px-4 py-3 font-mono text-xs">'+esc(t.id_transaksi)+'</td>'+
        '<td class="px-4 py-3">'+esc(t.nama_member)+'</td>'+
        '<td class="px-4 py-3"><div>'+esc(t.judul)+'</div><div class="text-xs text-platinum-400 font-mono">'+esc(t.id_buku)+'</div></td>'+
        '<td class="px-4 py-3 whitespace-nowrap">'+tgl(t.tgl_pinjam)+'</td>'+
        '<td class="px-4 py-3 whitespace-nowrap">'+tgl(t.jatuh_tempo)+'</td>'+
        '<td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs '+badge+'">'+esc(t.status)+'</span></td>'+
        '<td class="px-4 py-3">'+(t.denda>0?rupiah(t.denda):'-')+'</td>'+
        '<td class="px-4 py-3 text-right whitespace-nowrap text-sm">'+aksi+'</td></tr>';
    }).join('') || '<tr><td colspan="8" class="px-4 py-8 text-center text-platinum-400">Belum ada transaksi.</td></tr>';
    el('sk-list').innerHTML = tableWrap(['Transaksi','Member','Buku','Pinjam','Jatuh Tempo','Status','Denda','Aksi'],body);
  }).catch(function(e){ toast(e.message,false); });
}
function kirimReminder(id){ loading(true); api('kirimReminder',{id_transaksi:id}).then(function(r){ loading(false); toast(r.pesan); }).catch(function(e){ loading(false); toast(e.message,false); }); }
function perpanjang(id){ api('perpanjang',{id_transaksi:id}).then(function(r){ toast(r.pesan); loadSirkulasi(); }).catch(function(e){ toast(e.message,false); }); }

/* ======================================================================
   DENDA
   ====================================================================== */
function viewDenda(){
  shellAdmin('denda',
    '<div class="flex gap-2 mb-4"><select id="dn-status" onchange="loadDenda()" class="px-3 py-2.5 rounded-xl border border-platinum-200"><option value="">Semua</option><option>Belum dibayar</option><option>Lunas</option></select>'+btn('⬇ Export','eksporDenda()','px-4 py-2.5 bg-white border border-platinum-300 text-platinum-700 hover:bg-platinum-50 text-sm font-semibold rounded-xl')+'</div>'+
    '<div id="dn-list">'+skelTable(6,5)+'</div>');
  loadDenda();
}
function loadDenda(){
  api('dendaList',{status_denda:el('dn-status')?el('dn-status').value:''}).then(function(rows){
    var total=0; rows.forEach(function(t){ if(t.status_denda==='Belum dibayar') total+=parseInt(t.denda,10)||0; });
    var body = rows.map(function(t){
      var lunas = t.status_denda==='Lunas';
      return '<tr class="hover:bg-platinum-50"><td class="px-4 py-3 font-mono text-xs">'+esc(t.id_transaksi)+'</td>'+
        '<td class="px-4 py-3">'+esc(t.nama_member)+'</td><td class="px-4 py-3">'+esc(t.judul)+'</td>'+
        '<td class="px-4 py-3 font-semibold text-rose-600">'+rupiah(t.denda)+'</td>'+
        '<td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs '+(lunas?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700')+'">'+esc(t.status_denda)+'</span></td>'+
        '<td class="px-4 py-3 text-right">'+(lunas?'':'<button onclick="dendaLunas(\''+t.id_transaksi+'\')" class="text-emerald-700 hover:underline text-sm">Tandai Lunas</button>')+'</td></tr>';
    }).join('') || '<tr><td colspan="6" class="px-4 py-8 text-center text-platinum-400">Tidak ada denda.</td></tr>';
    el('dn-list').innerHTML = '<div class="bg-rose-50 text-rose-800 rounded-2xl p-4 mb-4 font-semibold">Total denda belum dibayar: '+rupiah(total)+'</div>'+
      tableWrap(['Transaksi','Member','Buku','Denda','Status','Aksi'],body);
  }).catch(function(e){ toast(e.message,false); });
}
function dendaLunas(id){ api('dendaLunas',{id_transaksi:id}).then(function(r){ toast(r.pesan); loadDenda(); }).catch(function(e){ toast(e.message,false); }); }

/* ======================================================================
   CETAK (Kartu / Surat Bebas Pustaka / Laporan)
   ====================================================================== */
function viewCetak(){
  shellAdmin('cetak',
    '<div class="grid md:grid-cols-3 gap-4">'+
      cetakCard('Kartu Member','Cetak kartu ber-barcode (per member / batch).','kartu')+
      cetakCard('Label Buku','Barcode per eksemplar — judul sama, kode berbeda.','label')+
      cetakCard('Surat Bebas Pustaka','Verifikasi tanggungan & terbitkan surat siswa.','surat')+
      cetakCard('Laporan','Katalog, member, sirkulasi, denda (filter periode).','laporan')+
    '</div>'+
    '<div id="cetak-panel" class="mt-6"></div>'+
    '<div id="print-area" class="print-area" style="display:none"></div>');
}
function cetakCard(judul,desc,key){
  return '<button onclick="panelCetak(\''+key+'\')" class="text-left bg-white rounded-2xl shadow-soft p-5 hover:-translate-y-1 transition">'+
    '<div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center mb-3">'+svg(ICON.print)+'</div>'+
    '<div class="font-bold text-platinum-900">'+judul+'</div><div class="text-sm text-platinum-500 mt-1">'+desc+'</div></button>';
}
function panelCetak(key){
  var p = el('cetak-panel');
  if(key==='kartu'){
    p.innerHTML='<div class="bg-white rounded-2xl shadow-soft p-5"><h3 class="font-bold mb-3">Cetak Kartu Member</h3>'+
      '<p class="text-sm text-platinum-500 mb-3">Kosongkan untuk mencetak semua, atau pilih beberapa member.</p>'+
      '<div id="kartu-pilih">Memuat...</div>'+
      '<div class="flex flex-wrap gap-2 mt-4">'+
        '<button onclick="cetakKartu(\'print\')" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl">🖨️ Cetak</button>'+
        '<button onclick="cetakKartu(\'pdf\')" class="px-5 py-2.5 bg-platinum-700 hover:bg-platinum-800 text-white font-semibold rounded-xl">📄 Simpan PDF ke Drive</button>'+
      '</div></div>';
    api('memberList',{}).then(function(rows){
      el('kartu-pilih').innerHTML='<div class="grid sm:grid-cols-2 gap-2 max-h-60 overflow-auto">'+rows.map(function(m){
        return '<label class="flex items-center gap-2 text-sm p-2 rounded hover:bg-platinum-50"><input type="checkbox" class="kartu-cb" value="'+m.id_member+'"/> '+esc(m.nama)+' <span class="text-platinum-400 text-xs">('+m.id_member+')</span></label>';
      }).join('')+'</div>';
    });
  } else if(key==='label'){
    p.innerHTML='<div class="bg-white rounded-2xl shadow-soft p-5"><h3 class="font-bold mb-3">Cetak Label Barcode Buku</h3>'+
      '<p class="text-sm text-platinum-500 mb-3">Tiap eksemplar judul yang sama mendapat kode unik (mis. BK0001-01, BK0001-02). Kosongkan = semua buku.</p>'+
      '<div id="label-pilih">Memuat...</div>'+
      '<div class="flex flex-wrap gap-2 mt-4">'+
        '<button onclick="cetakLabel(\'print\')" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl">🖨️ Cetak</button>'+
        '<button onclick="cetakLabel(\'pdf\')" class="px-5 py-2.5 bg-platinum-700 hover:bg-platinum-800 text-white font-semibold rounded-xl">📄 Simpan PDF ke Drive</button>'+
      '</div></div>';
    api('bukuList',{}).then(function(rows){
      el('label-pilih').innerHTML='<div class="grid sm:grid-cols-2 gap-2 max-h-60 overflow-auto">'+rows.map(function(b){
        return '<label class="flex items-center gap-2 text-sm p-2 rounded hover:bg-platinum-50"><input type="checkbox" class="label-cb" value="'+b.id_buku+'"/> '+esc(b.judul)+' <span class="text-platinum-400 text-xs">('+b.id_buku+' ×'+b.stok_total+')</span></label>';
      }).join('')+'</div>';
    });
  } else if(key==='surat'){
    p.innerHTML='<div class="bg-white rounded-2xl shadow-soft p-5 max-w-md"><h3 class="font-bold mb-3">Surat Bebas Pustaka</h3>'+
      '<input id="surat-id" placeholder="ID Member (cth SW0001)" class="w-full mb-3 px-4 py-2.5 rounded-xl border border-platinum-200 font-mono"/>'+
      '<div class="flex flex-wrap gap-2">'+
        '<button onclick="cetakSurat(\'print\')" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl">🖨️ Verifikasi &amp; Cetak</button>'+
        '<button onclick="cetakSurat(\'pdf\')" class="px-5 py-2.5 bg-platinum-700 hover:bg-platinum-800 text-white font-semibold rounded-xl">📄 Simpan PDF</button>'+
      '</div>'+
      '<div id="surat-info" class="mt-3"></div></div>';
  } else {
    p.innerHTML='<div class="bg-white rounded-2xl shadow-soft p-5"><h3 class="font-bold mb-3">Cetak Laporan</h3>'+
      '<div class="flex flex-wrap gap-2 items-end">'+
        '<div><label class="text-xs text-platinum-500">Jenis</label><select id="lap-jenis" class="block px-3 py-2.5 rounded-xl border border-platinum-200 mt-1"><option value="katalog">Katalog Buku</option><option value="member">Daftar Member</option><option value="sirkulasi">Sirkulasi</option><option value="denda">Denda</option></select></div>'+
        '<div><label class="text-xs text-platinum-500">Dari</label><input id="lap-dari" type="date" class="block px-3 py-2.5 rounded-xl border border-platinum-200 mt-1"/></div>'+
        '<div><label class="text-xs text-platinum-500">Sampai</label><input id="lap-sampai" type="date" class="block px-3 py-2.5 rounded-xl border border-platinum-200 mt-1"/></div>'+
        '<button onclick="cetakLaporan(\'print\')" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl">🖨️ Cetak</button>'+
        '<button onclick="cetakLaporan(\'pdf\')" class="px-5 py-2.5 bg-platinum-700 hover:bg-platinum-800 text-white font-semibold rounded-xl">📄 Simpan PDF</button>'+
      '</div></div>';
  }
}
function kop(s){
  return '<div style="display:flex;align-items:center;gap:16px;border-bottom:3px double #333;padding-bottom:12px;margin-bottom:16px">'+
    (s.logo?'<img src="'+esc(driveImg(s.logo))+'" style="width:70px;height:70px;object-fit:contain"/>':'')+
    '<div style="text-align:center;flex:1"><div style="font-size:20px;font-weight:800">'+esc(s.nama)+'</div><div style="font-size:13px">'+esc(s.alamat||'')+'</div></div></div>';
}
function doPrint(html){
  var a=el('print-area'); a.innerHTML=html; a.style.display='block';
  var w=window.open('','_blank');
  w.document.write('<html><head><title>Cetak</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#222}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f0f0f0}</style></head><body>'+html+'</body></html>');
  w.document.close(); setTimeout(function(){ w.print(); },400);
  a.style.display='none';
}
/* Simpan HTML sebagai PDF ke Google Drive (lewat backend), lalu buka linknya. */
function simpanPdfDrive(nama, html){
  loading(true);
  api('simpanPdf',{nama:nama,html:html}).then(function(d){ loading(false);
    toast('PDF tersimpan ke Drive: '+d.nama);
    window.open(d.url,'_blank');
  }).catch(function(e){ loading(false); toast(e.message,false); });
}
/* Hasilkan barcode sebagai data-URI PNG (self-contained) supaya ikut tercetak
   di PDF maupun jendela cetak tanpa perlu memuat JsBarcode lagi. */
function barcodeDataUrl(code){
  try{
    var c=document.createElement('canvas');
    JsBarcode(c, String(code), {format:'CODE128',displayValue:true,fontSize:13,height:34,margin:0,width:1.6});
    return c.toDataURL('image/png');
  }catch(e){ return ''; }
}
function cetakKartu(mode){
  var ids=[].slice.call(document.querySelectorAll('.kartu-cb:checked')).map(function(c){return c.value;});
  loading(true);
  api('cetakKartu',{ids:ids}).then(function(d){ loading(false);
    var cards = d.members.map(function(m){
      var bc = barcodeDataUrl(m.id_member);
      return '<div style="display:inline-block;width:320px;height:200px;border:1px solid #047857;border-radius:12px;margin:6px;padding:12px;box-sizing:border-box;vertical-align:top">'+
        '<div style="display:flex;align-items:center;gap:8px;border-bottom:2px solid #047857;padding-bottom:6px">'+
        (d.sekolah.logo_data?'<img src="'+d.sekolah.logo_data+'" style="width:32px;height:32px;object-fit:contain"/>':'')+
        '<div style="font-weight:700;font-size:13px">'+esc(d.sekolah.nama)+'</div></div>'+
        '<div style="display:flex;gap:10px;margin-top:8px">'+
          (m.foto_data?'<img src="'+m.foto_data+'" style="width:64px;height:80px;object-fit:cover;border-radius:6px"/>':'<div style="width:64px;height:80px;background:#eee;border-radius:6px"></div>')+
          '<div style="font-size:12px"><div style="font-weight:700;font-size:14px">'+esc(m.nama)+'</div><div>'+esc(m.status)+'</div><div>'+esc(m.nis_nip||'')+'</div><div>'+esc(m.kelas_jabatan||'')+'</div></div>'+
        '</div>'+
        (bc?'<img src="'+bc+'" style="width:100%;height:40px;object-fit:contain;margin-top:6px"/>':'<div style="text-align:center;font-family:monospace;margin-top:10px">'+esc(m.id_member)+'</div>')+
      '</div>';
    }).join('') || '<p>Tidak ada member.</p>';
    if(mode==='pdf') simpanPdfDrive('Kartu_Member', cards);
    else doPrint(cards);
  }).catch(function(e){ loading(false); toast(e.message,false); });
}
function cetakLabel(mode){
  var ids=[].slice.call(document.querySelectorAll('.label-cb:checked')).map(function(c){return c.value;});
  loading(true);
  api('labelBuku',{ids:ids}).then(function(d){ loading(false);
    var labels = d.labels.map(function(l){
      var bc = barcodeDataUrl(l.kode);
      return '<div style="display:inline-block;width:200px;height:96px;border:1px solid #999;border-radius:6px;margin:4px;padding:6px;box-sizing:border-box;vertical-align:top;overflow:hidden">'+
        '<div style="font-size:10px;font-weight:700;line-height:1.2;height:24px;overflow:hidden">'+esc(l.judul)+'</div>'+
        (bc?'<img src="'+bc+'" style="width:100%;height:40px;object-fit:contain"/>':'<div style="font-family:monospace;text-align:center">'+esc(l.kode)+'</div>')+
        '<div style="font-size:9px;color:#555;display:flex;justify-content:space-between"><span>'+esc(d.sekolah.nama)+'</span><span>Rak: '+esc(l.rak||'-')+'</span></div>'+
      '</div>';
    }).join('') || '<p>Tidak ada buku.</p>';
    var html='<div style="font-family:Arial,sans-serif">'+labels+'</div>';
    if(mode==='pdf') simpanPdfDrive('Label_Buku', html);
    else doPrint(html);
  }).catch(function(e){ loading(false); toast(e.message,false); });
}
function cetakSurat(mode){
  var id=el('surat-id').value.trim();
  if(!id){ toast('Isi ID member',false); return; }
  loading(true);
  api('cetakSurat',{id_member:id}).then(function(d){ loading(false);
    var m=d.member, s=d.sekolah;
    var html = kop(s)+
      '<div style="text-align:center;font-weight:700;text-decoration:underline;margin:12px 0">SURAT KETERANGAN BEBAS PUSTAKA<br/><span style="font-weight:400;font-size:13px">Nomor: '+esc(d.nomor_surat)+'</span></div>'+
      '<p style="font-size:14px;line-height:1.8">Yang bertanda tangan di bawah ini, Kepala Perpustakaan '+esc(s.nama)+', menerangkan bahwa:</p>'+
      '<table style="font-size:14px;margin:8px 0;border:none"><tr><td style="border:none;width:140px">Nama</td><td style="border:none">: '+esc(m.nama)+'</td></tr>'+
      '<tr><td style="border:none">NIS</td><td style="border:none">: '+esc(m.nis_nip||'-')+'</td></tr>'+
      '<tr><td style="border:none">Kelas</td><td style="border:none">: '+esc(m.kelas_jabatan||'-')+'</td></tr></table>'+
      '<p style="font-size:14px;line-height:1.8">telah menyelesaikan seluruh kewajiban dan <b>tidak memiliki tanggungan</b> pinjaman buku maupun denda di perpustakaan sekolah. Surat ini dapat digunakan sebagaimana mestinya.</p>'+
      '<div style="display:flex;justify-content:flex-end;margin-top:40px"><div style="text-align:center;font-size:14px">'+esc(s.alamat?'':'')+'<div>'+d.tanggal+'</div><div>Kepala Perpustakaan</div><div style="height:70px"></div><div style="font-weight:700;text-decoration:underline">'+esc(s.kepala_perpus)+'</div></div></div>';
    el('surat-info').innerHTML='<div class="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm">✓ Bebas tanggungan. '+(mode==='pdf'?'Menyimpan PDF...':'Mencetak surat...')+'</div>';
    if(mode==='pdf') simpanPdfDrive('Surat_Bebas_Pustaka_'+id, html);
    else doPrint(html);
  }).catch(function(e){ loading(false);
    // backend mengirim daftar tanggungan via error message
    el('surat-info').innerHTML='<div class="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">✗ '+esc(e.message)+' Member masih punya buku/denda tertunggak.</div>';
  });
}
function cetakLaporan(mode){
  var jenis=el('lap-jenis').value;
  loading(true);
  api('laporan',{jenis:jenis,dari:el('lap-dari').value,sampai:el('lap-sampai').value}).then(function(d){ loading(false);
    var cols, rowsHtml;
    if(jenis==='katalog'){ cols=['Kode','Judul','Pengarang','Kategori','Stok'];
      rowsHtml=d.rows.map(function(b){return '<tr><td>'+esc(b.id_buku)+'</td><td>'+esc(b.judul)+'</td><td>'+esc(b.pengarang||'')+'</td><td>'+esc(b.kategori||'')+'</td><td>'+b.stok_tersedia+'/'+b.stok_total+'</td></tr>';}).join(''); }
    else if(jenis==='member'){ cols=['ID','Nama','Status','Kelas/Jabatan','WA'];
      rowsHtml=d.rows.map(function(m){return '<tr><td>'+esc(m.id_member)+'</td><td>'+esc(m.nama)+'</td><td>'+esc(m.status)+'</td><td>'+esc(m.kelas_jabatan||'')+'</td><td>'+esc(m.no_wa||'')+'</td></tr>';}).join(''); }
    else { cols=['Transaksi','Member','Buku','Pinjam','Jatuh Tempo','Status','Denda'];
      rowsHtml=d.rows.map(function(t){return '<tr><td>'+esc(t.id_transaksi)+'</td><td>'+esc(t.nama_member)+'</td><td>'+esc(t.judul)+'</td><td>'+tgl(t.tgl_pinjam)+'</td><td>'+tgl(t.jatuh_tempo)+'</td><td>'+esc(t.status)+'</td><td>'+rupiah(t.denda)+'</td></tr>';}).join(''); }
    var html = kop(d.kop)+'<h3 style="text-align:center;margin:6px 0">LAPORAN '+jenis.toUpperCase()+'</h3>'+
      '<table><thead><tr>'+cols.map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead><tbody>'+(rowsHtml||'<tr><td colspan="'+cols.length+'">Tidak ada data</td></tr>')+'</tbody></table>'+
      '<div style="text-align:right;margin-top:30px;font-size:13px">Mengetahui,<br/>Kepala Perpustakaan<br/><br/><br/><b>'+esc(d.kop.kepala_perpus||'')+'</b></div>';
    if(mode==='pdf') simpanPdfDrive('Laporan_'+jenis, html);
    else doPrint(html);
  }).catch(function(e){ loading(false); toast(e.message,false); });
}

/* ======================================================================
   KELOLA USER (Admin)
   ====================================================================== */
function viewUser(){
  if(state.user.role!=='Admin'){ shellAdmin('user','<p class="text-rose-500">Khusus Admin.</p>'); return; }
  shellAdmin('user',
    '<div class="flex items-center justify-between mb-4"><div><h3 class="font-bold text-lg">Kelola User</h3><p class="text-sm text-platinum-500">Tambah/ubah petugas & admin, reset password, aktif/nonaktif.</p></div>'+btn('+ Tambah User','formUser()')+'</div>'+
    '<div id="user-list">'+skelTable(6,5)+'</div>');
  loadUser();
}
function loadUser(){
  api('userList',{}).then(function(rows){
    var body=rows.map(function(u){
      return '<tr class="hover:bg-platinum-50">'+
        '<td class="px-4 py-3 font-mono text-xs">'+esc(u.id)+'</td>'+
        '<td class="px-4 py-3 font-medium text-platinum-900">'+esc(u.username)+'</td>'+
        '<td class="px-4 py-3">'+esc(u.nama)+'</td>'+
        '<td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs '+(u.role==='Admin'?'bg-blue-50 text-blue-700':'bg-emerald-50 text-emerald-700')+'">'+esc(u.role)+'</span></td>'+
        '<td class="px-4 py-3">'+(u.aktif?'<span class="text-emerald-700 text-sm">Aktif</span>':'<span class="text-platinum-400 text-sm">Nonaktif</span>')+'</td>'+
        '<td class="px-4 py-3 text-right whitespace-nowrap">'+
          '<button onclick="resetUserPw(\''+u.id+'\',\''+esc(u.username)+'\')" class="text-amber-600 hover:underline text-sm mr-3">Reset PW</button>'+
          '<button onclick=\'formUser('+JSON.stringify(JSON.stringify(u))+')\' class="text-emerald-700 hover:underline text-sm mr-3">Edit</button>'+
          '<button onclick="hapusUser(\''+u.id+'\')" class="text-rose-600 hover:underline text-sm">Hapus</button>'+
        '</td></tr>';
    }).join('')||'<tr><td colspan="6" class="px-4 py-8 text-center text-platinum-400">Belum ada user.</td></tr>';
    el('user-list').innerHTML=tableWrap(['ID','Username','Nama','Role','Status','Aksi'],body);
  }).catch(function(e){ toast(e.message,false); });
}
function formUser(json){
  var u=json?JSON.parse(json):{role:'Petugas',aktif:true};
  modal('<div class="p-6"><div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">'+(u.id?'Edit':'Tambah')+' User</h3><button onclick="closeModal()" class="text-platinum-400 text-xl">&times;</button></div>'+
    inp('us-username','Username',u.username,'mb-3')+
    inp('us-nama','Nama Lengkap',u.nama,'mb-3')+
    '<div class="mb-3"><label class="text-xs text-platinum-500">Role</label><select id="us-role" class="w-full px-3 py-2.5 rounded-xl border border-platinum-200 mt-1"><option '+(u.role==='Petugas'?'selected':'')+'>Petugas</option><option '+(u.role==='Admin'?'selected':'')+'>Admin</option></select></div>'+
    (u.id
      ? '<label class="flex items-center gap-2 text-sm mb-1"><input type="checkbox" id="us-aktif" '+(u.aktif?'checked':'')+'/> Akun aktif</label><p class="text-xs text-platinum-400">Untuk ganti password, pakai tombol <b>Reset PW</b>.</p>'
      : inp('us-pass','Password Awal (min. 6 karakter)','','','password'))+
    '<input type="hidden" id="us-id" value="'+esc(u.id||'')+'"/>'+
    '<div class="flex gap-2 mt-5">'+btn('Simpan','simpanUser()','flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl')+btn('Batal','closeModal()','px-4 py-2.5 bg-platinum-100 rounded-xl')+'</div></div>');
}
function simpanUser(){
  var d={ id:el('us-id').value, username:el('us-username').value.trim(), nama:el('us-nama').value.trim(), role:el('us-role').value };
  var ak=el('us-aktif'); if(ak) d.aktif=ak.checked;
  var pw=el('us-pass'); if(pw) d.password=pw.value;
  if(!d.username||!d.nama){ toast('Username & nama wajib diisi',false); return; }
  loading(true);
  api('userSimpan',d).then(function(r){ loading(false); closeModal(); toast(r.pesan); loadUser(); }).catch(function(e){ loading(false); toast(e.message,false); });
}
function resetUserPw(id,username){
  modal('<div class="p-6"><h3 class="font-bold text-lg mb-1">Reset Password</h3><p class="text-sm text-platinum-500 mb-4">User: <b>'+esc(username)+'</b></p>'+
    '<input id="rs-pw" type="password" placeholder="Password baru (min. 6 karakter)" class="w-full mb-4 px-4 py-2.5 rounded-xl border border-platinum-200 outline-none focus:border-emerald-500" onkeydown="if(event.key===\'Enter\')doResetUserPw(\''+id+'\')"/>'+
    '<div class="flex gap-2">'+btn('Reset','doResetUserPw(\''+id+'\')','flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl')+btn('Batal','closeModal()','px-4 py-2.5 bg-platinum-100 rounded-xl')+'</div></div>');
}
function doResetUserPw(id){
  var pw=el('rs-pw').value;
  if(pw.length<6){ toast('Password minimal 6 karakter',false); return; }
  loading(true);
  api('userResetPassword',{id:id,baru:pw}).then(function(r){ loading(false); closeModal(); toast(r.pesan); }).catch(function(e){ loading(false); toast(e.message,false); });
}
function hapusUser(id){ konfirmasi('Hapus user ini?',function(){ api('userHapus',{id:id}).then(function(r){ toast(r.pesan); loadUser(); }).catch(function(e){ toast(e.message,false); }); }); }

/* ======================================================================
   PENGATURAN (Admin)
   ====================================================================== */
function viewSettings(){
  if(state.user.role!=='Admin'){ shellAdmin('settings','<p class="text-rose-500">Khusus Admin.</p>'); return; }
  shellAdmin('settings','<div id="set-form"><div class="grid lg:grid-cols-2 gap-6">'+
    '<div class="bg-white rounded-2xl shadow-soft border border-platinum-100 p-5 space-y-3">'+skelBar('40%',14)+skelBar('100%',40)+skelBar('100%',40)+skelBar('100%',40)+'</div>'+
    '<div class="bg-white rounded-2xl shadow-soft border border-platinum-100 p-5 space-y-3">'+skelBar('40%',14)+skelBar('100%',40)+skelBar('100%',40)+skelBar('100%',40)+'</div>'+
    '</div></div>');
  api('getSettings',{}).then(function(s){
    el('set-form').innerHTML=
    '<div class="grid lg:grid-cols-2 gap-6">'+
      '<div class="bg-white rounded-2xl shadow-soft p-5 space-y-3"><h3 class="font-bold">Identitas Sekolah</h3>'+
        sInp('nama_sekolah','Nama Sekolah',s.nama_sekolah)+sInp('alamat_sekolah','Alamat',s.alamat_sekolah)+
        sInp('kepala_sekolah','Kepala Sekolah',s.kepala_sekolah)+sInp('kepala_perpus','Kepala Perpustakaan',s.kepala_perpus)+
        '<div><label class="text-xs text-platinum-500">Logo</label><input id="set-logo-file" type="file" accept="image/*" class="w-full text-sm mt-1"/>'+(s.logo_url?'<img src="'+esc(driveImg(s.logo_url))+'" class="h-12 mt-2"/>':'')+'<input type="hidden" id="set-logo_url" value="'+esc(s.logo_url||'')+'"/></div>'+
      '</div>'+
      '<div class="bg-white rounded-2xl shadow-soft p-5 space-y-3"><h3 class="font-bold">Aturan Peminjaman</h3>'+
        sInp('lama_pinjam_siswa','Lama Pinjam Siswa (hari)',s.lama_pinjam_siswa,'number')+
        sInp('lama_pinjam_guru','Lama Pinjam Guru (hari)',s.lama_pinjam_guru,'number')+
        sInp('tarif_denda','Tarif Denda / hari (Rp)',s.tarif_denda,'number')+
        sInp('maks_pinjam','Maksimal Buku / Member',s.maks_pinjam,'number')+
        sInp('hari_peringatan','Reminder berapa hari sebelum jatuh tempo',s.hari_peringatan,'number')+
      '</div>'+
      '<div class="bg-white rounded-2xl shadow-soft p-5 space-y-3 lg:col-span-2"><h3 class="font-bold">WhatsApp (Fonnte) & Drive</h3>'+
        '<div class="grid md:grid-cols-2 gap-3">'+sInp('fonnte_token','Token Fonnte',s.fonnte_token)+sInp('fonnte_pengirim','Nomor Pengirim',s.fonnte_pengirim)+'</div>'+
        '<div><label class="text-xs text-platinum-500">Template Pesan WA</label><textarea id="set-template_wa" rows="3" class="w-full px-3 py-2.5 rounded-xl border border-platinum-200 mt-1">'+esc(s.template_wa)+'</textarea><p class="text-xs text-platinum-400 mt-1">Placeholder: {nama} {judul} {jatuh_tempo} {sekolah}</p></div>'+
        sInp('drive_folder_id','ID Folder Google Drive (aset)',s.drive_folder_id)+
      '</div>'+
    '</div>'+
    '<button onclick="simpanSettings()" class="mt-5 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl">Simpan Pengaturan</button>';
  }).catch(function(e){ el('set-form').innerHTML='<p class="text-rose-500">'+esc(e.message)+'</p>'; });
}
function sInp(key,label,val,type){ return '<div><label class="text-xs text-platinum-500">'+label+'</label><input id="set-'+key+'" type="'+(type||'text')+'" value="'+esc(val==null?'':val)+'" class="w-full px-3 py-2.5 rounded-xl border border-platinum-200 mt-1"/></div>'; }
function simpanSettings(){
  var keys=['nama_sekolah','alamat_sekolah','kepala_sekolah','kepala_perpus','logo_url','lama_pinjam_siswa','lama_pinjam_guru','tarif_denda','maks_pinjam','hari_peringatan','fonnte_token','fonnte_pengirim','template_wa','drive_folder_id'];
  var d={}; keys.forEach(function(k){ var x=el('set-'+k); if(x) d[k]=x.value; });
  var f=el('set-logo-file').files[0];
  loading(true);
  var prep = f ? uploadFile(f,'logo').then(function(url){ d.logo_url=url; }) : Promise.resolve();
  prep.then(function(){ return api('saveSettings',d); }).then(function(r){ loading(false); toast(r.pesan); state.info.nama_sekolah=d.nama_sekolah; state.info.logo_url=d.logo_url; })
    .catch(function(e){ loading(false); toast(e.message,false); });
}

/* ======================================================================
   HELPER: input field, konfirmasi, upload file (base64 -> Drive)
   ====================================================================== */
function inp(id,label,val,span,type){
  return '<div class="'+(span||'')+'"><label class="text-xs text-platinum-500">'+label+'</label>'+
    '<input id="'+id+'" type="'+(type||'text')+'" value="'+esc(val==null?'':val)+'" class="w-full px-3 py-2.5 rounded-xl border border-platinum-200 mt-1 outline-none focus:border-emerald-500"/></div>';
}
function konfirmasi(pesan,cb){
  modal('<div class="p-6"><p class="text-platinum-800 font-medium">'+esc(pesan)+'</p><div class="flex gap-2 mt-5">'+
    '<button onclick="closeModal();(window.__cb&&window.__cb())" class="flex-1 py-2.5 bg-rose-600 text-white font-semibold rounded-xl">Ya, lanjutkan</button>'+
    '<button onclick="closeModal()" class="px-4 py-2.5 bg-platinum-100 rounded-xl">Batal</button></div></div>');
  window.__cb=cb;
}
function uploadFile(file,jenis){
  return new Promise(function(resolve,reject){
    var r=new FileReader();
    r.onload=function(){
      var b64=r.result.split(',')[1];
      api('upload',{base64:b64,mime:file.type,nama:jenis+'_'+Date.now(),jenis:jenis})
        .then(function(d){ resolve(d.url); }).catch(reject);
    };
    r.onerror=reject; r.readAsDataURL(file);
  });
}

/* ======================================================================
   BOOT
   ====================================================================== */
(function init(){
  try {
    applyDark();
    router();
    el('app').setAttribute('data-ok','1');
  } catch(err){
    el('app').innerHTML = '<div style="padding:24px;font-family:monospace;color:#b91c1c">Boot error: '+(err&&err.message?err.message:err)+'</div>';
    return;
  }
  setupPWA(); // manifest awal (ikon default) supaya bisa dipasang sejak awal
  // ambil identitas sekolah utk header publik (tidak memblokir tampilan)
  api('opacInfo',{}).then(function(i){ if(i){ state.info=i; setupPWA(); if(!location.hash || location.hash==='#/') router(); } }).catch(function(){});
})();
