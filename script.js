const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby0aQ6KdF7kK-VirWqh1GmMtA_BtP6bcC9ZTIPW2phe1O5VfExNk_HvQynr6vuic4sF/exec";

let masterGenerus = [];
let globalPresensi = [];
let globalRundown = [];
let globalKegiatan = [];
let clickCounter = 0;

window.onload = () => {
  loadData();
};

// Keamanan Client-Side
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
  if (e.ctrlKey && e.altKey && (e.keyCode === 77 || e.key === 'm' || e.key === 'M')) {
    e.preventDefault();
    document.getElementById("admin-modal").classList.remove('hidden');
    return;
  }
  if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74)) || (e.ctrlKey && e.keyCode == 85)) {
    return false;
  }
};

function triggerAdminModal() {
  clickCounter++;
  if (clickCounter >= 5) {
    clickCounter = 0;
    document.getElementById("admin-modal").classList.remove('hidden');
  }
}

function closeAdminModal() {
  document.getElementById("admin-modal").classList.add('hidden');
  document.getElementById("admin-pin-input").value = "";
  document.getElementById("admin-login-box").classList.remove('hidden');
  document.getElementById("admin-dashboard-box").classList.add('hidden');
}

async function fetchAdminData() {
  const pin = document.getElementById("admin-pin-input").value;
  try {
    const ua = encodeURIComponent(navigator.userAgent);
    const res = await fetch(`${SCRIPT_URL}?mode=admin&pin=${pin}&ua=${ua}`);
    const data = await res.json();

    if (data.status === 'error') {
      alert(data.message);
      return;
    }

    document.getElementById("admin-login-box").classList.add('hidden');
    document.getElementById("admin-dashboard-box").classList.remove('hidden');

    document.getElementById("stat-presensi").innerText = data.log.length;
    document.getElementById("stat-saran").innerText = data.saran.length;

    document.getElementById("adm-list-presensi").innerHTML = data.log.map(l => `
      <div class="bg-slate-900 p-2 rounded-lg border border-slate-700 flex justify-between items-center text-[11px]">
        <div><span class="font-bold text-slate-100">${l.nama}</span> <span class="text-slate-400">(${l.kelompok})</span></div>
        <span class="px-2 py-0.5 rounded font-bold ${l.status === 'Hadir' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">${l.status}</span>
      </div>
    `).join('');

    renderAdminRundown();
    renderAdminKegiatan();
  } catch (err) {
    alert("Gagal terhubung ke server.");
  }
}

function switchAdminTab(tab) {
  ['rekap', 'peserta', 'rundown', 'kegiatan'].forEach(t => {
    document.getElementById(`adm-sec-${t}`).classList.add('hidden');
    document.getElementById(`adm-btn-${t}`).className = "bg-slate-900 text-slate-300 px-3 py-2 rounded-xl font-bold";
  });
  document.getElementById(`adm-sec-${tab}`).classList.remove('hidden');
  document.getElementById(`adm-btn-${tab}`).className = "bg-emerald-600 text-white px-3 py-2 rounded-xl font-bold";
}

// Navigasi Tab Utama
function switchTab(tab) {
  ['dashboard', 'presensi', 'saran'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
    document.getElementById(`nav-${t}`).className = "flex flex-col items-center text-slate-400 text-xs font-bold gap-1 transition";
  });
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.getElementById(`nav-${tab}`).className = "flex flex-col items-center text-emerald-400 text-xs font-bold gap-1 transition";
}

// Sub-Tab Presensi & Riwayat
function switchPresensiSubTab(sub) {
  ['form', 'riwayat'].forEach(s => {
    document.getElementById(`subcontent-${s}`).classList.add('hidden');
    document.getElementById(`subtab-${s}`).className = "flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl text-slate-400 transition";
  });
  document.getElementById(`subcontent-${sub}`).classList.remove('hidden');
  document.getElementById(`subtab-${sub}`).className = "flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 text-white transition";
  
  if (sub === 'riwayat') renderRiwayatKelompok();
}

async function loadData() {
  try {
    const res = await fetch(SCRIPT_URL);
    const data = await res.json();
    masterGenerus = data.generus || [];
    globalPresensi = data.riwayat || [];
    globalRundown = data.rundown || [];
    globalKegiatan = data.kegiatan || [];

    renderDashboardRundown(globalRundown);
    renderDashboardKegiatan(globalKegiatan);

    // Populate Desa Filter Horizontal
    const desaUnik = [...new Set(masterGenerus.map(item => item.desa))].filter(Boolean).sort();
    const selDesa = document.getElementById("select-desa");
    selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>';
    desaUnik.forEach(d => selDesa.innerHTML += `<option value="${d}">${d}</option>`);

    renderSaran(data.saranList || []);
  } catch (err) {
    console.error("Gagal memuat data:", err);
  }
}

function filterKelompok() {
  const desa = document.getElementById("select-desa").value;
  const selKelompok = document.getElementById("select-kelompok");
  
  selKelompok.innerHTML = '<option value="">-- Pilih Desa Dulu --</option>';
  selKelompok.disabled = true;
  document.getElementById("container-byname").innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Silakan pilih kelompok terlebih dahulu.</p>';

  if (!desa) return;

  const kelompokUnik = [...new Set(masterGenerus.filter(g => g.desa === desa).map(g => g.kelompok))].filter(Boolean).sort();
  selKelompok.innerHTML = '<option value="">-- Pilih Kelompok --</option>';
  kelompokUnik.forEach(k => selKelompok.innerHTML += `<option value="${k}">${k}</option>`);
  selKelompok.disabled = false;
}

// Render By-Name List berdasarkan Desa & Kelompok yang dipilih
function renderBynameList() {
  const desa = document.getElementById("select-desa").value;
  const kelompok = document.getElementById("select-kelompok").value;
  const container = document.getElementById("container-byname");

  if (!desa || !kelompok) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Silakan pilih Desa dan Kelompok.</p>';
    return;
  }

  const listPeserta = masterGenerus.filter(g => g.desa === desa && g.kelompok === kelompok).sort((a,b) => a.nama.localeCompare(b.nama));

  if (!listPeserta.length) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Tidak ada data generus pada kelompok ini.</p>';
    return;
  }

  container.innerHTML = `
    <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-3 shadow-xl">
      <h3 class="font-bold text-sm text-emerald-400 border-b border-slate-700 pb-2">Daftar Generus: ${kelompok} (${listPeserta.length} Orang)</h3>
      <div class="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
        ${listPeserta.map(p => {
          const absensi = globalPresensi.find(x => x.nama === p.nama && x.kelompok === p.kelompok);
          const status = absensi ? absensi.status : 'Belum Absen';
          const badgeColor = status === 'Hadir' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : status === 'Izin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600';
          
          return `
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p class="font-bold text-slate-100 text-xs sm:text-sm">${p.nama}</p>
                <p class="text-[11px] text-slate-400">Jenjang: <span class="text-teal-300 font-semibold">${p.jenjang || '-'}</span></p>
              </div>
              <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <span class="text-[10px] px-2.5 py-1 rounded-full border font-bold ${badgeColor}">${status}</span>
                <div class="flex gap-1">
                  <button onclick="submitPresensiByname('${p.nama}', '${p.kelompok}', '${p.jenjang}', 'Hadir')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition">Hadir</button>
                  <button onclick="submitPresensiByname('${p.nama}', '${p.kelompok}', '${p.jenjang}', 'Izin')" class="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition">Izin</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

async function submitPresensiByname(nama, kelompok, jenjang, status) {
  let keterangan = status === 'Hadir' ? 'Hadir di lokasi' : prompt("Masukkan alasan izin:", "Sakit / Acara keluarga");
  if (status === 'Izin' && !keterangan) return;

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "presensi", nama, kelompok, jenjang, status, keterangan })
    });
    const result = await res.json();
    if (result.status === 'success') {
      alert(`Presensi ${nama} (${status}) berhasil dicatat!`);
      loadData().then(() => renderBynameList());
    }
  } catch (err) {
    alert("Gagal mengirim presensi.");
  }
}

// Render Riwayat By-Name per Kelompok
function renderRiwayatKelompok() {
  const container = document.getElementById("list-riwayat-all");
  const kelompokUnik = [...new Set(masterGenerus.map(m => m.kelompok))].filter(Boolean).sort();

  if (!kelompokUnik.length) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center col-span-full">Belum ada data kelompok.</p>';
    return;
  }

  container.innerHTML = kelompokUnik.map(kel => {
    const anggota = masterGenerus.filter(m => m.kelompok === kel);
    return `
      <div class="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow space-y-3">
        <h4 class="font-bold text-emerald-400 text-sm border-b border-slate-700 pb-2">Kelompok: ${kel} (${anggota.length} Anggota)</h4>
        <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          ${anggota.map(a => {
            const abs = globalPresensi.find(x => x.nama === a.nama && x.kelompok === kel);
            const st = abs ? abs.status : 'Belum Absen';
            const badge = st === 'Hadir' ? 'text-emerald-400 bg-emerald-500/10' : st === 'Izin' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 bg-slate-700/30';
            return `
              <div class="bg-slate-900 p-2 rounded-xl border border-slate-700/60 flex justify-between items-center text-xs">
                <div>
                  <span class="font-semibold text-slate-200">${a.nama}</span>
                  <p class="text-[10px] text-slate-400">${a.desa} • ${a.jenjang || '-'}</p>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badge}">${st}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Admin: Tambah Generus Baru
async function saveNewGenerus() {
  const nama = document.getElementById("add-nama").value.trim();
  const kelompok = document.getElementById("add-kelompok").value.trim();
  const desa = document.getElementById("add-desa").value.trim();
  const jenjang = document.getElementById("add-jenjang").value.trim();

  if (!nama || !kelompok || !desa) return alert("Nama, Kelompok, dan Desa wajib diisi!");

  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "add_generus", nama, kelompok, desa, jenjang })
  });

  alert("Peserta baru berhasil ditambahkan!");
  document.getElementById("add-nama").value = "";
  document.getElementById("add-kelompok").value = "";
  document.getElementById("add-desa").value = "";
  document.getElementById("add-jenjang").value = "";
  loadData();
}

function renderDashboardRundown(list) {
  const container = document.getElementById("dynamic-rundown");
  if (!list.length) { container.innerHTML = '<p class="text-xs text-slate-400">Belum ada rundown.</p>'; return; }
  container.innerHTML = list.map(r => `
    <div>
      <span class="font-bold text-emerald-400">${r.mulai} - ${r.selesai} WIB</span>
      <p class="text-slate-300 font-medium mt-0.5">${r.nama}</p>
      ${r.ket ? `<p class="text-[11px] text-slate-400">${r.ket}</p>` : ''}
    </div>
  `).join('');
}

function renderDashboardKegiatan(list) {
  const container = document.getElementById("dynamic-kegiatan");
  if (!list.length) { container.innerHTML = '<p class="text-xs text-slate-400">Belum ada kegiatan.</p>'; return; }
  container.innerHTML = list.map(k => `
    <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
      <h4 class="font-bold text-teal-300 text-xs sm:text-sm">📌 ${k.nama}</h4>
      <ul class="list-disc list-inside text-[11px] text-slate-300 space-y-1">
        ${k.uraian1 ? `<li>${k.uraian1}</li>` : ''}
        ${k.uraian2 ? `<li>${k.uraian2}</li>` : ''}
        ${k.uraian3 ? `<li>${k.uraian3}</li>` : ''}
      </ul>
    </div>
  `).join('');
}

function renderAdminRundown() {
  const container = document.getElementById("adm-list-rundown");
  container.innerHTML = globalRundown.map(r => `
    <div class="bg-slate-900 p-2.5 rounded-lg border border-slate-700 flex justify-between items-center text-[11px]">
      <div><span class="font-bold text-emerald-400">${r.mulai}-${r.selesai}</span> • <b>${r.nama}</b></div>
      <button onclick="deleteRundown('${r.id}')" class="bg-rose-600 px-2 py-1 rounded text-white font-bold">Hapus</button>
    </div>
  `).join('');
}

async function saveRundown() {
  const mulai = document.getElementById("rd-mulai").value;
  const selesai = document.getElementById("rd-selesai").value;
  const nama = document.getElementById("rd-nama").value;
  const ket = document.getElementById("rd-ket").value;
  if (!mulai || !selesai || !nama) return alert("Isi data dengan lengkap!");

  await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "save_rundown", mulai, selesai, nama, ket }) });
  alert("Rundown disimpan!");
  loadData(); fetchAdminData();
}

async function deleteRundown(id) {
  if (!confirm("Hapus?")) return;
  await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete_rundown", id }) });
  loadData(); fetchAdminData();
}

function renderAdminKegiatan() {
  const container = document.getElementById("adm-list-kegiatan");
  container.innerHTML = globalKegiatan.map(k => `
    <div class="bg-slate-900 p-2.5 rounded-lg border border-slate-700 flex justify-between items-center text-[11px]">
      <div><b>${k.nama}</b></div>
      <button onclick="deleteKegiatan('${k.id}')" class="bg-rose-600 px-2 py-1 rounded text-white font-bold">Hapus</button>
    </div>
  `).join('');
}

async function saveKegiatan() {
  const nama = document.getElementById("kg-nama").value;
  const uraian1 = document.getElementById("kg-u1").value;
  const uraian2 = document.getElementById("kg-u2").value;
  const uraian3 = document.getElementById("kg-u3").value;
  if (!nama) return alert("Nama wajib diisi!");

  await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "save_kegiatan", nama, uraian1, uraian2, uraian3 }) });
  alert("Kegiatan disimpan!");
  loadData(); fetchAdminData();
}

async function deleteKegiatan(id) {
  if (!confirm("Hapus?")) return;
  await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete_kegiatan", id }) });
  loadData(); fetchAdminData();
}

async function kirimSaran() {
  const pengirim = document.getElementById("saran-nama").value;
  const pesan = document.getElementById("saran-pesan").value;
  if (!pesan.trim()) return alert("Tuliskan pesan saran terlebih dahulu.");

  await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "saran", pengirim, pesan }) });
  alert("Saran berhasil dikirim!");
  document.getElementById("saran-pesan").value = "";
  loadData();
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
