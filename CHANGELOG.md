# CHANGELOG.md — Nakhoda
**Naungan Awak Kapal Armada (Timja Pengawakan - Dit. POA)**  
*Direktorat Pemantauan dan Operasi Armada (Dit. POA)*  
*Direktorat Jenderal Pengawasan Sumber Daya Kelautan dan Perikanan (Ditjen PSDKP)*  
*Kementerian Kelautan dan Perikanan Republik Indonesia (KKP RI)*

---

## [Sinkronisasi Skill Agent — tasteskill 2.5.0 & Design-Kowalski] — 9 Nov 2026
**Status:** Selesai

**Pencapaian:**
- Menyinkronkan seluruh skill dari proyek `smelt` ke `.agents/skills/` (46 skill): 6 skill `ponytail`, 17 skill `design-kowalski`, dan `design-taste-frontend` 2.5.0.
- Merapikan struktur: `redesign-skill` → `redesign-existing-projects`, `generative_ui` → `generative-ui`, frontmatter tervalidasi tanpa tautan rusak, dan helper grafik v2 dipertahankan di `assets/charts.js`.
- Memperbarui referensi perintah desain di `README.md`, `DESIGN.md`, `PHASES.md`, `PRD.md`, dan `skills-lock.json` dari `lint.mjs`/`inspect.mjs` ke `consistency.mjs`/`check.mjs`/`shoot.mjs`/`perf.mjs`.

---

## [Fase 8 — Dasbor Ringkasan Eksekutif, Notifikasi Cron & Laporan Dinas] — 9 Nov 2026
**Status:** Selesai

**Pencapaian:**
- Membangun backend konsolidasi `services/LaporanService.js` (`ringkasan_get`, `lap_getPreviewData`, `lap_exportData`) yang mengagregasikan 4 metrik strip KPI pengawakan, status kelaikan safe manning kapal, kepatuhan sertifikasi STCW-F, matriks AKN terkini, dan generator narasi temuan pimpinan berbasis data.
- Membangun layanan automasi serverless cron triggers `services/NotifService.js` (`notif_runDailyScan`, `notif_runWeeklyReminder`, `notif_runWeeklyBackup`) terhubung ke trigger GAS di `Code.js`.
- Membangun antarmuka dasbor `html/views/Ringkasan.html` dan runtime `html/Script_Ringkasan.html` dengan kartu situasi dinamis, metrik kelaikan armada, ringkasan matriks AKN snapshot, dan tabel antrean sertifikat kedaluwarsa (&le; 90 hari).
- Membangun antarmuka `html/views/Laporan.html` dan runtime `html/Script_Laporan.html` mendukung pratinjau lembar dinas resmi standar A4 dengan kop dinas Ditjen PSDKP dan pengunduhan berkas CSV (Direktori Awak & Armada Kapal).
- Mengintegrasikan rute `ringkasan` dan `laporan` ke `html/Script_Core.html` dan `html/Index.html`.
- Lolos audit linter mandiri `node lint_ui.js` (4 pass, 0 error) dan verifikasi test suite (25/25 pass).

---

## [Fase 7 — Sub-Modul E: Penugasan Kapal & Papan Sijil Safe Manning] — 6 Nov 2026
**Status:** Selesai

**Pencapaian:**
- Menyediakan katalog seeder armada kapal pengawas Ditjen PSDKP dan standar Safe Manning Kepmen KP untuk seluruh Kelas Kapal I s.d. V (`data/SeedKapalManning.js`).
- Mengembangkan modul murni `pure/Sijil.js` (`normalizePosSijil`, `evaluateSafeManning`) untuk kalkulasi persentase manning, pendeteksian kekosongan posisi krusial, dan penentuan kelaikan operasi armada teruji 100% pada `tests/sijil.test.js` (3 test pass, total 25 test pass).
- Membangun backend `services/SijilService.js` (`sijil_getPapanArmada`, `sijil_getDetailKapal`, `sijil_assignAwak`, `sijil_unassignAwak`, `sijil_ensureStandarManningSeeded`) berpelindung `withLock()`.
- Membangun antarmuka `html/views/Sijil.html` dan runtime `html/Script_Sijil.html` dengan kartu ringkasan kelaikan armada, filter kelas kapal I-V, papan grid armada berindikator Safe Manning, slide-over detail sijil kru per departemen (Dek & Mesin), serta dialog penugasan awak kapal.
- Mendaftarkan rute `sijil` pada `html/Script_Core.html` dan mengintegrasikan template pada `html/Index.html`.
- Lolos audit linter mandiri `node lint_ui.js` (4 pass, 0 error).

---

## [Fase 6 — Sub-Modul D: Register Sertifikasi STCW-F & Mesin Kedaluwarsa] — 6 Nov 2026
**Status:** Selesai

**Pencapaian:**
- Menyediakan katalog standar 114 butir kompetensi kepelautan STCW-F untuk 9 jabatan awak armada PSDKP (`data/SeedStandarPelatihan.js`) lengkap dengan penentuan masa berlaku 60 bulan untuk sertifikat keselamatan laut.
- Mengembangkan modul murni `pure/Sertifikat.js` (`evaluateSertifikatStatus`, `calculateKelaikanKompetensi`) teruji 100% pada `tests/sertifikat.test.js` (6 test pass, total 22 test pass).
- Membangun backend `services/KompetensiService.js` (`kom_getDashboard`, `kom_listAwakKompetensi`, `kom_getAwakMatriks`, `kom_saveSertifikat`, `kom_ensureStandarSeeded`) dengan penguncian `withLock()` dan siklus hidup `SUPERSEDED`.
- Membangun antarmuka `html/views/Kompetensi.html` dan runtime `html/Script_Kompetensi.html` mendukung kartu metrik 4-tier, antrean kerja revalidasi sertifikat kedaluwarsa (&le; 90 hari), matriks checklist kelaikan per personil, dan modal rekam STTPP dengan upload berkas ke Google Drive.
- Lolos audit linter mandiri `node lint_ui.js` (4 pass, 0 error).

---

## [Fase 5 — Sub-Modul C: Direktori 396+ Awak Kapal Armada & Pemetaan Kelas] — 6 Nov 2026
**Status:** Selesai

**Pencapaian:**
- Menyediakan dataset seeder resmi 396 awak kapal pengawas armada Ditjen PSDKP (`data/SeedAwak.js`) mencakup 249 personil Dek dan 147 personil Mesin.
- Mengembangkan modul murni `pure/Kelas.js` (`extractKelasKapal`, `extractRumpunAwak`, `maskNip`) teruji penuh pada `tests/kelas.test.js` (3 test pass, total 16 test pass).
- Membangun backend `services/DirektoriService.js` (`dir_list`, `dir_getDetail`, `dir_save`, `dir_batchAssign`, `dir_ensureSeeded`) dengan paginasi, filter kelas I-V, dan penugasan massal.
- Membangun antarmuka `html/views/Direktori.html` dan runtime `html/Script_Direktori.html` dengan kartu statistik dinamis, avatar nama deterministik, slide-over sheet detail profil awak, antrean kerja "Perlu Dilengkapi", dan dialog modal edit data.
- Menyiapkan akun default auto-seeded idempoten (`superadmin@nakhoda.go.id`, `katimja.awak@nakhoda.go.id`, `staf.awak@nakhoda.go.id`) pada `data/SheetAccess.js` untuk kemudahan uji coba akses login.
- Lolos audit linter mandiri `node lint_ui.js` (4 pass, 0 error).

---

## [Fase 4 — Sub-Modul B: Log Kegiatan & Multi-Evidence Handler] — 6 Nov 2026
**Status:** Selesai

**Pencapaian:**
- Mengembangkan modul logika murni `pure/Kegiatan.js` untuk kalkulasi rentang hari, penentuan periode mingguan, dan validasi agenda kegiatan dengan unit test komprehensif (`tests/kegiatan.test.js`, 5 test pass).
- Membangun backend `services/KegiatanService.js` (`keg_list`, `keg_getDetail`, `keg_submit`, `keg_revisi`, `keg_anulir`) dengan proteksi `withLock()` dan integritas relasi `TX_Kegiatan_Peserta`.
- Menyesuaikan `services/EvidenceService.js` untuk konteks sub-modul Pengawakan dan penyimpanan terstruktur di Google Drive `POA_Evidence_Nakhoda`.
- Membangun antarmuka `html/views/Kegiatan.html` dan runtime controller `html/Script_Kegiatan.html` mendukung penyaringan jenis kegiatan, pencarian teks, modal formulir pencatatan agenda, multi-evidence file uploader (maks 15MB), modal rincian notula, dan dialog anulir Kadiv/Superadmin.
- Lolos audit linter mandiri `node lint_ui.js` (4 pass, 0 error).

---

## [Fase 3 — Sub-Modul A: Komposisi AKN Snapshot & Carry-Forward Engine] — 6 Nov 2026
**Status:** Selesai

**Pencapaian:**
- Mengembangkan modul murni `pure/Carry.js` dengan fungsi `resolveCarryForward()`, `resolveMatrix()`, dan `validateAknMatrix()` yang teruji 100% pada `tests/carry.test.js` (8 test pass).
- Membangun backend `services/AknService.js` menyediakan RPC `akn_getPapan`, `akn_submit`, `akn_revisi`, `akn_anulir`, `akn_konfirmasiTanpaMutasi`, dan `akn_getTren` dengan proteksi locking `withLock()`.
- Merancang form matriks 2x5 snapshot total (`html/views/Komposisi.html`) mencakup 2 Scope (Keseluruhan PSDKP & Dit. POA) dan 5 Kategori Kepegawaian (PNS, PPPK Fungsional, PPPK Pelaksana, PPPK Paruh Waktu, PJLP) dengan validasi interaktif `POA <= Keseluruhan`.
- Mengembangkan controller klien `html/Script_Akn.html` dengan grafik batang deret waktu SVG murni (Oranye Keselamatan `#D9480F` vs Tinta Hitam `#15181B`), banner status carry-forward, modal dialog revisi baris, dan anulir Kadiv/Superadmin.
- Lolos audit linter mandiri `node lint_ui.js` (4 pass, 0 error).

---

## [Fase 2 — Otentikasi Terpadu, Open Plane Shell & Runtime Klien] — 6 Nov 2026
**Status:** Selesai

**Pencapaian:**
- Menyusun token warna, tipografi Geist, skala kontrol 3-tier (`LG: 40px`, `MD: 32px`, `SM: 26px`), badge pill status, dan dialog styling pada `html/Style.html` (bebas efek kaca/blur, aksen Oranye Keselamatan `#D9480F`).
- Membangun antarmuka masuk terpadu `html/Auth.html` mendukung login Email/NIP, alur pendaftaran 3-tahap dengan OTP email 6-digit, dan antrean approval dengan auto-polling status real-time.
- Membangun shell antarmuka `html/Index.html` (arsitektur Open Plane, sidebar 240px, logo Panji November SVG murni, 8 sub-modul navigasi).
- Memperbarui `services/AuthService.js`: verifikasi kredensial Email atau NIP dinas, proteksi brute-force (batas 5 kali percobaan gagal terkunci 15 menit), manajemen sesi ScriptCache TTL 6 jam, dan eliminasi alias peran.
- Mengembangkan pustaka pemformatan `html/Script_Format.html` (angka tabular Indonesia, tanggal id-ID, status badge, inisial avatar deterministik, pencegahan XSS).
- Mengembangkan runtime klien terpusat `html/Script_Core.html` (RPC bridge Promise wrapper `google.script.run`, client-side hash router, modal controller, toast system).
- Lolos audit linter mandiri `node lint_ui.js` (4 pass, 0 error).

---

## [Fase 1 — Sanitasi Template Nautika, Setup Constants, DB Self-Healing & Test Suite] — 6 Nov 2026
**Status:** Selesai

**Pencapaian:**
- Membersihkan 12 file service warisan usang Nautika (Operasi, Intelijen, Pemantauan, Perawatan, Logistik, BMN, dll.) dan 14 berkas HTML views non-pengawakan.
- Mengonfigurasi `utils/Constants.js` khusus satelit Pengawakan (`RadarPOA_Nakhoda_DB`, `DIV-AWAK`, enum `AWAK_*`).
- Menyediakan self-healing database `openAwakSheet()` dan `ensureAwakSpreadsheet()` pada `data/SheetAccess.js`.
- Mengimplementasikan modul logika murni `pure/Carry.js` dan unit test suite `tests/carry.test.js` (5 test pass).
- Memporting script audit `lint_ui.js` untuk penegakan aturan 3-tier controls, zero-emoji, dan validasi satelit.

---

## [Fase 0 — Penyelarasan Dokumen Inti Proyek & Baseline Keputusan] — 6 Nov 2026
**Status:** Selesai

**Pencapaian:**
- Mengadopsi keterampilan desain terpadu `design-taste-frontend` dari ekosistem proyek SIKAP ke direktori `.agents/skills/` (31 skill terpasang) lengkap dengan `skills-lock.json`.
- Menetapkan arah visual baru pada `DESIGN.md` menggunakan arsitektur **Open Plane (Achromatic Ledger)** dengan aksen data **Oranye Keselamatan (`#D9480F`)**, menggantikan tema Maritime Navy dan kaca warisan Nautika.
- Memperluas cakupan sistem pada `PRD.md` dari 2 sub-modul awal menjadi 8 sub-modul mandiri (`AWAK-A` s.d. `AWAK-H`) dengan penegakan *Prinsip Anti-Gabruk*.
- Menyelaraskan `ARCHITECTURE.md` dengan konvensi RPC modular (`akn_`, `keg_`, `dir_`, `kom_`, `sijil_`, dll.), skema konkurensi `withLock()`, pemisahan modul kalkulasi murni (`pure/`), dan layer caching berversi.
- Memperbarui `DATA_SCHEMA.md` mencakup tabel-tabel transaksi satelit (`TX_Pengawakan_AKN`, `TX_Pengawakan_Kegiatan`, `TX_Kegiatan_Peserta`, `TX_Pelatihan_Awak`, `TX_Penugasan_Kapal`, `TX_Konfirmasi_Mingguan`, `TX_Evidence`) dan tabel master (`Master_Awak`, `Master_Standar_Pelatihan`, `Master_SafeManning`).
- Memperbarui roadmap kerja 11 fase pada `PHASES.md` lengkap dengan matriks pengujian QA yang terukur.
- Menyiapkan dokumen perencanaan implementasi detail (*Implementation Plan v1.0*) yang telah disetujui pengguna.

---

## [Inisialisasi Proyek — Template Setup] — 26 Okt 2026
**Status:** Selesai

**Pencapaian:**
- Inisialisasi repositori Nakhoda dengan konfigurasi clasp (`1WJimi2JBFXG8_wsgS9K74Z5ztO-Y037NbLAJ-LquiNCwtq7Bvh-uXcc6`).
- Penyiapan repositori lokal awal dan struktur berkas dasar.
