/**
 * services/DirektoriService.js
 * Sub-Modul C: Direktori 396+ Awak Kapal Armada PSDKP & Pemetaan Kelas
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

/**
 * Mengambil daftar awak kapal armada dengan filter, pencarian, dan paginasi.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} [params.rumpun]        - 'DEK' | 'MESIN'
 * @param {string} [params.kelasKapal]    - 'KELAS_I' s.d. 'KELAS_V'
 * @param {string} [params.statusAktif]   - 'AKTIF' | 'NONAKTIF'
 * @param {string} [params.search]        - Nama, NIP, atau Jabatan
 * @param {boolean} [params.perluDilengkapi]
 * @param {number} [params.limit]         - Default 50
 * @param {number} [params.offset]        - Default 0
 */
/**
 * Memperbaiki data KelasKapal lawas yang korup akibat bug pencocokan substring lama
 * (misal Kelas II/III/IV tersimpan KELAs_I atau Kelas V tersimpan NON_JENJANG).
 */
var _MASTER_AWAK_REQUIRED_COLS = [
  'StatusPenempatan', 'NomorSKPenempatan', 'DokumenPenempatanURL', 'UkuranBaju', 'UkuranSepatu'
];

function _inferStatusPenempatan(unitOrPangkalan, currentVal) {
  var cur = String(currentVal || '').trim().toUpperCase();
  if (cur === 'PUSAT_POA' || cur === 'DIPERBANTUKAN_UPT') return cur;
  var u = String(unitOrPangkalan || '').toLowerCase();
  if (u.indexOf('pangkalan') !== -1 || u.indexOf('stasiun') !== -1 || u.indexOf('satwas') !== -1 || u.indexOf('upt-') !== -1) {
    return 'DIPERBANTUKAN_UPT';
  }
  return 'PUSAT_POA';
}

function _computeVesselDurationText(startDateStr, nowDate) {
  var s = String(startDateStr || '').trim();
  if (!s) return '-';
  var d = new Date(s.length === 10 ? (s + 'T00:00:00') : s);
  if (isNaN(d.getTime())) return '-';
  var now = nowDate || new Date();
  var diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 0) return 'Terjadwal';
  if (diffDays < 1) return 'Hari ini';
  if (diffDays < 30) return diffDays + ' hari';
  var totalMonths = Math.floor(diffDays / 30.4375);
  var years = Math.floor(totalMonths / 12);
  var months = totalMonths % 12;
  if (years > 0 && months > 0) return years + ' thn ' + months + ' bln';
  if (years > 0) return years + ' thn';
  return totalMonths + ' bln';
}

var _NAKHODA_DUPLICATE_SEED_IDS = {
  'PEG-0044': true,
  'PEG-0123': true,
  'PEG-0300': true,
  'PEG-0362': true
};

function _resolveAwakKategoriFromSeed(a, nipOverride) {
  var nipClean = String(nipOverride !== undefined ? nipOverride : (a && a.nip ? a.nip : '')).replace(/[^0-9]/g, '');
  if (a && a.kategoriKepegawaian) {
    return typeof normalizeAknKategori === 'function' ? normalizeAknKategori(a.kategoriKepegawaian) : String(a.kategoriKepegawaian);
  }
  return /^\d{12}21\d{4}$/.test(nipClean) ? 'P3K' : 'PNS';
}

function _buildMasterAwakRowObj(a, nowStr) {
  var jabLengkap = String(a.jabatanLengkap || a.kelompokJabatan || '');
  var kelas = normalizeKelasKapal(a.tingkatKelas, jabLengkap);
  var rmp = String(a.rumpun || extractRumpunAwak(jabLengkap));
  if (rmp.indexOf('AWAK_') === 0) rmp = rmp.substring(5);
  var unit = String(a.unit || a.pangkalanId || 'Dit. POA Pusat');
  var rawNip = String(a.nip || '').trim();
  return {
    PegawaiID: String(a.pegawaiId || ''),
    NIP: rawNip === '-' ? '' : rawNip,
    Nama: typeof sanitizeNamaPersonel === 'function' ? sanitizeNamaPersonel(a.nama) : String(a.nama || '').toUpperCase(),
    KelompokJabatan: String(a.kelompokJabatan || ''),
    JabatanLengkap: jabLengkap,
    KelasKapal: kelas,
    Rumpun: rmp || 'DEK',
    KategoriKepegawaian: _resolveAwakKategoriFromSeed(a, rawNip),
    StatusAktif: String(a.statusAktif || 'AKTIF'),
    StatusPenempatan: _inferStatusPenempatan(unit, ''),
    PangkalanID: unit,
    KapalID: String(a.kapalId || ''),
    TanggalMulaiKerja: '',
    TanggalSelesaiKontrak: '',
    NomorSKPenempatan: '',
    DokumenPenempatanURL: '',
    UkuranBaju: '',
    UkuranSepatu: '',
    Catatan: 'Data Induk Armada PSDKP',
    UpdatedAt: nowStr,
    UpdatedBy: 'SYSTEM_SEED'
  };
}

/**
 * Self-healing skema kolom baru (21 kolom kanonik DATA_SCHEMA.md §3.1),
 * koreksi KelasKapal, konversi nama kanonik HURUF BESAR tanpa gelar/simbol,
 * penyatuan 4 kategori kepegawaian, rekonsiliasi seed SKP, dan pemformatan sheet formal.
 */
function _healMasterAwakKelasIfNeeded(sheet, rows) {
  if (!sheet) return;
  try {
    var lastCol = sheet.getLastColumn();
    var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    var schemaChanged = false;

    _MASTER_AWAK_REQUIRED_COLS.forEach(function (colName) {
      if (headers.indexOf(colName) === -1) {
        var newCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, newCol).setValue(colName);
        headers.push(colName);
        schemaChanged = true;
      }
    });

    if (!rows || rows.length === 0) {
      if (schemaChanged && typeof applyFormalSheetFormatting === 'function') {
        applyFormalSheetFormatting(sheet, SHEET_AWAK.MASTER_AWAK);
      }
      return;
    }

    var seedList = (typeof SEED_AWAK_ARMADA !== 'undefined' && Array.isArray(SEED_AWAK_ARMADA))
      ? SEED_AWAK_ARMADA : [];
    var seedUnitById = {};
    var seedById = {};
    seedList.forEach(function (s) {
      if (s.pegawaiId) {
        seedById[String(s.pegawaiId)] = s;
        if (s.unit) seedUnitById[String(s.pegawaiId)] = String(s.unit);
      }
    });

    var dirtyCols = {};
    var existingIdSet = {};
    var existingNipSet = {};

    rows.forEach(function (r) {
      // 1. Heal tertukar NIP vs Nama (jika terlanjur tersimpan terbalik)
      var rawNama = String(r.Nama || '').trim();
      var rawNip = String(r.NIP || '').trim();
      if (/^\d{10,}$/.test(rawNama) && rawNip && !/^\d+$/.test(rawNip)) {
        r.NIP = rawNama;
        r.Nama = rawNip;
        dirtyCols.NIP = true;
        dirtyCols.Nama = true;
      }

      // 2. Normalisasi Nama Kanonik HURUF BESAR tanpa gelar/simbol
      if (typeof sanitizeNamaPersonel === 'function' && r.Nama) {
        var cleanNama = sanitizeNamaPersonel(String(r.Nama));
        if (cleanNama && cleanNama !== String(r.Nama)) {
          r.Nama = cleanNama;
          dirtyCols.Nama = true;
        }
      }

      // 3. Normalisasi 4 Kategori Kepegawaian
      if (typeof normalizeAknKategori === 'function') {
        var normKat = normalizeAknKategori(r.KategoriKepegawaian || 'PNS');
        if (String(r.KategoriKepegawaian || '').trim() !== normKat) {
          r.KategoriKepegawaian = normKat;
          dirtyCols.KategoriKepegawaian = true;
        }
      }

      // 4. Heal KelasKapal
      var cur = String(r.KelasKapal || '').toUpperCase().trim();
      var jab = String(r.JabatanLengkap || r.KelompokJabatan || '');
      var extracted = extractKelasKapal(jab);
      if (extracted !== 'NON_KAPAL' && (
        !cur || cur === 'NON_JENJANG' || cur === 'NON_KAPAL' ||
        (cur === 'KELAS_I' && extracted !== 'KELAS_I')
      )) {
        r.KelasKapal = extracted;
        dirtyCols.KelasKapal = true;
      }

      // 5. Heal PangkalanID dari seed bila kosong
      var pId = String(r.PegawaiID || '').trim();
      if (!String(r.PangkalanID || '').trim() && pId && seedUnitById[pId]) {
        r.PangkalanID = seedUnitById[pId];
        dirtyCols.PangkalanID = true;
      }

      // 6. Rekonsiliasi terhadap SEED_AWAK_ARMADA terbaru (dedup, NIP, P3K, jabatan, kapal)
      if (pId && _NAKHODA_DUPLICATE_SEED_IDS[pId]) {
        if (String(r.StatusAktif || '').toUpperCase().trim() !== 'NONAKTIF') {
          r.StatusAktif = 'NONAKTIF';
          dirtyCols.StatusAktif = true;
        }
      } else if (pId && seedById[pId]) {
        var seed = seedById[pId];
        var seedNip = String(seed.nip || '').trim();
        if (/^\d{18}$/.test(seedNip) && String(r.NIP || '').trim() !== seedNip) {
          r.NIP = seedNip;
          dirtyCols.NIP = true;
        }
        var activeNip = String(r.NIP || '').replace(/[^0-9]/g, '');
        if (seed.kategoriKepegawaian || /^\d{12}21\d{4}$/.test(activeNip)) {
          var targetKat = _resolveAwakKategoriFromSeed(seed, activeNip);
          if (String(r.KategoriKepegawaian || '').trim() !== targetKat) {
            r.KategoriKepegawaian = targetKat;
            dirtyCols.KategoriKepegawaian = true;
          }
        }
        var updBy = String(r.UpdatedBy || '').trim();
        var isSeededOrigin = !updBy || updBy === 'SYSTEM_SEED' || updBy === 'SYSTEM_SEED_SKP' || updBy === 'SYSTEM_CRON_SIKAP';
        if (isSeededOrigin) {
          if (seed.kelompokJabatan && String(r.KelompokJabatan || '') !== String(seed.kelompokJabatan)) {
            r.KelompokJabatan = String(seed.kelompokJabatan);
            dirtyCols.KelompokJabatan = true;
          }
          if (seed.jabatanLengkap && String(r.JabatanLengkap || '') !== String(seed.jabatanLengkap)) {
            r.JabatanLengkap = String(seed.jabatanLengkap);
            dirtyCols.JabatanLengkap = true;
          }
          var sKelas = normalizeKelasKapal(seed.tingkatKelas, seed.jabatanLengkap || seed.kelompokJabatan);
          if (sKelas !== 'NON_KAPAL' && String(r.KelasKapal || '').toUpperCase().trim() !== sKelas) {
            r.KelasKapal = sKelas;
            dirtyCols.KelasKapal = true;
          }
          if (seed.rumpun) {
            var sRmp = String(seed.rumpun).toUpperCase();
            if (sRmp.indexOf('AWAK_') === 0) sRmp = sRmp.substring(5);
            if (sRmp && String(r.Rumpun || '').toUpperCase().trim() !== sRmp) {
              r.Rumpun = sRmp;
              dirtyCols.Rumpun = true;
            }
          }
        }
        if (seed.kapalId && !String(r.KapalID || '').trim()) {
          r.KapalID = String(seed.kapalId);
          dirtyCols.KapalID = true;
        }
      } else {
        var fallbackNip = String(r.NIP || '').replace(/[^0-9]/g, '');
        if (/^\d{12}21\d{4}$/.test(fallbackNip) && String(r.KategoriKepegawaian || '').trim() !== 'P3K') {
          r.KategoriKepegawaian = 'P3K';
          dirtyCols.KategoriKepegawaian = true;
        }
      }

      // 7. Heal StatusPenempatan default
      var inferredPenempatan = _inferStatusPenempatan(r.PangkalanID || r.Catatan, r.StatusPenempatan);
      if (String(r.StatusPenempatan || '').trim() !== inferredPenempatan) {
        r.StatusPenempatan = inferredPenempatan;
        dirtyCols.StatusPenempatan = true;
      }

      if (pId) existingIdSet[pId] = true;
      var trackedNip = String(r.NIP || '').replace(/[^0-9]/g, '');
      if (/^\d{18}$/.test(trackedNip)) existingNipSet[trackedNip] = true;
    });

    Object.keys(dirtyCols).forEach(function (colKey) {
      var colIdx = headers.indexOf(colKey);
      if (colIdx !== -1) {
        sheet.getRange(2, colIdx + 1, rows.length, 1).setValues(rows.map(function (r) {
          var v = r[colKey];
          return [v !== undefined && v !== null ? String(v) : ''];
        }));
      }
    });

    // 8. Append personil baru dari SEED_AWAK_ARMADA yang belum ada di Master_Awak
    var appendedNew = false;
    if (seedList.length > 0 && headers.length > 0) {
      var nowAppendStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      var toAppendRows = [];
      var toAppendObjs = [];
      seedList.forEach(function (a) {
        var sPid = String(a.pegawaiId || '').trim();
        var sNip = String(a.nip || '').replace(/[^0-9]/g, '');
        if (!sPid || _NAKHODA_DUPLICATE_SEED_IDS[sPid] || existingIdSet[sPid] || (/^\d{18}$/.test(sNip) && existingNipSet[sNip])) {
          return;
        }
        var rowObj = _buildMasterAwakRowObj(a, nowAppendStr);
        toAppendObjs.push(rowObj);
        toAppendRows.push(headers.map(function (h) {
          return rowObj[h] !== undefined ? rowObj[h] : '';
        }));
        existingIdSet[sPid] = true;
      });
      if (toAppendRows.length > 0) {
        var startAppendRow = sheet.getLastRow() + 1;
        sheet.getRange(startAppendRow, 1, toAppendRows.length, headers.length).setValues(toAppendRows);
        toAppendObjs.forEach(function (o) { rows.push(o); });
        appendedNew = true;
      }
    }

    if (schemaChanged || appendedNew || Object.keys(dirtyCols).length > 0) {
      if (typeof applyFormalSheetFormatting === 'function') {
        applyFormalSheetFormatting(sheet, SHEET_AWAK.MASTER_AWAK);
      }
    }
  } catch (eHeal) {
    Logger.log('[_healMasterAwakKelasIfNeeded] ' + eHeal.message);
  }
}

function _buildAwakComputedMaps() {
  var now = new Date();
  var todayStr = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd');
  var bstByPegawai = {};
  var vesselByPegawai = {};
  var placementsByPegawai = {};
  var kapalNameMap = {};

  try {
    var rowsKapal = sheetToObjects(openMasterSheet(SHEET_MASTER.KAPAL));
    rowsKapal.forEach(function (k) {
      kapalNameMap[String(k.KapalID || '')] = String(k.NamaKapal || k.KapalID || '');
    });
  } catch (eK) {}

  try {
    var rowsSrt = sheetToObjects(openAwakSheet(SHEET_AWAK.PELATIHAN_AWAK));
    rowsSrt.forEach(function (s) {
      if (String(s.Status || '').toUpperCase() !== ROW_STATUS.ACTIVE) return;
      var pid = String(s.PegawaiID || '').trim();
      if (!pid) return;
      var kd = String(s.KodePelatihan || '').toUpperCase();
      var nm = String(s.NamaPelatihan || '').toUpperCase();
      var isBst = nm.indexOf('BST') !== -1 || nm.indexOf('BASIC SAFETY TRAINING') !== -1 ||
        kd === 'TRN-JMK-01' || /^TRN-[A-Z]+-02$/.test(kd);
      if (!isBst) return;

      var evalRes = typeof evaluateSertifikatStatus === 'function'
        ? evaluateSertifikatStatus(s, now)
        : { status: 'BERLAKU', label: 'Berlaku', sisaHari: 999 };

      var prev = bstByPegawai[pid];
      // Ambil status terbaik jika ada lebih dari 1 catatan BST aktif
      var rank = { BERLAKU: 3, SEGERA_HABIS: 2, KEDALUWARSA: 1, BELUM_ADA: 0 };
      if (!prev || (rank[evalRes.status] || 0) >= (rank[prev.status] || 0)) {
        bstByPegawai[pid] = {
          status: evalRes.status,
          label: evalRes.label,
          berlakuSampai: String(s.BerlakuSampai || ''),
          nomorSertifikat: String(s.NomorSertifikat || '-')
        };
      }
    });
  } catch (eSrt) {}

  try {
    var rowsTgs = sheetToObjects(openAwakSheet(SHEET_AWAK.PENUGASAN_KAPAL));
    rowsTgs.forEach(function (t) {
      if (String(t.Status || '').toUpperCase() !== ROW_STATUS.ACTIVE) return;
      var pid = String(t.PegawaiID || '').trim();
      if (!pid) return;
      var kId = String(t.KapalID || '').trim();
      var tNaik = String(t.TanggalNaik || '').trim().substring(0, 10);
      var tTurun = String(t.TanggalTurun || '').trim().substring(0, 10);

      if (!placementsByPegawai[pid]) placementsByPegawai[pid] = [];
      placementsByPegawai[pid].push({
        kapalId: kId,
        namaKapal: kapalNameMap[kId] || kId,
        posSijil: String(t.PosSijil || ''),
        tanggalNaik: tNaik,
        tanggalTurun: tTurun
      });

      var isCurrentlyActive = !tTurun || tTurun >= todayStr;
      if (isCurrentlyActive) {
        var prevV = vesselByPegawai[pid];
        if (!prevV || tNaik >= prevV.tanggalNaik) {
          vesselByPegawai[pid] = {
            kapalId: kId,
            namaKapal: kapalNameMap[kId] || kId,
            posSijil: String(t.PosSijil || ''),
            tanggalNaik: tNaik,
            durasiTeks: _computeVesselDurationText(tNaik, now)
          };
        }
      }
    });
  } catch (eTgs) {}

  return {
    now: now,
    bstByPegawai: bstByPegawai,
    vesselByPegawai: vesselByPegawai,
    placementsByPegawai: placementsByPegawai,
    kapalNameMap: kapalNameMap
  };
}

/**
 * Menghitung rekap kekuatan personel per Kelompok Jabatan (Eksisting vs Ideal Safe Manning Armada)
 * untuk tampilan eksekutif di Ringkasan, Komposisi AKN, dan Papan Sijil.
 */
function dir_computeRekapJabatan() {
  var result = [];
  try {
    var rowsAwak = sheetToObjects(openAwakSheet(SHEET_AWAK.MASTER_AWAK));
    var rowsKapal = sheetToObjects(openMasterSheet(SHEET_MASTER.KAPAL));
    var rowsManning = sheetToObjects(openAwakSheet(SHEET_AWAK.MASTER_SAFE_MANNING));

    var manningByKelasPos = {};
    rowsManning.forEach(function (m) {
      var kls = String(m.KelasKapal || '').toUpperCase().trim();
      var pos = String(m.PosSijil || '').toUpperCase().trim();
      if (!manningByKelasPos[kls]) manningByKelasPos[kls] = {};
      manningByKelasPos[kls][pos] = (manningByKelasPos[kls][pos] || 0) + (parseInt(m.Minimum, 10) || 0);
    });

    function mapPosToKelompok(posToken) {
      if (posToken === 'NAKHODA') return 'Nahkoda';
      if (posToken.indexOf('MUALIM') === 0) return 'Mualim';
      if (posToken === 'KKM') return 'KKM';
      if (posToken.indexOf('MASINIS') === 0) return 'Masinis';
      if (posToken === 'MARKONIS') return 'Markonis';
      if (posToken === 'SERANG') return 'Serang';
      if (posToken === 'JURU_MUDI') return 'Juru Mudi';
      if (posToken === 'KELASI') return 'Kelasi';
      if (posToken === 'JURU_MINYAK') return 'Juru Minyak';
      if (posToken === 'JURU_MASAK') return 'Juru Masak';
      return 'Kelasi';
    }

    function normalizeAwakToGroup(jabStr) {
      var t = String(jabStr || '').toUpperCase();
      if (/NAHKODA|NAKHODA/.test(t)) return 'Nahkoda';
      if (/MUALIM/.test(t)) return 'Mualim';
      if (/KKM|KEPALA KAMAR MESIN/.test(t)) return 'KKM';
      if (/MASINIS/.test(t)) return 'Masinis';
      if (/MARKONIS|RADIO/.test(t)) return 'Markonis';
      if (/SERANG/.test(t)) return 'Serang';
      if (/JURU[\s_]*MUDI|JURU[\s_]*MUDY/.test(t)) return 'Juru Mudi';
      if (/JURU[\s_]*MINYAK|OILER/.test(t)) return 'Juru Minyak';
      if (/JURU[\s_]*MASAK|KOKI|COOK|STEWARD/.test(t)) return 'Juru Masak';
      if (/KELASI/.test(t)) return 'Kelasi';
      return 'Kelasi';
    }

    var groupsOrder = [
      'Nahkoda', 'Mualim', 'KKM', 'Masinis', 'Markonis',
      'Serang', 'Juru Mudi', 'Kelasi', 'Juru Minyak', 'Juru Masak'
    ];
    var mapData = {};
    groupsOrder.forEach(function (g) {
      mapData[g] = { kelompokJabatan: g, eksisting: 0, poaPusat: 0, idealArmada: 0 };
    });

    // 1. Hitung kebutuhan ideal armada per kelompok jabatan
    rowsKapal.forEach(function (k) {
      var kls = String(k.KelasKapal || 'KELAS_II').toUpperCase().trim();
      var posMap = manningByKelasPos[kls] || {};
      Object.keys(posMap).forEach(function (pos) {
        var grp = mapPosToKelompok(pos);
        if (mapData[grp]) {
          mapData[grp].idealArmada += posMap[pos];
        }
      });
    });

    // 2. Hitung personil eksisting aktif dari Master_Awak
    rowsAwak.forEach(function (a) {
      if (String(a.StatusAktif || 'AKTIF').toUpperCase().trim() !== 'AKTIF') return;
      var grp = normalizeAwakToGroup(a.KelompokJabatan || a.JabatanLengkap);
      if (!mapData[grp]) mapData[grp] = { kelompokJabatan: grp, eksisting: 0, poaPusat: 0, idealArmada: 0 };
      mapData[grp].eksisting++;
      var sp = _inferStatusPenempatan(a.PangkalanID || a.Catatan, a.StatusPenempatan);
      if (sp === 'PUSAT_POA' || String(a.PangkalanID || '').toLowerCase().indexOf('pusat') !== -1) {
        mapData[grp].poaPusat++;
      }
    });

    result = groupsOrder.map(function (g) {
      var d = mapData[g];
      var selisih = d.eksisting - d.idealArmada;
      return {
        kelompokJabatan: d.kelompokJabatan,
        eksisting: d.eksisting,
        poaPusat: d.poaPusat,
        idealArmada: d.idealArmada,
        selisih: selisih,
        status: d.idealArmada === 0 ? 'TERSEDIA' : (selisih >= 0 ? 'CUKUP' : 'KURANG')
      };
    });
  } catch (eRec) {
    Logger.log('[dir_computeRekapJabatan] ' + eRec.message);
  }
  return result;
}

function dir_list(params) {
  try {
    var p = params || {};
    var session = _requireSession(p.token);
    var isPrivileged = session.role === ROLE.SUPERADMIN || session.role === ROLE.KADIV;

    var sheet = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var rows = sheetToObjects(sheet);

    if (rows.length === 0) {
      dir_ensureSeeded();
      rows = sheetToObjects(sheet);
    }

    _healMasterAwakKelasIfNeeded(sheet, rows);
    var computed = _buildAwakComputedMaps();

    var rumpunFilter = String(p.rumpun || '').toUpperCase().trim();
    var kelasFilter = p.kelasKapal ? normalizeKelasKapal(p.kelasKapal, '') : '';
    var kategoriFilter = p.kategoriKepegawaian ? normalizeAknKategori(p.kategoriKepegawaian) : '';
    var statusFilter = String(p.statusAktif || '').toUpperCase().trim();
    var penempatanFilter = String(p.statusPenempatan || '').toUpperCase().trim();
    var bstFilter = String(p.bstStatus || '').toUpperCase().trim();
    var searchStr = String(p.search || '').toLowerCase().trim();
    var filterPerluDilengkapi = p.perluDilengkapi === true;

    // Filter Periode / Triwulan / Rentang Kalender
    var hasPeriodeFilter = p.periodeMode && String(p.periodeMode).toUpperCase() !== 'ALL';
    var periodeWin = hasPeriodeFilter && typeof resolvePeriodeWindow === 'function'
      ? resolvePeriodeWindow({
          mode: p.periodeMode,
          tahun: p.tahun,
          startDate: p.startDate,
          endDate: p.endDate
        })
      : null;

    var countTotal = rows.length;
    var countDek = 0;
    var countMesin = 0;
    var countPenunjang = 0;
    var countPerlu = 0;

    // Enrich & hitung KPI sebelum disaring filter UI
    var enriched = rows.map(function (r) {
      var pId = String(r.PegawaiID || '');
      var rawNip = String(r.NIP || '').trim();
      var cleanNipDigits = rawNip.replace(/[^0-9]/g, '');
      var rmp = String(r.Rumpun || '').toUpperCase();
      if (rmp.indexOf('AWAK_') === 0) rmp = rmp.substring(5);
      if (!rmp) rmp = extractRumpunAwak(r.KelompokJabatan || r.JabatanLengkap || '');
      if (rmp === 'NON_AWAK') rmp = 'DEK';

      if (rmp === 'DEK') countDek++;
      else if (rmp === 'MESIN') countMesin++;
      else if (rmp === 'PENUNJANG') countPenunjang++;

      var kat = normalizeAknKategori(r.KategoriKepegawaian || 'PNS');
      var bstInfo = computed.bstByPegawai[pId] || { status: 'BELUM_ADA', label: 'Belum ada' };
      var hasValidBst = bstInfo.status === 'BERLAKU' || bstInfo.status === 'SEGERA_HABIS';
      var needsNip = (kat !== 'PJLP') && !/^\d{18}$/.test(cleanNipDigits);
      var isPerlu = !kat || !hasValidBst || needsNip;
      if (isPerlu) countPerlu++;

      var vessel = computed.vesselByPegawai[pId];
      var kapalId = String((vessel && vessel.kapalId) || r.KapalID || '').trim();
      var namaKapal = kapalId ? (computed.kapalNameMap[kapalId] || kapalId) : '';
      var tglNaik = (vessel && vessel.tanggalNaik) || String(r.TanggalMulaiKerja || '').substring(0, 10);
      var durasiTeks = (vessel && vessel.durasiTeks) || (kapalId && tglNaik ? _computeVesselDurationText(tglNaik, computed.now) : '-');
      var statusPenempatan = _inferStatusPenempatan(r.PangkalanID || r.Catatan, r.StatusPenempatan);

      return {
        row: r,
        pegawaiId: pId,
        nipDisplay: kat === 'PJLP' && !cleanNipDigits ? '-' : maskNip(rawNip, isPrivileged),
        nipRaw: isPrivileged ? rawNip : '',
        cleanNipDigits: cleanNipDigits,
        nama: String(r.Nama || ''),
        kelompokJabatan: String(r.KelompokJabatan || ''),
        jabatanLengkap: String(r.JabatanLengkap || r.KelompokJabatan || ''),
        kelasKapal: normalizeKelasKapal(r.KelasKapal, r.JabatanLengkap || r.KelompokJabatan),
        rumpun: rmp,
        kategoriKepegawaian: kat,
        statusAktif: String(r.StatusAktif || 'AKTIF'),
        statusPenempatan: statusPenempatan,
        pangkalanId: String(r.PangkalanID || '-'),
        kapalId: kapalId || '-',
        namaKapal: namaKapal || (kapalId || '-'),
        tanggalNaikKapal: tglNaik,
        durasiKapalTeks: durasiTeks,
        bstStatus: bstInfo.status,
        bstLabel: bstInfo.label,
        ukuranBaju: String(r.UkuranBaju || ''),
        ukuranSepatu: String(r.UkuranSepatu || ''),
        nomorSkPenempatan: String(r.NomorSKPenempatan || ''),
        dokumenPenempatanUrl: String(r.DokumenPenempatanURL || ''),
        tanggalMulaiKerja: String(r.TanggalMulaiKerja || ''),
        tanggalSelesaiKontrak: String(r.TanggalSelesaiKontrak || ''),
        isPerluDilengkapi: isPerlu,
        placements: computed.placementsByPegawai[pId] || []
      };
    });

    var filtered = enriched.filter(function (it) {
      if (rumpunFilter && it.rumpun !== rumpunFilter) return false;
      if (kelasFilter && it.kelasKapal !== kelasFilter) return false;
      if (kategoriFilter && it.kategoriKepegawaian !== kategoriFilter) return false;
      if (statusFilter && it.statusAktif.toUpperCase() !== statusFilter) return false;
      if (penempatanFilter && it.statusPenempatan !== penempatanFilter) return false;
      if (bstFilter && it.bstStatus !== bstFilter) return false;
      if (filterPerluDilengkapi && !it.isPerluDilengkapi) return false;

      if (periodeWin && periodeWin.startDateStr && periodeWin.endDateStr) {
        var wStart = periodeWin.startDateStr;
        var wEnd = periodeWin.endDateStr;
        var matchesWindow = false;
        if (it.placements.length > 0) {
          matchesWindow = it.placements.some(function (pl) {
            var pStart = pl.tanggalNaik || '1900-01-01';
            var pEnd = pl.tanggalTurun || '9999-12-31';
            return pStart <= wEnd && pEnd >= wStart;
          });
        } else {
          var tMulai = String(it.tanggalMulaiKerja || '').substring(0, 10);
          var tSelesai = String(it.tanggalSelesaiKontrak || '').substring(0, 10);
          if (tMulai) {
            matchesWindow = tMulai <= wEnd && (!tSelesai || tSelesai >= wStart);
          } else {
            // Gunakan UpdatedAt untuk awak lama yang belum memiliki tanggal mulai eksplisit
            var updStr = it.row.UpdatedAt instanceof Date
              ? Utilities.formatDate(it.row.UpdatedAt, 'GMT+7', 'yyyy-MM-dd')
              : String(it.row.UpdatedAt || '').substring(0, 10);
            matchesWindow = !updStr || updStr <= wEnd;
          }
        }
        if (!matchesWindow) return false;
      }

      if (searchStr) {
        var nama = it.nama.toLowerCase();
        var nip = String(it.row.NIP || '').toLowerCase();
        var jab = (it.kelompokJabatan + ' ' + it.jabatanLengkap + ' ' + it.namaKapal).toLowerCase();
        if (nama.indexOf(searchStr) === -1 && nip.indexOf(searchStr) === -1 && jab.indexOf(searchStr) === -1) {
          return false;
        }
      }
      return true;
    });

    var totalMatched = filtered.length;
    var limit = p.limit || 50;
    var offset = p.offset || 0;
    var paged = filtered.slice(offset, offset + limit).map(function (it) {
      var out = Object.assign({}, it);
      delete out.row;
      delete out.placements;
      delete out.cleanNipDigits;
      return out;
    });

    return {
      success: true,
      data: {
        items: paged,
        total: totalMatched,
        periodeWindow: periodeWin,
        stats: {
          total: countTotal,
          dek: countDek,
          mesin: countMesin,
          penunjang: countPenunjang,
          perluDilengkapi: countPerlu
        },
        sikapAlerts: _getCurrentSikapAlerts(rows),
        userRole: session.role,
        isPrivileged: isPrivileged
      }
    };
  } catch (e) {
    Logger.log('[dir_list] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mengambil detail profil komprehensif seorang awak kapal.
 */
function dir_getDetail(token, pegawaiId) {
  try {
    var session = _requireSession(token);
    var isPrivileged = session.role === ROLE.SUPERADMIN || session.role === ROLE.KADIV;
    var pId = String(pegawaiId || '').trim();

    var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var found = findRowByField(sheetAwak, 'PegawaiID', pId);
    if (!found) return { success: false, error: 'Awak kapal tidak ditemukan.' };

    var a = found.obj;
    var rawNip = String(a.NIP || '');
    var now = new Date();
    var computed = _buildAwakComputedMaps();

    var penugasan = [];
    try {
      var sheetTgs = openAwakSheet(SHEET_AWAK.PENUGASAN_KAPAL);
      penugasan = sheetToObjects(sheetTgs)
        .filter(function (t) {
          return String(t.PegawaiID || '') === pId && String(t.Status || '').toUpperCase() === 'ACTIVE';
        })
        .map(function (t) {
          var kId = String(t.KapalID || '');
          var tNaik = String(t.TanggalNaik || '').substring(0, 10);
          return {
            rowId: String(t.RowID || ''),
            kapalId: kId,
            namaKapal: computed.kapalNameMap[kId] || kId,
            posSijil: String(t.PosSijil || ''),
            tanggalNaik: tNaik,
            tanggalTurun: String(t.TanggalTurun || '').substring(0, 10),
            durasiTeks: _computeVesselDurationText(tNaik, now),
            keterangan: String(t.Keterangan || '')
          };
        });
    } catch (eTgs) {}

    var sertifikat = [];
    try {
      var sheetSrt = openAwakSheet(SHEET_AWAK.PELATIHAN_AWAK);
      sertifikat = sheetToObjects(sheetSrt)
        .filter(function (s) {
          return String(s.PegawaiID || '') === pId && String(s.Status || '').toUpperCase() === 'ACTIVE';
        })
        .map(function (s) {
          return {
            rowId: String(s.RowID || ''),
            kodePelatihan: String(s.KodePelatihan || ''),
            namaPelatihan: String(s.NamaPelatihan || ''),
            statusKelulusan: String(s.StatusKelulusan || ''),
            nomorSertifikat: String(s.NomorSertifikat || '-'),
            berlakuSampai: String(s.BerlakuSampai || '').substring(0, 10)
          };
        });
    } catch (eSrt) {}

    var rmp = String(a.Rumpun || '').toUpperCase();
    if (rmp.indexOf('AWAK_') === 0) rmp = rmp.substring(5);
    var bstInfo = computed.bstByPegawai[pId] || { status: 'BELUM_ADA', label: 'Belum ada' };
    var vessel = computed.vesselByPegawai[pId];
    var kapalId = String((vessel && vessel.kapalId) || a.KapalID || '');

    return {
      success: true,
      data: {
        pegawaiId: pId,
        nipDisplay: maskNip(rawNip, isPrivileged),
        nipRaw: isPrivileged ? rawNip : '',
        nama: String(a.Nama || ''),
        kelompokJabatan: String(a.KelompokJabatan || ''),
        jabatanLengkap: String(a.JabatanLengkap || ''),
        kelasKapal: normalizeKelasKapal(a.KelasKapal, a.JabatanLengkap || a.KelompokJabatan),
        rumpun: rmp || 'DEK',
        kategoriKepegawaian: normalizeAknKategori(a.KategoriKepegawaian || 'PNS'),
        statusAktif: String(a.StatusAktif || 'AKTIF'),
        statusPenempatan: _inferStatusPenempatan(a.PangkalanID || a.Catatan, a.StatusPenempatan),
        pangkalanId: String(a.PangkalanID || ''),
        kapalId: kapalId,
        namaKapal: kapalId ? (computed.kapalNameMap[kapalId] || kapalId) : '',
        tanggalNaikKapal: (vessel && vessel.tanggalNaik) || String(a.TanggalMulaiKerja || '').substring(0, 10),
        durasiKapalTeks: (vessel && vessel.durasiTeks) || '-',
        bstStatus: bstInfo.status,
        bstLabel: bstInfo.label,
        nomorSkPenempatan: String(a.NomorSKPenempatan || ''),
        dokumenPenempatanUrl: String(a.DokumenPenempatanURL || ''),
        ukuranBaju: String(a.UkuranBaju || ''),
        ukuranSepatu: String(a.UkuranSepatu || ''),
        tanggalMulaiKerja: String(a.TanggalMulaiKerja || '').substring(0, 10),
        tanggalSelesaiKontrak: String(a.TanggalSelesaiKontrak || '').substring(0, 10),
        catatan: String(a.Catatan || ''),
        penugasan: penugasan,
        sertifikat: sertifikat,
        isPrivileged: isPrivileged
      }
    };
  } catch (e) {
    Logger.log('[dir_getDetail] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mendorong pembaruan profil awak kapal dari NAKHODA ke SIKAP (Master_Pegawai_POA)
 * dengan penanda StatusKelengkapanTU = 'DISPARITAS_NAKHODA' agar TU melengkapinya di SIKAP.
 */
function _pushAwakToSikap(awakRecord, reasonText) {
  try {
    if (!awakRecord) return { skipped: true };
    var props = PropertiesService.getScriptProperties();
    var sikapId = props ? props.getProperty(PROP_KEY.SIKAP_SS_ID) : '';
    if (!sikapId) return { skipped: true, reason: 'SIKAP_SS_ID belum tertaut' };

    var sikapSs = SpreadsheetApp.openById(sikapId);
    var sSheet = sikapSs.getSheetByName('Master_Pegawai_POA') || sikapSs.getSheetByName('Data_Pegawai');
    if (!sSheet) return { skipped: true, reason: 'Sheet Master_Pegawai_POA tidak ditemukan di SIKAP' };

    // Pastikan kolom sinkronisasi & disparitas tersedia di sheet SIKAP
    var reqSikapCols = [
      'StatusPenempatan', 'KapalPenempatan', 'UkuranBaju', 'UkuranSepatu',
      'SumberSinkronisasi', 'StatusKelengkapanTU', 'CatatanDisparitas'
    ];
    var lastCol = sSheet.getLastColumn();
    var headers = lastCol > 0 ? sSheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    reqSikapCols.forEach(function (col) {
      if (headers.indexOf(col) === -1) {
        var newC = sSheet.getLastColumn() + 1;
        sSheet.getRange(1, newC).setValue(col);
        headers.push(col);
      }
    });

    var rows = sheetToObjects(sSheet);
    var pId = String(awakRecord.PegawaiID || '').trim();
    var nipClean = String(awakRecord.NIP || '').replace(/[^0-9]/g, '');
    var canonNama = typeof sanitizeNamaPersonel === 'function'
      ? sanitizeNamaPersonel(String(awakRecord.Nama || ''))
      : String(awakRecord.Nama || '').toUpperCase().trim();

    var matchIdx = -1;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (pId && String(r.PegawaiID || '').trim() === pId) { matchIdx = i; break; }
      if (nipClean && /^\d{18}$/.test(nipClean) && String(r.NIP || '').replace(/[^0-9]/g, '') === nipClean) { matchIdx = i; break; }
      if (canonNama) {
        var rNama = typeof sanitizeNamaPersonel === 'function'
          ? sanitizeNamaPersonel(String(r.Nama || ''))
          : String(r.Nama || '').toUpperCase().trim();
        if (rNama === canonNama) { matchIdx = i; break; }
      }
    }

    var now = new Date();
    var todayIso = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd');
    var kapalId = String(awakRecord.KapalID || '').trim();
    var kapalNameMap = {};
    try {
      sheetToObjects(openMasterSheet(SHEET_MASTER.KAPAL)).forEach(function (k) {
        kapalNameMap[String(k.KapalID || '')] = String(k.NamaKapal || k.KapalID || '');
      });
    } catch (eK) {}
    var kapalLabel = kapalId ? (kapalNameMap[kapalId] || kapalId) : '';
    var pangkalan = String(awakRecord.PangkalanID || 'Dit. POA Pusat').trim();
    var statusPenempatan = _inferStatusPenempatan(pangkalan, awakRecord.StatusPenempatan);
    var unitKerjaText = statusPenempatan === 'DIPERBANTUKAN_UPT'
      ? ('AKP Pusat Diperbantukan di ' + (kapalLabel || pangkalan) + (kapalLabel ? (' — ' + pangkalan) : ''))
      : ('Dit. POA Pusat' + (kapalLabel ? (' — ' + kapalLabel) : ''));

    var kelJab = String(awakRecord.KelompokJabatan || '').trim();
    var klsKapal = String(awakRecord.KelasKapal || 'NON_KAPAL').trim();
    var rmp = String(awakRecord.Rumpun || 'DEK').toUpperCase();
    var kategoriRumpun = rmp === 'MESIN' ? 'AWAK_MESIN' : (rmp === 'PENUNJANG' ? 'PENUNJANG' : 'AWAK_DEK');
    var catatanDisparitas = 'Kiriman Nakhoda [' + todayIso + ']: ' +
      (reasonText || ('Kelompok Jabatan [' + kelJab + ' / ' + klsKapal.replace('_', ' ') + ']')) +
      ' — Perlu verifikasi / pelengkapan Jabatan Lengkap TU di SIKAP.';

    var patchObj = {
      'PegawaiID': pId,
      'NIP': nipClean,
      'Nama': canonNama,
      'UnitKerja': unitKerjaText,
      'LingkupData': 'AWAK_KAPAL_ARMADA',
      'KelompokJabatan': kelJab,
      'TingkatKelas': klsKapal,
      'KategoriRumpun': kategoriRumpun,
      'StatusKepegawaian': String(awakRecord.KategoriKepegawaian || 'PNS'),
      'StatusAktif': String(awakRecord.StatusAktif || 'AKTIF'),
      'StatusPenempatan': statusPenempatan,
      'KapalPenempatan': kapalLabel,
      'UkuranBaju': String(awakRecord.UkuranBaju || ''),
      'UkuranSepatu': String(awakRecord.UkuranSepatu || ''),
      'TanggalMulai': String(awakRecord.TanggalMulaiKerja || ''),
      'TanggalSelesai': String(awakRecord.TanggalSelesaiKontrak || ''),
      'DokumenSK_URL': String(awakRecord.DokumenPenempatanURL || ''),
      'CatatanTambahan': String(awakRecord.Catatan || unitKerjaText),
      'SumberSinkronisasi': 'PUSH_NAKHODA',
      'StatusKelengkapanTU': 'DISPARITAS_NAKHODA',
      'CatatanDisparitas': catatanDisparitas,
      'UpdatedAt': Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss'),
      'UpdatedBy': String(awakRecord.UpdatedBy || 'NAKHODA_SYNC')
    };

    if (matchIdx !== -1) {
      // Pertahankan JabatanLengkap jika TU sudah pernah mengisi dan kelompok tidak berubah drastis, namun tandai disparitas
      updateRowCells(sSheet, matchIdx + 2, patchObj);
    } else {
      patchObj.JabatanLengkap = '';
      appendRowData(sSheet, patchObj);
    }

    if (typeof applyFormalSheetFormatting === 'function') {
      applyFormalSheetFormatting(sSheet, 'Master_Pegawai_POA');
    }

    return { success: true, matched: matchIdx !== -1 };
  } catch (ePush) {
    Logger.log('[_pushAwakToSikap] Notice: ' + ePush.message);
    return { success: false, error: ePush.message };
  }
}

/**
 * Mendorong sertifikat (terutama BST) dari NAKHODA ke TX_TU_Pelatihan_Pegawai di SIKAP.
 */
function _pushSertifikatToSikap(pegawaiObj, certRecord) {
  try {
    if (!pegawaiObj || !certRecord) return { skipped: true };
    var props = PropertiesService.getScriptProperties();
    var sikapId = props ? props.getProperty(PROP_KEY.SIKAP_SS_ID) : '';
    if (!sikapId) return { skipped: true };

    var sikapSs = SpreadsheetApp.openById(sikapId);
    var certSheet = sikapSs.getSheetByName('TX_TU_Pelatihan_Pegawai');
    if (!certSheet) return { skipped: true };

    var now = new Date();
    appendRowData(certSheet, {
      'RecordID': String(certRecord.RowID || ('CERT-NKH-' + Utilities.getUuid().substring(0, 8).toUpperCase())),
      'PegawaiID': String(pegawaiObj.PegawaiID || ''),
      'NIP': String(pegawaiObj.NIP || '').replace(/[^0-9]/g, ''),
      'KodePelatihan': String(certRecord.KodePelatihan || ''),
      'NamaPelatihan': String(certRecord.NamaPelatihan || ''),
      'StatusKelulusan': String(certRecord.StatusKelulusan || 'SUDAH_LULUS'),
      'NomorSertifikat': String(certRecord.NomorSertifikat || '-'),
      'TahunPelatihan': certRecord.TahunPelatihan || now.getFullYear(),
      'BerlakuSampai': String(certRecord.BerlakuSampai || ''),
      'FileEvidenceID': String(certRecord.EvidenceID || ''),
      'FileEvidenceURL': certRecord.EvidenceID ? ('https://drive.google.com/file/d/' + certRecord.EvidenceID + '/view') : '',
      'UpdatedAt': Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss'),
      'UpdatedBy': 'NAKHODA_SYNC'
    });

    if (typeof applyFormalSheetFormatting === 'function') {
      applyFormalSheetFormatting(certSheet, 'TX_TU_Pelatihan_Pegawai');
    }
    return { success: true };
  } catch (eCert) {
    Logger.log('[_pushSertifikatToSikap] Notice: ' + eCert.message);
    return { success: false, error: eCert.message };
  }
}

/**
 * Menyimpan atau memperbarui profil awak kapal di Master_Awak.
 * Menegakkan Nama Kanonik HURUF BESAR, NIP kondisional (18 digit wajib non-PJLP),
 * tanpa input JabatanLengkap / NomorBukuPelaut, serta push sync ke SIKAP.
 */
function dir_save(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.STAF, ROLE.KADIV, ROLE.SUPERADMIN], null);

      var pId = String(params.pegawaiId || '').trim();
      var rawNama = String(params.nama || '').trim();
      var nama = typeof sanitizeNamaPersonel === 'function' ? sanitizeNamaPersonel(rawNama) : rawNama.toUpperCase();
      if (!nama || !/^[A-Z ]+$/.test(nama)) {
        return { success: false, error: 'Nama lengkap wajib diisi dengan huruf kapital (A-Z) tanpa gelar, simbol, atau angka.' };
      }

      var kat = typeof normalizeAknKategori === 'function'
        ? normalizeAknKategori(params.kategoriKepegawaian || 'PNS')
        : String(params.kategoriKepegawaian || 'PNS').trim();

      var rawNip = String(params.nip || '').trim().replace(/[^0-9]/g, '');
      if (kat !== 'PJLP') {
        if (!/^\d{18}$/.test(rawNip)) {
          return {
            success: false,
            error: 'NIP wajib diisi tepat 18 digit angka untuk kategori PNS, P3K, dan P3K Paruh Waktu.'
          };
        }
      } else {
        rawNip = ''; // PJLP tidak memiliki NIP
      }

      var kelJab = String(params.kelompokJabatan || '').trim();
      if (!kelJab) {
        return { success: false, error: 'Kelompok jabatan wajib dipilih.' };
      }

      var kelasKapal = params.kelasKapal ? normalizeKelasKapal(params.kelasKapal, '') : 'KELAS_II';
      var kelasHuman = kelasKapal !== 'NON_KAPAL' ? (' ' + kelasKapal.replace('_', ' ')) : '';
      var autoJabatanLengkap = kelJab + kelasHuman;

      var rumpun = String(params.rumpun || extractRumpunAwak(kelJab)).toUpperCase().trim();
      if (rumpun.indexOf('AWAK_') === 0) rumpun = rumpun.substring(5);
      if (rumpun === 'NON_AWAK') rumpun = 'DEK';

      var statusPenempatan = _inferStatusPenempatan(params.pangkalanId, params.statusPenempatan);
      var pangkalanId = String(params.pangkalanId || (statusPenempatan === 'PUSAT_POA' ? 'Dit. POA Pusat' : '')).trim();
      var kapalId = String(params.kapalId || '').trim();
      var noSk = String(params.nomorSkPenempatan || '').trim();
      var docUrl = String(params.dokumenPenempatanUrl || '').trim();
      var ukBaju = String(params.ukuranBaju || '').toUpperCase().trim();
      var ukSepatu = String(params.ukuranSepatu || '').trim();

      var sheet = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
      var rowsExisting = sheetToObjects(sheet);
      _healMasterAwakKelasIfNeeded(sheet, rowsExisting);

      var now = new Date();
      var found = pId ? findRowByField(sheet, 'PegawaiID', pId) : null;
      var targetId = found ? pId : ('PEG-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase());

      // Upload opsional dokumen SK Penempatan / Surat Tugas jika disertakan
      if (params.fileData && params.fileData.dataBase64 && typeof evidence_upload === 'function') {
        try {
          var upRes = evidence_upload(params.token, {
            refSheet: SHEET_AWAK.MASTER_AWAK,
            refRowId: targetId,
            fileName: params.fileData.fileName || ('SK_Penempatan_' + targetId + '.pdf'),
            mimeType: params.fileData.mimeType || 'application/pdf',
            dataBase64: params.fileData.dataBase64
          });
          if (upRes && upRes.success && upRes.data && upRes.data.driveFileId) {
            docUrl = 'https://drive.google.com/file/d/' + upRes.data.driveFileId + '/view';
          }
        } catch (eUp) {
          Logger.log('[dir_save] Upload SK optional notice: ' + eUp.message);
        }
      }

      var catatanInput = String(params.catatan || '').trim();
      if (!catatanInput) {
        catatanInput = (statusPenempatan === 'DIPERBANTUKAN_UPT' ? 'AKP Pusat Diperbantukan di UPT' : 'Organik Dit. POA Pusat') +
          (kelJab ? (' · ' + kelJab + kelasHuman) : '');
      }

      var record = {
        'PegawaiID': targetId,
        'Nama': nama,
        'NIP': rawNip,
        'KelompokJabatan': kelJab,
        'JabatanLengkap': autoJabatanLengkap,
        'KelasKapal': kelasKapal,
        'Rumpun': rumpun,
        'KategoriKepegawaian': kat,
        'StatusAktif': String(params.statusAktif || 'AKTIF').trim(),
        'StatusPenempatan': statusPenempatan,
        'PangkalanID': pangkalanId,
        'KapalID': kapalId,
        'TanggalMulaiKerja': String(params.tanggalMulaiKerja || '').trim(),
        'TanggalSelesaiKontrak': String(params.tanggalSelesaiKontrak || '').trim(),
        'NomorSKPenempatan': noSk,
        'DokumenPenempatanURL': docUrl,
        'UkuranBaju': ukBaju,
        'UkuranSepatu': ukSepatu,
        'Catatan': catatanInput,
        'UpdatedAt': Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss'),
        'UpdatedBy': session.userId
      };

      if (found) {
        if (!docUrl && found.obj.DokumenPenempatanURL) {
          record.DokumenPenempatanURL = String(found.obj.DokumenPenempatanURL);
        }
        updateRowCells(sheet, found.rowIndex, record);
        _auditLog(session.userId, 'UPDATE_AWAK', SHEET_AWAK.MASTER_AWAK, targetId, 'Pembaruan profil: ' + nama);
      } else {
        appendRowData(sheet, record);
        _auditLog(session.userId, 'CREATE_AWAK', SHEET_AWAK.MASTER_AWAK, targetId, 'Perekaman personil baru: ' + nama);
      }

      if (typeof applyFormalSheetFormatting === 'function') {
        applyFormalSheetFormatting(sheet, SHEET_AWAK.MASTER_AWAK);
      }
      if (typeof akn_syncFromAwak === 'function') {
        try { akn_syncFromAwak(session.userId, (found ? 'Pembaruan profil awak: ' : 'Penambahan personil baru: ') + nama); } catch (eAkn) {}
      }

      var pushRes = _pushAwakToSikap(record, (found ? 'Pembaruan profil ' : 'Personil baru ') + kelJab + kelasHuman);

      return {
        success: true,
        data: {
          pegawaiId: targetId,
          sikapSynced: !!(pushRes && pushRes.success),
          message: found
            ? 'Profil personil berhasil diperbarui dan disinkronkan ke SIKAP.'
            : 'Personil baru berhasil ditambahkan dan didorong ke antrean verifikasi TU SIKAP.'
        }
      };
    });
  } catch (e) {
    Logger.log('[dir_save] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Penugasan Kategori Kepegawaian Massal (Batch Assign) ke 4 kategori baku + Push Sync SIKAP.
 */
function dir_batchAssign(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.KADIV, ROLE.SUPERADMIN], null);

      var ids = params.pegawaiIds || [];
      var kat = typeof normalizeAknKategori === 'function'
        ? normalizeAknKategori(params.kategoriKepegawaian || '')
        : String(params.kategoriKepegawaian || '').trim();
      if (!Array.isArray(ids) || ids.length === 0) {
        return { success: false, error: 'Pilih minimal satu personil awak kapal.' };
      }
      if (!kat) {
        return { success: false, error: 'Pilih kategori kepegawaian yang valid.' };
      }

      var sheet = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
      var rows = sheetToObjects(sheet);
      var updatedCount = 0;
      var now = new Date();
      var updStr = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

      for (var i = 0; i < rows.length; i++) {
        var pId = String(rows[i].PegawaiID || '');
        if (ids.indexOf(pId) !== -1) {
          var patch = {
            'KategoriKepegawaian': kat,
            'UpdatedAt': updStr,
            'UpdatedBy': session.userId
          };
          updateRowCells(sheet, i + 2, patch);
          rows[i].KategoriKepegawaian = kat;
          rows[i].UpdatedBy = session.userId;
          _pushAwakToSikap(rows[i], 'Perubahan massal kategori menjadi ' + kat);
          updatedCount++;
        }
      }

      if (typeof applyFormalSheetFormatting === 'function') {
        applyFormalSheetFormatting(sheet, SHEET_AWAK.MASTER_AWAK);
      }

      _auditLog(session.userId, 'BATCH_ASSIGN_AWAK', SHEET_AWAK.MASTER_AWAK, kat,
        'Penugasan kategori ' + kat + ' untuk ' + updatedCount + ' awak kapal');

      if (typeof akn_syncFromAwak === 'function') {
        try { akn_syncFromAwak(session.userId, 'Penugasan massal kategori ' + kat + ' (' + updatedCount + ' personil)'); } catch (eAkn) {}
      }

      return {
        success: true,
        data: {
          updatedCount: updatedCount,
          message: 'Berhasil memperbarui kategori ' + updatedCount + ' awak kapal menjadi ' + kat + '.'
        }
      };
    });
  } catch (e) {
    Logger.log('[dir_batchAssign] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Seeding otomatis dan idempoten 442 awak kapal armada PSDKP ke Master_Awak (21 kolom kanonik).
 */
function dir_ensureSeeded() {
  try {
    var sheet = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    _healMasterAwakKelasIfNeeded(sheet, []);
    var rows = sheetToObjects(sheet);

    if (typeof SEED_AWAK_ARMADA === 'undefined' || !Array.isArray(SEED_AWAK_ARMADA)) {
      Logger.log('[dir_ensureSeeded] SEED_AWAK_ARMADA tidak ditemukan.');
      return { success: false, error: 'Dataset SEED_AWAK_ARMADA tidak tersedia.' };
    }

    if (rows.length > 0) {
      var prevLen = rows.length;
      _healMasterAwakKelasIfNeeded(sheet, rows);
      var addedOnHeal = rows.length - prevLen;
      return {
        success: true,
        count: rows.length,
        added: addedOnHeal,
        message: addedOnHeal > 0
          ? ('Diselaraskan & ditambahkan ' + addedOnHeal + ' awak kapal baru.')
          : 'Data sudah terisi dan selaras.'
      };
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    var toInsert = [];

    SEED_AWAK_ARMADA.forEach(function (a) {
      var pId = String(a.pegawaiId || '');
      if (!pId || _NAKHODA_DUPLICATE_SEED_IDS[pId]) return;

      var rowObj = _buildMasterAwakRowObj(a, nowStr);
      toInsert.push(headers.map(function (h) {
        return rowObj[h] !== undefined ? rowObj[h] : '';
      }));
    });

    if (toInsert.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, toInsert.length, headers.length).setValues(toInsert);
      if (typeof applyFormalSheetFormatting === 'function') {
        applyFormalSheetFormatting(sheet, SHEET_AWAK.MASTER_AWAK);
      }
      Logger.log('[dir_ensureSeeded] Berhasil men-seed ' + toInsert.length + ' awak kapal armada.');
    }

    return { success: true, count: toInsert.length };
  } catch (e) {
    Logger.log('[dir_ensureSeeded] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mengidentifikasi personil yang berstatus NONAKTIF (termasuk yang keluar/dihapus dari SIKAP)
 * tetapi masih memiliki penempatan aktif pada TX_Penugasan_Kapal.
 */
function _getSikapOnboardConflicts(awakRowsOpt) {
  var conflicts = [];
  try {
    var rowsAwak = awakRowsOpt || sheetToObjects(openAwakSheet(SHEET_AWAK.MASTER_AWAK));
    var nonAktifById = {};
    rowsAwak.forEach(function (a) {
      var st = String(a.StatusAktif || 'AKTIF').toUpperCase().trim();
      if (st !== 'AKTIF') {
        nonAktifById[String(a.PegawaiID || '')] = {
          pegawaiId: String(a.PegawaiID || ''),
          nama: String(a.Nama || ''),
          nip: String(a.NIP || ''),
          statusAktif: st,
          catatan: String(a.Catatan || '')
        };
      }
    });
    if (Object.keys(nonAktifById).length === 0) return conflicts;

    var rowsTgs = sheetToObjects(openAwakSheet(SHEET_AWAK.PENUGASAN_KAPAL));
    var rowsKapal = sheetToObjects(openMasterSheet(SHEET_MASTER.KAPAL));
    var kapalNameMap = {};
    rowsKapal.forEach(function (k) {
      kapalNameMap[String(k.KapalID || '')] = String(k.NamaKapal || k.KapalID || '');
    });

    var todayStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
    rowsTgs.forEach(function (t) {
      if (String(t.Status || '').toUpperCase() !== ROW_STATUS.ACTIVE) return;
      var tglTurun = String(t.TanggalTurun || '').trim();
      if (tglTurun && tglTurun < todayStr) return;

      var pid = String(t.PegawaiID || '');
      var person = nonAktifById[pid];
      if (!person) return;

      var kId = String(t.KapalID || '');
      conflicts.push({
        pegawaiId: pid,
        nama: person.nama,
        nip: person.nip,
        kapalId: kId,
        namaKapal: kapalNameMap[kId] || kId,
        posSijil: String(t.PosSijil || ''),
        statusAktif: person.statusAktif,
        alasan: person.catatan || ('Status kepegawaian ' + person.statusAktif)
      });
    });
  } catch (eConf) {
    Logger.log('[_getSikapOnboardConflicts] ' + eConf.message);
  }
  return conflicts;
}

function dir_getOnboardConflicts() {
  return _getSikapOnboardConflicts(null);
}

function _getCurrentSikapAlerts(awakRowsOpt) {
  var saved = null;
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props ? props.getProperty(PROP_KEY.SIKAP_ALERTS) : '';
    if (raw) saved = JSON.parse(raw);
  } catch (e) {}

  var onboardConflicts = _getSikapOnboardConflicts(awakRowsOpt);
  var base = saved && typeof saved === 'object' ? saved : {
    dismissed: false,
    syncedAt: '',
    source: '',
    missingCount: 0,
    deactivatedCount: 0,
    affectedCrew: []
  };

  return {
    dismissed: Boolean(base.dismissed) && onboardConflicts.length === 0,
    syncedAt: base.syncedAt || '',
    source: base.source || '',
    missingCount: base.missingCount || 0,
    deactivatedCount: base.deactivatedCount || 0,
    affectedCrew: Array.isArray(base.affectedCrew) ? base.affectedCrew : [],
    onboardConflicts: onboardConflicts,
    hasAlert: (!base.dismissed && ((base.missingCount || 0) > 0 || (base.deactivatedCount || 0) > 0)) || onboardConflicts.length > 0
  };
}

function dir_dismissSikapAlerts(token) {
  try {
    var session = _requireSession(token);
    assertScope(session, [ROLE.SUPERADMIN, ROLE.KADIV, ROLE.STAF], null);

    var props = PropertiesService.getScriptProperties();
    var raw = props ? props.getProperty(PROP_KEY.SIKAP_ALERTS) : '';
    if (raw) {
      var obj = JSON.parse(raw);
      obj.dismissed = true;
      props.setProperty(PROP_KEY.SIKAP_ALERTS, JSON.stringify(obj));
    }
    return { success: true, data: _getCurrentSikapAlerts(null) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function _runSikapSyncCore(actorUserId, onlyIfExternalConfigured) {
  var props = PropertiesService.getScriptProperties();
  var sikapId = props.getProperty(PROP_KEY.SIKAP_SS_ID);

  if (onlyIfExternalConfigured && !sikapId) {
    return { success: true, data: { skipped: true, reason: 'SIKAP_SS_ID belum dikonfigurasi' } };
  }

  var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
  var awakRows = sheetToObjects(sheetAwak);
  _healMasterAwakKelasIfNeeded(sheetAwak, awakRows);

  // Lookup existing berdasarkan PegawaiID, NIP (18 digit), dan Nama Kanonik
  var awakMapByNip = {};
  var awakMapById = {};
  var awakMapByNama = {};
  awakRows.forEach(function (r, idx) {
    var cleanNip = String(r.NIP || '').replace(/[^0-9]/g, '');
    if (cleanNip) awakMapByNip[cleanNip] = { row: r, rowIndex: idx + 2 };
    var pId = String(r.PegawaiID || '').trim();
    if (pId) awakMapById[pId] = { row: r, rowIndex: idx + 2 };
    var cNama = typeof sanitizeNamaPersonel === 'function' ? sanitizeNamaPersonel(String(r.Nama || '')) : String(r.Nama || '').toUpperCase().trim();
    if (cNama) awakMapByNama[cNama] = { row: r, rowIndex: idx + 2 };
  });

  var sikapEmployees = [];
  var isSourceFromSheet = false;

  // 1. Baca dari Spreadsheet SIKAP khusus bila SIKAP_SS_ID tersedia
  if (sikapId) {
    try {
      var sikapSs = SpreadsheetApp.openById(sikapId);
      var sheetNames = ['Master_Pegawai_POA', 'Data_Pegawai', 'Pegawai', 'Master_Awak'];
      var sSheet = null;
      for (var i = 0; i < sheetNames.length; i++) {
        sSheet = sikapSs.getSheetByName(sheetNames[i]);
        if (sSheet) break;
      }
      if (!sSheet) sSheet = sikapSs.getSheets()[0];

      if (sSheet) {
        var rawSikap = sheetToObjects(sSheet);
        if (rawSikap && rawSikap.length > 0 && (rawSikap[0].Nama !== undefined || rawSikap[0].nama !== undefined || rawSikap[0].NIP !== undefined)) {
          sikapEmployees = rawSikap;
          isSourceFromSheet = true;
        }
      }
    } catch (eSs) {
      Logger.log('[_runSikapSyncCore] Gagal membuka spreadsheet SIKAP: ' + eSs.message);
    }
  }

  // 2. Fallback / Baseline ke SEED_AWAK_ARMADA bila spreadsheet SIKAP eksternal belum ditautkan
  if (!isSourceFromSheet) {
    if (typeof SEED_AWAK_ARMADA !== 'undefined' && Array.isArray(SEED_AWAK_ARMADA)) {
      sikapEmployees = SEED_AWAK_ARMADA.map(function (s) {
        return {
          NIP: s.nip,
          Nama: s.nama,
          KelompokJabatan: s.kelompokJabatan,
          JabatanLengkap: s.jabatanLengkap,
          PegawaiID: s.pegawaiId,
          Unit: s.unit || 'Armada Kapal Pengawas (Pusat)',
          TingkatKelas: s.tingkatKelas,
          Rumpun: s.rumpun,
          KategoriKepegawaian: _resolveAwakKategoriFromSeed(s, s.nip),
          KapalPenempatan: s.kapalId || '',
          StatusAktif: s.statusAktif || 'AKTIF'
        };
      });
    }
  }

  var now = new Date();
  var todayIso = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd');
  var updatedCount = 0;
  var addedCount = 0;
  var matchedCount = 0;
  var deactivatedList = [];
  var missingFromSikapList = [];
  var toAppend = [];

  var sikapNipSet = {};
  var sikapIdSet = {};
  var sikapNamaSet = {};
  var awakHeaders = sheetAwak.getRange(1, 1, 1, sheetAwak.getLastColumn()).getValues()[0];
  var nowTimestampStr = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

  sikapEmployees.forEach(function (emp) {
    var rawNip = String(emp.NIP || emp.nip || '').trim().replace(/[^0-9]/g, '');
    var pId = String(emp.PegawaiID || emp.pegawaiId || '').trim();
    var rawNama = String(emp.Nama || emp.nama || '').trim();
    var nama = typeof sanitizeNamaPersonel === 'function' ? sanitizeNamaPersonel(rawNama) : rawNama.toUpperCase();
    var jab = String(emp.JabatanLengkap || emp.jabatanLengkap || emp.KelompokJabatan || emp.kelompokJabatan || '').trim();
    var kelJab = String(emp.KelompokJabatan || emp.kelompokJabatan || '').trim();
    var rawStatus = String(emp.StatusAktif || emp.statusAktif || 'AKTIF').toUpperCase().trim();
    var isSikapActive = (rawStatus === 'AKTIF' || rawStatus === 'ACTIVE' || rawStatus === '');
    var normalizedStatus = isSikapActive ? 'AKTIF' : 'NONAKTIF';
    var unitStr = String(emp.PangkalanID || emp.pangkalanId || emp.UnitKerja || emp.Unit || emp.unit || '').trim();

    // Fokus cakupan: hanya awak kapal armada / AKP yang berkaitan dengan POA atau sudah terdaftar
    var lingkupEmp = String(emp.LingkupData || '').toUpperCase().trim();
    if (isSourceFromSheet && lingkupEmp && lingkupEmp !== 'AWAK_KAPAL_ARMADA' &&
        String(emp.StatusPenempatan || '').toUpperCase() !== 'DIPERBANTUKAN_UPT' &&
        !(pId && awakMapById[pId]) && !(rawNip && awakMapByNip[rawNip])) {
      return;
    }

    if (!nama) return;
    if (rawNip) sikapNipSet[rawNip] = true;
    if (pId) sikapIdSet[pId] = true;
    sikapNamaSet[nama] = true;

    var existing = (pId && awakMapById[pId]) ? awakMapById[pId]
      : ((rawNip && awakMapByNip[rawNip]) ? awakMapByNip[rawNip]
        : (awakMapByNama[nama] || null));

    if (existing) {
      matchedCount++;
      var r = existing.row;
      var needsUpdate = false;
      var patch = { 'UpdatedAt': nowTimestampStr, 'UpdatedBy': actorUserId };

      if (nama && r.Nama !== nama) { patch.Nama = nama; needsUpdate = true; }
      if (rawNip && String(r.NIP || '').replace(/[^0-9]/g, '') !== rawNip) { patch.NIP = rawNip; needsUpdate = true; }
      if (jab && r.JabatanLengkap !== jab) { patch.JabatanLengkap = jab; needsUpdate = true; }
      if (kelJab && r.KelompokJabatan !== kelJab) { patch.KelompokJabatan = kelJab; needsUpdate = true; }
      if (unitStr && !String(r.PangkalanID || '').trim()) { patch.PangkalanID = unitStr; needsUpdate = true; }
      if (emp.UkuranBaju && !r.UkuranBaju) { patch.UkuranBaju = String(emp.UkuranBaju); needsUpdate = true; }
      if (emp.UkuranSepatu && !r.UkuranSepatu) { patch.UkuranSepatu = String(emp.UkuranSepatu); needsUpdate = true; }

      var prevSt = String(r.StatusAktif || 'AKTIF').toUpperCase().trim();
      if (normalizedStatus !== prevSt) {
        patch.StatusAktif = normalizedStatus;
        needsUpdate = true;
        if (prevSt === 'AKTIF' && normalizedStatus !== 'AKTIF') {
          patch.Catatan = '[SIKAP ' + todayIso + '] Status berubah menjadi ' + rawStatus;
          deactivatedList.push({
            pegawaiId: String(r.PegawaiID || ''),
            nama: nama,
            nip: rawNip,
            reason: 'Status SIKAP: ' + rawStatus
          });
        }
      }

      var rawKat = String(emp.KategoriKepegawaian || emp.kategori || emp.StatusKepegawaian || '').trim();
      var normKat = rawKat ? (typeof normalizeAknKategori === 'function' ? normalizeAknKategori(rawKat) : rawKat) : '';
      if (/^\d{12}21\d{4}$/.test(rawNip) && (!normKat || normKat === 'PNS')) {
        normKat = 'P3K';
      }
      if (normKat && r.KategoriKepegawaian !== normKat) {
        patch.KategoriKepegawaian = normKat;
        needsUpdate = true;
      }
      if ((emp.KapalPenempatan || emp.KapalID) && !String(r.KapalID || '').trim()) {
        patch.KapalID = String(emp.KapalPenempatan || emp.KapalID);
        needsUpdate = true;
      }

      var syncedKelas = normalizeKelasKapal(emp.TingkatKelas || emp.tingkatKelas || r.KelasKapal, jab || r.JabatanLengkap);
      if (syncedKelas !== 'NON_KAPAL' && String(r.KelasKapal || '').toUpperCase().trim() !== syncedKelas) {
        patch.KelasKapal = syncedKelas;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updateRowCells(sheetAwak, existing.rowIndex, patch);
        updatedCount++;
      }
    } else {
      var newId = pId || ('PEG-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase());
      var kelas = normalizeKelasKapal(emp.TingkatKelas || emp.tingkatKelas, jab);
      var rmp = String(emp.Rumpun || emp.rumpun || emp.KategoriRumpun || extractRumpunAwak(jab));
      if (rmp.indexOf('AWAK_') === 0) rmp = rmp.substring(5);
      var rawKatBaru = String(emp.KategoriKepegawaian || emp.kategori || emp.StatusKepegawaian || 'PNS').trim();
      var katBaru = typeof normalizeAknKategori === 'function' ? normalizeAknKategori(rawKatBaru) : rawKatBaru;
      if (/^\d{12}21\d{4}$/.test(rawNip) && (!katBaru || katBaru === 'PNS')) {
        katBaru = 'P3K';
      }
      var newObj = {
        PegawaiID: newId,
        NIP: katBaru === 'PJLP' ? '' : rawNip,
        Nama: nama,
        KelompokJabatan: kelJab || 'Kelasi',
        JabatanLengkap: jab || kelJab || 'Awak Kapal Pengawas',
        KelasKapal: kelas || 'NON_KAPAL',
        Rumpun: rmp || 'DEK',
        KategoriKepegawaian: katBaru || 'PNS',
        StatusAktif: normalizedStatus,
        StatusPenempatan: _inferStatusPenempatan(unitStr, emp.StatusPenempatan),
        PangkalanID: unitStr,
        KapalID: String(emp.KapalPenempatan || emp.KapalID || ''),
        TanggalMulaiKerja: String(emp.TanggalMulai || ''),
        TanggalSelesaiKontrak: String(emp.TanggalSelesai || ''),
        NomorSKPenempatan: '',
        DokumenPenempatanURL: String(emp.DokumenSK_URL || ''),
        UkuranBaju: String(emp.UkuranBaju || ''),
        UkuranSepatu: String(emp.UkuranSepatu || ''),
        Catatan: 'Sinkronisasi SIKAP: ' + (isSourceFromSheet ? 'Spreadsheet Master' : 'Dataset Resmi'),
        UpdatedAt: nowTimestampStr,
        UpdatedBy: actorUserId
      };
      toAppend.push(awakHeaders.map(function (h) {
        return newObj[h] !== undefined ? newObj[h] : '';
      }));
      addedCount++;
    }
  });

  if (toAppend.length > 0) {
    var startRow = sheetAwak.getLastRow() + 1;
    sheetAwak.getRange(startRow, 1, toAppend.length, awakHeaders.length).setValues(toAppend);
  }

  // 2B. Deteksi pegawai aktif di Master_Awak yang dihapus ("di-kick") dari sheet SIKAP
  if (isSourceFromSheet && sikapEmployees.length > 0 && sikapEmployees.length >= Math.floor(awakRows.length * 0.3)) {
    awakRows.forEach(function (r, idx) {
      var st = String(r.StatusAktif || 'AKTIF').toUpperCase().trim();
      if (st !== 'AKTIF') return;

      var cNip = String(r.NIP || '').replace(/[^0-9]/g, '');
      var cId = String(r.PegawaiID || '').trim();
      var cNama = typeof sanitizeNamaPersonel === 'function' ? sanitizeNamaPersonel(String(r.Nama || '')) : String(r.Nama || '').toUpperCase().trim();
      var foundInSikap = (cId && sikapIdSet[cId]) || (cNip && sikapNipSet[cNip]) || (cNama && sikapNamaSet[cNama]);
      if (!foundInSikap) {
        updateRowCells(sheetAwak, idx + 2, {
          'StatusAktif': 'NONAKTIF',
          'Catatan': '[KELUAR SIKAP ' + todayIso + '] Tidak lagi terdaftar di data kepegawaian SIKAP',
          'UpdatedAt': nowTimestampStr,
          'UpdatedBy': actorUserId
        });
        missingFromSikapList.push({
          pegawaiId: cId,
          nama: String(r.Nama || ''),
          nip: cNip,
          reason: 'Dihapus / keluar dari master SIKAP'
        });
      }
    });
  }

  // 3. Sinkronisasi Data Sertifikasi & Diklat dari SIKAP jika lembar sertifikat tersedia
  var certSyncedCount = 0;
  if (sikapId && isSourceFromSheet) {
    try {
      var sikapSsCert = SpreadsheetApp.openById(sikapId);
      var certSheetNames = ['TX_TU_Pelatihan_Pegawai', 'Riwayat_Diklat', 'Sertifikasi', 'Data_Sertifikat', 'Pelatihan', 'Diklat_Pegawai', 'TX_Pelatihan_Awak'];
      var sCertSheet = null;
      for (var c = 0; c < certSheetNames.length; c++) {
        sCertSheet = sikapSsCert.getSheetByName(certSheetNames[c]);
        if (sCertSheet) break;
      }

      if (sCertSheet) {
        var rawCerts = sheetToObjects(sCertSheet);
        if (rawCerts && rawCerts.length > 0) {
          var sheetSrt = openAwakSheet(SHEET_AWAK.PELATIHAN_AWAK);
          var existingSrt = sheetToObjects(sheetSrt);

          var certIndex = {};
          existingSrt.forEach(function (s, sIdx) {
            if (String(s.Status || '').toUpperCase() === ROW_STATUS.ACTIVE) {
              var epId = String(s.PegawaiID || '');
              var ekd = String(s.KodePelatihan || '');
              var eno = String(s.NomorSertifikat || '');
              if (epId && ekd) certIndex[epId + '::' + ekd] = { row: s, rowIndex: sIdx + 2 };
              if (epId && eno && eno !== '-') certIndex[epId + '::' + eno] = { row: s, rowIndex: sIdx + 2 };
            }
          });

          var freshAwakForCert = sheetToObjects(sheetAwak);
          var nipToPid = {};
          freshAwakForCert.forEach(function (a) {
            var cNip = String(a.NIP || '').replace(/[^0-9]/g, '');
            if (cNip) nipToPid[cNip] = String(a.PegawaiID || '');
            var pid = String(a.PegawaiID || '');
            if (pid) nipToPid[pid] = pid;
          });

          var certsToAppend = [];
          rawCerts.forEach(function (c) {
            var cNip = String(c.NIP || c.nip || '').trim().replace(/[^0-9]/g, '');
            var cPid = String(c.PegawaiID || c.pegawaiId || '').trim();
            var targetPid = cPid ? (nipToPid[cPid] || cPid) : (cNip ? nipToPid[cNip] : '');
            if (!targetPid) return;

            var namaPel = String(c.NamaPelatihan || c.Nama_Pelatihan || c.Nama_Diklat || c.NamaDiklat || c.NamaSertifikat || c.Jenis_Diklat || '').trim();
            var kdPel = String(c.KodePelatihan || c.Kode_Pelatihan || c.Kode || '').trim();
            if (!kdPel && namaPel) {
              kdPel = 'TRN-' + namaPel.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 18);
            }
            if (!kdPel && !namaPel) return;
            if (!namaPel) namaPel = kdPel;

            var noSert = String(c.NomorSertifikat || c.Nomor_Sertifikat || c.NoSertifikat || c.No_Sertifikat || '-').trim();
            var tglTerbit = String(c.TanggalTerbit || c.Tanggal_Terbit || c.Tgl_Sertifikat || '').trim();
            var berlakuSampai = String(c.BerlakuSampai || c.Tanggal_Kedaluwarsa || c.Tgl_Expired || c.Masa_Berlaku || '').trim();
            var lembaga = String(c.PenerbitLembaga || c.Penyelenggara || c.Lembaga || 'Pusdiklat / Balai KKP').trim();
            var thn = parseInt(c.TahunPelatihan || c.Tahun || (tglTerbit ? tglTerbit.substring(0, 4) : now.getFullYear()), 10) || now.getFullYear();

            var key1 = targetPid + '::' + kdPel;
            var key2 = targetPid + '::' + noSert;
            var existingC = certIndex[key1] || (noSert !== '-' ? certIndex[key2] : null);

            if (existingC) {
              var ex = existingC.row;
              var cPatch = { 'UpdatedAt': now, 'UpdatedBy': actorUserId };
              var cNeeds = false;
              if (noSert && noSert !== '-' && ex.NomorSertifikat !== noSert) { cPatch.NomorSertifikat = noSert; cNeeds = true; }
              if (berlakuSampai && ex.BerlakuSampai !== berlakuSampai) { cPatch.BerlakuSampai = berlakuSampai; cNeeds = true; }
              if (tglTerbit && ex.TanggalTerbit !== tglTerbit) { cPatch.TanggalTerbit = tglTerbit; cNeeds = true; }
              if (cNeeds) {
                updateRowCells(sheetSrt, existingC.rowIndex, cPatch);
                certSyncedCount++;
              }
            } else {
              var newRowId = 'AWAK-SRT-' + Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();
              var periode = getPeriodeFromDate(tglTerbit || todayIso);
              certsToAppend.push([
                newRowId, DIVISI_ID.AWAK, periode, actorUserId, now, ROW_STATUS.ACTIVE,
                '', '', '', '', targetPid, kdPel, namaPel, 'SUDAH_LULUS',
                noSert, thn, tglTerbit, berlakuSampai, lembaga, ''
              ]);
              certSyncedCount++;
            }
          });

          if (certsToAppend.length > 0) {
            var sStart = sheetSrt.getLastRow() + 1;
            sheetSrt.getRange(sStart, 1, certsToAppend.length, certsToAppend[0].length).setValues(certsToAppend);
          }
        }
      }
    } catch (eCert) {
      Logger.log('[_runSikapSyncCore] Info: Gagal sinkronisasi sertifikat SIKAP: ' + eCert.message);
    }
  }

  var freshAwakAll = sheetToObjects(sheetAwak);
  var onboardConflicts = _getSikapOnboardConflicts(freshAwakAll);
  var combinedAffected = deactivatedList.concat(missingFromSikapList).slice(0, 20);

  if (deactivatedList.length > 0 || missingFromSikapList.length > 0 || onboardConflicts.length > 0) {
    try {
      props.setProperty(PROP_KEY.SIKAP_ALERTS, JSON.stringify({
        dismissed: false,
        syncedAt: now.toISOString(),
        source: isSourceFromSheet ? 'SPREADSHEET_SIKAP' : 'SEED_BASELINE_SIKAP',
        missingCount: missingFromSikapList.length,
        deactivatedCount: deactivatedList.length,
        affectedCrew: combinedAffected
      }));
    } catch (eProp) {}
  }

  try { props.setProperty(PROP_KEY.SIKAP_LAST_SYNC, now.toISOString()); } catch (eLs) {}

  _auditLog(actorUserId, 'SYNC_SIKAP', SHEET_AWAK.MASTER_AWAK, 'SYNC',
    'Sinkronisasi SIKAP: ' + matchedCount + ' cocok, ' + updatedCount + ' mutakhir, ' + addedCount + ' baru, ' +
    deactivatedList.length + ' nonaktif di SIKAP, ' + missingFromSikapList.length + ' hilang/keluar dari SIKAP, ' +
    onboardConflicts.length + ' konflik Sijil kapal, ' + certSyncedCount + ' sertifikat.');

  if (typeof akn_syncFromAwak === 'function') {
    try {
      akn_syncFromAwak(actorUserId, 'Sinkronisasi SIKAP: ' + updatedCount + ' mutasi, ' + addedCount + ' baru, ' +
        (deactivatedList.length + missingFromSikapList.length) + ' keluar/nonaktif');
    } catch (eAkn) {}
  }

  return {
    success: true,
    data: {
      source: isSourceFromSheet ? 'SPREADSHEET_SIKAP' : 'SEED_BASELINE_SIKAP',
      totalSikap: sikapEmployees.length,
      matched: matchedCount,
      updated: updatedCount,
      added: addedCount,
      deactivatedCount: deactivatedList.length,
      missingCount: missingFromSikapList.length,
      sertifikatSynced: certSyncedCount,
      onboardConflicts: onboardConflicts,
      sikapAlerts: _getCurrentSikapAlerts(freshAwakAll),
      timestamp: now.toISOString()
    }
  };
}

function dir_syncSikap(tokenOrParams) {
  try {
    return withLock(function () {
      var token = typeof tokenOrParams === 'string' ? tokenOrParams : (tokenOrParams && tokenOrParams.token ? tokenOrParams.token : '');
      var session = _requireSession(token);
      assertScope(session, [ROLE.SUPERADMIN, ROLE.KADIV], null);
      return _runSikapSyncCore(session.userId, false);
    });
  } catch (e) {
    Logger.log('[dir_syncSikap] ' + e.message);
    return { success: false, error: e.message };
  }
}

function dir_runScheduledSikapSync() {
  try {
    return withLock(function () {
      return _runSikapSyncCore('SYSTEM_CRON_SIKAP', true);
    });
  } catch (e) {
    Logger.log('[dir_runScheduledSikapSync] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Alias untuk kepatuhan ARCHITECTURE.md §3.4
 */
function dir_importDariSikap(tokenOrParams, extraParams) {
  return dir_syncSikap(tokenOrParams);
}


