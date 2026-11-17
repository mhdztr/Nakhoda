# DATA_SCHEMA.md — Skema Basis Data Relasional: Nakhoda
**Naungan Awak Kapal Armada (Timja Pengawakan - Dit. POA)**  
*Database Satelit:* `RadarPOA_Nakhoda_DB` | *Database Master:* `RadarPOA_Master_DB`

---

## 1. Konvensi Kolom Standar Relasional (Relational Audit Columns)

Setiap tabel transaksi (`TX_*`) pada basis data satelit Nakhoda secara wajib mewarisi 10 kolom standar audit berikut pada posisi kolom terdepan:

| # | Nama Kolom | Tipe Data | Format / Nilai | Nullable | Deskripsi & Aturan Bisnis |
|---|---|---|---|:---:|---|
| 1 | `RowID` | Text (PK) | Format unik per sub-modul (contoh: `AWAK-AKN-XXXXX`) | Tidak | Primary key unik immutable untuk setiap baris transaksi. |
| 2 | `DivisiID` | Text (FK) | `DIV-AWAK` | Tidak | Mengidentifikasi kepemilikan data (selalu `DIV-AWAK` untuk Nakhoda). |
| 3 | `Periode` | Text | `YYYY-MM-WW` atau `YYYY-MM` | Tidak | Penanda periode pelaporan mingguan atau bulanan. |
| 4 | `SubmittedBy` | Text (FK) | `UserID` (Ref: `Users`) | Tidak | Identitas akun staf/pejabat pembuat data. |
| 5 | `Timestamp` | DateTime | `YYYY-MM-DDTHH:mm:ssZ` | Tidak | Waktu persis penulisan data ke spreadsheet. |
| 6 | `Status` | Enum | `ACTIVE`, `SUPERSEDED`, `VOID` | Tidak | Status daur hidup baris data dalam model non-destruktif. |
| 7 | `SupersedesRowID`| Text (FK) | `RowID` (Self) | Ya | Berisi `RowID` lama jika baris ini merupakan revisi pengganti. |
| 8 | `VoidReason` | Text | Teks Bebas | Ya | Alasan resmi pembatalan entri (wajib diisi jika `Status = 'VOID'`). |
| 9 | `VoidedBy` | Text (FK) | `UserID` (Ref: `Users`) | Ya | Akun pejabat (Kadiv/Direktur) yang menganulir data. |
| 10| `VoidedAt` | DateTime | `YYYY-MM-DDTHH:mm:ssZ` | Ya | Waktu pencatatan pembatalan data. |

---

## 2. Tabel Transaksi Satelit `RadarPOA_Nakhoda_DB`

### 2.1 `TX_Pengawakan_AKN` — Komposisi Awak Kapal Negara (Snapshot Total)
Mencatat pelaporan berkala komposisi aparatur pengawakan berbasis 2 Scope dan **4 Kategori Kepegawaian Baku** (diselaraskan dengan SIKAP).

| # | Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Aturan Bisnis & Validasi |
|---|---|---|:---:|---|---|
| 1-10 | *(Kolom Standar)* | — | — | — | `RowID` format `AWAK-AKN-` + 10 hex. |
| 11 | `Scope` | Enum | Tidak | `AKN_KESELURUHAN` | Nilai: `AKN_KESELURUHAN`, `AKN_POA` (Ref: `Opsi.AWAK_SCOPE`). |
| 12 | `Kategori` | Enum | Tidak | `PNS` | Nilai: `PNS`, `P3K`, `P3K_PARUH_WAKTU`, `PJLP`. *(Data lama `PPPK_FUNGSIONAL`/`PPPK_PELAKSANA` dimigrasi otomatis ke `P3K`; `PPPK_PARUH_WAKTU` ke `P3K_PARUH_WAKTU`).* |
| 13 | `Jumlah` | Integer | Tidak | `42` | Total personil aktif saat ini ($\ge 0$). Input berupa angka total terkini. |
| 14 | `Keterangan` | Text | Ya | `2 personil mutasi ke Pangkalan Bitung` | Catatan dinamika perubahan. Wajib diisi jika jumlah personil menurun. |
| 15 | `BatchID` | Text | Tidak | `BATCH-20261106-01` | Penanda batch transaksi yang di-submit bersamaan dalam 1 sesi dialog form. |

---

### 2.2 `TX_Pengawakan_Kegiatan` — Log Agenda & Pembinaan Personil
Merekam agenda pelatihan teknis, sertifikasi, bimtek, penyegaran taktis, dan kedisiplinan awak kapal.

| # | Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Aturan Bisnis & Validasi |
|---|---|---|:---:|---|---|
| 1-10 | *(Kolom Standar)* | — | — | — | `RowID` format `AWAK-KEG-` + 10 hex. |
| 11 | `JudulKegiatan` | Text | Tidak | `Penyegaran Keterampilan Menembak TW I` | Nama resmi agenda kegiatan. |
| 12 | `JenisKegiatan` | Enum | Tidak | `PENYEGARAN_TAKTIK` | Nilai: `PELATIHAN_TEKNIS`, `SERTIFIKASI_LAUT`, `PENYEGARAN_TAKTIK`, `PEMBINAAN_DISIPLIN`. |
| 13 | `TanggalMulai` | Date | Tidak | `2026-03-10` | Tanggal awal pelaksanaan kegiatan. |
| 14 | `TanggalSelesai`| Date | Tidak | `2026-03-12` | Tanggal selesai pelaksanaan ($\ge \text{TanggalMulai}$, rentang $\le 365$ hari). |
| 15 | `Wilayah` | Text | Ya | `Pangkalan PSDKP Batam` | Lokasi / UPT pangkalan penyelenggaraan. |
| 16 | `JumlahPeserta` | Integer | Tidak | `24` | Total personil yang mengikuti kegiatan ($\ge 1$). |
| 17 | `Deskripsi` | Text | Ya | `Penyegaran menembak laras panjang dan pistol dinas` | Notula, materi, dan evaluasi hasil kegiatan. |
| 18 | `EvidenceUrl` | Text (URL) | Ya | `https://drive.google.com/...` | Tautan folder bukti Google Drive (`POA_Evidence_Nakhoda`). |

---

### 2.3 `TX_Kegiatan_Peserta` — Daftar Personil Peserta Kegiatan (Junction Table)
Menghubungkan data agenda kegiatan dengan personil awak yang tercatat di Direktori.

| # | Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Aturan Bisnis & Validasi |
|---|---|---|:---:|---|---|
| 1-10 | *(Kolom Standar)* | — | — | — | `RowID` format `AWAK-KPS-` + 10 hex. |
| 11 | `ParentRowID` | Text (FK) | Tidak | `AWAK-KEG-A1B2C3D4E5` | Mengacu pada `TX_Pengawakan_Kegiatan.RowID`. |
| 12 | `PegawaiID` | Text (FK) | Tidak | `PEG-0042` | Mengacu pada `Master_Awak.PegawaiID`. |
| 13 | `Catatan` | Text | Ya | `Lulus dengan predikat predikat sangat baik` | Catatan evaluasi keikutsertaan personil. |

---

### 2.4 `TX_Pelatihan_Awak` — Register Kelulusan & Revalidasi Sertifikat
Merekam kepemilikan dan riwayat revalidasi sertifikat kepelautan/teknis tiap personil awak kapal.

| # | Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Aturan Bisnis & Validasi |
|---|---|---|:---:|---|---|
| 1-10 | *(Kolom Standar)* | — | — | — | `RowID` format `AWAK-SRT-` + 10 hex. |
| 11 | `PegawaiID` | Text (FK) | Tidak | `PEG-0042` | Mengacu pada `Master_Awak.PegawaiID`. |
| 12 | `KodePelatihan` | Text (FK) | Tidak | `TRN-NKH-02` | Mengacu pada `Master_Standar_Pelatihan.KodePelatihan`. |
| 13 | `NamaPelatihan` | Text | Tidak | `Basic Safety Training Fisheries (BST-F)` | Nama sertifikat/pelatihan resmi. |
| 14 | `StatusKelulusan`| Enum | Tidak | `SUDAH_LULUS` | Nilai: `SUDAH_LULUS`, `BELUM`, `PERLU_PEMBARUAN`. |
| 15 | `NomorSertifikat`| Text | Ya | `62.01.2023.001928` | Nomor registrasi resmi sertifikat pelaut / STTPP. |
| 16 | `TahunPelatihan` | Integer | Ya | `2023` | Tahun kelulusan diklat ($\ge 1980$). |
| 17 | `TanggalTerbit` | Date | Ya | `2023-05-14` | Tanggal penerbitan sertifikat. |
| 18 | `BerlakuSampai` | Date | Ya | `2028-05-14` | Tanggal habis masa berlaku (wajib jika standar memiliki masa berlaku terbatas). |
| 19 | `PenerbitLembaga`| Text | Ya | `Balai Pendidikan dan Pelatihan Perikanan Tegal` | Nama institusi diklat penerbit. |
| 20 | `EvidenceID` | Text (FK) | Ya | `EV-A1B2C3D4E5F6` | Ref: `TX_Evidence.EvidenceID` (file pindaian sertifikat di Drive). |

---

### 2.5 `TX_Penugasan_Kapal` — Riwayat Penempatan Awak di Kapal Pengawas
Mencatat formasi penugasan aktif personil di atas kapal pengawas armada.

| # | Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Aturan Bisnis & Validasi |
|---|---|---|:---:|---|---|
| 1-10 | *(Kolom Standar)* | — | — | — | `RowID` format `AWAK-TGS-` + 10 hex. |
| 11 | `PegawaiID` | Text (FK) | Tidak | `PEG-0042` | Mengacu pada `Master_Awak.PegawaiID`. |
| 12 | `KapalID` | Text (FK) | Tidak | `KP-ORCA-01` | Mengacu pada `Kapal.KapalID`. |
| 13 | `PosSijil` | Enum | Tidak | `NAKHODA` | Posisi formasi penugasan di atas kapal (Ref: `Opsi.AWAK_POS_SIJIL`). |
| 14 | `TanggalNaik` | Date | Tidak | `2026-01-01` | Tanggal mulai bertugas aktif di atas kapal. |
| 15 | `TanggalTurun` | Date | Ya | `2026-12-31` | Tanggal selesai penugasan kapal (kosong jika masih aktif bertugas). |
| 16 | `Keterangan` | Text | Ya | `Penempatan berdasarkan SK Direktur POA` | Dasar penetapan atau rotasi dinas. |

---

### 2.6 `TX_Konfirmasi_Mingguan` — Pernyataan Status Tanpa Mutasi
Mencatat pernyataan resmi bahwa periode minggu berjalan tidak mengalami perubahan personil.

| # | Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Aturan Bisnis & Validasi |
|---|---|---|:---:|---|---|
| 1-10 | *(Kolom Standar)* | — | — | — | `RowID` format `AWAK-KFM-` + 10 hex. |
| 11 | `Catatan` | Text | Tidak | `Komposisi personil tetap sesuai minggu sebelumnya` | Pernyataan konfirmasi tertulis staf. |

---

### 2.7 `TX_Evidence` — Metadata Lampiran Berkas Google Drive
Menyimpan data pengindeksan file bukti kegiatan dan scan sertifikat.

| # | Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Aturan Bisnis & Validasi |
|---|---|---|:---:|---|---|
| 1 | `EvidenceID` | Text (PK) | Tidak | `EV-A1B2C3D4E5F6` | ID unik lampiran berkas. |
| 2 | `RefSheet` | Text | Tidak | `TX_Pelatihan_Awak` | Nama sheet tujuan relasi. |
| 3 | `RefRowID` | Text | Tidak | `AWAK-SRT-A1B2C3D4E5` | RowID baris transaksi tujuan. |
| 4 | `DriveFileID` | Text | Tidak | `1A2b3C4d5E...` | File ID Google Drive. |
| 5 | `FileName` | Text | Tidak | `Scan_BST_Slamet_2023.pdf` | Nama asli berkas yang diunggah. |
| 6 | `FileType` | Text | Tidak | `application/pdf` | MIME-type berkas. |
| 7 | `SourceMode` | Enum | Tidak | `UPLOAD` | `UPLOAD` (base64 client) atau `DRIVE_LINK`. |
| 8 | `UploadedBy` | Text (FK) | Tidak | `USR-STAF-AWAK-001` | UserID staf pengunggah. |
| 9 | `UploadedAt` | DateTime | Tidak | `2026-11-06T09:00:00Z` | Waktu pengunggahan file ke Drive. |
| 10 | `Status` | Enum | Tidak | `ACTIVE` | Status berkas: `ACTIVE`, `DELETED`. |
| 11 | `Catatan` | Text | Ya | `Pindaian STTPP legalisir` | Keterangan tambahan lampiran. |

---

## 3. Tabel Master Data Satelit `RadarPOA_Nakhoda_DB`

### 3.1 `Master_Awak` — Direktori 396+ Personil Awak Kapal Pengawas
Buku induk profil seluruh personil awak kapal di lingkungan armada PSDKP (termasuk AKP Pusat yang diperbantukan di kapal UPT berdasarkan SK/Surat Tugas Pusat).

| # | Nama Kolom | Tipe Data | Format Sheet | Nullable | Contoh Nilai | Aturan Bisnis & Validasi |
|---|---|---|---|:---:|---|---|
| 1 | `PegawaiID` | Text (PK) | Plain Text (`CENTER`) | Tidak | `PEG-0042` | Format unik `PEG-XXXX` 4 digit urut. |
| 2 | `NIP` | Text | Plain Text `@` (`CENTER`) | Kondisional | `198504122010121002` | **Wajib 18 digit angka** untuk `PNS`, `P3K`, `P3K_PARUH_WAKTU`. **Opsional/Kosong** untuk `PJLP`. |
| 3 | `Nama` | Text | Text (`LEFT`) | Tidak | `SLAMET RIYADI` | **Wajib HURUF BESAR (`A-Z` & spasi tunggal saja)**, tanpa gelar, tanpa tanda petik (`'`), titik, koma, atau angka (`sanitizeNamaPersonel`). |
| 4 | `KelompokJabatan` | Text | Text (`LEFT`) | Tidak | `Nahkoda` | 10 kelompok jabatan: `Nahkoda`, `Mualim`, `KKM`, `Masinis`, `Markonis`, `Serang`, `Juru Mudi`, `Kelasi`, `Juru Minyak`, `Juru Masak`. |
| 5 | `JabatanLengkap` | Text | Text (`LEFT`) | Ya | `Nakhoda Kapal Kelas II` | **Tidak diinput di form Nakhoda.** Diisi otomatis dari `KelompokJabatan` + `KelasKapal` untuk kompatibilitas arsip; nomenklatur formal TU dilengkapi di SIKAP via notifikasi disparitas. |
| 6 | `KelasKapal` | Enum | Text (`CENTER`) | Ya | `KELAS II` | `KELAS I`, `KELAS II`, `KELAS III`, `KELAS IV`, `NON-KELAS`. |
| 7 | `Rumpun` | Enum | Text (`CENTER`) | Tidak | `DEK` | Nilai: `DEK`, `MESIN`, `PENUNJANG`. |
| 8 | `KategoriKepegawaian`| Enum | Text (`CENTER`) | Tidak | `PNS` | 4 kategori baku: `PNS`, `P3K`, `P3K_PARUH_WAKTU`, `PJLP`. |
| 9 | `StatusAktif` | Enum | Text (`CENTER`) | Tidak | `AKTIF` | Nilai: `AKTIF`, `CUTI`, `TUGAS_BELAJAR`, `MUTASI_KELUAR`, `PENSIUN`, `NONAKTIF`. |
| 10 | `StatusPenempatan` | Enum | Text (`CENTER`) | Tidak | `PUSAT_POA` | `PUSAT_POA` (Organik Pusat) atau `DIPERBANTUKAN_UPT` (AKP Pusat diperbantukan di UPT berdasar ST/SK). |
| 11 | `PangkalanID` | Text (FK) | Text (`CENTER`) | Ya | `UPT-BTM` | Pangkalan UPT homebase penempatan. |
| 12 | `KapalID` | Text (FK) | Text (`LEFT`) | Ya | `KP-ORCA-01` | Kapal penugasan saat ini (terintegrasi otomatis dari penugasan Sijil aktif). |
| 13 | `TanggalMulaiKerja` | Date | `yyyy-mm-dd` (`CENTER`) | Ya | `2018-02-01` | Tanggal mulai bertugas di kapal pengawas (wajib pilih dari kalender). |
| 14 | `TanggalSelesaiKontrak`| Date | `yyyy-mm-dd` (`CENTER`) | Ya | `2026-12-31` | Tanggal berakhir masa kontrak (khusus `P3K_PARUH_WAKTU` & `PJLP`). |
| 15 | `NomorSKPenempatan` | Text | Plain Text (`LEFT`) | Ya | `ST-412/PSDKP/2026` | Opsional (diisi bila ada nomor SK Penempatan / Surat Tugas). |
| 16 | `DokumenPenempatanURL`| Text (URL) | Text (`LEFT`) | Ya | `https://drive.google.com/...` | Opsional (diisi bila ada pindaian SK Penempatan / Surat Tugas di Drive). |
| 17 | `UkuranBaju` | Enum | Text (`CENTER`) | Ya | `L` | Opsional: `S`, `M`, `L`, `XL`, `XXL`, `XXXL`. |
| 18 | `UkuranSepatu` | Text | Plain Text (`CENTER`) | Ya | `42` | Opsional: `37` s.d. `46`. |
| 19 | `Catatan` | Text | Wrap Text (`LEFT`) | Ya | `Penempatan Aktif: KP. Orca 01 (Nahkoda) \| Pemegang sertifikat BST aktif` | Narasi ringkas formal *human-readable* yang terisi rapi untuk pembacaan langsung di Sheet. |
| 20 | `UpdatedAt` | DateTime | `yyyy-mm-dd hh:mm:ss` (`CENTER`) | Tidak | `2026-11-17 09:00:00` | Waktu pembaruan data terakhir (format terbaca manusia). |
| 21 | `UpdatedBy` | Text (FK) | Text (`LEFT`) | Tidak | `USR-STAF-AWAK-001` | User pelaksana pembaruan data. |

> [!NOTE]
> **Kebijakan Penghapusan `NomorBukuPelaut`:** Kolom lama `NomorBukuPelaut` tidak lagi menjadi kolom kanonik, tidak ditampilkan di UI, dan tidak dihitung dalam metrik kelengkapan data. Apabila sheet lama masih memiliki kolom tersebut, kolom dipertahankan secara pasif hanya demi integritas arsip historis.

---

### 3.2 `Master_Standar_Pelatihan` — Katalog Kurikulum Kompetensi 10 Jabatan Awak
Memuat 114+ butir kurikulum wajib kecakapan awak kapal pengawas (dengan **BST / Basic Safety Training** wajib bagi seluruh awak *on board*, termasuk PJLP Juru Minyak dan Juru Masak).

| # | Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Aturan Bisnis & Validasi |
|---|---|---|:---:|---|---|
| 1 | `KodePelatihan` | Text (PK) | Tidak | `TRN-NKH-02` | Format unik `TRN-[JABATAN]-[NOMOR]`. |
| 2 | `KelompokJabatan` | Text | Tidak | `Nahkoda` | Rumpun jabatan pemilik standar kurikulum. |
| 3 | `TingkatKelas` | Enum | Tidak | `ALL` | `ALL`, `KELAS_I`, `KELAS_II`, dll. |
| 4 | `Kategori` | Enum | Tidak | `SERTIFIKASI_LAUT` | `SERTIFIKASI_LAUT`, `TEKNIS`, `MANAJERIAL`, `FUNGSIONAL`. |
| 5 | `NamaPelatihan` | Text | Tidak | `Basic Safety Training Fisheries (BST-F)` | Nama resmi pelatihan / sertifikasi. |
| 6 | `MasaBerlakuBulan` | Integer | Ya | `60` | Masa berlaku sertifikat dalam bulan (contoh: 60 = 5 tahun). Null jika permanen. |
| 7 | `Wajib` | Boolean | Tidak | `TRUE` | `TRUE` jika mutlak dipersyaratkan untuk kelaikan jabatan. |
| 8 | `Urutan` | Integer | Tidak | `2` | Urutan penomoran tampilan di antarmuka. |

---

### 3.3 `Master_SafeManning` — Standar Kebutuhan Minimum Awak Kapal Pengawas
Tabel rujukan formasi personil minimum per kelas kapal pengawas PSDKP.

| # | Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Aturan Bisnis & Validasi |
|---|---|---|:---:|---|---|
| 1 | `ManningID` | Text (PK) | Tidak | `MAN-KL1-NKH` | Format `MAN-[KELAS]-[POS]`. |
| 2 | `KelasKapal` | Enum | Tidak | `KELAS_I` | Kelas kapal pengawas (`KELAS_I` s.d. `KELAS_V`). |
| 3 | `PosSijil` | Enum | Tidak | `NAKHODA` | Pos formasi jabatan di atas kapal. |
| 4 | `Minimum` | Integer | Tidak | `1` | Jumlah kebutuhan minimum personil ($\ge 1$). |
| 5 | `BerlakuMulai` | Date | Tidak | `2024-01-01` | Tanggal dasar hukum berlakunya aturan formasi. |
| 6 | `Sumber` | Text | Tidak | `Kepdirjen PSDKP No. 12 Tahun 2024` | Dasar regulasi resmi penetapan Safe Manning. |

---

## 4. Tabel Master Data `RadarPOA_Master_DB` (Read-Only)

1. **`Users`**: Menyimpan akun pengguna, NIP, PasswordHash (HMAC SHA-256 + garam), DivisiID, Role, dan Status persetujuan.
2. **`Divisi`**: Referensi divisi resmi (`DIV-AWAK` = Subdirektorat Pengawakan / Timja Pengawakan).
3. **`Kapal`**: Daftar inventaris kapal pengawas armada PSDKP (`KapalID`, `NamaKapal`, `JenisKapal`, `KelasKapal`).
4. **`Opsi`**: Daftar pilihan dropdown terstandar untuk grup `AWAK_SCOPE`, `AWAK_KATEGORI` (`PNS`, `P3K`, `P3K_PARUH_WAKTU`, `PJLP`), `AWAK_JENIS_KEGIATAN`, `AWAK_POS_SIJIL` (termasuk `JURU_MINYAK` dan `JURU_MASAK`), dsb.

---

## 5. Standar Format Fisik Google Spreadsheet (`SheetFormatter` — Formal & Human-Readable)

Untuk mengantisipasi pemeriksaan langsung oleh pimpinan maupun auditor di Google Sheets `RadarPOA_Nakhoda_DB`, setiap sheet wajib memenuhi aturan pemformatan resmi berikut (dieksekusi otomatis oleh `applyFormalSheetFormatting()` di `data/SheetAccess.js`):

| Elemen Sheet | Aturan Standar Formal | Nilai Spesifik |
|---|---|---|
| **Tipografi Dasar** | Jenis & ukuran huruf seragam | `Arial` / `Inter`, `10pt` (data), `10pt Bold` (header) |
| **Header Baris 1** | Kontras tinggi, resmi, & beku saat gulir | Background `#0F172A` (Master) / `#1E293B` (Transaksi), teks `#FFFFFF`, tinggi `34px`, `setFrozenRows(1)` |
| **Baris Data (Baris 2+)** | Tinggi proporsional, *zebra banding*, batas bersih | Tinggi `26px`, vertikal `MIDDLE`, border `#E2E8F0`, warna baris ganjil `#FFFFFF` & genap `#F8FAFC` |
| **Anti-Notasi Ilmiah (`@`)** | Kolom NIP & Nomor Seri wajib berformat teks murni | `NIP`, `NomorSertifikat`, `NomorSKPenempatan`, `UkuranSepatu` diformat `.setNumberFormat('@')` |
| **Tanggal & Waktu** | Standar ISO bersih agar mudah disortir & dibaca | Kolom tanggal: `yyyy-mm-dd` (`CENTER`); Timestamp: `yyyy-mm-dd hh:mm:ss` (`CENTER`) |
| **Angka & Kuantitas** | Pemisah ribuan dan perataan kanan | `Jumlah`, `Minimum`, `JumlahPeserta`, `MasaBerlakuBulan`: format `#,##0` (`RIGHT`) |
| **Lebar Kolom Utama** | Tidak memotong teks kunci atau menyisakan ruang kosong berlebih | `PegawaiID`/`RowID`: `140px`, `NIP`: `165px`, `Nama`: `240px`, `KelompokJabatan`: `165px`, `KelasKapal`: `110px`, `KategoriKepegawaian`: `155px`, `StatusPenempatan`: `165px`, `KapalID`: `180px`, `Tanggal*`: `120px`, `UkuranBaju`/`UkuranSepatu`: `105px`, `Catatan`: `300px` (`WRAP`) |
