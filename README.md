# Nakhoda (Naungan Awak Kapal Armada)
> **Aplikasi Satelit Mandiri Timja Pengawakan — Dit. POA**  
> *Direktorat Jenderal Pengawasan Sumber Daya Kelautan dan Perikanan (Ditjen PSDKP)*  
> *Kementerian Kelautan dan Perikanan Republik Indonesia (KKP RI)*

---

## 1. Ikhtisar Sistem

**Nakhoda** adalah sistem informasi manajemen pengawakan kapal pengawas perikanan terpadu yang bertindak sebagai sumber kebenaran tunggal (*Single Source of Truth*) untuk pembinaan, pemantauan postur kekuatan, sertifikasi kepelautan (STCW-F), dan penugasan formasi awak armada kapal patroli pengawasan maritim di bawah naungan Direktorat Pemantauan dan Operasi Armada (Dit. POA).

Sistem dibangun dengan arsitektur satelit mandiri berkinerja tinggi (*distributed satellite system*) di atas runtime Google Apps Script (GAS) dan Google Spreadsheet terisolasi (`RadarPOA_Nakhoda_DB`) guna mengeliminasi persaingan kunci (*lock contention*) dan memastikan ketersediaan data secara real-time.

### Parameter Teknis:
- **Script ID (Google Apps Script):** `1WJimi2JBFXG8_wsgS9K74Z5ztO-Y037NbLAJ-LquiNCwtq7Bvh-uXcc6`
- **Repositori GitHub:** `https://github.com/mhdztr/Nakhoda.git`
- **Spreadsheet Basis Data Satelit:** `RadarPOA_Nakhoda_DB`
- **Spreadsheet Master Acuan (Read-Only):** `RadarPOA_Master_DB`
- **Penyimpanan Berkas Digital:** Google Drive Folder `POA_Evidence_Nakhoda`

---

## 2. 8 Sub-Modul Mandiri (Prinsip Anti-Gabruk)

Sesuai mandat fungsional, seluruh alur interaksi dan transaksi data di Nakhoda dipisahkan secara independen ke dalam 8 sub-modul mandiri:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   NAKHODA PORTAL PENGAWAKAN ARMADA                              │
├─────────────────────┬─────────────────────┬─────────────────────┬───────────────────────────────┤
│ [AWAK-A] KOMPOSISI  │ [AWAK-B] KEGIATAN   │ [AWAK-C] DIREKTORI  │ [AWAK-D] KOMPETENSI           │
│ • Snapshot Total    │ • Agenda Bimtek     │ • 396+ Awak Armada  │ • 114 Butir Standar STCW-F    │
│ • 2 Scope x 5 Kat   │ • Multi-Evidence    │ • Pemetaan Kelas    │ • Status Masa Berlaku 5 Tahun │
│ • Carry-Forward     │ • Garis Waktu       │ • Antrean Perlu Cek │ • Antrean Tindak Lanjut       │
├─────────────────────┼─────────────────────┼─────────────────────┼───────────────────────────────┤
│ [AWAK-E] PAPAN SIJIL│ [AWAK-F] NOTIFIKASI │ [AWAK-G] LAPORAN    │ [AWAK-H] PENGELOLAAN          │
│ • Matriks Kelaikan  │ • Pemindai Harian   │ • Pratinjau Cetak A4│ • Pengguna & Persetujuan      │
│ • Safe Manning Kapal│ • Pengingat Senin   │ • Generator PDF/XLSX│ • Jejak Audit Operasional     │
│ • Alert Tidak Laik  │ • Auto Cadangan DB  │ • Panji November    │ • Manajemen Data Acuan        │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **[AWAK-A] Komposisi AKN:** Pelaporan berkala postur kekuatan personil (Keseluruhan vs POA) untuk 5 kategori kepegawaian berbasis snapshot total angka terkini dengan kalkulasi carry-forward otomatis.
2. **[AWAK-B] Log Kegiatan & Pembinaan:** Pencatatan agenda pelatihan, penyegaran menembak, dan bimtek awak kapal dengan dukungan unggah multi-berkas Drive.
3. **[AWAK-C] Direktori Awak Kapal:** Buku induk 396+ personil awak kapal pengawas lengkap dengan rincian kelas kapal, kategori kepegawaian, dan penyamaran NIP untuk privasi.
4. **[AWAK-D] Kompetensi & Sertifikat:** Pengawalan pemenuhan kurikulum wajib kecakapan pelaut perikanan dan pemantauan masa berlaku sertifikat (termasuk revalidasi BST/BST-F 5 tahunan).
5. **[AWAK-E] Penugasan Kapal & Papan Sijil:** Matriks pemantauan kecukupan dan kelaikan formasi awak di setiap kapal pengawas terhadap formasi minimum (*Safe Manning*).
6. **[AWAK-F] Notifikasi & Pengingat Otomatis:** Otomasi peringatan dini dokumen kedaluwarsa, masa kontrak aparatur, dan pengingat pelaporan mingguan via serverless triggers.
7. **[AWAK-G] Laporan & Ekspor Eksekutif:** Penyusunan dokumen rekapitulasi dinas siap cetak dalam format PDF dan spreadsheet Excel.
8. **[AWAK-H] Pengelolaan & Administrasi:** Pengaturan hak akses peran berjenjang, antrean persetujuan registrasi, dan penelusuran riwayat audit.

---

## 3. Desain Antarmuka & Identitas Visual

Antarmuka Nakhoda dibangun dengan arsitektur **Open Plane (Achromatic Ledger)** mengacu pada standar `design-taste-frontend`:
- **Warna Tanda (Signature Accent):** **Oranye Keselamatan (`#D9480F`)** sebagai representasi pelampung, sekoci, dan keselamatan awak di laut. Bebas dari warna Navy dan hijau jade.
- **Landasan Visual:** Landasan kelabu dingin netral (`#F4F5F6`) dengan kartu mineral datar (`#FFFFFF`) tanpa efek kaca atau blur.
- **Skala Geometri 3-Tier Controls:**
  - `Tier LG (40px)`: Form input dialog, tombol submit primer, kolom otentikasi.
  - `Tier MD (32px)`: Kontrol sekunder, baris filter toolbar, segmented tab.
  - `Tier SM (26px)`: Khusus aksi baris tabel (*Detail, Revisi, Anulir*).
- **Zero-Emoji Policy:** Bersih 100% dari karakter unicode emoji; seluruh ikon menggunakan SVG outline presisi stroke 1.5px.
- **Tipografi Tabular:** Geist Font dengan penerapan `tabular-nums` pada seluruh angka, tanggal, dan NIP.

---

## 4. Panduan Verifikasi QA

Sebelum melakukan deployment, jalankan serangkaian pengujian penjaminan mutu mandiri:

```bash
# 1. Audit konsistensi UI, 3-tier kontrol, dan arsitektur Nakhoda
node lint_ui.js

# 2. Verifikasi sintaksis JavaScript
node -c Code.js services/*.js utils/*.js data/*.js pure/*.js

# 3. Eksekusi unit test modul murni
node --test tests/*.test.js

# 4. Audit aturan desain antarmuka
node .agents/skills/design-taste-frontend/scripts/lint.mjs --app
```

---

## 5. Referensi Dokumen Wajib Proyek

1. [PRD.md](file:///home/pinefeast/Projects/Nakhoda/PRD.md) — Kebutuhan fungsional dan aturan bisnis (Sumber kebenaran tertinggi).
2. [ARCHITECTURE.md](file:///home/pinefeast/Projects/Nakhoda/ARCHITECTURE.md) — Arsitektur teknis, locking, carry-forward, dan state machine sertifikat.
3. [DATA_SCHEMA.md](file:///home/pinefeast/Projects/Nakhoda/DATA_SCHEMA.md) — Skema kolom tabel transaksi dan master.
4. [DESIGN.md](file:///home/pinefeast/Projects/Nakhoda/DESIGN.md) — Standar desain visual Achromatic Ledger, Oranye Keselamatan, dan 3-tier scale.
5. [PHASES.md](file:///home/pinefeast/Projects/Nakhoda/PHASES.md) — Roadmap pengembangan 11 fase dan kriteria penerimaan.
6. [AGENTS.md](file:///home/pinefeast/Projects/Nakhoda/AGENTS.md) — Panduan kerja dan batasan keras AI coding agent.
7. [CHANGELOG.md](file:///home/pinefeast/Projects/Nakhoda/CHANGELOG.md) — Catatan riwayat pembaruan sistem per versi.
