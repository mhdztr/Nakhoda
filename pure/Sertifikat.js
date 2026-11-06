/**
 * pure/Sertifikat.js
 * Logika murni evaluasi status kedaluwarsa sertifikat STCW-F & kelaikan kompetensi.
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

var CERT_STATUS = {
  BERLAKU: 'BERLAKU',
  SEGERA_HABIS: 'SEGERA_HABIS',
  KEDALUWARSA: 'KEDALUWARSA',
  BELUM_ADA: 'BELUM_ADA'
};

var DEFAULT_WARN_DAYS = 90;
var DEFAULT_CRIT_DAYS = 30;

/**
 * Mengevaluasi status masa berlaku suatu sertifikat terhadap tanggal acuan.
 *
 * @param {Object} sertifikatObj - { BerlakuSampai: string (YYYY-MM-DD), TanggalTerbit: string, StatusKelulusan: string }
 * @param {string|Date} [todayRef] - Tanggal acuan (default hari ini)
 * @param {number} [warnDays] - Ambang batas peringatan segera habis (default 90 hari)
 * @param {number} [critDays] - Ambang batas kritis (default 30 hari)
 * @returns {{
 *   status: string,
 *   sisaHari: number|null,
 *   isWarning: boolean,
 *   isExpired: boolean,
 *   label: string
 * }}
 */
function evaluateSertifikatStatus(sertifikatObj, todayRef, warnDays, critDays) {
  var warn = warnDays !== undefined ? warnDays : DEFAULT_WARN_DAYS;
  var crit = critDays !== undefined ? critDays : DEFAULT_CRIT_DAYS;

  if (!sertifikatObj || !sertifikatObj.NomorSertifikat && !sertifikatObj.BerlakuSampai) {
    return {
      status: CERT_STATUS.BELUM_ADA,
      sisaHari: null,
      isWarning: false,
      isExpired: false,
      label: 'Belum Memiliki'
    };
  }

  var berlakuStr = String(sertifikatObj.BerlakuSampai || '').trim();
  if (!berlakuStr) {
    // Berlaku seumur hidup (tanpa tanggal kadaluwarsa)
    return {
      status: CERT_STATUS.BERLAKU,
      sisaHari: null,
      isWarning: false,
      isExpired: false,
      label: 'Berlaku (Permanen)'
    };
  }

  var dToday = todayRef instanceof Date ? todayRef : (todayRef ? new Date(todayRef + 'T00:00:00Z') : new Date());
  var dExp = new Date(berlakuStr + 'T00:00:00Z');

  if (isNaN(dExp.getTime())) {
    return {
      status: CERT_STATUS.BERLAKU,
      sisaHari: null,
      isWarning: false,
      isExpired: false,
      label: 'Berlaku'
    };
  }

  var diffMs = dExp.getTime() - dToday.getTime();
  var diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: CERT_STATUS.KEDALUWARSA,
      sisaHari: diffDays,
      isWarning: true,
      isExpired: true,
      label: 'Kedaluwarsa (' + Math.abs(diffDays) + ' hari lalu)'
    };
  }

  if (diffDays <= crit) {
    return {
      status: CERT_STATUS.SEGERA_HABIS,
      sisaHari: diffDays,
      isWarning: true,
      isExpired: false,
      label: 'Kritis (' + diffDays + ' hari lagi)'
    };
  }

  if (diffDays <= warn) {
    return {
      status: CERT_STATUS.SEGERA_HABIS,
      sisaHari: diffDays,
      isWarning: true,
      isExpired: false,
      label: 'Segera Habis (' + diffDays + ' hari lagi)'
    };
  }

  return {
    status: CERT_STATUS.BERLAKU,
    sisaHari: diffDays,
    isWarning: false,
    isExpired: false,
    label: 'Berlaku (' + diffDays + ' hari)'
  };
}

/**
 * Menghitung persentase kelaikan kompetensi seorang awak kapal
 * membandingkan butir standar wajib jabatannya terhadap sertifikat yang dimiliki.
 *
 * @param {Array<Object>} standarWajibList - Daftar butir standar dengan wajib === true
 * @param {Object} sertifikatMap - Map { [KodePelatihan]: sertifikatObj }
 * @param {string|Date} [todayRef]
 * @returns {{
 *   persen: number,
 *   totalWajib: number,
 *   terpenuhi: number,
 *   segeraHabis: number,
 *   kedaluwarsa: number,
 *   belumAda: number,
 *   isLaik: boolean
 * }}
 */
function calculateKelaikanKompetensi(standarWajibList, sertifikatMap, todayRef) {
  var stds = Array.isArray(standarWajibList) ? standarWajibList : [];
  var sMap = sertifikatMap || {};

  var totalWajib = stds.length;
  if (totalWajib === 0) {
    return {
      persen: 100,
      totalWajib: 0,
      terpenuhi: 0,
      segeraHabis: 0,
      kedaluwarsa: 0,
      belumAda: 0,
      isLaik: true
    };
  }

  var terpenuhi = 0;
  var segeraHabis = 0;
  var kedaluwarsa = 0;
  var belumAda = 0;

  stds.forEach(function (std) {
    var cert = sMap[std.kode || std.KodePelatihan];
    var evalRes = evaluateSertifikatStatus(cert, todayRef);

    if (evalRes.status === CERT_STATUS.BERLAKU) {
      terpenuhi++;
    } else if (evalRes.status === CERT_STATUS.SEGERA_HABIS) {
      terpenuhi++;
      segeraHabis++;
    } else if (evalRes.status === CERT_STATUS.KEDALUWARSA) {
      kedaluwarsa++;
    } else {
      belumAda++;
    }
  });

  var persen = Math.round((terpenuhi / totalWajib) * 100);

  return {
    persen: persen,
    totalWajib: totalWajib,
    terpenuhi: terpenuhi,
    segeraHabis: segeraHabis,
    kedaluwarsa: kedaluwarsa,
    belumAda: belumAda,
    isLaik: persen === 100 && kedaluwarsa === 0
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CERT_STATUS: CERT_STATUS,
    evaluateSertifikatStatus: evaluateSertifikatStatus,
    calculateKelaikanKompetensi: calculateKelaikanKompetensi
  };
}

