// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUPUWPpBBLJMWlhpFy-Y9GUXJQvT-kvVDI8OfSGzuLhxkQCHGJQV_jPq-e1cSuPb6M/exec";

let masterGenerus = [];
let globalRundown = [];
let globalKegiatan = [];
let statusPilihan = "Hadir";
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

    document.getElementById("stat-presensi").innerText = `Total Presensi: ${data.log.length}`;
    document.getElementById("stat-saran").innerText = `Total Saran: ${data.saran.length}`;

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
  ['rekap', 'rundown', 'kegiatan'].forEach(t => {
    document.getElementById(`adm-sec-${t}`).classList.add('hidden');
    document.getElementById(`adm-btn-${t}`).className = "bg-slate-900 text-slate-300 px-3 py-1.5 rounded-lg font-bold";
  });
  document.getElementById(`adm-sec-${tab}`).classList.remove('hidden');
  document.getElementById(`adm-btn-${tab}`).className = "bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold";
}

// Navigasi Tab Utama
function switchTab(tab) {
  ['dashboard', 'presensi', 'saran'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
    document.getElementById(`nav-${t}`).className = "flex flex-col items-center text-slate-400 text-[11px] font-bold gap-0.5 transition";
  });
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.getElementById(`nav-${tab}`).className = "flex flex-col items-center text-emerald-400 text-[11px] font-bold gap-0.5 transition";
}

async function loadData() {
  try {
    const res = await fetch(SCRIPT_URL);
    const data = await res.json();
    masterGenerus = data.generus;
    globalRundown = data.rundown || [];
    globalKegiatan = data.kegiatan || [];

    renderDashboardRundown(globalRundown);
    renderDashboardKegiatan(globalKegiatan);

    const kelompokUnik = [...new Set(masterGenerus.map(item => item.kelompok))].sort();
    const selKelompok = document.getElementById("select-kelompok");
    selKelompok.innerHTML = '<option value="">-- Pilih Kelompok --</option>';
    kelompokUnik.forEach(k => selKelompok.innerHTML += `<option value="${k}">${k}</option>`);

    renderRiwayat(data.riwayat);
    renderSaran(data.saranList);
  } catch (err) {
    console.error("Gagal memuat data:", err);
  }
}

function renderDashboardRundown(list) {
  const container = document.getElementById("dynamic-rundown");
  if (!list.length) {
    container.innerHTML = '<p class="text-xs text-slate-400">Belum ada rundown kegiatan.</p>';
    return;
  }
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
  if (!list.length) {
    container.innerHTML = '<p class="text-xs text-slate-400">Belum ada daftar kegiatan.</p>';
    return;
  }
  container.innerHTML = list.map(k => `
    <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 space-y-1.5">
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
      <div>
        <span class="font-bold text-emerald-400">${r.mulai}-${r.selesai}</span> • <b>${r.nama}</b>
        <p class="text-slate-400 text-[10px]">${r.ket || ''}</p>
      </div>
      <div class="flex gap-1">
        <button onclick="editRundown('${r.id}')" class="bg-amber-600 px-2 py-1 rounded text-white font-bold">Edit</button>
        <button onclick="deleteRundown('${r.id}')" class="bg-rose-600 px-2 py-1 rounded text-white font-bold">Hapus</button>
      </div>
    </div>
  `).join('');
}

async function saveRundown() {
  const id = document.getElementById("rd-id").value;
  const mulai = document.getElementById("rd-mulai").value;
  const selesai = document.getElementById("rd-selesai").value;
  const nama = document.getElementById("rd-nama").value;
  const ket = document.getElementById("rd-ket").value;

  if (!mulai || !selesai || !nama) return alert("Jam dan Nama Kegiatan wajib diisi!");

  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "save_rundown", id, mulai, selesai, nama, ket })
  });

  alert("Rundown berhasil disimpan!");
  document.getElementById("rd-id").value = "";
  document.getElementById("rd-mulai").value = "";
  document.getElementById("rd-selesai").value = "";
  document.getElementById("rd-nama").value = "";
  document.getElementById("rd-ket").value = "";
  loadData();
  fetchAdminData();
}

function editRundown(id) {
  const r = globalRundown.find(x => x.id == id);
  if (r) {
    document.getElementById("rd-id").value = r.id;
    document.getElementById("rd-mulai").value = r.mulai;
    document.getElementById("rd-selesai").value = r.selesai;
    document.getElementById("rd-nama").value = r.nama;
    document.getElementById("rd-ket").value = r.ket;
  }
}

async function deleteRundown(id) {
  if (!confirm("Hapus rundown ini?")) return;
  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "delete_rundown", id })
  });
  loadData();
  fetchAdminData();
}

function renderAdminKegiatan() {
  const container = document.getElementById("adm-list-kegiatan");
  container.innerHTML = globalKegiatan.map(k => `
    <div class="bg-slate-900 p-2.5 rounded-lg border border-slate-700 flex justify-between items-center text-[11px]">
      <div>
        <b>${k.nama}</b>
        <p class="text-slate-400 text-[10px]">• ${k.uraian1 || ''} • ${k.uraian2 || ''}</p>
      </div>
      <div class="flex gap-1">
        <button onclick="editKegiatan('${k.id}')" class="bg-amber-600 px-2 py-1 rounded text-white font-bold">Edit</button>
        <button onclick="deleteKegiatan('${k.id}')" class="bg-rose-600 px-2 py-1 rounded text-white font-bold">Hapus</button>
      </div>
    </div>
  `).join('');
}

async function saveKegiatan() {
  const id = document.getElementById("kg-id").value;
  const nama = document.getElementById("kg-nama").value;
  const uraian1 = document.getElementById("kg-u1").value;
  const uraian2 = document.getElementById("kg-u2").value;
  const uraian3 = document.getElementById("kg-u3").value;

  if (!nama) return alert("Nama kegiatan wajib diisi!");

  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "save_kegiatan", id, nama, uraian1, uraian2, uraian3 })
  });

  alert("Kegiatan berhasil disimpan!");
  document.getElementById("kg-id").value = "";
  document.getElementById("kg-nama").value = "";
  document.getElementById("kg-u1").value = "";
  document.getElementById("kg-u2").value = "";
  document.getElementById("kg-u3").value = "";
  loadData();
  fetchAdminData();
}

function editKegiatan(id) {
  const k = globalKegiatan.find(x => x.id == id);
  if (k) {
    document.getElementById("kg-id").value = k.id;
    document.getElementById("kg-nama").value = k.nama;
    document.getElementById("kg-u1").value = k.uraian1;
    document.getElementById("kg-u2").value = k.uraian2;
    document.getElementById("kg-u3").value = k.uraian3;
  }
}

async function deleteKegiatan(id) {
  if (!confirm("Hapus kegiatan ini?")) return;
  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "delete_kegiatan", id })
  });
  loadData();
  fetchAdminData();
}

function filterJenjang() {
  const kel = document.getElementById("select-kelompok").value;
  const selJenjang = document.getElementById("select-jenjang");
  const selNama = document.getElementById("select-nama");

  selNama.innerHTML = '<option value="">-- Pilih Jenjang Dulu --</option>';
  selNama.disabled = true;

  if (!kel) {
    selJenjang.innerHTML = '<option value="">-- Pilih Kelompok Dulu --</option>';
    selJenjang.disabled = true;
    return;
  }

  const jenjangUnik = [...new Set(masterGenerus.filter(g => g.kelompok === kel).map(g => g.jenjang))];
  selJenjang.innerHTML = '<option value="">-- Pilih Jenjang Usia --</option>';
  jenjangUnik.forEach(j => selJenjang.innerHTML += `<option value="${j}">${j}</option>`);
  selJenjang.disabled = false;
}

function filterNama() {
  const kel = document.getElementById("select-kelompok").value;
  const jen = document.getElementById("select-jenjang").value;
  const selNama = document.getElementById("select-nama");

  if (!jen) {
    selNama.disabled = true;
    return;
  }

  const namaFiltered = masterGenerus
    .filter(g => g.kelompok === kel && g.jenjang === jen)
    .sort((a, b) => a.nama.localeCompare(b.nama));

  selNama.innerHTML = '<option value="">-- Pilih Nama Anda --</option>';
  namaFiltered.forEach(g => selNama.innerHTML += `<option value="${g.nama}">${g.nama}</option>`);
  selNama.disabled = false;
}

function setStatus(status) {
  statusPilihan = status;
  const btnHadir = document.getElementById("btn-hadir");
  const btnIzin = document.getElementById("btn-izin");
  const boxKet = document.getElementById("box-keterangan");

  if (status === 'Hadir') {
    btnHadir.className = "py-3 rounded-xl border border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold text-xs transition";
    btnIzin.className = "py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-400 font-bold text-xs transition";
    boxKet.classList.add('hidden');
  } else {
    btnIzin.className = "py-3 rounded-xl border border-amber-500 bg-amber-500/20 text-amber-300 font-bold text-xs transition";
    btnHadir.className = "py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-400 font-bold text-xs transition";
    boxKet.classList.remove('hidden');
  }
}

async function kirimPresensi() {
  const kelompok = document.getElementById("select-kelompok").value;
  const jenjang = document.getElementById("select-jenjang").value;
  const nama = document.getElementById("select-nama").value;
  const keterangan = statusPilihan === 'Hadir' ? 'Hadir di lokasi' : document.getElementById("input-keterangan").value;

  if (!nama) return alert("Silakan pilih kelompok, jenjang, dan nama lengkap terlebih dahulu!");
  if (statusPilihan === 'Izin' && !keterangan.trim()) return alert("Harap isi alasan izin terlebih dahulu!");

  const btn = document.getElementById("btn-submit-presensi");
  btn.innerText = "Mengirim...";
  btn.disabled = true;

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "presensi", nama, kelompok, jenjang, status: statusPilihan, keterangan })
    });
    const result = await res.json();

    if (result.status === 'duplicate') {
      alert(result.message);
    } else {
      alert(`Alhamdulillah ${nama}, data ${statusPilihan} berhasil dicatat!`);
      document.getElementById("input-keterangan").value = "";
      loadData();
    }
  } catch (err) {
    alert("Gagal mengirim data. Periksa koneksi internet.");
  }

  btn.innerText = "Kirim Data Presensi";
  btn.disabled = false;
}

function renderRiwayat(list) {
  const container = document.getElementById("list-riwayat");
  if (!list || list.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Belum ada data presensi masuk.</p>';
    return;
  }
  container.innerHTML = list.map(item => {
    const isHadir = item.status === 'Hadir';
    const badgeClass = isHadir ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return `
      <div class="bg-slate-800/90 border border-slate-700/80 p-3 rounded-xl flex justify-between items-center shadow-sm">
        <div>
          <p class="text-xs sm:text-sm font-bold text-slate-100">${item.nama}</p>
          <p class="text-[10px] sm:text-[11px] text-slate-400">${item.kelompok} • ${item.jenjang} • Pukul ${item.waktu}</p>
          ${!isHadir ? `<p class="text-[10px] text-amber-300 mt-0.5">Ket: ${item.ket}</p>` : ''}
        </div>
        <span class="text-[10px] sm:text-xs px-2.5 py-1 rounded-full border font-bold ${badgeClass}">${item.status}</span>
      </div>
    `;
  }).join('');
}

async function kirimSaran() {
  const pengirim = document.getElementById("saran-nama").value;
  const pesan = document.getElementById("saran-pesan").value;
  if (!pesan.trim()) return alert("Tuliskan pesan saran atau usulan terlebih dahulu.");

  const btn = document.getElementById("btn-submit-saran");
  btn.innerText = "Mengirim...";
  btn.disabled = true;

  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "saran", pengirim, pesan })
  });

  alert("Terima kasih, saran dan usulan berhasil dikirim!");
  document.getElementById("saran-pesan").value = "";
  btn.innerText = "Kirim Saran & Usul";
  btn.disabled = false;
  loadData();
}

function renderSaran(list) {
  const container = document.getElementById("list-saran");
  if (!list.length) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center">Belum ada saran masuk.</p>';
    return;
  }
  container.innerHTML = list.map(s => `
    <div class="bg-slate-900 p-2.5 rounded-lg border border-slate-700 text-xs space-y-1">
      <div class="flex justify-between font-bold text-teal-400">
        <span>${s.pengirim}</span>
        <span class="text-[10px] text-slate-400">${s.waktu}</span>
      </div>
      <p class="text-slate-300">${s.pesan}</p>
    </div>
  `).join('');
}
