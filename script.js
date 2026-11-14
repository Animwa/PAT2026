const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw18Ipc2XNWjw8tdhn0XMLwyz1AFyTjedOdclTiEk-cYhnP6X7z5K0MjXKkM8JaSD-m/exec";

let masterGenerus = [];
let globalPresensi = [];
let globalRundown = [];
let globalKegiatan = [];
let clickCounter = 0;
let isAdminLoggedIn = false;

const jenjangRanking = {
  'pra-remaja': 1,
  'pra remaja': 1,
  'remaja': 2,
  'muda-mudi': 3,
  'muda mudi': 3,
  'mt': 4
};

function getJenjangScore(val) {
  if (!val) return 99;
  const clean = String(val).trim().toLowerCase();
  return jenjangRanking[clean] || 99;
}

window.onload = () => {
  loadDataSilent();
};

document.addEventListener('contextmenu', event => event.preventDefault());

function triggerAdminLoginPrompt() {
  clickCounter++;
  if (clickCounter >= 5) {
    clickCounter = 0;
    promptAdminLogin();
  }
}

async function promptAdminLogin() {
  const { value: pin } = await Swal.fire({
    title: '🔐 Login Admin Sekretariat',
    input: 'password',
    inputPlaceholder: 'Masukkan PIN Admin',
    showCancelButton: true,
    confirmButtonText: 'Masuk',
    cancelButtonText: 'Batal'
  });

  if (!pin) return;

  try {
    const ua = encodeURIComponent(navigator.userAgent);
    const res = await fetch(`${SCRIPT_URL}?mode=admin&pin=${pin}&ua=${ua}`);
    const data = await res.json();

    if (data.status === 'error') {
      Swal.fire('Gagal', data.message, 'error');
      return;
    }

    isAdminLoggedIn = true;
    document.getElementById("btn-admin-badge").classList.remove('hidden');
    document.getElementById("admin-dashboard-controls").classList.remove('hidden');
    document.getElementById("btn-open-peserta").classList.remove('hidden');

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Admin berhasil masuk! Menu kelola aktif.',
      showConfirmButton: false,
      timer: 1500
    });

    renderDashboardRundown(globalRundown);
    renderDashboardKegiatan(globalKegiatan);
    if (!document.getElementById("subcontent-riwayat").classList.contains('hidden')) {
      renderRiwayatDesaKelompok();
    }
  } catch (err) {
    Swal.fire('Error', 'Gagal menghubungkan ke server.', 'error');
  }
}

function logoutAdmin() {
  isAdminLoggedIn = false;
  document.getElementById("btn-admin-badge").classList.add('hidden');
  document.getElementById("admin-dashboard-controls").classList.add('hidden');
  document.getElementById("btn-open-peserta").classList.add('hidden');
  document.getElementById("form-rundown-box").classList.add('hidden');
  document.getElementById("form-kegiatan-box").classList.add('hidden');
  document.getElementById("form-peserta-box").classList.add('hidden');

  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'info',
    title: 'Admin keluar.',
    showConfirmButton: false,
    timer: 1000
  });

  renderDashboardRundown(globalRundown);
  renderDashboardKegiatan(globalKegiatan);
  renderRiwayatDesaKelompok();
}

function switchTab(tab) {
  ['dashboard', 'presensi', 'saran'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
    document.getElementById(`nav-${t}`).className = "flex flex-col items-center text-slate-400 text-xs font-bold gap-1 transition";
  });
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.getElementById(`nav-${tab}`).className = "flex flex-col items-center text-emerald-400 text-xs font-bold gap-1 transition";
}

function switchPresensiSubTab(sub) {
  ['form', 'riwayat'].forEach(s => {
    document.getElementById(`subcontent-${s}`).classList.add('hidden');
    document.getElementById(`subtab-${s}`).className = "flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl text-slate-400 transition";
  });
  document.getElementById(`subcontent-${sub}`).classList.remove('hidden');
  document.getElementById(`subtab-${sub}`).className = "flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 text-white transition";
  
  if (sub === 'form') {
    const savedDesa = localStorage.getItem('last_desa');
    const savedKelompok = localStorage.getItem('last_kelompok');
    if (savedDesa && savedKelompok) renderBynameList();
  } else if (sub === 'riwayat') {
    populateRiwayatFilters();
    renderRiwayatDesaKelompok();
  }
}

async function loadDataSilent() {
  try {
    const res = await fetch(SCRIPT_URL);
    const data = await res.json();
    masterGenerus = data.generus || [];
    globalPresensi = data.riwayat || [];
    globalRundown = data.rundown || [];
    globalKegiatan = data.kegiatan || [];

    renderDashboardRundown(globalRundown);
    renderDashboardKegiatan(globalKegiatan);

    const desaUnik = [...new Set(masterGenerus.map(item => item.desa))].filter(Boolean).sort();
    const selDesa = document.getElementById("select-desa");
    
    selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>';
    desaUnik.forEach(d => selDesa.innerHTML += `<option value="${d}">${d}</option>`);

    const savedDesa = localStorage.getItem('last_desa');
    if (savedDesa && desaUnik.includes(savedDesa)) {
      selDesa.value = savedDesa;
      filterKelompok(true);
    }

    renderSaran(data.saranList || []);
  } catch (err) {
    console.error("Gagal memuat data:", err);
  }
}

function filterKelompok(isRestore = false) {
  const desa = document.getElementById("select-desa").value;
  const selKelompok = document.getElementById("select-kelompok");
  
  selKelompok.innerHTML = '<option value="">-- Pilih Desa Dulu --</option>';
  selKelompok.disabled = true;
  document.getElementById("container-byname").innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Silakan pilih kelompok terlebih dahulu.</p>';

  if (!desa) return;

  localStorage.setItem('last_desa', desa);

  const kelompokUnik = [...new Set(masterGenerus.filter(g => g.desa === desa).map(g => g.kelompok))].filter(Boolean).sort();
  selKelompok.innerHTML = '<option value="">-- Pilih Kelompok --</option>';
  kelompokUnik.forEach(k => selKelompok.innerHTML += `<option value="${k}">${k}</option>`);
  selKelompok.disabled = false;

  if (isRestore) {
    const savedKelompok = localStorage.getItem('last_kelompok');
    if (savedKelompok && kelompokUnik.includes(savedKelompok)) {
      selKelompok.value = savedKelompok;
      renderBynameList();
    }
  }
}

function resetDesaKelompok() {
  localStorage.removeItem('last_desa');
  localStorage.removeItem('last_kelompok');
  document.getElementById("select-desa").value = "";
  const selKelompok = document.getElementById("select-kelompok");
  selKelompok.innerHTML = '<option value="">-- Pilih Desa Dulu --</option>';
  selKelompok.disabled = true;
  document.getElementById("container-byname").innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Silakan pilih Desa dan Kelompok di atas.</p>';
}

function renderBynameList() {
  const desa = document.getElementById("select-desa").value;
  const kelompok = document.getElementById("select-kelompok").value;
  const container = document.getElementById("container-byname");

  if (!desa || !kelompok) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Silakan pilih Desa dan Kelompok.</p>';
    return;
  }

  localStorage.setItem('last_kelompok', kelompok);

  const listPeserta = masterGenerus.filter(g => {
    if (g.desa !== desa || g.kelompok !== kelompok) return false;
    const sudahAbsen = globalPresensi.some(x => String(x.nama).trim().toLowerCase() === String(g.nama).trim().toLowerCase() && String(x.kelompok).trim().toLowerCase() === String(kelompok).trim().toLowerCase());
    return !sudahAbsen;
  });

  if (!listPeserta.length) {
    container.innerHTML = `
      <div class="bg-emerald-900/20 border border-emerald-700/50 p-8 rounded-2xl text-center space-y-2">
        <span class="text-3xl">🎉</span>
        <h4 class="font-bold text-emerald-400 text-sm">Alhamdulillah, Semua Selesai!</h4>
        <p class="text-xs text-slate-300">Seluruh generus di kelompok ${kelompok} sudah diabsen.</p>
      </div>
    `;
    return;
  }

  const jenjangGroups = {};
  listPeserta.forEach(p => {
    const j = p.jenjang || 'Lainnya';
    if (!jenjangGroups[j]) jenjangGroups[j] = [];
    jenjangGroups[j].push(p);
  });

  const sortedJenjangKeys = Object.keys(jenjangGroups).sort((a, b) => getJenjangScore(a) - getJenjangScore(b));

  let htmlContent = `
    <div class="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 mb-2">
      <span class="text-xs font-bold text-slate-300">⚡ Aksi Cepat Kelompok</span>
      <button onclick="hadirkanSemuaKelompok()" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow">
        ✅ Hadirkan Semua Belum Absen (${listPeserta.length} Orang)
      </button>
    </div>
  `;

  htmlContent += sortedJenjangKeys.map(jenjang => {
    const members = jenjangGroups[jenjang].sort((a,b) => a.nama.localeCompare(b.nama));
    return `
      <div class="bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-700 space-y-3 shadow-lg">
        <div class="flex justify-between items-center border-b border-slate-700 pb-2">
          <h3 class="font-bold text-xs sm:text-sm text-emerald-400 uppercase tracking-wide">📍 Jenjang: ${jenjang}</h3>
          <span class="bg-slate-700 text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">${members.length} Orang</span>
        </div>
        <div class="space-y-2">
          ${members.map(p => `
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p class="font-bold text-slate-100 text-xs sm:text-sm">${p.nama}</p>
                <p class="text-[10px] text-slate-400">Desa: ${p.desa} • Jenjang: ${p.jenjang || '-'}</p>
              </div>
              <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button onclick="submitPresensiByname('${p.nama}', '${p.kelompok}', '${p.jenjang}', 'Hadir')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow">Hadir</button>
                <button onclick="submitPresensiByname('${p.nama}', '${p.kelompok}', '${p.jenjang}', 'Izin')" class="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow">Izin</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = htmlContent;
}

async function submitPresensiByname(nama, kelompok, jenjang, status) {
  let keterangan = status === 'Hadir' ? 'Hadir di lokasi' : '';
  
  if (status === 'Izin') {
    const { value: text } = await Swal.fire({
      title: 'Wajib Mengisi Keterangan Izin',
      input: 'text',
      inputPlaceholder: 'Contoh: Sakit / Acara Keluarga',
      showCancelButton: true,
      confirmButtonText: 'Kirim Izin',
      cancelButtonText: 'Batal',
      inputValidator: (value) => !value ? 'Keterangan izin tidak boleh kosong!' : null
    });
    if (!text) return;
    keterangan = text;
  }

  globalPresensi = globalPresensi.filter(x => String(x.nama).trim().toLowerCase() !== String(nama).trim().toLowerCase());

  globalPresensi.unshift({
    nama: nama,
    kelompok: kelompok,
    jenjang: jenjang,
    status: status,
    ket: keterangan,
    waktu: new Date().toLocaleTimeString()
  });

  renderBynameList();

  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: `${nama} (${status})`,
    showConfirmButton: false,
    timer: 300,
    timerProgressBar: false
  });

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "presensi", nama, kelompok, jenjang, status, keterangan })
  }).catch(err => console.error("Sync error:", err));
}

// Hadirkan Semua: Hanya memproses yang belum absen sama sekali (yang sudah izin tetap aman)
async function hadirkanSemuaKelompok() {
  const desa = document.getElementById("select-desa").value;
  const kelompok = document.getElementById("select-kelompok").value;
  if (!desa || !kelompok) return;

  const listPeserta = masterGenerus.filter(g => {
    if (g.desa !== desa || g.kelompok !== kelompok) return false;
    const existing = globalPresensi.find(x => String(x.nama).trim().toLowerCase() === String(g.nama).trim().toLowerCase());
    return !existing; // Hanya yang belum absen sama sekali
  });

  if (!listPeserta.length) return;

  if (!confirm(`Hadirkan ${listPeserta.length} orang yang belum absen di kelompok ${kelompok}?`)) return;

  listPeserta.forEach(p => {
    globalPresensi.unshift({
      nama: p.nama,
      kelompok: kelompok,
      jenjang: p.jenjang,
      status: 'Hadir',
      ket: 'Hadir di lokasi',
      waktu: new Date().toLocaleTimeString()
    });

    fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "presensi", nama: p.nama, kelompok: kelompok, jenjang: p.jenjang, status: 'Hadir', keterangan: 'Hadir di lokasi' })
    }).catch(e => {});
  });

  renderBynameList();

  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: 'Anggota berhasil di-hadirkan!',
    showConfirmButton: false,
    timer: 500
  });
}

function populateRiwayatFilters() {
  const desaUnik = [...new Set(masterGenerus.map(m => m.desa))].filter(Boolean).sort();
  const kelUnik = [...new Set(masterGenerus.map(m => m.kelompok))].filter(Boolean).sort();

  const selDesa = document.getElementById("riwayat-filter-desa");
  const currentDesa = selDesa.value;
  selDesa.innerHTML = '<option value="">-- Semua Desa --</option>';
  desaUnik.forEach(d => selDesa.innerHTML += `<option value="${d}">${d}</option>`);
  selDesa.value = currentDesa;

  const selKel = document.getElementById("riwayat-filter-kelompok");
  const currentKel = selKel.value;
  selKel.innerHTML = '<option value="">-- Semua Kelompok --</option>';
  kelUnik.forEach(k => selKel.innerHTML += `<option value="${k}">${k}</option>`);
  selKel.value = currentKel;
}

function renderRiwayatDesaKelompok() {
  const container = document.getElementById("list-riwayat-all");
  const filterDesaVal = document.getElementById("riwayat-filter-desa").value;
  const filterKelVal = document.getElementById("riwayat-filter-kelompok").value;

  let desaList = [...new Set(masterGenerus.map(m => m.desa))].filter(Boolean).sort();
  if (filterDesaVal) desaList = [filterDesaVal];

  if (!desaList.length) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center col-span-full">Tidak ada data desa.</p>';
    return;
  }

  let totalAll = 0, hadirAll = 0, izinAll = 0, belumAll = 0;

  container.innerHTML = desaList.map(desa => {
    let kelompokDiDesa = [...new Set(masterGenerus.filter(m => m.desa === desa).map(m => m.kelompok))].filter(Boolean).sort();
    if (filterKelVal) {
      kelompokDiDesa = kelompokDiDesa.filter(k => k === filterKelVal);
      if (!kelompokDiDesa.length) return '';
    }

    return `
      <div class="col-span-full bg-slate-800/90 border border-slate-700 p-4 sm:p-5 rounded-2xl shadow space-y-4">
        <div class="flex justify-between items-center border-b border-slate-700 pb-2">
          <h3 class="font-black text-base text-emerald-400">🏘️ Desa: ${desa}</h3>
          <span class="text-xs bg-slate-700 px-2.5 py-1 rounded-full font-semibold text-slate-300">Jumlah Kelompok: ${kelompokDiDesa.length}</span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${kelompokDiDesa.map(kel => {
            const anggota = masterGenerus.filter(m => m.desa === desa && m.kelompok === kel);
            
            let total = anggota.length;
            let hadir = 0, izin = 0, belumHadir = 0;

            const detailAnggota = anggota.map(a => {
              const abs = globalPresensi.find(x => String(x.nama).trim().toLowerCase() === String(a.nama).trim().toLowerCase());
              const st = abs ? abs.status : 'Belum Absen';
              
              if (st === 'Hadir') hadir++;
              else if (st === 'Izin') izin++;
              else belumHadir++;

              return { ...a, status: st, ket: abs ? abs.ket : '' };
            });

            totalAll += total;
            hadirAll += hadir;
            izinAll += izin;
            belumAll += belumHadir;

            detailAnggota.sort((a, b) => {
              const scoreA = getJenjangScore(a.jenjang);
              const scoreB = getJenjangScore(b.jenjang);
              if (scoreA !== scoreB) return scoreA - scoreB;
              return a.nama.localeCompare(b.nama);
            });

            return `
              <div class="bg-slate-900 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div class="border-b border-slate-800 pb-2 space-y-1">
                  <div class="flex justify-between items-center">
                    <h4 class="font-bold text-slate-100 text-sm">Kelompok: ${kel}</h4>
                    <span class="text-[11px] bg-emerald-900/40 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-700/50">Total: ${total}</span>
                  </div>
                  <div class="flex gap-2 text-[10px] font-semibold pt-1">
                    <span class="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Hadir: ${hadir}</span>
                    <span class="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Izin: ${izin}</span>
                    <span class="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">Belum: ${belumHadir}</span>
                  </div>
                </div>

                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  ${detailAnggota.map(a => {
                    const badge = a.status === 'Hadir' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : a.status === 'Izin' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-slate-400 bg-slate-800 border-slate-700';
                    return `
                      <div class="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50 flex justify-between items-center text-xs">
                        <div>
                          <span class="font-semibold text-slate-200">${a.nama}</span>
                          <p class="text-[10px] text-slate-400">Jenjang: <span class="text-teal-300 font-medium">${a.jenjang || '-'}</span> ${a.ket ? '• ' + a.ket : ''}</p>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${badge}">${a.status}</span>
                          ${isAdminLoggedIn && a.status !== 'Belum Absen' ? `<button onclick="adminResetPresensi('${a.nama}')" title="Ubah ke Belum Absen" class="bg-rose-600 hover:bg-rose-500 text-white p-1 rounded text-[9px] font-bold">↺</button>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById("sum-total").innerText = totalAll;
  document.getElementById("sum-hadir").innerText = hadirAll;
  document.getElementById("sum-izin").innerText = izinAll;
  document.getElementById("sum-belum").innerText = belumAll;
}

async function adminResetPresensi(nama) {
  if (!confirm(`Kembalikan status "${nama}" menjadi Belum Absen?`)) return;
  
  globalPresensi = globalPresensi.filter(x => String(x.nama).trim().toLowerCase() !== String(nama).trim().toLowerCase());
  
  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "reset_presensi", nama })
  });

  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${nama} direset ke Belum Absen`, showConfirmButton: false, timer: 800 });
  renderRiwayatDesaKelompok();
  if (!document.getElementById("subcontent-form").classList.contains('hidden')) {
    renderBynameList();
  }
}

// ---------------- RUNDOWN & KEGIATAN MANAJEMEN ---------------- //

function openFormRundown(id = '', mulai = '', selesai = '', nama = '', ket = '') {
  document.getElementById("form-rundown-box").classList.remove('hidden');
  document.getElementById("rd-id").value = id;
  document.getElementById("rd-mulai").value = mulai;
  document.getElementById("rd-selesai").value = selesai;
  document.getElementById("rd-nama").value = nama;
  document.getElementById("rd-ket").value = ket;
}

async function saveRundown() {
  const id = document.getElementById("rd-id").value;
  const mulai = document.getElementById("rd-mulai").value;
  const selesai = document.getElementById("rd-selesai").value;
  const nama = document.getElementById("rd-nama").value;
  const ket = document.getElementById("rd-ket").value;

  if (!mulai || !selesai || !nama) return alert("Lengkapi jam dan nama kegiatan!");

  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "save_rundown", id, mulai, selesai, nama, ket })
  });

  document.getElementById("form-rundown-box").classList.add('hidden');
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Rundown disimpan!', showConfirmButton: false, timer: 800 });
  loadDataSilent();
}

async function deleteRundown(id) {
  if (!confirm("Hapus rundown ini?")) return;
  await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete_rundown", id }) });
  loadDataSilent();
}

// Uraian Tanpa Batas Handler
function openFormKegiatan(id = '', nama = '', uraianArr = []) {
  document.getElementById("form-kegiatan-box").classList.remove('hidden');
  document.getElementById("kg-id").value = id;
  document.getElementById("kg-nama").value = nama;
  
  const container = document.getElementById("container-uraian-inputs");
  container.innerHTML = '';
  
  if (uraianArr.length === 0) {
    tambahInputUraian('');
  } else {
    uraianArr.forEach(u => tambahInputUraian(u));
  }
}

function tambahInputUraian(val = '') {
  const container = document.getElementById("container-uraian-inputs");
  const div = document.createElement('div');
  div.className = "flex gap-2 items-center";
  div.innerHTML = `
    <input type="text" value="${val}" placeholder="Poin uraian..." class="input-uraian w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs">
    <button onclick="this.parentElement.remove()" class="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-2 rounded-lg text-xs font-bold">✕</button>
  `;
  container.appendChild(div);
}

async function saveKegiatan() {
  const id = document.getElementById("kg-id").value;
  const nama = document.getElementById("kg-nama").value;
  const inputElements = document.querySelectorAll(".input-uraian");
  let uraianList = [];
  inputElements.forEach(el => {
    if (el.value.trim()) uraianList.push(el.value.trim());
  });

  if (!nama) return alert("Nama kegiatan wajib diisi!");

  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "save_kegiatan", id, nama, uraian: uraianList })
  });

  document.getElementById("form-kegiatan-box").classList.add('hidden');
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Kegiatan disimpan!', showConfirmButton: false, timer: 800 });
  loadDataSilent();
}

async function deleteKegiatan(id) {
  if (!confirm("Hapus kegiatan ini?")) return;
  await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete_kegiatan", id }) });
  loadDataSilent();
}

function openFormTambahPeserta() {
  const box = document.getElementById("form-peserta-box");
  box.classList.toggle('hidden');
}

async function saveNewGenerus() {
  const nama = document.getElementById("add-nama").value.trim();
  const kelompok = document.getElementById("add-kelompok").value.trim();
  const desa = document.getElementById("add-desa").value.trim();
  const jenjang = document.getElementById("add-jenjang").value;

  if (!nama || !kelompok || !desa) return alert("Nama, Kelompok, dan Desa wajib diisi!");

  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "add_generus", nama, kelompok, desa, jenjang })
  });

  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Peserta ditambahkan!', showConfirmButton: false, timer: 800 });
  document.getElementById("add-nama").value = "";
  document.getElementById("add-kelompok").value = "";
  document.getElementById("add-desa").value = "";
  document.getElementById("form-peserta-box").classList.add('hidden');
  loadDataSilent();
}

function renderDashboardRundown(list) {
  const container = document.getElementById("dynamic-rundown");
  if (!list.length) { container.innerHTML = '<p class="text-xs text-slate-400">Belum ada rundown.</p>'; return; }
  container.innerHTML = list.map(r => `
    <div class="relative group">
      <span class="font-bold text-emerald-400">${r.mulai} - ${r.selesai} WIB</span>
      <p class="text-slate-300 font-medium mt-0.5">${r.nama}</p>
      ${r.ket ? `<p class="text-[11px] text-slate-400">${r.ket}</p>` : ''}
      ${isAdminLoggedIn ? `
        <div class="flex gap-1 mt-1">
          <button onclick="openFormRundown('${r.id}', '${r.mulai}', '${r.selesai}', '${r.nama}', '${r.ket}')" class="text-[10px] bg-amber-600 px-2 py-0.5 rounded text-white font-bold">Edit</button>
          <button onclick="deleteRundown('${r.id}')" class="text-[10px] bg-rose-600 px-2 py-0.5 rounded text-white font-bold">Hapus</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function renderDashboardKegiatan(list) {
  const container = document.getElementById("dynamic-kegiatan");
  if (!list.length) { container.innerHTML = '<p class="text-xs text-slate-400">Belum ada kegiatan.</p>'; return; }
  container.innerHTML = list.map(k => `
    <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5 relative">
      <div class="flex justify-between items-start">
        <h4 class="font-bold text-teal-300 text-xs sm:text-sm">📌 ${k.nama}</h4>
        ${isAdminLoggedIn ? `
          <div class="flex gap-1">
            <button onclick='openFormKegiatan("${k.id}", "${k.nama}", ${JSON.stringify(k.uraian)})' class="text-[10px] bg-amber-600 px-2 py-0.5 rounded text-white font-bold">Edit</button>
            <button onclick="deleteKegiatan('${k.id}')" class="text-[10px] bg-rose-600 px-2 py-0.5 rounded text-white font-bold">Hapus</button>
          </div>
        ` : ''}
      </div>
      <ul class="list-disc list-inside text-[11px] text-slate-300 space-y-1">
        ${k.uraian.map(u => `<li>${u}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

async function kirimSaran() {
  const pengirim = document.getElementById("saran-nama").value;
  const pesan = document.getElementById("saran-pesan").value;
  if (!pesan.trim()) return alert("Tuliskan pesan saran terlebih dahulu.");

  await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "saran", pengirim, pesan }) });
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Saran dikirim!', showConfirmButton: false, timer: 800 });
  document.getElementById("saran-pesan").value = "";
  loadDataSilent();
}

function renderSaran(list) {
  const container = document.getElementById("list-saran");
  if (!list.length) { container.innerHTML = '<p class="text-xs text-slate-400 text-center">Belum ada saran.</p>'; return; }
  container.innerHTML = list.map(s => `
    <div class="bg-slate-900 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
      <div class="flex justify-between font-bold text-teal-400"><span>${s.pengirim}</span><span class="text-[10px] text-slate-400">${s.waktu}</span></div>
      <p class="text-slate-300">${s.pesan}</p>
    </div>
  `).join('');
}
