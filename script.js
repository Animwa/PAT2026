const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby0aQ6KdF7kK-VirWqh1GmMtA_BtP6bcC9ZTIPW2phe1O5VfExNk_HvQynr6vuic4sF/exec";

let masterGenerus = [];
let globalPresensi = [];
let globalRundown = [];
let globalKegiatan = [];
let clickCounter = 0;

// Urutan prioritas jenjang usia
const jenjangRanking = {
  'pra-remaja': 1,
  'pra remaja': 1,
  'remaja': 2,
  'muda-mudi': 3,
  'muda mudi': 3
};

function getJenjangScore(val) {
  if (!val) return 99;
  const clean = String(val).trim().toLowerCase();
  return jenjangRanking[clean] || 99;
}

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

    const desaUnik = [...new Set(masterGenerus.map(item => item.desa))].filter(Boolean).sort();
    const selDesa = document.getElementById("select-desa");
    selDesa.innerHTML = '<option value="">-- Pilih Desa --</option>';
    desaUnik.forEach(d => selDesa.innerHTML += `<option value="${d}">${d}</option>`);

    renderSaran(data.saranList || []);
    
    // Refresh list if currently active
    if (document.getElementById("select-kelompok").value) {
      renderBynameList();
    }
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

// Render By-Name List per Kelompok, Terkelompok & Terurut Berdasarkan Jenjang Usia
function renderBynameList() {
  const desa = document.getElementById("select-desa").value;
  const kelompok = document.getElementById("select-kelompok").value;
  const container = document.getElementById("container-byname");

  if (!desa || !kelompok) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Silakan pilih Desa dan Kelompok.</p>';
    return;
  }

  // Hanya ambil yang belum diabsen (belum ada di globalPresensi hari ini)
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

  // Kelompokkan berdasarkan Jenjang Usia, lalu urutkan sesuai ranking (Pra-Remaja -> Remaja -> Muda-Mudi)
  const jenjangGroups = {};
  listPeserta.forEach(p => {
    const j = p.jenjang || 'Lainnya';
    if (!jenjangGroups[j]) jenjangGroups[j] = [];
    jenjangGroups[j].push(p);
  });

  const sortedJenjangKeys = Object.keys(jenjangGroups).sort((a, b) => getJenjangScore(a) - getJenjangScore(b));

  container.innerHTML = sortedJenjangKeys.map(jenjang => {
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
                <p class="text-[10px] text-slate-400">Desa: ${p.desa}</p>
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
}

async function submitPresensiByname(nama, kelompok, jenjang, status) {
  let keterangan = status === 'Hadir' ? 'Hadir di lokasi' : '';
  
  if (status === 'Izin') {
    const { value: text } = await Swal.fire({
      title: 'Wajib Mengisi Keterangan Izin',
      input: 'text',
      inputPlaceholder: 'Contoh: Sakit / Acara Keluarga / Tugas Luar Kota',
      showCancelButton: true,
      confirmButtonText: 'Kirim Izin',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) {
          return 'Keterangan izin tidak boleh kosong!';
        }
      }
    });
    if (!text) return;
    keterangan = text;
  }

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "presensi", nama, kelompok, jenjang, status, keterangan })
    });
    const result = await res.json();
    
    if (result.status === 'success') {
      // Toast Cepat 0.5 Detik (500ms)
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${nama} (${status})`,
        showConfirmButton: false,
        timer: 500,
        timerProgressBar: true
      });

      // Langsung muat data & render ulang agar langsung hilang dari grid
      await loadData();
      renderBynameList();
    }
  } catch (err) {
    alert("Gagal mengirim presensi.");
  }
}

// Render Riwayat Ter-grid per Kelompok, Terurut Berdasarkan Jenjang Usia
function renderRiwayatKelompok() {
  const container = document.getElementById("list-riwayat-all");
  const kelompokUnik = [...new Set(masterGenerus.map(m => m.kelompok))].filter(Boolean).sort();

  if (!kelompokUnik.length) {
    container.innerHTML = '<p class="text-xs text-slate-400 text-center col-span-full">Belum ada data kelompok.</p>';
    return;
  }

  container.innerHTML = kelompokUnik.map(kel => {
    let anggota = masterGenerus.filter(m => m.kelompok === kel);
    
    // Urutkan anggota berdasarkan ranking jenjang usia terlebih dahulu, lalu abjad nama
    anggota.sort((a, b) => {
      const scoreA = getJenjangScore(a.jenjang);
      const scoreB = getJenjangScore(b.jenjang);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.nama.localeCompare(b.nama);
    });

    return `
      <div class="bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-700 shadow space-y-3">
        <h4 class="font-bold text-emerald-400 text-sm border-b border-slate-700 pb-2 flex justify-between items-center">
          <span>Kelompok: ${kel}</span>
          <span class="text-xs text-slate-400 font-normal">${anggota.length} Anggota</span>
        </h4>
        <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
          ${anggota.map(a => {
            const abs = globalPresensi.find(x => String(x.nama).trim().toLowerCase() === String(a.nama).trim().toLowerCase() && String(x.kelompok).trim().toLowerCase() === String(kel).trim().toLowerCase());
            const st = abs ? abs.status : 'Belum Absen';
            const badge = st === 'Hadir' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : st === 'Izin' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-slate-400 bg-slate-700/30 border-slate-600';
            
            return `
              <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-700/60 flex justify-between items-center text-xs">
                <div>
                  <span class="font-semibold text-slate-200">${a.nama}</span>
                  <p class="text-[10px] text-slate-400">Jenjang: <span class="text-teal-300 font-medium">${a.jenjang || '-'}</span> ${abs && abs.ket ? '• Ket: ' + abs.ket : ''}</p>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge}">${st}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
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

  alert("Peserta baru berhasil ditambahkan!");
  document.getElementById("add-nama").value = "";
  document.getElementById("add-kelompok").value = "";
  document.getElementById("add-desa").value = "";
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
