# PHASES.md — Roadmap Pengembangan & Verifikasi QA: Nakhoda
**Naungan Awak Kapal Armada (Timja Pengawakan - Dit. POA)**  
*Direktorat Pemantauan dan Operasi Armada (Dit. POA)*  
*Direktorat Jenderal Pengawasan Sumber Daya Kelautan dan Perikanan (Ditjen PSDKP)*  
*Kementerian Kelautan dan Perikanan Republik Indonesia (KKP RI)*

---

## 1. Ikhtisar Siklus Pengembangan (11 Fase Terukur)

Pengembangan sistem satelit Nakhoda dilaksanakan melalui 11 fase terukur dengan standar penjaminan mutu, pengujian unit test mandiri, audit linter visual 3-tier, dan verifikasi fungsional:

```
ROADMAP PENGEMBANGAN NAKHODA v1.0
├── [Fase 0] Penyelarasan Dokumen Inti Proyek & Baseline Keputusan
├── [Fase 1] Sanitasi Kode Template Nautika, Setup Constants, DB Self-Healing & Test Suite
├── [Fase 2] Otentikasi Terpadu, Open Plane Shell & Design System (Oranye Keselamatan)
├── [Fase 3] Sub-Modul A: Komposisi AKN Snapshot & Carry-Forward Engine
├── [Fase 4] Sub-Modul B: Log Kegiatan & Pembinaan Personil + Multi-Evidence
├── [Fase 5] Sub-Modul C: Direktori 396+ Awak Kapal Armada & Pemetaan Kelas
├── [Fase 6] Sub-Modul D: Register Sertifikasi STCW-F & Mesin Status Kedaluwarsa
├── [Fase 7] Sub-Modul E: Penugasan Kapal & Matriks Papan Sijil (Safe Manning)
├── [Fase 8] Dasbor Ringkasan Eksekutif, Notifikasi Cron & Generator Laporan
├── [Fase 9] Sub-Modul H: Pengelolaan Pengguna, Persetujuan & Log Audit
└── [Fase 10] Hardening Keamanan, Audit Mutu UI, dan UAT Pengawakan
```

---

## 2. Rincian Eksekusi & Kriteria Verifikasi per Fase

### Fase 0: Penyelarasan Dokumen Inti Proyek & Baseline Keputusan
- **Tujuan:** Menjadikan seluruh dokumentasi acuan (`PRD.md`, `ARCHITECTURE.md`, `DATA_SCHEMA.md`, `DESIGN.md`, `PHASES.md`, `CHANGELOG.md`, `README.md`) sebagai sumber kebenaran tunggal yang sinkron dan terbebas dari sisa peninggalan template lain.
- **Tugas Utama:**
  - Pembaruan PRD mencakup 8 sub-modul mandiri (`AWAK-A` s.d. `AWAK-H`).
  - Pembaruan ARCHITECTURE mencakup topologi satelit mandiri, konvensi RPC modular, pola locking `withLock`, dan algoritma carry-forward.
  - Pembaruan DATA_SCHEMA mencakup seluruh tabel transaksi dan master pendukung.
  - Penyusunan panduan CHANGELOG dan README.
- **Deliverables & Checklist:**
  - [x] Dokumen `DESIGN.md` teradopsi dari skill `design-taste-frontend` gaya `achromatic-ledger` dengan warna Oranye Keselamatan (`#D9480F`).
  - [x] Dokumen `PRD.md`, `ARCHITECTURE.md`, `DATA_SCHEMA.md`, `PHASES.md` tersinkronisasi 100%.

---

### Fase 1: Sanitasi Kode Template Nautika, Setup Constants, DB Self-Healing & Test Suite
- **Tujuan:** Menghapus seluruh residu modul non-pengawakan dari template warisan Nautika, menata ulang konstanta terpusat, mengaktifkan database satelit self-healing, dan menyiapkan runner test suite.
- **Tugas Utama:**
  - Pembersihan berkas-berkas layanan dan antarmuka usang (Operasi, Intelijen, Pemantauan, Perawatan, Logistik, BMN, Tata Usaha).
  - Penulisan ulang `utils/Constants.js` dengan konstanta khusus satelit Pengawakan (`SS_NAME.AWAK`, `SHEET_AWAK`, `DIVISI_ID.AWAK`, enum `AWAK_*`).
  - Penulisan layer `data/SheetAccess.js` dengan fungsi pembuka mandiri `openAwakSheet()` dan pembuat otomatis `ensureAwakSpreadsheet()`.
  - Porting script audit mandiri `lint_ui.js` dengan penegakan Zero-Emoji, 3-Tier Controls, larangan inline height, dan ketiadaan residu kode Nautika.
  - Setup runner pengujian unit mandiri `tests/` dengan mock Google Apps Script.
- **Deliverables & Checklist:**
  - [x] Residu modul Nautika dibersihkan dari direktori `services/`, `html/views/`, dan `html/Script_Main.html`.
  - [x] `utils/Constants.js` dan `data/SheetAccess.js` terhubung stabil ke `RadarPOA_Nakhoda_DB`.
  - [x] Verifikasi kompilasi sintaksis bebas galat (`node -c`).
  - [x] Script linter mandiri `node lint_ui.js` siap dijalankan.

---

### Fase 2: Otentikasi Terpadu, Open Plane Shell & Design System
- **Tujuan:** Membangun antarmuka masuk terpadu (*Auth*), arsitektur shell *Open Plane*, sistem navigasi sidebar, dan pengamanan sesi login berbasis HMAC SHA-256 + garam.
- **Tugas Utama:**
  - Pembuatan token warna, tipografi Geist, dan skala kontrol 3-tier pada `html/Style.html`.
  - Shell antarmuka `html/Index.html` dengan logo Panji November dan tanpa topbar mengambang.
  - Implementasi login via Email / NIP di `services/AuthService.js` (tanpa jalan pintas alias peran, brute-force limit 5x).
  - Alur registrasi mandiri staf dengan kode verifikasi OTP dan antrean persetujuan Kadiv/Superadmin.
  - Runtime klien `html/Script_Format.html` dan `html/Script_Core.html` (RPC Bridge Promise, Router Hash, Modal, Toaster).
- **Deliverables & Checklist:**
  - [x] Halaman login dan form registrasi aktif tanpa emoji grafis.
  - [x] Navigasi sidebar responsif dengan pill aktif netral.
  - [x] Sistem token sesi login terproteksi via `CacheService` dengan masa kedaluwarsa 6 jam.
  - [x] Runtime script core (RPC Promise, Router, Modal, Toaster) terintegrasi dan lolos `lint_ui.js`.

---

### Fase 3: Sub-Modul A: Komposisi AKN Snapshot & Carry-Forward Engine
- **Tujuan:** Menyelenggarakan pencatatan berkala komposisi personil awak kapal (Keseluruhan vs POA) untuk 5 kategori kepegawaian dengan algoritma *carry-forward* antar-periode yang konsisten.
- **Tugas Utama:**
  - Implementasi modul murni `pure/Carry.js` untuk kalkulasi nilai efektif lintas minggu/bulan.
  - Backend `services/AknService.js` (`akn_getPapan`, `akn_submit`, `akn_revisi`, `akn_anulir`, `akn_konfirmasiTanpaMutasi`, `akn_getTren`).
  - Antarmuka form input matriks 2x5 yang terisi nilai aktif terkini (*snapshot total*) dan validasi `POA <= Keseluruhan`.
  - Tabel riwayat transaksi dengan aksi baris tier SM (`26px`) untuk dialog Revisi dan Anulir.
  - Visualisasi tren deret waktu batang SVG murni (Oranye Keselamatan `#D9480F` vs Tinta Hitam).
- **Deliverables & Checklist:**
  - [x] Algoritma carry-forward teruji 100% pada unit test kasus lintas tahun, revisi, dan anulir (8 test pass).
  - [x] Form submit mencatat snapshot total terkini dalam satu `BatchID`.
  - [x] Grafik batang komposisi terisi warna Oranye Keselamatan (`#D9480F`) aktif tanpa speedometer.
  - [x] Lolos verifikasi `node lint_ui.js` (4 pass, 0 error).

---

### Fase 4: Sub-Modul B: Log Kegiatan & Pembinaan Personil + Multi-Evidence
- **Tujuan:** Memfasilitasi pencatatan agenda diklat, pembinaan taktis, dan bimtek pengawakan lengkap dengan penanganan lampiran multi-berkas Drive.
- **Tugas Utama:**
  - Backend `services/KegiatanService.js` dan adaptasi `services/EvidenceService.js`.
  - Form dialog input agenda kegiatan (judul, jenis, rentang tanggal, wilayah, total peserta, deskripsi).
  - Komponen multi-evidence uploader (drag-and-drop berkas dokumen, foto) terintegrasi ke folder Google Drive `POA_Evidence_Nakhoda`.
  - Tampilan tabel log kegiatan dengan status badge, pencarian judul/wilayah, dan aksi baris tier SM (`26px`).
- **Deliverables & Checklist:**
  - [x] Input kegiatan beserta lampiran multi-berkas Drive tersimpan dan terindeks di `TX_Evidence`.
  - [x] Validasi batas ukuran berkas (15 MB dokumen / 50 MB video) dan rentang tanggal terverifikasi server-side (13 test pass).
  - [x] Dialog revisi (`SUPERSEDED`) dan anulir (`VOID`) kegiatan berfungsi tanpa tumpang tindih alur (*Anti-Gabruk*).
  - [x] Lolos verifikasi `node lint_ui.js` (4 pass, 0 error).

---

### Fase 5: Sub-Modul C: Direktori 396+ Awak Kapal Armada & Pemetaan Kelas
- **Tujuan:** Mengelola direktori 396+ personil awak kapal pengawas, integrasi data master SIKAP, pemetaan kelas kapal, dan privasi identitas.
- **Tugas Utama:**
  - Seeding mandiri dan idempoten 396 awak kapal armada PSDKP (`data/SeedAwak.js`) mencakup Dek (249) dan Mesin (147).
  - Modul murni `pure/Kelas.js` untuk ekstraksi kelas kapal (Kelas I s.d. V), rumpun, dan masking NIP.
  - Backend `services/DirektoriService.js` (`dir_list` dengan paginasi virtual 50 baris, filter rumpun, jabatan, kelas kapal, status, dan antrean "Perlu Dilengkapi").
  - Tampilan tabel direktori (`html/views/Direktori.html`) dengan avatar inisial warna deterministik, kartu statistik, dan lembar samping (*slide-over sheet*) rincian profil awak.
  - Fitur penugasan kategori kepegawaian massal (*batch assign*) bagi Kadiv/Superadmin.
- **Deliverables & Checklist:**
  - [x] Sebanyak 396 personil awak kapal armada terimpor sempurna tanpa duplikasi.
  - [x] Penyamaran NIP (*masking*) aktif untuk akun tanpa wewenang khusus (16 test pass).
  - [x] Lembar samping rincian profil menampilkan data penugasan dan ringkasan sertifikat.
  - [x] Lolos verifikasi `node lint_ui.js` (4 pass, 0 error).

---

### Fase 6: Sub-Modul D: Register Sertifikasi STCW-F & Mesin Status Kedaluwarsa
- **Tujuan:** Standarisasi kurikulum kecakapan 9 jabatan awak (114 butir kompetensi), pencatatan sertifikat STCW-F, dan evaluasi masa berlaku otomatis.
- **Tugas Utama:**
  - Seeding 114 butir standar kompetensi pada `Master_Standar_Pelatihan` (`data/SeedStandarPelatihan.js`) lengkap dengan atribut `MasaBerlakuBulan` (60 bulan untuk STCW).
  - Implementasi modul murni `pure/Sertifikat.js` untuk evaluasi status kedaluwarsa (`BERLAKU`, `SEGERA_HABIS`, `KEDALUWARSA`, `BELUM_ADA`) dan persentase kelaikan awak.
  - Backend `services/KompetensiService.js` (`kom_getDashboard`, `kom_listAwakKompetensi`, `kom_getAwakMatriks`, `kom_saveSertifikat`).
  - Antarmuka antrean kerja tindak lanjut segera habis/expired dan matriks kelengkapan kompetensi per personil (`html/views/Kompetensi.html`, `html/Script_Kompetensi.html`).
  - Modal dialog revalidasi cepat sertifikat dengan lampiran pindaian STTPP di Google Drive.
- **Deliverables & Checklist:**
  - [x] Mesin status masa berlaku berjalan 100% server-side dengan ambang batas 90 hari dan 30 hari (22 test pass).
  - [x] Perekaman sertifikat baru otomatis menandai sertifikat lama sebagai `SUPERSEDED`.
  - [x] Pengambilan daftar tindak lanjut $\le 1.5$ detik untuk ratusan rekaman sertifikat.
  - [x] Lolos verifikasi `node lint_ui.js` (4 pass, 0 error).

---

### Fase 7: Sub-Modul E: Penugasan Kapal & Matriks Papan Sijil (Safe Manning)
- **Tujuan:** Memantau kelaikan dan formasi keterisian awak di setiap kapal pengawas armada Ditjen PSDKP secara real-time.
- **Tugas Utama:**
  - Konfigurasi tabel kebutuhan minimum awak kapal pada `Master_SafeManning`.
  - Modul murni `pure/Sijil.js` untuk kalkulasi deviasi formasi penempatan kapal pengawas.
  - Backend `services/SijilService.js` (`sijil_getPapan`, `sijil_naik`, `sijil_turun`).
  - Visualisasi interaktif **Papan Sijil** (Kapal x Pos Jabatan) dengan indikator sel dinamis.
  - Penandaan status kapal "Tidak Laik Berlayar" jika terdapat personil aktif dengan sertifikat keselamatan kedaluwarsa.
- **Deliverables & Checklist:**
  - [x] Matriks Papan Sijil menampilkan deviasi kebutuhan formasi akurat per kapal (25 test pass).
  - [x] Setiap awak kapal hanya memiliki maksimal 1 penugasan kapal aktif dengan penguncian withLock.
  - [x] Interaksi klik sel kapal membuka lembar samping susunan formasi awak per departemen (Dek & Mesin).
  - [x] Lolos verifikasi `node lint_ui.js` (4 pass, 0 error).

---

### Fase 8: Dasbor Ringkasan Eksekutif, Notifikasi Cron & Generator Laporan
- **Tujuan:** Menyediakan kokpit monitoring terpadu, automasi alerting kedaluwarsa dokumen, dan generator berkas laporan cetak resmi.
- **Tugas Utama:**
  - Endpoint agregasi terpadu `ringkasan_get()` dengan generator kalimat temuan berbasis data.
  - Backend `services/NotifService.js` dengan serverless triggers: pemindai kedaluwarsa harian (06:00 WIB), pengingat mingguan (Senin 07:00 WIB), dan pencadangan database mingguan (Minggu 02:00 WIB).
  - Backend `services/LaporanService.js` untuk pratinjau cetak A4 dan ekspor dokumen PDF/XLSX/CSV berformat resmi dinas.
- **Deliverables & Checklist:**
  - [x] Dasbor Ringkasan memuat dalam $\le 2.0$ detik dengan strip 4 KPI terpadu.
  - [x] Triggers cron terjadwal terkonfigurasi dan teruji berjalan stabil.
  - [x] Ekspor CSV dan pratinjau lembar dinas cetak standar A4 kop resmi Ditjen PSDKP.
  - [x] Lolos verifikasi `node lint_ui.js` (4 pass, 0 error).

---

### Fase 9: Sub-Modul H: Pengelolaan Pengguna, Persetujuan & Log Audit
- **Tujuan:** Pengendalian otoritas akses pengguna, pengelolaan data acuan sistem, dan penelusuran jejak audit operasional.
- **Tugas Utama:**
  - Panel administrasi akun, mutasi peran, penonaktifan akun, dan reset password via token sekali pakai di `services/AdminService.js`.
  - Panel persetujuan pendaftaran akun baru (*Approval Queue*).
  - Penampil catatan audit (*Audit Log Viewer*) dengan inspeksi nilai `Sebelum` dan `Sesudah`.
  - Antarmuka editor data acuan master (`Opsi`, `Master_Standar_Pelatihan`, `Master_SafeManning`).
- **Deliverables & Checklist:**
  - [ ] Seluruh tindakan administratif terekam otomatis dalam tabel `Audit_Log`.
  - [ ] Hak persetujuan berjenjang (Kadiv untuk Staf; Superadmin untuk Kadiv) terisolasi.
  - [ ] Tidak ada kata sandi yang disimpan atau ditampilkan dalam bentuk plaintext.

---

### Fase 10: Hardening Keamanan, Audit Mutu UI, dan UAT Pengawakan
- **Tujuan:** Uji penetrasi internal, sanitasi keamanan data, audit kepatuhan desain menyeluruh, dan verifikasi penerimaan pengguna akhir (UAT).
- **Tugas Utama:**
  - Sanitasi injeksi formula spreadsheet (karakter `=`, `+`, `-`, `@` otomatis diawali apostrof `'`).
  - Audit hak akses RBAC menyeluruh pada seluruh fungsi RPC server-side.
  - Eksekusi linter visual `node lint_ui.js` dan inspeksi `lint.mjs --app` untuk verifikasi Zero-Emoji, 3-Tier Controls, dan kepatuhan desain.
  - Pelaksanaan skenario pengujian UAT fungsional bersama tim kerja Pengawakan.
  - Penyusunan dokumentasi runbook operasional sistem dan pencadangan akhir.
- **Deliverables & Checklist:**
  - [ ] Audit linter UI lolos 100% tanpa pelanggaran (`0 errors`).
  - [ ] Seluruh skenario pengujian UAT terpenuhi dan disetujui.
  - [ ] Versi v1.0 siap dirilis untuk operasional resmi Timja Pengawakan Dit. POA.

---

## 3. Matriks Pengujian & Verifikasi Kualitas (QA Test Suite)

| Kategori Pengujian | Parameter Verifikasi | Perintah / Prosedur Uji | Target Kelulusan |
|---|---|---|:---:|
| **Audit Linter UI & Proyek** | Zero-Emoji, Skala 3-Tier, Larangan Inline Height, Anti-Gabruk, Kalkulasi Server-Side | `node lint_ui.js` | **100% PASS (0 Errors)** |
| **Pemeriksaan Sintaksis JS** | Validasi kompilasi seluruh file JavaScript backend & utils | `node -c Code.js services/*.js utils/*.js data/*.js pure/*.js` | **0 Syntax Errors** |
| **Unit Test Logika Murni** | Carry-forward, mesin status sertifikat, kalkulasi Papan Sijil, parser kelas | `node --test tests/*.test.js` | **100% Tests Pass** |
| **Inspeksi Skill Desain** | Aturan app screen (Achromatic Ledger), pangsa warna < 3%, tipografi Geist | `node .agents/skills/design-taste-frontend/scripts/lint.mjs --app` | **0 Violations** |
| **Inspeksi Visual Multi-Resolusi** | Tampilan antarmuka pada lebar 1440px, 768px, dan 390px | `node .agents/skills/design-taste-frontend/scripts/inspect.mjs --app` | **0 FAIL** |
