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
