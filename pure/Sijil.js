/**
 * pure/Sijil.js
 * Logika murni evaluasi formasi papan sijil & kebutuhan minimum pengawakan (Safe Manning).
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

var POS_SIJIL_TOKENS = [
  'NAKHODA',
  'MUALIM_I',
  'MUALIM_II',
  'MUALIM_III',
  'KKM',
  'MASINIS_I',
  'MASINIS_II',
  'MASINIS_III',
  'MARKONIS',
  'SERANG',
  'JURU_MUDI',
  'JURU_MINYAK',
  'KELASI'
];

/**
 * Normalisasi teks posisi formasi ke token standar enum.
 * Mendukung variasi spasi maupun underscore (misal 'Juru Mudi' atau 'JURU_MUDI').
 */
function normalizePosSijil(str) {
  if (!str) return 'KELASI';
  var t = String(str).toUpperCase().trim();

  if (/NAHKODA|NAKHODA/.test(t)) return 'NAKHODA';

  if (/MUALIM[_\s]*(III|3)\b/.test(t)) return 'MUALIM_III';
  if (/MUALIM[_\s]*(II|2)\b/.test(t)) return 'MUALIM_II';
  if (/MUALIM[_\s]*(I|1)\b/.test(t)) return 'MUALIM_I';
  if (/MUALIM/.test(t)) return 'MUALIM_I';

  if (/KEPALA[_\s]*KAMAR[_\s]*MESIN|KKM/.test(t)) return 'KKM';
  if (/MASINIS[_\s]*(III|3)\b/.test(t)) return 'MASINIS_III';
  if (/MASINIS[_\s]*(II|2)\b/.test(t)) return 'MASINIS_II';
  if (/MASINIS[_\s]*(I|1)\b/.test(t)) return 'MASINIS_I';
  if (/MASINIS/.test(t)) return 'MASINIS_I';

  if (/MARKONIS|RADIO/.test(t)) return 'MARKONIS';
  if (/SERANG/.test(t)) return 'SERANG';
  if (/JURU[_\s]*MUDI|JURU[_\s]*MUDY/.test(t)) return 'JURU_MUDI';
  if (/JURU[_\s]*MINYAK|OILER/.test(t)) return 'JURU_MINYAK';
  if (/KELASI/.test(t)) return 'KELASI';

  return 'KELASI';
}

/**
 * Mengevaluasi pemenuhan formasi Safe Manning untuk sebuah kapal.
 *
 * @param {Array<Object>} standarList - Daftar butir Master_SafeManning untuk kelas kapal terkait
 * @param {Array<Object>} penugasanAktifList - Daftar penugasan aktif awak di kapal tsb
 * @returns {{
 *   totalKebutuhan: number,
 *   totalTerisi: number,
 *   persenTerisi: number,
 *   isLaikOperasi: boolean,
 *   statusOperasi: string,
 *   posisiRincian: Array<Object>,
 *   defisitPosisi: Array<string>
 * }}
 */
function evaluateSafeManning(standarList, penugasanAktifList) {
  var stds = Array.isArray(standarList) ? standarList : [];
  var active = Array.isArray(penugasanAktifList) ? penugasanAktifList : [];

  // Hitung jumlah terisi per posisi sijil
  var countByPos = {};
  active.forEach(function (t) {
    var pos = normalizePosSijil(t.PosSijil || t.posSijil);
    countByPos[pos] = (countByPos[pos] || 0) + 1;
  });

  var totalKebutuhan = 0;
  var totalTerisi = 0;
  var defisitPosisi = [];
  var posisiRincian = [];

  stds.forEach(function (std) {
    var pos = normalizePosSijil(std.PosSijil || std.posSijil || '');
    var min = parseInt(std.Minimum || std.minimum, 10) || 0;
    var terisi = countByPos[pos] || 0;

    totalKebutuhan += min;
    totalTerisi += terisi;

    var kurang = Math.max(0, min - terisi);
    if (kurang > 0) {
      defisitPosisi.push(pos + ' (kurang ' + kurang + ')');
    }

    posisiRincian.push({
      posSijil: pos,
      minimum: min,
      terisi: terisi,
      kurang: kurang,
      status: terisi >= min ? 'TERPENUHI' : 'KURANG'
    });
  });

  var persen = totalKebutuhan > 0 ? Math.round((totalTerisi / totalKebutuhan) * 100) : 100;
  var isLaik = defisitPosisi.length === 0;

  return {
    totalKebutuhan: totalKebutuhan,
    totalTerisi: totalTerisi,
    persenTerisi: persen,
    isLaikOperasi: isLaik,
    statusOperasi: isLaik ? 'LAIK_OPERASI' : 'KURANG_AWAK',
    posisiRincian: posisiRincian,
    defisitPosisi: defisitPosisi
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    POS_SIJIL_TOKENS: POS_SIJIL_TOKENS,
    normalizePosSijil: normalizePosSijil,
    evaluateSafeManning: evaluateSafeManning
  };
}
