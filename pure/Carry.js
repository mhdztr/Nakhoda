/**
 * pure/Carry.js
 * Logika murni: Snapshot Carry-Forward dan Kalkulasi Matriks Komposisi AKN
 * Bebas dari ketergantungan Google Apps Script / DOM sehingga 100% testable di Node.js.
 */

var AKN_SCOPES = ['AKN_KESELURUHAN', 'AKN_POA'];
var AKN_KATEGORIS = ['PNS', 'PPPK_FUNGSIONAL', 'PPPK_PELAKSANA', 'PPPK_PARUH_WAKTU', 'PJLP'];

/**
 * Menghitung nilai efektif (Scope, Kategori) pada periode target.
 *
 * @param {Array<Object>} rows - Array baris transaksi AKN
 * @param {string} scope - Token scope (AKN_KESELURUHAN / AKN_POA)
 * @param {string} kategori - Token kategori (PNS, PPPK_*, PJLP)
 * @param {string} targetPeriode - Format YYYY-MM-W# atau YYYY-MM
 * @returns {{jumlah: number, periodeSumber: string, carried: boolean, rowId?: string, keterangan?: string}|null}
 */
function resolveCarryForward(rows, scope, kategori, targetPeriode) {
  if (!rows || !Array.isArray(rows) || !targetPeriode) return null;

  // 1. Saring baris untuk scope & kategori terkait dengan Periode <= targetPeriode
  var matches = rows.filter(function (r) {
    if (String(r.Status || '').toUpperCase() !== 'ACTIVE') return false;
    if (String(r.Scope || '') !== scope) return false;
    if (String(r.Kategori || '') !== kategori) return false;
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
  var jumlah = parseInt(latest.Jumlah, 10);
  if (isNaN(jumlah)) jumlah = 0;

  return {
    jumlah: jumlah,
    periodeSumber: String(latest.Periode || ''),
    carried: String(latest.Periode || '') !== targetPeriode,
    rowId: String(latest.RowID || ''),
    keterangan: String(latest.Keterangan || '')
  };
}

/**
 * Menyusun matriks 2x5 lengkap untuk periode tertentu.
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
    AKN_KESELURUHAN: { PNS: 0, PPPK_FUNGSIONAL: 0, PPPK_PELAKSANA: 0, PPPK_PARUH_WAKTU: 0, PJLP: 0 },
    AKN_POA: { PNS: 0, PPPK_FUNGSIONAL: 0, PPPK_PELAKSANA: 0, PPPK_PARUH_WAKTU: 0, PJLP: 0 },
    totalAktif: 0,
    totalPoa: 0
  };

  if (!awakRows || !Array.isArray(awakRows)) return counts;

  awakRows.forEach(function (a) {
    var st = String(a.StatusAktif || 'AKTIF').toUpperCase().trim();
    if (st !== 'AKTIF') return; // Abaikan non-aktif / mutasi

    var rawKat = String(a.KategoriKepegawaian || 'PNS').trim().toUpperCase();
    var kat = 'PNS';
    if (rawKat === 'PPPK_FUNGSIONAL' || rawKat.indexOf('FUNGSIONAL') !== -1) kat = 'PPPK_FUNGSIONAL';
    else if (rawKat === 'PPPK_PELAKSANA' || rawKat.indexOf('PELAKSANA') !== -1) kat = 'PPPK_PELAKSANA';
    else if (rawKat === 'PPPK_PARUH_WAKTU' || rawKat.indexOf('PARUH') !== -1) kat = 'PPPK_PARUH_WAKTU';
    else if (rawKat === 'PJLP' || rawKat.indexOf('NON') !== -1 || rawKat.indexOf('KONTRAK') !== -1) kat = 'PJLP';
    else kat = 'PNS';

    counts.AKN_KESELURUHAN[kat]++;
    counts.totalAktif++;

    var unit = String(a.Unit || a.PangkalanID || a.Catatan || a.JabatanLengkap || '').toLowerCase();
    var isPoa = unit.indexOf('pusat') !== -1 || unit.indexOf('poa') !== -1 || unit.indexOf('armada kapal pengawas (pusat)') !== -1;
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
    resolveCarryForward: resolveCarryForward,
    resolveMatrix: resolveMatrix,
    validateAknMatrix: validateAknMatrix,
    akn_aggregateAwakRows: akn_aggregateAwakRows
  };
}
