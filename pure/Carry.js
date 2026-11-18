/**
 * pure/Carry.js
 * Logika murni: Snapshot Carry-Forward dan Kalkulasi Matriks Komposisi AKN
 * Bebas dari ketergantungan Google Apps Script / DOM sehingga 100% testable di Node.js.
 */

var AKN_SCOPES = ['AKN_KESELURUHAN', 'AKN_POA'];
var AKN_KATEGORIS = ['PNS', 'P3K', 'P3K_PARUH_WAKTU', 'PJLP'];

/**
 * Menormalisasi varian nama kategori lama ke 4 kategori baku AKN:
 * PNS | P3K | P3K_PARUH_WAKTU | PJLP
 *
 * @param {string} rawKategori
 * @returns {string}
 */
function normalizeAknKategori(rawKategori) {
  var k = String(rawKategori || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (!k || k === 'PNS') return 'PNS';
  if (k === 'P3K_PARUH_WAKTU' || k === 'PPPK_PARUH_WAKTU' || k.indexOf('PARUH') !== -1) {
    return 'P3K_PARUH_WAKTU';
  }
  if (k === 'P3K' || k === 'PPPK' || k === 'PPPK_FUNGSIONAL' || k === 'PPPK_PELAKSANA' ||
      k.indexOf('FUNGSIONAL') !== -1 || k.indexOf('PELAKSANA') !== -1 || k.indexOf('PPPK') !== -1) {
    return 'P3K';
  }
  if (k === 'PJLP' || k.indexOf('NON') !== -1 || k.indexOf('KONTRAK') !== -1 || k.indexOf('HONOR') !== -1) {
    return 'PJLP';
  }
  return 'PNS';
}

/**
 * Menghitung nilai efektif (Scope, Kategori) pada periode target.
 * Mendukung penggabungan otomatis data historis PPPK_FUNGSIONAL + PPPK_PELAKSANA -> P3K.
 *
 * @param {Array<Object>} rows - Array baris transaksi AKN
 * @param {string} scope - Token scope (AKN_KESELURUHAN / AKN_POA)
 * @param {string} kategori - Token kategori baku (PNS, P3K, P3K_PARUH_WAKTU, PJLP)
 * @param {string} targetPeriode - Format YYYY-MM-W# atau YYYY-MM
 * @returns {{jumlah: number, periodeSumber: string, carried: boolean, rowId?: string, keterangan?: string}|null}
 */
function resolveCarryForward(rows, scope, kategori, targetPeriode) {
  if (!rows || !Array.isArray(rows) || !targetPeriode) return null;
  var targetKat = normalizeAknKategori(kategori);

  // 1. Saring baris untuk scope & kategori terkait (beserta alias lama) dengan Periode <= targetPeriode
  var matches = rows.filter(function (r) {
    if (String(r.Status || '').toUpperCase() !== 'ACTIVE') return false;
    if (String(r.Scope || '') !== scope) return false;
    if (normalizeAknKategori(r.Kategori) !== targetKat) return false;
    var p = String(r.Periode || '');
    return p <= targetPeriode;
  });

  if (matches.length === 0) return null;

  // 2. Urutkan berdasarkan Periode DESC, lalu Timestamp DESC
  matches.sort(function (a, b) {
    var pA = String(a.Periode || '');
    var pB = String(b.Periode || '');
    if (pA !== pB) return pB.localeCompare(pA);

    var tA = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
    var tB = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
    return tB - tA;
  });

  var latest = matches[0];
  var highestPeriode = String(latest.Periode || '');

  // Jika periode tertinggi masih menyimpan pecahan PPPK_FUNGSIONAL + PPPK_PELAKSANA, jumlahkan keduanya
  var atHighest = matches.filter(function (m) {
    return String(m.Periode || '') === highestPeriode;
  });

  var jumlah = 0;
  if (targetKat === 'P3K' && atHighest.length > 1) {
    var byRawKat = {};
    atHighest.forEach(function (m) {
      var rk = String(m.Kategori || '').trim().toUpperCase();
      if (!byRawKat[rk]) byRawKat[rk] = m; // sudah urut Timestamp DESC
    });
    if (byRawKat['P3K']) {
      jumlah = parseInt(byRawKat['P3K'].Jumlah, 10) || 0;
    } else {
      Object.keys(byRawKat).forEach(function (rk) {
        jumlah += parseInt(byRawKat[rk].Jumlah, 10) || 0;
      });
    }
  } else {
    jumlah = parseInt(latest.Jumlah, 10);
    if (isNaN(jumlah)) jumlah = 0;
  }

  return {
    jumlah: jumlah,
    periodeSumber: highestPeriode,
    carried: highestPeriode !== targetPeriode,
    rowId: String(latest.RowID || ''),
    keterangan: String(latest.Keterangan || '')
  };
}

/**
 * Menyusun matriks 2x4 lengkap untuk periode tertentu.
 * Menghitung total tiap scope dan mendeteksi apakah data diwarisi (carried).
 *
 * @param {Array<Object>} rows - Seluruh baris transaksi AKN
 * @param {string} targetPeriode
 * @returns {{
 *   periode: string,
 *   matrix: Object,
 *   totals: { AKN_KESELURUHAN: number, AKN_POA: number },
 *   isFullyCarried: boolean
 * }}
 */
function resolveMatrix(rows, targetPeriode) {
  var matrix = {
    AKN_KESELURUHAN: {},
    AKN_POA: {}
  };
  var totals = {
    AKN_KESELURUHAN: 0,
    AKN_POA: 0
  };

  var anyDirect = false;

  AKN_SCOPES.forEach(function (scope) {
    AKN_KATEGORIS.forEach(function (kat) {
      var cell = resolveCarryForward(rows, scope, kat, targetPeriode);
      if (cell) {
        matrix[scope][kat] = cell;
        totals[scope] += cell.jumlah;
        if (!cell.carried) anyDirect = true;
      } else {
        matrix[scope][kat] = {
          jumlah: 0,
          periodeSumber: '',
          carried: false,
          rowId: '',
          keterangan: ''
        };
      }
    });
  });

  return {
    periode: targetPeriode,
    matrix: matrix,
    totals: totals,
    isFullyCarried: !anyDirect
  };
}

/**
 * Validasi integritas bisnis form Komposisi AKN:
 * 1. Seluruh nilai >= 0
 * 2. Nilai POA <= Keseluruhan untuk setiap kategori
 * 3. Total POA <= Total Keseluruhan
 *
 * @param {Object} inputMatrix - { AKN_KESELURUHAN: { PNS: n, ... }, AKN_POA: { PNS: m, ... } }
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
function validateAknMatrix(inputMatrix) {
  var errors = [];
  if (!inputMatrix || !inputMatrix.AKN_KESELURUHAN || !inputMatrix.AKN_POA) {
    return { valid: false, errors: ['Format data komposisi tidak lengkap.'] };
  }

  var totKes = 0;
  var totPoa = 0;

  AKN_KATEGORIS.forEach(function (kat) {
    var valKes = parseInt(inputMatrix.AKN_KESELURUHAN[kat], 10);
    var valPoa = parseInt(inputMatrix.AKN_POA[kat], 10);

    if (isNaN(valKes) || valKes < 0) {
      errors.push('Jumlah Keseluruhan untuk ' + kat + ' harus berupa angka positif.');
    }
    if (isNaN(valPoa) || valPoa < 0) {
      errors.push('Jumlah Dit. POA untuk ' + kat + ' harus berupa angka positif.');
    }

    if (!isNaN(valKes) && !isNaN(valPoa)) {
      if (valPoa > valKes) {
        errors.push('Jumlah Dit. POA (' + valPoa + ') tidak boleh melebihi Keseluruhan (' + valKes + ') pada kategori ' + kat + '.');
      }
      totKes += valKes;
      totPoa += valPoa;
    }
  });

  if (totPoa > totKes) {
    errors.push('Total personil Dit. POA (' + totPoa + ') tidak boleh melebihi Total Keseluruhan (' + totKes + ').');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    totalKeseluruhan: totKes,
    totalPoa: totPoa
  };
}

/**
 * Menghitung kesimpulan agregasi komposisi AKN langsung dari data personil Master_Awak.
 * Menghitung personil aktif berdasarkan (Scope, Kategori) secara deterministik.
 *
 * @param {Array<Object>} awakRows
 * @returns {{
 *   AKN_KESELURUHAN: Object,
 *   AKN_POA: Object,
 *   totalAktif: number,
 *   totalPoa: number
 * }}
 */
function akn_aggregateAwakRows(awakRows) {
  var counts = {
    AKN_KESELURUHAN: { PNS: 0, P3K: 0, P3K_PARUH_WAKTU: 0, PJLP: 0 },
    AKN_POA: { PNS: 0, P3K: 0, P3K_PARUH_WAKTU: 0, PJLP: 0 },
    totalAktif: 0,
    totalPoa: 0
  };

  if (!awakRows || !Array.isArray(awakRows)) return counts;

  awakRows.forEach(function (a) {
    var st = String(a.StatusAktif || 'AKTIF').toUpperCase().trim();
    if (st !== 'AKTIF') return; // Abaikan non-aktif / mutasi

    var kat = normalizeAknKategori(a.KategoriKepegawaian || 'PNS');

    counts.AKN_KESELURUHAN[kat]++;
    counts.totalAktif++;

    var statusPenempatan = String(a.StatusPenempatan || '').trim().toUpperCase();
    var unit = String(a.Unit || a.PangkalanID || a.JabatanLengkap || '').toLowerCase();
    var catatanLower = String(a.Catatan || '').toLowerCase();
    var isSeedUptNote = catatanLower === 'data induk armada psdkp';
    var isPoa = (statusPenempatan === 'PUSAT_POA') ||
      (statusPenempatan === 'DIPERBANTUKAN_UPT' && !isSeedUptNote) ||
      unit.indexOf('pusat') !== -1 ||
      unit.indexOf('poa') !== -1 ||
      unit.indexOf('armada kapal pengawas (pusat)') !== -1;
    if (isPoa) {
      counts.AKN_POA[kat]++;
      counts.totalPoa++;
    }
  });

  return counts;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AKN_SCOPES: AKN_SCOPES,
    AKN_KATEGORIS: AKN_KATEGORIS,
    normalizeAknKategori: normalizeAknKategori,
    resolveCarryForward: resolveCarryForward,
    resolveMatrix: resolveMatrix,
    validateAknMatrix: validateAknMatrix,
    akn_aggregateAwakRows: akn_aggregateAwakRows
  };
}
