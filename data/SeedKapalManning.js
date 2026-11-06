/**
 * data/SeedKapalManning.js
 * Master Kapal Pengawas Armada Ditjen PSDKP & Matriks Standar Kebutuhan Minimum (Safe Manning)
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

var SEED_KAPAL_ARMADA = [
  // KELAS I (Panjang > 60 meter / Pengawasan ZEE)
  { kapalId: 'KP-ORCA-01', namaKapal: 'KP. Orca 01', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_I', pangkalanId: 'Pangkalan PSDKP Batam', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-ORCA-02', namaKapal: 'KP. Orca 02', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_I', pangkalanId: 'Pangkalan PSDKP Bitung', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-ORCA-03', namaKapal: 'KP. Orca 03', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_I', pangkalanId: 'Pangkalan PSDKP Jakarta', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-ORCA-04', namaKapal: 'KP. Orca 04', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_I', pangkalanId: 'Pangkalan PSDKP Benoa', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-ORCA-05', namaKapal: 'KP. Orca 05', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_I', pangkalanId: 'Stasiun PSDKP Pontianak', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-ORCA-06', namaKapal: 'KP. Orca 06', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_I', pangkalanId: 'Pangkalan PSDKP Lampulo', statusOperasi: 'SIAP_LAUT' },

  // KELAS II (Panjang 40 - 60 meter)
  { kapalId: 'KP-HIU-01', namaKapal: 'KP. Hiu Macan Tutul 01', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_II', pangkalanId: 'Pangkalan PSDKP Batam', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-02', namaKapal: 'KP. Hiu Macan Tutul 02', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_II', pangkalanId: 'Pangkalan PSDKP Bitung', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-03', namaKapal: 'KP. Hiu 03', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_II', pangkalanId: 'Stasiun PSDKP Kupang', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-11', namaKapal: 'KP. Hiu 11', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_II', pangkalanId: 'Stasiun PSDKP Pontianak', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-12', namaKapal: 'KP. Hiu 12', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_II', pangkalanId: 'Pangkalan PSDKP Lampulo', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-14', namaKapal: 'KP. Hiu 14', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_II', pangkalanId: 'Pangkalan PSDKP Tual', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-15', namaKapal: 'KP. Hiu 15', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_II', pangkalanId: 'Stasiun PSDKP Ambon', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-16', namaKapal: 'KP. Hiu 16', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_II', pangkalanId: 'Stasiun PSDKP Biak', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-17', namaKapal: 'KP. Hiu 17', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_II', pangkalanId: 'Pangkalan PSDKP Benoa', statusOperasi: 'SIAP_LAUT' },

  // KELAS III (Panjang 28 - 40 meter)
  { kapalId: 'KP-HIU-05', namaKapal: 'KP. Hiu 05', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_III', pangkalanId: 'Pangkalan PSDKP Batam', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-08', namaKapal: 'KP. Hiu 08', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_III', pangkalanId: 'Stasiun PSDKP Belawan', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-PAUS-01', namaKapal: 'KP. Paus 01', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_III', pangkalanId: 'Pangkalan PSDKP Jakarta', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-13', namaKapal: 'KP. Hiu 13', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_III', pangkalanId: 'Stasiun PSDKP Tarakan', statusOperasi: 'SIAP_LAUT' },

  // KELAS IV (Panjang 18 - 28 meter / Perairan Pantai)
  { kapalId: 'KP-HIU-04', namaKapal: 'KP. Hiu 04', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_IV', pangkalanId: 'Stasiun PSDKP Cilacap', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-07', namaKapal: 'KP. Hiu 07', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_IV', pangkalanId: 'Pangkalan PSDKP Benoa', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-HIU-10', namaKapal: 'KP. Hiu 10', jenisKapal: 'Kapal Pengawas', kelasKapal: 'KELAS_IV', pangkalanId: 'Stasiun PSDKP Tahuna', statusOperasi: 'SIAP_LAUT' },

  // KELAS V (Speedboat Patroli / Reaksi Cepat)
  { kapalId: 'KP-BARAKUDA', namaKapal: 'KP. Barakuda 01', jenisKapal: 'Speedboat Pengawas', kelasKapal: 'KELAS_V', pangkalanId: 'Pangkalan PSDKP Batam', statusOperasi: 'SIAP_LAUT' },
  { kapalId: 'KP-KAKAP-01', namaKapal: 'KP. Kakap 01', jenisKapal: 'Speedboat Pengawas', kelasKapal: 'KELAS_V', pangkalanId: 'Pangkalan PSDKP Bitung', statusOperasi: 'SIAP_LAUT' }
];

var SEED_SAFE_MANNING = [
  // KELAS I: Total minimum = 21 personil
  { manningId: 'MAN-K1-01', kelasKapal: 'KELAS_I', posSijil: 'NAKHODA', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-02', kelasKapal: 'KELAS_I', posSijil: 'MUALIM_I', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-03', kelasKapal: 'KELAS_I', posSijil: 'MUALIM_II', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-04', kelasKapal: 'KELAS_I', posSijil: 'MUALIM_III', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-05', kelasKapal: 'KELAS_I', posSijil: 'KKM', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-06', kelasKapal: 'KELAS_I', posSijil: 'MASINIS_I', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-07', kelasKapal: 'KELAS_I', posSijil: 'MASINIS_II', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-08', kelasKapal: 'KELAS_I', posSijil: 'MASINIS_III', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-09', kelasKapal: 'KELAS_I', posSijil: 'MARKONIS', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-10', kelasKapal: 'KELAS_I', posSijil: 'SERANG', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-11', kelasKapal: 'KELAS_I', posSijil: 'JURU_MUDI', minimum: 4, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-12', kelasKapal: 'KELAS_I', posSijil: 'JURU_MINYAK', minimum: 3, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K1-13', kelasKapal: 'KELAS_I', posSijil: 'KELASI', minimum: 4, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },

  // KELAS II: Total minimum = 14 personil
  { manningId: 'MAN-K2-01', kelasKapal: 'KELAS_II', posSijil: 'NAKHODA', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K2-02', kelasKapal: 'KELAS_II', posSijil: 'MUALIM_I', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K2-03', kelasKapal: 'KELAS_II', posSijil: 'MUALIM_II', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K2-04', kelasKapal: 'KELAS_II', posSijil: 'KKM', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K2-05', kelasKapal: 'KELAS_II', posSijil: 'MASINIS_I', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K2-06', kelasKapal: 'KELAS_II', posSijil: 'MASINIS_II', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K2-07', kelasKapal: 'KELAS_II', posSijil: 'SERANG', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K2-08', kelasKapal: 'KELAS_II', posSijil: 'JURU_MUDI', minimum: 3, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K2-09', kelasKapal: 'KELAS_II', posSijil: 'JURU_MINYAK', minimum: 2, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K2-10', kelasKapal: 'KELAS_II', posSijil: 'KELASI', minimum: 2, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },

  // KELAS III: Total minimum = 9 personil
  { manningId: 'MAN-K3-01', kelasKapal: 'KELAS_III', posSijil: 'NAKHODA', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K3-02', kelasKapal: 'KELAS_III', posSijil: 'MUALIM_I', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K3-03', kelasKapal: 'KELAS_III', posSijil: 'KKM', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K3-04', kelasKapal: 'KELAS_III', posSijil: 'MASINIS_I', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K3-05', kelasKapal: 'KELAS_III', posSijil: 'JURU_MUDI', minimum: 2, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K3-06', kelasKapal: 'KELAS_III', posSijil: 'JURU_MINYAK', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K3-07', kelasKapal: 'KELAS_III', posSijil: 'KELASI', minimum: 2, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },

  // KELAS IV: Total minimum = 5 personil
  { manningId: 'MAN-K4-01', kelasKapal: 'KELAS_IV', posSijil: 'NAKHODA', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K4-02', kelasKapal: 'KELAS_IV', posSijil: 'MUALIM_I', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K4-03', kelasKapal: 'KELAS_IV', posSijil: 'KKM', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K4-04', kelasKapal: 'KELAS_IV', posSijil: 'JURU_MUDI', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K4-05', kelasKapal: 'KELAS_IV', posSijil: 'KELASI', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },

  // KELAS V: Total minimum = 3 personil
  { manningId: 'MAN-K5-01', kelasKapal: 'KELAS_V', posSijil: 'NAKHODA', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K5-02', kelasKapal: 'KELAS_V', posSijil: 'KKM', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' },
  { manningId: 'MAN-K5-03', kelasKapal: 'KELAS_V', posSijil: 'KELASI', minimum: 1, sumber: 'Permen KP No. 58/PERMEN-KP/2020' }
];

