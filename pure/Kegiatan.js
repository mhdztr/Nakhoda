/**
 * pure/Kegiatan.js
 * Logika murni validasi data agenda & kegiatan pengawakan (Sub-Modul B).
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

var JENIS_KEGIATAN_VALID = [
  'PELATIHAN_TEKNIS',
  'SERTIFIKASI_LAUT',
  'PENYEGARAN_TAKTIK',
  'PEMBINAAN_DISIPLIN'
];

/**
 * Menghitung selisih hari antara dua tanggal (YYYY-MM-DD).
 */
function calculateRentangHari(tglMulai, tglSelesai) {
  if (!tglMulai || !tglSelesai) return 0;
  var d1 = new Date(tglMulai + 'T00:00:00Z');
  var d2 = new Date(tglSelesai + 'T00:00:00Z');
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  var diffMs = d2.getTime() - d1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1; // inklusif
}

/**
 * Mengekstrak penanda periode mingguan YYYY-MM-W# dari tanggal YYYY-MM-DD.
 */
function getPeriodeFromDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return '';
  var yyyy = d.getUTCFullYear();
  var mm = d.getUTCMonth() + 1;
  var strMm = mm < 10 ? '0' + mm : String(mm);
  var day = d.getUTCDate();
  var week = Math.ceil(day / 7);
  if (week > 4) week = 4;
  return yyyy + '-' + strMm + '-W0' + week;
}

/**
 * Validasi form agenda kegiatan pengawakan.
 *
 * @param {Object} data
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
function validateKegiatanInput(data) {
  var errors = [];
  if (!data) return { valid: false, errors: ['Data kegiatan kosong.'] };

  var judul = String(data.judulKegiatan || '').trim();
  if (!judul || judul.length < 5) {
    errors.push('Nama kegiatan wajib diisi minimal 5 karakter.');
  }

  var jenis = String(data.jenisKegiatan || '').trim();
  if (JENIS_KEGIATAN_VALID.indexOf(jenis) === -1) {
    errors.push('Jenis kegiatan tidak valid. Pilih dari daftar yang tersedia.');
  }

  var tglMulai = String(data.tanggalMulai || '').trim();
  var tglSelesai = String(data.tanggalSelesai || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tglMulai)) {
    errors.push('Format tanggal mulai tidak valid (wajib YYYY-MM-DD).');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tglSelesai)) {
    errors.push('Format tanggal selesai tidak valid (wajib YYYY-MM-DD).');
  }

  if (tglMulai && tglSelesai) {
    if (tglSelesai < tglMulai) {
      errors.push('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
    } else {
      var rentang = calculateRentangHari(tglMulai, tglSelesai);
      if (rentang > 365) {
        errors.push('Rentang durasi kegiatan tidak boleh melebihi 365 hari.');
      }
    }
  }

  var peserta = parseInt(data.jumlahPeserta, 10);
  if (isNaN(peserta) || peserta < 1) {
    errors.push('Jumlah peserta harus minimal 1 orang.');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    rentangHari: calculateRentangHari(tglMulai, tglSelesai),
    periode: getPeriodeFromDate(tglMulai)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    JENIS_KEGIATAN_VALID: JENIS_KEGIATAN_VALID,
    calculateRentangHari: calculateRentangHari,
    getPeriodeFromDate: getPeriodeFromDate,
    validateKegiatanInput: validateKegiatanInput
  };
}

