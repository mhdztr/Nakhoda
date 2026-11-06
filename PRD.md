# PRD.md — Product Requirements Document: Nakhoda
**Naungan Awak Kapal Armada (Timja Pengawakan - Dit. POA)**
*Direktorat Pemantauan dan Operasi Armada (Dit. POA)*  
*Direktorat Jenderal Pengawasan Sumber Daya Kelautan dan Perikanan (Ditjen PSDKP)*  
*Kementerian Kelautan dan Perikanan Republik Indonesia (KKP RI)*

---

## 1. Pendahuluan & Visi Sistem

Awak Kapal Negara (AKN) merupakan garda terdepan dan penentu keberhasilan pelaksanaan patroli pengawasan sumber daya kelautan dan perikanan di seluruh Wilayah Pengelolaan Perikanan Negara Republik Indonesia (WPPNRI). Tim Kerja (Timja) Pengawakan di bawah Direktorat Pemantauan dan Operasi Armada (Dit. POA) bertanggung jawab penuh terhadap:
1. Monitoring postur kekuatan personil dan rasio kepegawaian awak kapal pengawas (PNS vs Non-ASN).
2. Pemenuhan kompetensi kecakapan pelaut perikanan sesuai standar nasional dan konvensi internasional (*STCW-F*, sertifikasi ANKAPIN/ATKAPIN, BST-F, dsb.).
3. Kesiapan penempatan awak di atas kapal pengawas (*Safe Manning / Sijil Awak Kapal*).
4. Penyelenggaraan kegiatan pembinaan kapasitas teknis, taktis, dan kedisiplinan personil pengawakan.

**Nakhoda** hadir sebagai aplikasi satelit mandiri berkinerja tinggi (*distributed satellite system*) di atas runtime Google Apps Script (GAS) dengan database Google Sheets terisolasi (`RadarPOA_Nakhoda_DB`). Sistem ini bertindak sebagai **sumber kebenaran tunggal (*Single Source of Truth*)** untuk seluruh data profil, rekam jejak sertifikasi, penugasan kapal, dan dinamika kepegawaian 396+ Awak Kapal Armada PSDKP.

---

## 2. Prinsip Arsitektur Utama

### 2.1 Prinsip "Anti-Gabruk" (Modular Input Separation)
Form input, alur submit, skema validasi, tabel riwayat, dan modal interaksi di Nakhoda dipisahkan secara tegas ke dalam modul-modul independen. Dilarang keras menggabungkan payload, tombol submit, atau modal dialog antar-konteks. Setiap sub-modul memiliki daur hidup dan tanggung jawab mandiri:
- **[AWAK-A] Komposisi Awak Kapal Negara (AKN)** — Snapshot mingguan postur kekuatan.
- **[AWAK-B] Log Kegiatan & Pembinaan Personil** — Agenda bimtek/pelatihan + multi-evidence.
- **[AWAK-C] Direktori Awak Kapal** — Master direktori 396+ personil awak armada.
- **[AWAK-D] Kompetensi & Sertifikat Kepelautan** — Manajemen kurikulum wajib & revalidasi berkala.
- **[AWAK-E] Penugasan Kapal & Papan Sijil** — Kelaikan penempatan awak kapal (*Safe Manning*).
- **[AWAK-F] Notifikasi & Pengingat Otomatis** — Alerting kedaluwarsa dokumen & pengingat berkala.
- **[AWAK-G] Laporan & Ekspor Eksekutif** — Pratinjau cetak A4, PDF, dan spreadsheet resmi.
- **[AWAK-H] Pengelolaan & Administrasi Sistem** — Manajemen akun, persetujuan, dan jejak audit.

### 2.2 Prinsip "Snapshot Total Terkini" (Carry-Forward Snapshot)
Pada sub-modul pencatatan berkala (seperti Komposisi AKN), input data selalu bersifat **snapshot angka total riil terkini** per kategori, bukan selisih mutasi (+/- delta). Jika dalam periode minggu berjalan tidak terdapat mutasi personil, data periode sebelumnya otomatis berlaku secara berkesinambungan (*carry-forward*), tanpa mewajibkan penginputan ulang angka yang sama.

### 2.3 Prinsip "Kalkulasi Selalu Server-Side"
Seluruh formula agregasi kekuatan personil, rasio kecukupan sijil kapal, status masa berlaku sertifikat, deteksi kesenjangan kompetensi, dan kalkulasi tren mingguan/bulanan wajib dieksekusi di backend Google Apps Script. Frontend hanya berfungsi untuk menampilkan representasi data dan tidak dipercaya untuk kalkulasi bisnis inti.

### 2.4 Pola Transaksi Non-Destruktif (Append-Only Versioning)
Sistem menerapkan prinsip pelestarian data:
- **Revisi Data:** Baris lama ditandai `Status = 'SUPERSEDED'`. Baris baru di-append dengan kolom `SupersedesRowID` menunjuk ke baris lama.
- **Anulir Data:** Baris ditandai `Status = 'VOID'` dengan kewajiban mencatat `VoidReason`, `VoidedBy`, dan `VoidedAt`. Baris berstatus `VOID` tidak dihitung dalam agregasi aktif namun tersimpan permanen untuk audit.

---

## 3. Spesifikasi Fungsional Sub-Modul

### 3.1 Sub-Modul [AWAK-A]: Komposisi Awak Kapal Negara (AKN)
- **Tujuan:** Monitoring postur kekuatan personil pengawakan kapal pengawas berbasis 2 Scope dan 5 Kategori Kepegawaian resmi.
- **Scope Pelaporan:**
  1. `AKN_KESELURUHAN`: Seluruh personil awak kapal di bawah lingkup pembinaan Direktorat POA.
  2. `AKN_POA`: Personil awak kapal yang aktif langsung dalam penugasan operasi patroli armada Dit. POA.
- **5 Kategori Kepegawaian Resmi:**
  1. `PNS`: Pegawai Negeri Sipil Fungsional Pelaut / Pengawas.
  2. `PPPK_FUNGSIONAL`: PPPK Tenaga Teknis Jabatan Fungsional.
  3. `PPPK_PELAKSANA`: PPPK Tenaga Teknis Jabatan Pelaksana.
  4. `PPPK_PARUH_WAKTU`: PPPK Paruh Waktu (kebijakan reformasi MenPAN-RB).
  5. `PJLP`: Penyedia Jasa Lainnya Perorangan / ABK Kontrak.
- **Mekanisme Kerja & Validasi:**
  - Form dialog menampilkan matriks 2x5 yang terisi nilai aktif terkini (*carry-forward*).
  - Pengguna hanya mengubah sel yang mengalami mutasi. Sistem hanya mencatat baris baru untuk sel yang berubah dengan penanda `BatchID` yang sama.
  - Validasi ketat: Nilai `Jumlah` bilangan bulat $\ge 0$. Nilai `AKN_POA` secara logis tidak boleh melebihi `AKN_KESELURUHAN` pada kategori yang sama.
  - Tersedia fitur *Konfirmasi Tanpa Mutasi* jika minggu berjalan tidak memiliki perubahan personil.

### 3.2 Sub-Modul [AWAK-B]: Log Kegiatan & Pembinaan Personil
- **Tujuan:** Pencatatan komprehensif agenda pelatihan, bimbingan teknis kepelautan, penyegaran menembak, simulasi olah gerak, dan pembinaan disiplin awak kapal.
- **Field Data:**
  - `JudulKegiatan`: Nama resmi agenda (contoh: "Penyegaran Keterampilan Menembak Senjata Api Kapal Pengawas TW I").
  - `JenisKegiatan`: Kategori kegiatan (`PELATIHAN_TEKNIS`, `SERTIFIKASI_LAUT`, `PENYEGARAN_TAKTIK`, `PEMBINAAN_DISIPLIN`).
  - `TanggalMulai` & `TanggalSelesai`: Rentang waktu kegiatan (maksimal rentang 365 hari).
  - `Wilayah`: Pangkalan/Stasiun UPT lokasi pelaksanaan (contoh: "Pangkalan PSDKP Batam").
  - `JumlahPeserta`: Total personil yang mengikuti agenda.
  - `Deskripsi`: Notula ringkas, capaian, dan evaluasi hasil kegiatan.
  - `EvidenceUrl`: Tautan Google Drive folder multi-evidence (dokumen daftar hadir, pindaian sertifikat, foto fisik dokumentasi).
- **Peserta Terkait (Opsional):** Integrasi penandaan personil awak dari Direktori yang mengikuti kegiatan terkait via junction table.

### 3.3 Sub-Modul [AWAK-C]: Direktori Awak Kapal Armada
- **Tujuan:** Buku induk personil 396+ Awak Kapal Pengawas PSDKP seluruh Indonesia.
- **Atribut Personel:**
  - `PegawaiID` (format `PEG-XXXX`), `NIP` (18 digit atau `-` bagi non-ASN), `NamaLengkap`.
  - `KelompokJabatan`: 9 kelompok awak armada (Nahkoda, Mualim, KKM, Masinis, Markonis, Serang, Juru Mudi, Kelasi, Juru Minyak).
  - `JabatanLengkap`: Nomenklatur formatur resmi KKP.
  - `KelasKapal`: Kelas kapal pengawas penempatan (Kelas I, II, III, IV, V).
  - `Rumpun`: `AWAK_DEK` vs `AWAK_MESIN`.
  - `KategoriKepegawaian`: 5 kategori resmi pemerintah (PNS, PPPK Fungsional, PPPK Pelaksana, PPPK Paruh Waktu, PJLP).
  - `StatusAktif`: `AKTIF`, `TUGAS_BELAJAR`, `MUTASI`, `NON_AKTIF`.
  - `KapalID`: Kapal penugasan saat ini (terintegrasi otomatis dari status Sijil aktif).
  - `NomorBukuPelaut` & Masa Berlaku Kontrak (khusus PPPK Paruh Waktu & PJLP).
- **Fitur Khusus:**
  - Filter cepat antrean **"Perlu Dilengkapi"** untuk data profil yang belum memiliki NIP valid, belum terpetakan kelas kapal, atau belum ditetapkan kategori kepegawaiannya.
  - Fitur penyesuaian kategori kepegawaian massal (*batch assign*) bagi Kadiv/Superadmin.
  - Penyembunyian NIP (*masking*) untuk menjaga privasi personil bagi akun non-pengelola.

### 3.4 Sub-Modul [AWAK-D]: Kompetensi & Sertifikat Kepelautan
- **Tujuan:** Standarisasi kurikulum kecakapan awak kapal dan pengawalan masa berlaku sertifikat (termasuk sertifikat berkala 5 tahunan seperti BST/BST-F).
- **Struktur Kurikulum Resmi:** Mengelola 114 butir standar kompetensi resmi pada 9 kelompok jabatan awak kapal:
  - Sertifikasi Laut (STCW-F: ANKAPIN, ATKAPIN, BST-F, AFF, SCRB, MFA, Radar/ARPA, ECDIS, GMDSS/ORU, ERM/BRM).
  - Kompetensi Teknis (Boarding Officer VBSS, Olah Gerak Taktis, Penembakan Senjata Api Kapal Pengawas, K3 Kamar Mesin, Mesin Induk & Bantu).
  - Manajerial & Dinas Jaga (Dinas Jaga Laut, Engine Watchkeeping, Budaya Integritas & Loyalitas).
- **Manajemen Masa Berlaku Sertifikat:**
  - Setiap butir standar memiliki atribut `MasaBerlakuBulan` (mis. BST = 60 bulan / 5 tahun).
  - Mesin status kalkulasi server-side menghasilkan 4 status:
    1. `BERLAKU`: Masa berlaku aktif $> 90$ hari.
    2. `SEGERA_HABIS`: Sisa masa berlaku $\le 90$ hari (peringatan dini revalidasi).
    3. `KEDALUWARSA`: Telah melampaui tanggal `BerlakuSampai`.
    4. `BELUM_ADA`: Belum pernah mengunggah sertifikat kelulusan.
- **Tindak Lanjut Cepat:** Panel kerja "Antrean Tindak Lanjut" mengurutkan sertifikat yang paling mendesak kedaluwarsa beserta tombol cepat revalidasi.

### 3.5 Sub-Modul [AWAK-E]: Penugasan Kapal & Papan Sijil (Safe Manning)
- **Tujuan:** Memantau keterisian dan kelaikan formasi awak di setiap kapal pengawas armada Ditjen PSDKP.
- **Matriks Papan Sijil:**
  - Visualisasi 2 dimensi: Kapal Pengawas (baris) x Formasi Jabatan (kolom).
  - Sel menampilkan deviasi personil terhadap standar kebutuhan minimum (*Safe Manning*): `+1`, `0`, `-1`, `-2`.
  - Warna menanjak ke arah negatif: `0` dan surplus berwarna netral; `-1` kuning peringatan; $\le -2$ merah kritis.
- **Logika Penugasan Personel:**
  - Perekaman riwayat penugasan (`TX_Penugasan_Kapal`): tanggal naik kapal, pos sijil, dan tanggal turun kapal.
  - Setiap personil hanya boleh memiliki 1 penugasan kapal aktif pada satu waktu.
  - Personil yang memiliki sertifikat keselamatan wajib berstatus `KEDALUWARSA` tetap dihitung dalam formasi kapal namun diberi penanda visual **"Tidak Laik Berlayar"**.

### 3.6 Sub-Modul [AWAK-F]: Notifikasi & Pengingat Otomatis
- **Tujuan:** Menjaga proaktivitas pengawasan masa berlaku dokumen dan kedisiplinan pelaporan mingguan.
- **Automated Triggers (Serverless Cron):**
  - **Pemindai Harian (06:00 WIB):** Memindai seluruh register sertifikat yang memasuki masa tenggang $\le 90$ hari atau telah kedaluwarsa, serta memeriksa kontrak kerja PPPK/PJLP yang akan berakhir.
  - **Pengingat Mingguan (Senin 07:00 WIB):** Mengirimkan notifikasi push dalam aplikasi kepada staf pengawakan untuk pelaporan komposisi minggu berjalan.
  - **Pencadangan Basis Data (Minggu 02:00 WIB):** Ekspor salinan arsip snapshot database satelit secara terjadwal.

### 3.7 Sub-Modul [AWAK-G]: Laporan & Ekspor Eksekutif
- **Tujuan:** Penyediaan dokumen resmi cetak dan data olah untuk konsumsi pimpinan Dit. POA dan Ditjen PSDKP.
- **Format Keluaran:**
  - Pratinjau layout standar cetak A4 di dalam aplikasi.
  - Ekspor dokumen PDF resmi dengan kop dinas dan Panji November Nakhoda.
  - Ekspor spreadsheet Excel/XLSX berformat rapi untuk keperluan analisis lanjutan.

### 3.8 Sub-Modul [AWAK-H]: Pengelolaan & Administrasi Sistem
- **Tujuan:** Pengendalian keamanan pengguna, hak akses peran, data acuan, dan audit kepatuhan.
- **Fitur Administrasi:**
  - Manajemen akun staf pengawakan dan verifikasi antrean registrasi (*Approval Queue*).
  - Pengaturan nilai grup data master opsi (`Opsi`).
  - Pengaturan standar kebutuhan personil kapal (*Master Safe Manning*).
  - Penampil catatan audit (*Audit Log Viewer*) lengkap dengan inspeksi data sebelum dan sesudah perubahan.

---

## 4. Matriks Peran & Hak Akses (RBAC)

| Operasi / Modul | SUPERADMIN | DIREKTUR | KADIV AWAK | STAF AWAK | STAF Divisi Lain |
|---|:---:|:---:|:---:|:---:|:---:|
| **Ringkasan Eksekutif & KPI** | Ya | Ya | Ya | Ya | Terbatas (Agregat) |
| **Papan Sijil & Safe Manning** | Ya | Ya | Ya | Ya | Terbatas (Tanpa NIP) |
| **Input / Revisi Komposisi AKN (A)** | Ya | Tidak | Ya | Ya | Tidak |
| **Input / Revisi Log Kegiatan (B)** | Ya | Tidak | Ya | Ya | Tidak |
| **Kelola Direktori Awak (C)** | Ya | Tidak | Ya | Ya (Profil Saja) | Tidak |
| **Ubah Kategori Massal Awak (C)** | Ya | Tidak | Ya | Tidak | Tidak |
| **Input / Revalidasi Sertifikat (D)** | Ya | Tidak | Ya | Ya | Tidak |
| **Penugasan Sijil Kapal (E)** | Ya | Tidak | Ya | Ya | Tidak |
| **Anulir Transaksi (`VOID`)** | Ya | Ya | Ya | Tidak | Tidak |
| **Manajemen Pengguna & Persetujuan** | Ya | Tidak | Ya (Staf Awak) | Tidak | Tidak |
| **Kelola Standar & Safe Manning** | Ya | Tidak | Ya | Tidak | Tidak |
| **Lihat Log Audit Lengkap** | Ya | Ya | Ya | Tidak | Tidak |

---

## 5. Persyaratan Non-Fungsional

1. **Integritas Konkurensi & Locking:** Seluruh operasi tulis ke database spreadsheet wajib diproteksi menggunakan `LockService.getScriptLock()` dengan batas tunggu 15 hingga 30 detik untuk mengeliminasi potensi konflik data bersamaan.
2. **Kinerja & Kecepatan:**
   - Waktu muat awal SPA $\le 2.0$ detik pada koneksi internet standar.
   - Pemuatan register sertifikat volume tinggi (hingga 5.000+ data baris) wajib selesai $\le 1.5$ detik dengan teknik *Memory Object Mapping* dan *chunked caching*.
3. **Penyimpanan Berkas Digital:**
   - Seluruh lampiran bukti fisik, foto kegiatan, dan dokumen pindaian sertifikat disimpan secara terstruktur di Google Drive root `POA_Evidence_Nakhoda`.
   - Batas maksimal lampiran berkas dokumen/foto adalah 15 MB, dan lampiran video dokumentasi adalah 50 MB.
4. **Kepatuhan Tampilan & Aksesibilitas (Sesuai DESIGN.md):**
   - Mengadopsi arsitektur visual **Open Plane (Achromatic Ledger)** dengan warna aksen data **Oranye Keselamatan (`#D9480F`)**. Dilarang keras memakai warna Navy Nautika.
   - Kepatuhan mutlak terhadap skala kontrol 3-tier: `LG: 40px`, `MD: 32px`, `SM: 26px`.
   - **Zero-Emoji Policy:** Seluruh elemen teks, tombol, tabel, dan ekspor bersih dari karakter emoji; ikon wajib menggunakan SVG presisi (stroke 1.5px).
   - Tipografi tabular (`tabular-nums`) pada seluruh tampilan angka, tanggal, dan NIP.

---

## 6. Kriteria Penerimaan (Acceptance Criteria)

- [ ] Seluruh 8 sub-modul mandiri memiliki form, validasi server-side, tabel riwayat, dan dialog interaksi independen (*Prinsip Anti-Gabruk*).
- [ ] Form input komposisi AKN menginput angka total riil terkini (*Snapshot Total*), dan logika *carry-forward* antar-periode terbukti konsisten.
- [ ] Data 396 Awak Kapal Armada terdaftar lengkap di Direktori dan bersih dari duplikasi.
- [ ] Mesin status sertifikat kepelautan berjalan 100% server-side dengan klasifikasi akurat (`BERLAKU`, `SEGERA_HABIS`, `KEDALUWARSA`, `BELUM_ADA`).
- [ ] Papan Sijil berhasil memetakan rasio keterisian awak kapal pengawas terhadap formasi minimum secara real-time.
- [ ] Seluruh kode lolos audit linter antarmuka (`node lint_ui.js`), inspeksi skill (`lint.mjs --app`), dan verifikasi sintaksis JavaScript (`0 errors`).
