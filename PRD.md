# PRD.md — Product Requirements Document

## Nama Proyek
Portal Timja Harwat (Nakhoda)

## Tujuan
Mendukung transformasi arsitektur Nautika menjadi ekosistem terdistribusi Radar POA sesuai Master Blueprint v2.1.0.

## Ruang Lingkup
3 sub-modul: Kesiapan Armada 34 kapal besar (SIAP/TIDAK_SIAP), Monitoring Docking, Item Pekerjaan Pemeliharaan + multi-evidence

## Prinsip
- Desentralisasi input, agregasi terpusat (kecuali Radar POA yang juga punya modul Kegiatan Direktorat)
- Anti-gabruk (modul terpisah, validasi terisolasi)
- RBAC ditegakkan di server
- Versioning & anulir (tidak overwrite historis)
- Perhitungan server-side
- Kontrol UI 3-tier (LG/MD/SM)

## RBAC Umum
Mengacu pada pola aplikasi Nautika dengan penegakan scope per divisi/role di server.

## Data
Mengacu pada `DATA_SCHEMA.md`. Menggunakan master data bersama dari `RadarPOA_Master_DB` (untuk aplikasi satelit) sesuai kebutuhan.

## Desain
Mengacu pada `DESIGN.md` (Apple HIG, 3-tier control, negative prompt).
