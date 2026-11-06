/**
 * pure/Carry.js
 * Fungsi kalkulasi murni: Snapshot Carry-Forward Komposisi AKN
 */

/**
 * Menghitung nilai efektif (Scope, Kategori) pada periode target.
 *
 * @param {Array<Object>} rows - Array baris berstatus ACTIVE
 * @param {string} scope - Token scope (AKN_KESELURUHAN / AKN_POA)
 * @param {string} kategori - Token kategori (PNS, PPPK_*, PJLP)
 * @param {string} targetPeriode - Format YYYY-MM-WW
 * @returns {{jumlah: number, periodeSumber: string, carried: boolean}|null}
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
    carried: String(latest.Periode || '') !== targetPeriode
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { resolveCarryForward };
}

