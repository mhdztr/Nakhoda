/**
 * services/SijilService.js
 * Sub-Modul E: Penugasan Kapal & Matriks Papan Sijil (Safe Manning)
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

/**
 * Mengambil ringkasan kelaikan papan sijil seluruh kapal pengawas armada PSDKP.
 *
 * @param {string} token
 */
function sijil_getPapanArmada(token) {
  try {
    var session = _requireSession(token);
    if (typeof dir_ensureSeeded === 'function') dir_ensureSeeded();
    sijil_ensureStandarManningSeeded();
    sijil_ensurePenugasanSeeded();

    var sheetKapal = openMasterSheet(SHEET_MASTER.KAPAL);
    var rowsKapal = sheetToObjects(sheetKapal);

    var sheetManning = openAwakSheet(SHEET_AWAK.MASTER_SAFE_MANNING);
    var rowsManning = sheetToObjects(sheetManning);

    var sheetTgs = openAwakSheet(SHEET_AWAK.PENUGASAN_KAPAL);
    var rowsTgs = sheetToObjects(sheetTgs);

    var now = new Date();
    var todayStr = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd');

    // Saring penugasan aktif (Status ACTIVE & TanggalTurun kosong atau >= today)
    var activeByKapal = {};
    rowsTgs.forEach(function (t) {
      if (String(t.Status || '').toUpperCase() !== ROW_STATUS.ACTIVE) return;
      var tglTurun = String(t.TanggalTurun || '').trim();
      if (tglTurun && tglTurun < todayStr) return; // sudah turun kapal

      var kId = String(t.KapalID || '');
      if (!activeByKapal[kId]) activeByKapal[kId] = [];
      activeByKapal[kId].push(t);
    });

    // Kelompokkan standar manning per kelas kapal
    var manningByKelas = {};
    rowsManning.forEach(function (m) {
      var kls = String(m.KelasKapal || '').toUpperCase();
      if (!manningByKelas[kls]) manningByKelas[kls] = [];
      manningByKelas[kls].push(m);
    });

    var countLaik = 0;
    var countKurang = 0;
    var countKritis = 0;
    var totalAwakBertugas = 0;
    var totalKekuranganKursi = 0;

    var kapalEvaluasi = rowsKapal.map(function (k) {
      var kId = String(k.KapalID || '');
      var kls = String(k.KelasKapal || 'KELAS_II').toUpperCase();
      var activeTgs = activeByKapal[kId] || [];
      var stds = manningByKelas[kls] || [];

      var evalRes = evaluateSafeManning(stds, activeTgs);
      var mapRincian = {};
      (evalRes.posisiRincian || []).forEach(function (r) {
        mapRincian[r.posSijil] = r;
      });

      function aggregateGroup(tokens) {
        var min = 0;
        var terisi = 0;
        tokens.forEach(function (tk) {
          if (mapRincian[tk]) {
            min += mapRincian[tk].minimum;
            terisi += mapRincian[tk].terisi;
          }
        });
        return {
          min: min,
          terisi: terisi,
          selisih: terisi - min,
          kurang: Math.max(0, min - terisi)
        };
      }

      var matrixCols = {
        nakhoda: aggregateGroup(['NAKHODA']),
        mualim: aggregateGroup(['MUALIM_I', 'MUALIM_II', 'MUALIM_III']),
        kkm: aggregateGroup(['KKM']),
        masinis: aggregateGroup(['MASINIS_I', 'MASINIS_II', 'MASINIS_III']),
        markonis: aggregateGroup(['MARKONIS']),
        serang: aggregateGroup(['SERANG']),
        juruMudi: aggregateGroup(['JURU_MUDI']),
        kelasi: aggregateGroup(['KELASI']),
        juruMinyak: aggregateGroup(['JURU_MINYAK'])
      };

      var kurangKapal = 0;
      var hasCriticalCol = false;
      Object.keys(matrixCols).forEach(function (colKey) {
        var c = matrixCols[colKey];
        if (c.selisih < 0) kurangKapal += Math.abs(c.selisih);
        if (c.selisih <= -2) hasCriticalCol = true;
      });

      totalKekuranganKursi += kurangKapal;
      totalAwakBertugas += evalRes.totalTerisi;

      if (evalRes.isLaikOperasi && kurangKapal === 0) {
        countLaik++;
      } else {
        countKurang++;
        if (hasCriticalCol || kurangKapal >= 2) {
          countKritis++;
        }
      }

      return {
        kapalId: kId,
        namaKapal: String(k.NamaKapal || kId),
        jenisKapal: String(k.JenisKapal || 'Kapal Pengawas'),
        kelasKapal: kls,
        pangkalanId: String(k.PangkalanID || '-'),
        evaluasi: evalRes,
        matrixCols: matrixCols,
        jumlahAwakBertugas: evalRes.totalTerisi,
        kebutuhanMinimum: evalRes.totalKebutuhan,
        kekuranganKursi: kurangKapal,
        persenTerisi: evalRes.persenTerisi,
        statusOperasi: (evalRes.isLaikOperasi && kurangKapal === 0) ? 'LAIK_OPERASI' : 'KURANG_AWAK'
      };
    });

    return {
      success: true,
      data: {
        metrics: {
          totalKapal: rowsKapal.length,
          laikOperasi: countLaik,
          kurangAwak: countKurang,
          kritis: countKritis,
          totalAwakBertugas: totalAwakBertugas,
          totalKekuranganKursi: totalKekuranganKursi
        },
        kapal: kapalEvaluasi,
        userRole: session.role
      }
    };
  } catch (e) {
    Logger.log('[sijil_getPapanArmada] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mengambil detail papan sijil dan penugasan aktif satu kapal tertentu.
 *
 * @param {string} token
 * @param {string} kapalId
 */
function sijil_getDetailKapal(token, kapalId) {
  try {
    var session = _requireSession(token);
    var kId = String(kapalId || '').trim();
    if (!kId) return { success: false, error: 'KapalID tidak valid.' };

    var sheetKapal = openMasterSheet(SHEET_MASTER.KAPAL);
    var foundKapal = findRowByField(sheetKapal, 'KapalID', kId);
    if (!foundKapal) return { success: false, error: 'Kapal tidak ditemukan.' };

    var k = foundKapal.obj;
    var kls = String(k.KelasKapal || 'KELAS_II').toUpperCase();

    var sheetManning = openAwakSheet(SHEET_AWAK.MASTER_SAFE_MANNING);
    var stds = sheetToObjects(sheetManning).filter(function (m) {
      return String(m.KelasKapal || '').toUpperCase() === kls;
    });

    var sheetTgs = openAwakSheet(SHEET_AWAK.PENUGASAN_KAPAL);
    var now = new Date();
    var todayStr = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd');

    var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var rowsAwak = sheetToObjects(sheetAwak);
    var awakMap = {};
    rowsAwak.forEach(function (a) {
      awakMap[String(a.PegawaiID || '')] = a;
    });

    var activePenugasan = sheetToObjects(sheetTgs)
      .filter(function (t) {
        if (String(t.KapalID || '') !== kId) return false;
        if (String(t.Status || '').toUpperCase() !== ROW_STATUS.ACTIVE) return false;
        var tglTurun = String(t.TanggalTurun || '').trim();
        return !tglTurun || tglTurun >= todayStr;
      })
      .map(function (t) {
        var pId = String(t.PegawaiID || '');
        var awk = awakMap[pId] || {};
        var posToken = normalizePosSijil(t.PosSijil);

        return {
          rowId: String(t.RowID || ''),
          pegawaiId: pId,
          nama: String(awk.Nama || pId),
          nipDisplay: maskNip(String(awk.NIP || ''), session.role === ROLE.SUPERADMIN || session.role === ROLE.KADIV),
          posSijil: posToken,
          posSijilLabel: posToken.replace(/_/g, ' '),
          rumpun: String(awk.Rumpun || 'DEK'),
          tanggalNaik: String(t.TanggalNaik || ''),
          tanggalTurun: String(t.TanggalTurun || ''),
          keterangan: String(t.Keterangan || '')
        };
      });

    var evalRes = evaluateSafeManning(stds, activePenugasan);

    return {
      success: true,
      data: {
        kapalId: kId,
        namaKapal: String(k.NamaKapal || kId),
        jenisKapal: String(k.JenisKapal || 'Kapal Pengawas'),
        kelasKapal: kls,
        pangkalanId: String(k.PangkalanID || '-'),
        evaluasi: evalRes,
        awakBertugas: activePenugasan,
        userRole: session.role
      }
    };
  } catch (e) {
    Logger.log('[sijil_getDetailKapal] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Menempatkan personil awak ke atas kapal (Penugasan Sijil Baru).
 * Jika awak tersebut aktif di kapal lain, turunkan dari kapal lama secara otomatis.
 *
 * @param {Object} params
 */
function sijil_assignAwak(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.STAF, ROLE.KADIV, ROLE.SUPERADMIN], null);

      var pId = String(params.pegawaiId || '').trim();
      var kId = String(params.kapalId || '').trim();
      var pos = normalizePosSijil(params.posSijil);
      var tglNaik = String(params.tanggalNaik || '').trim();

      if (!pId) return { success: false, error: 'Pilih personil awak kapal.' };
      if (!kId) return { success: false, error: 'Pilih kapal tujuan.' };
      if (!tglNaik) return { success: false, error: 'Tanggal naik kapal wajib ditentukan.' };

      var now = new Date();
      var sheetTgs = openAwakSheet(SHEET_AWAK.PENUGASAN_KAPAL);
      var rowsTgs = sheetToObjects(sheetTgs);

      // Cek apakah ada penugasan aktif lama di kapal mana pun
      for (var i = 0; i < rowsTgs.length; i++) {
        var t = rowsTgs[i];
        if (String(t.PegawaiID || '') === pId && String(t.Status || '').toUpperCase() === ROW_STATUS.ACTIVE) {
          var tTurun = String(t.TanggalTurun || '').trim();
          if (!tTurun || tTurun > tglNaik) {
            // Turunkan dari kapal lama per tanggal naik baru
            updateRowCells(sheetTgs, i + 2, {
              'TanggalTurun': tglNaik,
              'Keterangan': (String(t.Keterangan || '') + ' [Rotasi ke ' + kId + ']').trim()
            });
          }
        }
      }

      var newRowId = 'AWAK-TGS-' + Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();
      var periode = getPeriodeFromDate(tglNaik);

      appendRowData(sheetTgs, {
        'RowID': newRowId,
        'DivisiID': DIVISI_ID.AWAK,
        'Periode': periode,
        'SubmittedBy': session.userId,
        'Timestamp': now,
        'Status': ROW_STATUS.ACTIVE,
        'SupersedesRowID': '',
        'VoidReason': '',
        'VoidedBy': '',
        'VoidedAt': '',
        'PegawaiID': pId,
        'KapalID': kId,
        'PosSijil': pos,
        'TanggalNaik': tglNaik,
        'TanggalTurun': '',
        'Keterangan': String(params.keterangan || '').trim()
      });

      // Update penempatan KapalID di Master_Awak
      var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
      var foundAwak = findRowByField(sheetAwak, 'PegawaiID', pId);
      if (foundAwak) {
        updateRowCells(sheetAwak, foundAwak.rowIndex, {
          'KapalID': kId,
          'UpdatedAt': now,
          'UpdatedBy': session.userId
        });
      }

      _auditLog(session.userId, 'ASSIGN_SIJIL', SHEET_AWAK.PENUGASAN_KAPAL, newRowId,
        'Penempatan ' + pId + ' di ' + kId + ' sebagai ' + pos);

      return {
        success: true,
        data: {
          rowId: newRowId,
          message: 'Personil berhasil ditempatkan pada papan sijil ' + kId + '.'
        }
      };
    });
  } catch (e) {
    Logger.log('[sijil_assignAwak] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Menurunkan personil dari kapal (Purna Penugasan).
 *
 * @param {Object} params
 */
function sijil_unassignAwak(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.STAF, ROLE.KADIV, ROLE.SUPERADMIN], null);

      var rowId = String(params.rowId || '').trim();
      var pId = String(params.pegawaiId || '').trim();
      var tglTurun = String(params.tanggalTurun || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd')).trim();

      if (!rowId) return { success: false, error: 'RowID penugasan tidak valid.' };

      var sheetTgs = openAwakSheet(SHEET_AWAK.PENUGASAN_KAPAL);
      var found = findRowByField(sheetTgs, 'RowID', rowId);
      if (!found) return { success: false, error: 'Data penugasan kapal tidak ditemukan.' };

      var now = new Date();
      updateRowCells(sheetTgs, found.rowIndex, {
        'TanggalTurun': tglTurun,
        'Keterangan': (String(found.obj.Keterangan || '') + ' [Turun kapal ' + tglTurun + ']').trim()
      });

      // Lepaskan KapalID di Master_Awak
      if (pId) {
        var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
        var foundAwak = findRowByField(sheetAwak, 'PegawaiID', pId);
        if (foundAwak) {
          updateRowCells(sheetAwak, foundAwak.rowIndex, {
            'KapalID': '',
            'UpdatedAt': now,
            'UpdatedBy': session.userId
          });
        }
      }

      _auditLog(session.userId, 'UNASSIGN_SIJIL', SHEET_AWAK.PENUGASAN_KAPAL, rowId,
        'Turun kapal ' + pId + ' per ' + tglTurun);

      return {
        success: true,
        data: { message: 'Personil berhasil diturunkan dari penugasan kapal.' }
      };
    });
  } catch (e) {
    Logger.log('[sijil_unassignAwak] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Seeding otomatis dan idempoten Master_SafeManning dan Master_Kapal.
 */
function sijil_ensureStandarManningSeeded() {
  try {
    // 1. Seed Master_SafeManning
    var sheetManning = openAwakSheet(SHEET_AWAK.MASTER_SAFE_MANNING);
    var rowsM = sheetToObjects(sheetManning);
    if (rowsM.length < 20 && typeof SEED_SAFE_MANNING !== 'undefined') {
      var toInsertM = SEED_SAFE_MANNING.map(function (s) {
        return [
          s.manningId,
          s.kelasKapal,
          s.posSijil,
          s.minimum,
          '2026-01-01',
          s.sumber
        ];
      });
      if (toInsertM.length > 0) {
        var startM = sheetManning.getLastRow() + 1;
        sheetManning.getRange(startM, 1, toInsertM.length, toInsertM[0].length).setValues(toInsertM);
        Logger.log('[sijil_ensureStandarManningSeeded] Master_SafeManning berhasil di-seed.');
      }
    }

    // 2. Seed Master_Kapal
    var sheetKapal = openMasterSheet(SHEET_MASTER.KAPAL);
    var rowsK = sheetToObjects(sheetKapal);
    if (rowsK.length < 10 && typeof SEED_KAPAL_ARMADA !== 'undefined') {
      var toInsertK = SEED_KAPAL_ARMADA.map(function (k) {
        return [
          k.kapalId,
          k.namaKapal,
          k.jenisKapal,
          k.kelasKapal,
          k.pangkalanId,
          k.statusOperasi
        ];
      });
      if (toInsertK.length > 0) {
        var startK = sheetKapal.getLastRow() + 1;
        sheetKapal.getRange(startK, 1, toInsertK.length, toInsertK[0].length).setValues(toInsertK);
        Logger.log('[sijil_ensureStandarManningSeeded] Master_Kapal berhasil di-seed.');
      }
    }
  } catch (e) {
    Logger.log('[sijil_ensureStandarManningSeeded] ' + e.message);
  }
}

/**
 * Seeding otomatis penugasan sijil awal ke TX_Penugasan_Kapal jika kosong.
 */
function sijil_ensurePenugasanSeeded() {
  try {
    var sheetTgs = openAwakSheet(SHEET_AWAK.PENUGASAN_KAPAL);
    if (sheetTgs.getLastRow() > 1) return;

    var sheetKapal = openMasterSheet(SHEET_MASTER.KAPAL);
    var rowsKapal = sheetToObjects(sheetKapal);
    var sheetManning = openAwakSheet(SHEET_AWAK.MASTER_SAFE_MANNING);
    var rowsManning = sheetToObjects(sheetManning);
    var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var rowsAwak = sheetToObjects(sheetAwak);

    if (rowsKapal.length === 0 || rowsManning.length === 0 || rowsAwak.length === 0) return;

    var manningByKelas = {};
    rowsManning.forEach(function (m) {
      var kls = String(m.KelasKapal || '').toUpperCase();
      if (!manningByKelas[kls]) manningByKelas[kls] = [];
      manningByKelas[kls].push(m);
    });

    // Defisit sengaja pada 4 kapal untuk simulasi operasional nyata:
    // KP-ORCA-04: kurang 1 MASINIS_II, kurang 2 JURU_MUDI (-2 kritis)
    // KP-HIU-02: kurang 1 MUALIM_II, kurang 1 JURU_MINYAK
    // KP-HIU-14: kurang 2 JURU_MUDI (-2 kritis)
    // KP-PAUS-01: kurang 1 MASINIS_I
    var deficitRules = {
      'KP-ORCA-04': { 'MASINIS_II': 1, 'JURU_MUDI': 2 },
      'KP-HIU-02':  { 'MUALIM_II': 1, 'JURU_MINYAK': 1 },
      'KP-HIU-14':  { 'JURU_MUDI': 2 },
      'KP-PAUS-01': { 'MASINIS_I': 1 }
    };

    var now = new Date();
    var periode = getCurrentPeriode();
    var awakCursor = 0;
    var toInsert = [];

    rowsKapal.forEach(function (k, kIdx) {
      var kId = String(k.KapalID || '');
      var kls = String(k.KelasKapal || 'KELAS_II').toUpperCase();
      var stds = manningByKelas[kls] || [];
      var defMap = deficitRules[kId] || {};

      stds.forEach(function (std) {
        var pos = String(std.PosSijil || '');
        var minCount = parseInt(std.Minimum, 10) || 0;
        var reduceBy = defMap[pos] || 0;
        var fillCount = Math.max(0, minCount - reduceBy);

        for (var c = 0; c < fillCount; c++) {
          var awk = rowsAwak[awakCursor % rowsAwak.length];
          awakCursor++;
          var pId = String(awk.PegawaiID || '');
          var rId = 'AWAK-TGS-SEED-' + String(kIdx + 1) + '-' + pos + '-' + String(c + 1);

          toInsert.push([
            rId,
            DIVISI_ID.AWAK,
            periode,
            'SYSTEM_SEED',
            now,
            ROW_STATUS.ACTIVE,
            '',
            '',
            '',
            '',
            pId,
            kId,
            pos,
            '2026-01-15',
            '',
            'Penugasan Sijil Awal Armada'
          ]);
        }
      });
    });

    if (toInsert.length > 0) {
      var startRow = sheetTgs.getLastRow() + 1;
      sheetTgs.getRange(startRow, 1, toInsert.length, toInsert[0].length).setValues(toInsert);
      Logger.log('[sijil_ensurePenugasanSeeded] Berhasil men-seed ' + toInsert.length + ' penugasan kapal.');
    }
  } catch (e) {
    Logger.log('[sijil_ensurePenugasanSeeded] ' + e.message);
  }
}

