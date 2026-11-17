# AGENTS.md — Panduan Kerja Agent: Nakhoda

## 1. Urutan Baca Wajib
1. `PRD.md` — Sumber kebenaran tertinggi mengenai kebutuhan dan aturan bisnis.
2. `ARCHITECTURE.md` — Arsitektur teknis, snapshot carry-forward, dan multi-evidence handler.
3. `DATA_SCHEMA.md` — Skema persis seluruh tabel, jangan mengarang nama kolom.
4. `DESIGN.md` — Aturan visual, skala 3-tier kontrol, dan negative prompt.
5. `PHASES.md` — Roadmap dan rencana tahapan kerja aktif.

## 2. Aturan Keras & Non-Negotiable
- **Git & GitHub Hanya Milik User:** Agent dilarang menjalankan perintah `git add`, `git commit`, `git push`, dsb. Agent hanya bertugas menyiapkan kode dan mengingatkan user.
- **Prinsip Anti-Gabruk:** 2 sub-modul input (Komposisi AKN dan Log Kegiatan) wajib memiliki form dan alur terpisah.
- **Snapshot Total:** Form komposisi AKN menginput total terkini, bukan selisih mutasi.
- **Kohesi Kontrol UI 3-Tier:** Semua tombol dan input terikat pada tier `LG: 40px`, `MD: 32px`, `SM: 26px`.
- **4 Kategori Kepegawaian Baku AKN:** Seluruh pengawakan kapal hanya memakai 4 kategori (`PNS`, `P3K`, `P3K_PARUH_WAKTU`, `PJLP`); pemisahan `PPPK_FUNGSIONAL` dan `PPPK_PELAKSANA` dihapus dan digabung menjadi `P3K`.
- **Aturan Nama Kanonik (`sanitizeNamaPersonel`):** Nama personel wajib **HURUF BESAR (`A-Z` dan spasi tunggal saja)**, tanpa gelar akademik/pelaut, tanpa tanda petik (`'`, `` ` ``, `’`), titik, koma, tanda hubung, maupun angka.
- **Tanpa Input `JabatanLengkap` & Aturan Kondisional `NIP`:** Di form Nakhoda, operator hanya memilih `KelompokJabatan` dan `KelasKapal` (tidak ada input manual `JabatanLengkap` dan `NomorBukuPelaut`). `NIP` **wajib 18 digit angka** untuk `PNS`, `P3K`, dan `P3K_PARUH_WAKTU`, serta **tidak wajib/dinonaktifkan** untuk `PJLP`.
- **Larangan Ketik Tanggal/Periode Manual:** Seluruh input tanggal dan periode (termasuk Komposisi AKN, filter Triwulan/Semester/Rentang Tanggal, TMT kapal, dan masa berlaku sertifikat) wajib menggunakan *Calendar Picker* (`type="date"` terproteksi `onkeydown="return false"`) atau *Preset Dropdown* — dilarang input ketik manual.
- **Push Sync Otomatis ke SIKAP & Disparitas TU:** Setiap tambah/ubah profil awak, penempatan Sijil, atau sertifikat BST di Nakhoda otomatis mendorong pembaruan ke `RadarPOA_SIKAP_DB` (`Master_Pegawai_POA`) dengan status `StatusKelengkapanTU = 'DISPARITAS_NAKHODA'` agar memicu notifikasi verifikasi di SIKAP.
- **Standar Google Sheet Formal & Human-Readable:** Seluruh sheet di `RadarPOA_Nakhoda_DB` wajib diformat formal melalui `applyFormalSheetFormatting()` (header `#0F172A` teks putih tebal, baris beku, *zebra banding*, format teks `@` pada NIP/nomor seri agar anti-notasi ilmiah, tanggal ISO `yyyy-mm-dd`, dan kolom lebar proporsional).
