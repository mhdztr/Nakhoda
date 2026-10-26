# ARCHITECTURE.md — Arsitektur Teknis

## Peran
Satelit mandiri Timja Harwat. Data ke `RadarPOA_Harwat_DB`. Evidence ke `POA_Evidence_Harwat`.

## Layanan
`HarwatService.js` dengan fungsi `harwat_*`.

## Aturan
LockService, validasi kondisional (TIDAK_SIAP wajib alasan), versioning/anulir, RBAC server-side
