# CHANGELOG.md — Nakhoda
**Naungan Awak Kapal Armada (Timja Pengawakan - Dit. POA)**  
*Direktorat Pemantauan dan Operasi Armada (Dit. POA)*  
*Direktorat Jenderal Pengawasan Sumber Daya Kelautan dan Perikanan (Ditjen PSDKP)*  
*Kementerian Kelautan dan Perikanan Republik Indonesia (KKP RI)*

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
