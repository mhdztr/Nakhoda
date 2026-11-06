# ARCHITECTURE.md — Arsitektur Teknis Sistem: Nakhoda
**Naungan Awak Kapal Armada (Timja Pengawakan - Dit. POA)**
*Direktorat Pemantauan dan Operasi Armada (Dit. POA)*  
*Direktorat Jenderal Pengawasan Sumber Daya Kelautan dan Perikanan (Ditjen PSDKP)*  
*Kementerian Kelautan dan Perikanan Republik Indonesia (KKP RI)*

---

## 1. Topologi Sistem & Ekosistem Terdistribusi

Nakhoda dirancang sebagai sistem satelit mandiri dalam klaster aplikasi Dit. POA. Model arsitektur terdistribusi (*decoupled satellite system*) mengisolasi pencatatan personil awak kapal, sertifikasi kepelautan, dan kegiatan pengawakan dari database operasional alutsista guna mencegah persaingan kunci (*lock contention*) dan menjaga stabilitas jangka panjang.

```
┌────────────────────────────────────────────────────────────────────────┐
│                       CLIENT TIER (BROWSER SPA)                        │
│  HTML5 + Vanilla CSS (Achromatic Ledger 3-Tier) + Vanilla JS (ES6/V8)  │
│  Geist Font (Tabular Figures) · Inline SVG Icons · Charts.js (SVG)     │
│  Canvas Compression Client Engine · Multi-Evidence Queue Handler       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ google.script.run (RPC JSON)
┌───────────────────────────────────▼────────────────────────────────────┐
│                  SERVERLESS GATEWAY TIER (GAS RUNTIME)                 │
│  V8 JavaScript Engine · Google Apps Script Serverless Container        │
│  doGet() HTML Service (ALLOWALL Iframe Embedding)                      │
│  Concurrency Lock: LockService.getScriptLock() (15s - 30s Wait)        │
│  Cache Layer: CacheService (Chunked Versioned Store, Key: v{ver}:...)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼──────────────┐    ┌───────▼───────────┐    ┌──────────▼─────────┐
│    SERVICES TIER     │    │ DATA ACCESS TIER  │    │ PURE LOGIC HELPERS │
│ • AknService         │    │ • SheetAccess.js  │    │ • pure/Carry.js    │
│ • KegiatanService    │    │ • Self-Healing DB │    │ • pure/Sertifikat  │
│ • DirektoriService   │    │ • Range.setValues │    │ • pure/Sijil.js    │
│ • KompetensiService  │    │ • Row Versioning  │    │ • pure/Kelas.js    │
│ • SijilService       │    │ • Memory Obj Map  │    │ • DateUtil / Lock  │
│ • EvidenceService    │    │ • Version Bump    │    │                    │
│ • AuthService/Admin  │    │                   │    │                    │
└───────┬──────────────┘    └───────┬───────────┘    └────────────────────┘
        │                           │
        └───────────────────────────┼───────────────────────────┐
                                    │                           │
┌───────────────────────────────────▼───────────┐   ┌───────────▼──────────┐
│         DATABASE TIER (GOOGLE SHEETS)         │   │ STORAGE TIER (DRIVE) │
│  1. RadarPOA_Nakhoda_DB (Dedicated Satelit)   │   │ POA_Evidence_Nakhoda │
│     • TX_Pengawakan_AKN                       │   │ ├── Kegiatan/        │
│     • TX_Pengawakan_Kegiatan                  │   │ ├── Sertifikat/      │
│     • TX_Kegiatan_Peserta                     │   │ └── Profil/          │
│     • Master_Awak                             │   └──────────────────────┘
│     • TX_Pelatihan_Awak                       │
│     • TX_Penugasan_Kapal                      │
│     • TX_Konfirmasi_Mingguan                  │
│     • TX_Evidence                             │
│     • Master_Standar_Pelatihan                │
│     • Master_SafeManning                      │
│  2. RadarPOA_Master_DB (Shared Read-Only)     │
│     • Users · Divisi · Opsi · Kapal           │
└───────────────────────────────────────────────┘
```

---

## 2. Struktur Modul & Layering Kode

Struktur kode Nakhoda menerapkan pemisahan tanggung jawab (*Separation of Concerns*) yang ketat:

```
Nakhoda/
├── Code.js                     # Entry point doGet() & registrasi trigger cron
├── appsscript.json             # Manifest Apps Script (V8 runtime, scopes)
├── utils/
│   ├── Constants.js            # ID Master, Enum peran, Sheet mapping, batas file
│   ├── DateUtil.js             # Parser periode YYYY-MM-WW & rentang ISO
│   └── Lock.js                 # Wrapper eksekusi aman LockService
├── data/
│   └── SheetAccess.js          # Layer abstraksi spreadsheet satelit, self-healing, append/update
├── pure/                       # Fungsi kalkulasi murni (Node.js testable)
│   ├── Carry.js                # Algoritma carry-forward snapshot AKN lintas periode
│   ├── Sertifikat.js           # Mesin status sertifikat & deteksi kedaluwarsa
│   ├── Sijil.js                # Kalkulasi kekurangan awak kapal terhadap safe manning
│   └── Kelas.js                # Parser regex kelas kapal dari teks jabatan lengkap
├── services/
│   ├── AuthService.js          # Autentikasi sesi, hashing HMAC SHA-256 + garam, RBAC
│   ├── AknService.js           # Sub-modul A (Komposisi AKN snapshot & carry-forward)
│   ├── KegiatanService.js      # Sub-modul B (Log kegiatan, pembinaan & peserta)
│   ├── DirektoriService.js     # Sub-modul C (Master direktori awak, masking NIP)
│   ├── KompetensiService.js    # Sub-modul D (Register sertifikasi & kurikulum jabatan)
│   ├── SijilService.js         # Sub-modul E (Penugasan kapal & matriks Papan Sijil)
│   ├── NotifService.js         # Sub-modul F (Pemindai harian, pengingat, cron job)
│   ├── LaporanService.js       # Sub-modul G (Pratinjau cetak A4, generator PDF/XLSX)
│   ├── AdminService.js         # Sub-modul H (Manajemen akun, data acuan, audit trail)
│   └── EvidenceService.js      # Pengelolaan berkas digital Google Drive multi-file
├── html/
│   ├── Index.html              # Shell antarmuka utama (Open Plane Architecture)
│   ├── Auth.html               # Layar masuk terpadu & antrean persetujuan akun
│   ├── Style.html              # CSS Design System (Geist, Oranye Keselamatan, 3-Tier)
│   ├── Script_Core.html        # RPC Client Controller, router hash, modal dialog, toast
│   ├── Script_Format.html      # Formatter angka tabular, tanggal id-ID, inisial warna
│   ├── Script_Charts.html      # Engine render grafik SVG modular (Charts.js)
│   ├── Script_Akn.html         # Controller interaksi form matriks & riwayat AKN
│   ├── Script_Kegiatan.html    # Controller log kegiatan & multi-file uploader
│   ├── Script_Direktori.html   # Controller tabel direktori awak & lembar samping
│   ├── Script_Kompetensi.html  # Controller matriks kompetensi & revalidasi sertifikat
│   ├── Script_Sijil.html       # Controller matriks Papan Sijil & form penugasan
│   ├── Script_Laporan.html     # Controller pratinjau cetak eksekutif & ekspor
│   ├── Script_Admin.html       # Controller manajemen akun, approval, dan audit log
│   └── views/
│       ├── Ringkasan.html      # Dasbor eksekutif utama & strip KPI
│       ├── Komposisi.html      # Sub-modul A (Papan komposisi AKN 2x5)
│       ├── Kegiatan.html       # Sub-modul B (Feed kegiatan & uploader)
│       ├── Direktori.html      # Sub-modul C (Tabel direktori awak armada)
│       ├── Kompetensi.html     # Sub-modul D (Daftar tindak lanjut & matriks sertifikat)
│       ├── Sijil.html          # Sub-modul E (Matriks Papan Sijil kapal)
│       ├── Laporan.html        # Sub-modul G (Pratinjau laporan A4)
│       └── Admin.html          # Sub-modul H (Panel admin & audit)
├── tests/                      # Unit test suite mandiri (node --test)
│   ├── mocks/                  # Mocking runtime Google Apps Script
│   ├── carry.test.js
│   ├── sertifikat.test.js
│   ├── sijil.test.js
│   └── rbac.test.js
└── lint_ui.js                  # Engine linter penjamin mutu desain & arsitektur proyek
```

---

## 3. Konvensi Fungsi Layanan Publik (RPC API Interface)

Setiap fungsi publik di backend mengikuti konvensi awalan nama per modul (ADR-12), menerima parameter `token` di argumen pertama, memvalidasi sesi via `assertScope()`, dan membungkus operasi mutasi dalam `withLock()`:

### 3.1 Otentikasi & Sesi (`auth_*`)
- `auth_register(params)`: Mendaftarkan akun baru dengan verifikasi NIP/Email.
- `auth_requestOtp(params)` & `auth_verifyOtp(params)`: Pengiriman dan verifikasi kode OTP 6 digit.
- `auth_login(params)`: Otentikasi sesi via Email atau NIP (tanpa alias peran).
- `auth_logout(token)`: Pencabutan token sesi aktif dari `CacheService`.
- `auth_getSessionInfo(token)`: Pengambilan metadata profil pengguna yang sedang login.

### 3.2 Sub-Modul A — Komposisi AKN (`akn_*`)
- `akn_getPapan(token, filter)`: Mengambil matriks komposisi 2x5 terkini (nilai efektif hasil carry-forward, penanda sumber periode, dan delta terhadap minggu lalu).
- `akn_getRiwayat(token, filter)`: Mengambil daftar kronologis riwayat baris komposisi.
- `akn_submit(token, payload)`: Menyimpan baris snapshot perubahan dengan validasi `POA <= Keseluruhan`.
- `akn_revisi(token, payload)`: Menandai baris lama sebagai `SUPERSEDED` dan meng-append baris baru dengan tautan `SupersedesRowID`.
- `akn_anulir(token, params)`: Membatalkan baris aktif menjadi `VOID` dengan pencatatan `VoidReason` wajib.
- `akn_getTren(token, filter)`: Mengambil deret tren mingguan/bulanan per kategori berbasis kalkulasi carry-forward.
- `akn_konfirmasiTanpaMutasi(token, params)`: Mencatat konfirmasi periode berjalan tidak memiliki mutasi.

### 3.3 Sub-Modul B — Log Kegiatan (`keg_*`)
- `keg_list(token, filter)`: Mengambil daftar agenda kegiatan beserta ringkasan peserta dan jumlah berkas bukti.
- `keg_get(token, rowId)`: Mengambil detail lengkap kegiatan dan daftar peserta terdaftar.
- `keg_submit(token, payload)`: Menyimpan agenda kegiatan baru beserta indexing bukti Drive.
- `keg_revisi(token, payload)`: Revisi data agenda (versioning non-destruktif).
- `keg_anulir(token, params)`: Pembatalan agenda kegiatan.
- `keg_getTimeline(token, filter)`: Mengambil data agenda dalam format sekuensial garis waktu.

### 3.4 Sub-Modul C — Direktori Awak (`dir_*`)
- `dir_list(token, params)`: Mengambil daftar filterable awak kapal dengan paginasi virtual (50 per halaman) dan penyamaran NIP bagi non-pengelola.
- `dir_get(token, pegawaiId)`: Mengambil profil lengkap personil, riwayat penugasan, dan ringkasan sertifikat.
- `dir_save(token, payload)`: Menyimpan penambahan atau pembaruan profil awak dengan pencatatan audit sebelum/sesudah.
- `dir_nonaktifkan(token, params)`: Mengubah status personil menjadi `NON_AKTIF` / `MUTASI`.
- `dir_setKategoriBatch(token, payload)`: Pembaruan kategori kepegawaian secara massal bagi personil terpilih.
- `dir_getKualitasData(token)`: Mengambil statistik kelengkapan atribut (antrean "Perlu Dilengkapi").
- `dir_importDariSikap(token, params)`: Skrip migrasi idempoten satu arah dari database SIKAP (khusus Superadmin).

### 3.5 Sub-Modul D — Kompetensi & Sertifikat (`kom_*`)
- `kom_getTindakLanjut(token, filter)`: Mengambil daftar sertifikat yang kedaluwarsa atau segera habis (diurutkan berdasarkan sisa hari kedaluwarsa).
- `kom_getMatriks(token, filter)`: Mengambil matriks pemenuhan standar kompetensi awak kapal terhadap kurikulum wajib jabatan.
- `kom_getAwak(token, pegawaiId)`: Mengambil seluruh riwayat sertifikat kepelautan yang dimiliki satu awak.
- `kom_saveSertifikat(token, payload)`: Mencatat kelulusan sertifikat baru atau hasil revalidasi beserta tautan bukti fisik.
- `kom_revisiSertifikat(token, payload)` & `kom_anulirSertifikat(token, params)`: Tata kelola revisi/anulir sertifikat.
- `kom_getStandar(token)` & `kom_saveStandar(token, payload)`: Manajemen katalog kurikulum wajib dan masa berlaku.

### 3.6 Sub-Modul E — Penugasan Kapal & Sijil (`sijil_*`)
- `sijil_getPapan(token, filter)`: Mengambil matriks keterisian formasi awak di setiap kapal pengawas armada terhadap standar *Safe Manning*.
- `sijil_getKapal(token, kapalId)`: Mengambil rincian formasi susunan awak aktif di satu kapal tertentu.
- `sijil_naik(token, payload)`: Menugaskan personil naik ke kapal pengawas pada pos sijil tertentu (otomatis menutup penugasan lama).
- `sijil_turun(token, payload)`: Mencatat tanggal turun kapal personil.
- `sijil_getKebutuhan(token)` & `sijil_saveKebutuhan(token, payload)`: Konfigurasi tabel kebutuhan minimum formasi per kelas kapal.

### 3.7 Sub-Modul F, G, H & Bukti Digital
- `ringkasan_get(token, filter)`: Satu endpoint gabungan berkinerja tinggi untuk memuat seluruh metrik dasbor utama.
- `notif_getRingkasan(token)` & `notif_markRead(token, notifId)`: Pengambilan dan pembaruan status notifikasi pengguna.
- `lap_preview(token, params)` & `lap_export(token, params)`: Pembuatan dokumen rekapitulasi dinas PDF/XLSX.
- `evidence_upload(token, params)` & `evidence_uploadBatch(token, params)`: Pengunggahan berkas bukti ke Drive terindeks.
- `admin_getUsers(token)`, `admin_updateUser(token, params)`, `admin_getAuditLog(token, params)`: Pengendalian sistem.

---

## 4. Pola Transaksi Non-Destruktif & Concurrency Control

### 4.1 Locking Script Terpusat (`withLock`)
Seluruh manipulasi data (penulisan komposisi, kegiatan, profil personil, sertifikat, penugasan) wajib melewati proteksi konkurensi:

```javascript
function withLock(fn) {
  var lock = LockService.getScriptLock();
  try {
    var success = lock.waitLock(20000); // Batas tunggu 20 detik
    if (!success) {
      return { success: false, error: 'Sistem sedang memproses transaksi lain. Silakan coba beberapa saat lagi.' };
    }
    return fn();
  } catch (e) {
    if (e.message && e.message.indexOf('Could not obtain lock') !== -1) {
      return { success: false, error: 'Sistem sedang sibuk. Silakan coba beberapa detik lagi.' };
    }
    throw e;
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}
```

### 4.2 Append-Only Versioning
Tidak ada baris riwayat yang dihapus secara fisik dari database. Status daur hidup:
- Baris baru: `Status = 'ACTIVE'`.
- Baris revisi: Baris lama diubah menjadi `Status = 'SUPERSEDED'`. Baris baru dibuat dengan `SupersedesRowID = RowID_Lama`.
- Baris anulir: Baris ditandai `Status = 'VOID'` dengan kewajiban mencatat `VoidReason`, `VoidedBy`, dan `VoidedAt`.

---

## 5. Algoritma Kunci Server-Side

### 5.1 Algoritma Snapshot Carry-Forward Komposisi AKN (`pure/Carry.js`)
Nilai efektif jumlah personil untuk kombinasi `(Scope, Kategori)` pada periode $T$:
1. Server menyaring seluruh baris transaksi berstatus `ACTIVE` untuk `(Scope, Kategori)` terkait.
2. Memfilter baris dengan `Periode <= T`.
3. Memilih baris dengan `Periode` tertinggi (karena format `YYYY-MM-WW` aman diperbandingkan secara leksikografis). Jika terdapat periode yang sama, dipilih baris dengan `Timestamp` terbaru.
4. Mengembalikan objek:
   ```javascript
   { jumlah: row.Jumlah, periodeSumber: row.Periode, carried: (row.Periode !== T) }
   ```
5. Jika tidak ditemukan satupun baris dengan `Periode <= T`, nilai dikembalikan sebagai `null` (dirender sebagai tanda hubung abu-abu `-` / "Belum dilaporkan", bukan `0`).

### 5.2 Algoritma Evaluasi Masa Berlaku Sertifikat (`pure/Sertifikat.js`)
Dijalankan secara deterministik berdasarkan tanggal referensi hari ini ($T_{\text{today}}$):
1. Jika butir standar tidak memiliki `MasaBerlakuBulan` (atau bernilai null/0):
   - Jika `StatusKelulusan == 'SUDAH_LULUS'`, status = `BERLAKU`.
   - Jika tidak, status = `BELUM_ADA`.
2. Jika butir standar memiliki masa berlaku terbatas (contoh: BST-F = 60 bulan):
   - Sisa hari: $\Delta_{\text{hari}} = \frac{T_{\text{BerlakuSampai}} - T_{\text{today}}}{86.400.000}$.
   - Jika $\Delta_{\text{hari}} < 0 \rightarrow$ status = `KEDALUWARSA`.
   - Jika $0 \le \Delta_{\text{hari}} \le 90 \rightarrow$ status = `SEGERA_HABIS`.
   - Jika $\Delta_{\text{hari}} > 90 \rightarrow$ status = `BERLAKU`.

### 5.3 Algoritma Kelaikan Formasi Sijil Kapal (`pure/Sijil.js`)
Untuk setiap kapal $K$ dan formasi jabatan $J$:
$$\text{Terisi}(K, J) = \sum \text{Awak aktif yang bertugas di Kapal } K \text{ pada Pos } J$$
$$\text{Minimum}(K, J) = \text{Master\_SafeManning}[\text{Kelas}(K), J]$$
$$\text{Deviasi}(K, J) = \text{Terisi}(K, J) - \text{Minimum}(K, J)$$
- Jika $\text{Deviasi} \ge 0 \rightarrow$ Formasi Cukup.
- Jika $\text{Deviasi} < 0 \rightarrow$ Kekurangan sebanyak $|\text{Deviasi}|$ personil.
- Personil aktif yang memiliki sertifikat keselamatan wajib berstatus `KEDALUWARSA` tetap dihitung dalam $\text{Terisi}$ namun memicu status agregat kapal menjadi `TIDAK_LAIK_BERLAYAR`.

---

## 6. Struktur Penyimpanan File Google Drive

Seluruh berkas bukti fisik disimpan dalam Google Drive root folder `POA_Evidence_Nakhoda` dengan struktur hierarkis:

```
POA_Evidence_Nakhoda/
├── Kegiatan/
│   └── YYYY-MM/
│       └── [KegiatanRowID]/
│           ├── Daftar_Hadir_[UUID].pdf
│           └── Dokumentasi_Foto_[UUID].jpg
├── Sertifikat/
│   └── [PegawaiID]/
│       └── [KodePelatihan]_[Tahun]_[UUID].pdf
└── Laporan/
    └── YYYY-MM/
        └── Rekap_Pengawakan_[Periode].pdf
```

Setiap file diindeks pada tabel `TX_Evidence` dengan mencatat `EvidenceID`, `RefSheet`, `RefRowID`, `DriveFileID`, `FileName`, `FileType`, `UploadedBy`, dan `UploadedAt`.

---

## 7. Mekanisme Self-Healing Database Satelit

Untuk menjamin ketersediaan sistem saat instalasi awal atau pemindahan sheet, modul `data/SheetAccess.js` mengimplementasikan fungsi `openAwakSheet(sheetName)`:
1. Membaca Script Property `AWAK_SS_ID`.
2. Jika properti belum ada atau spreadsheet terhapus, fungsi `ensureAwakSpreadsheet()` otomatis membuat spreadsheet baru dengan nama `RadarPOA_Nakhoda_DB` dan menyimpan ID-nya ke Script Properties.
3. Saat sebuah sheet dibuka, jika sheet tersebut belum ada, `_autoCreateAwakSheet()` langsung membuat sheet tersebut dengan baris header standar relasional lengkap dengan format teks tebal dan baris header beku (*frozen header row*).
