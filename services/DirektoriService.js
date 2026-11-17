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
function _healMasterAwakKelasIfNeeded(sheet, rows) {
  if (!sheet || !rows || rows.length === 0) return;
  var hasHealKelas = false;
  var hasHealPangkalan = false;

  // Map pangkalan/unit baseline dari SEED_AWAK_ARMADA bila PangkalanID masih kosong
  var seedUnitById = {};
  if (typeof SEED_AWAK_ARMADA !== 'undefined' && Array.isArray(SEED_AWAK_ARMADA)) {
    SEED_AWAK_ARMADA.forEach(function (s) {
      if (s.pegawaiId && s.unit) seedUnitById[String(s.pegawaiId)] = String(s.unit);
    });
  }

  rows.forEach(function (r) {
    var cur = String(r.KelasKapal || '').toUpperCase().trim();
    var jab = String(r.JabatanLengkap || r.KelompokJabatan || '');
    var extracted = extractKelasKapal(jab);
    if (extracted !== 'NON_KAPAL' && (
      !cur ||
      cur === 'NON_JENJANG' ||
      cur === 'NON_KAPAL' ||
      (cur === 'KELAS_I' && extracted !== 'KELAS_I')
    )) {
      r.KelasKapal = extracted;
      hasHealKelas = true;
    }

    var pId = String(r.PegawaiID || '').trim();
    if (!String(r.PangkalanID || '').trim() && pId && seedUnitById[pId]) {
      r.PangkalanID = seedUnitById[pId];
      hasHealPangkalan = true;
    }
  });

  if (hasHealKelas || hasHealPangkalan) {
    try {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (hasHealKelas) {
        var colIdx = headers.indexOf('KelasKapal');
        if (colIdx !== -1) {
          sheet.getRange(2, colIdx + 1, rows.length, 1).setValues(rows.map(function (r) {
            return [String(r.KelasKapal || 'NON_KAPAL')];
          }));
        }
      }
      if (hasHealPangkalan) {
        var pColIdx = headers.indexOf('PangkalanID');
        if (pColIdx !== -1) {
          sheet.getRange(2, pColIdx + 1, rows.length, 1).setValues(rows.map(function (r) {
            return [String(r.PangkalanID || '')];
          }));
        }
      }
    } catch (eHeal) {
      Logger.log('[_healMasterAwakKelasIfNeeded] ' + eHeal.message);
    }
  }
}

function dir_list(params) {
  try {
    var p = params || {};
    var session = _requireSession(p.token);
    var isPrivileged = session.role === ROLE.SUPERADMIN || session.role === ROLE.KADIV;

    var sheet = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var rows = sheetToObjects(sheet);

    // Auto-seed jika belum ada data
    if (rows.length === 0) {
      dir_ensureSeeded();
      rows = sheetToObjects(sheet);
    }

    _healMasterAwakKelasIfNeeded(sheet, rows);

    var rumpunFilter = String(p.rumpun || '').toUpperCase().trim();
    var kelasFilter = p.kelasKapal ? normalizeKelasKapal(p.kelasKapal, '') : '';
    var statusFilter = String(p.statusAktif || '').toUpperCase().trim();
    var searchStr = String(p.search || '').toLowerCase().trim();
    var filterPerluDilengkapi = p.perluDilengkapi === true;

    // Hitung statistik keseluruhan sebelum difilter paginasi
    var countTotal = rows.length;
    var countDek = 0;
    var countMesin = 0;
    var countPerlu = 0;

    rows.forEach(function (r) {
      var rmp = String(r.Rumpun || '').toUpperCase();
      if (rmp === 'DEK' || rmp === 'AWAK_DEK') countDek++;
      else if (rmp === 'MESIN' || rmp === 'AWAK_MESIN') countMesin++;

      var kat = String(r.KategoriKepegawaian || '').trim();
      var buku = String(r.NomorBukuPelaut || '').trim();
      if (!kat || !buku) countPerlu++;
    });

    // Saring baris
    var filtered = rows.filter(function (r) {
      if (rumpunFilter) {
        var rmp = String(r.Rumpun || '').toUpperCase();
        if (rmp !== rumpunFilter && rmp !== ('AWAK_' + rumpunFilter)) return false;
      }
      if (kelasFilter) {
        var rowKelas = normalizeKelasKapal(r.KelasKapal, r.JabatanLengkap || r.KelompokJabatan);
        if (rowKelas !== kelasFilter) return false;
      }
      if (statusFilter && String(r.StatusAktif || 'AKTIF').toUpperCase() !== statusFilter) {
        return false;
      }
      if (filterPerluDilengkapi) {
        var kat = String(r.KategoriKepegawaian || '').trim();
        var buku = String(r.NomorBukuPelaut || '').trim();
        if (kat && buku) return false;
      }
      if (searchStr) {
        var nama = String(r.Nama || '').toLowerCase();
        var nip = String(r.NIP || '').toLowerCase();
        var jab = String(r.JabatanLengkap || r.KelompokJabatan || '').toLowerCase();
        if (nama.indexOf(searchStr) === -1 && nip.indexOf(searchStr) === -1 && jab.indexOf(searchStr) === -1) {
          return false;
        }
      }
      return true;
    });

    var totalMatched = filtered.length;
    var limit = p.limit || 50;
    var offset = p.offset || 0;
    var paged = filtered.slice(offset, offset + limit);

    var items = paged.map(function (r) {
      var rawNip = String(r.NIP || '');
      var rmp = String(r.Rumpun || '');
      if (rmp.indexOf('AWAK_') === 0) rmp = rmp.substring(5);

      return {
        pegawaiId: String(r.PegawaiID || ''),
        nipDisplay: maskNip(rawNip, isPrivileged),
        nipRaw: isPrivileged ? rawNip : '',
        nama: String(r.Nama || ''),
        kelompokJabatan: String(r.KelompokJabatan || ''),
        jabatanLengkap: String(r.JabatanLengkap || ''),
        kelasKapal: normalizeKelasKapal(r.KelasKapal, r.JabatanLengkap || r.KelompokJabatan),
        rumpun: rmp || 'DEK',
        kategoriKepegawaian: String(r.KategoriKepegawaian || '-'),
        statusAktif: String(r.StatusAktif || 'AKTIF'),
        nomorBukuPelaut: String(r.NomorBukuPelaut || '-'),
        pangkalanId: String(r.PangkalanID || '-'),
        kapalId: String(r.KapalID || '-')
      };
    });

    return {
      success: true,
      data: {
        items: items,
        total: totalMatched,
        stats: {
          total: countTotal,
          dek: countDek,
          mesin: countMesin,
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
 *
 * @param {string} token
 * @param {string} pegawaiId
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

    // Ambil riwayat penugasan kapal
    var penugasan = [];
    try {
      var sheetTgs = openAwakSheet(SHEET_AWAK.PENUGASAN_KAPAL);
      penugasan = sheetToObjects(sheetTgs)
        .filter(function (t) {
          return String(t.PegawaiID || '') === pId && String(t.Status || '').toUpperCase() === 'ACTIVE';
        })
        .map(function (t) {
          return {
            rowId: String(t.RowID || ''),
            kapalId: String(t.KapalID || ''),
            posSijil: String(t.PosSijil || ''),
            tanggalNaik: String(t.TanggalNaik || ''),
            tanggalTurun: String(t.TanggalTurun || ''),
            keterangan: String(t.Keterangan || '')
          };
        });
    } catch (eTgs) {}

    // Ambil register sertifikat kompetensi
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
            berlakuSampai: String(s.BerlakuSampai || '')
          };
        });
    } catch (eSrt) {}

    var rmp = String(a.Rumpun || '');
    if (rmp.indexOf('AWAK_') === 0) rmp = rmp.substring(5);

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
        kategoriKepegawaian: String(a.KategoriKepegawaian || ''),
        statusAktif: String(a.StatusAktif || 'AKTIF'),
        pangkalanId: String(a.PangkalanID || ''),
        kapalId: String(a.KapalID || ''),
        nomorBukuPelaut: String(a.NomorBukuPelaut || ''),
        tanggalMulaiKerja: String(a.TanggalMulaiKerja || ''),
        tanggalSelesaiKontrak: String(a.TanggalSelesaiKontrak || ''),
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
 * Menyimpan atau memperbarui profil awak kapal di Master_Awak.
 *
 * @param {Object} params
 */
function dir_save(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.STAF, ROLE.KADIV, ROLE.SUPERADMIN], null);

      var pId = String(params.pegawaiId || '').trim();
      var nama = String(params.nama || '').trim();
      var rawNip = String(params.nip || '').trim().replace(/[^0-9]/g, '');

      if (!nama) return { success: false, error: 'Nama lengkap wajib diisi.' };

      var sheet = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
      var now = new Date();

      var found = pId ? findRowByField(sheet, 'PegawaiID', pId) : null;

      var jabLengkap = String(params.jabatanLengkap || params.kelompokJabatan || '').trim();
      var kelasKapal = params.kelasKapal
        ? normalizeKelasKapal(params.kelasKapal, '')
        : extractKelasKapal(jabLengkap);
      var rumpun = String(params.rumpun || extractRumpunAwak(jabLengkap)).trim();

      var record = {
        'Nama': nama,
        'NIP': rawNip,
        'KelompokJabatan': String(params.kelompokJabatan || '').trim(),
        'JabatanLengkap': jabLengkap,
        'KelasKapal': kelasKapal,
        'Rumpun': rumpun,
        'KategoriKepegawaian': String(params.kategoriKepegawaian || '').trim(),
        'StatusAktif': String(params.statusAktif || 'AKTIF').trim(),
        'PangkalanID': String(params.pangkalanId || '').trim(),
        'KapalID': String(params.kapalId || '').trim(),
        'NomorBukuPelaut': String(params.nomorBukuPelaut || '').trim(),
        'TanggalMulaiKerja': String(params.tanggalMulaiKerja || '').trim(),
        'TanggalSelesaiKontrak': String(params.tanggalSelesaiKontrak || '').trim(),
        'Catatan': String(params.catatan || '').trim(),
        'UpdatedAt': now,
        'UpdatedBy': session.userId
      };

      if (found) {
        updateRowCells(sheet, found.rowIndex, record);
        _auditLog(session.userId, 'UPDATE_AWAK', SHEET_AWAK.MASTER_AWAK, pId, 'Pembaruan profil: ' + nama);
        if (typeof akn_syncFromAwak === 'function') {
          try { akn_syncFromAwak(session.userId, 'Pembaruan profil awak: ' + nama); } catch (eAkn) {}
        }
        return {
          success: true,
          data: { pegawaiId: pId, message: 'Profil personil berhasil diperbarui.' }
        };
      } else {
        var newId = 'PEG-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
        record.PegawaiID = newId;
        appendRowData(sheet, record);
        _auditLog(session.userId, 'CREATE_AWAK', SHEET_AWAK.MASTER_AWAK, newId, 'Perekaman personil baru: ' + nama);
        if (typeof akn_syncFromAwak === 'function') {
          try { akn_syncFromAwak(session.userId, 'Penambahan personil baru: ' + nama); } catch (eAkn) {}
        }
        return {
          success: true,
          data: { pegawaiId: newId, message: 'Personil baru berhasil ditambahkan.' }
        };
      }
    });
  } catch (e) {
    Logger.log('[dir_save] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Penugasan Kategori Kepegawaian Massal (Batch Assign) untuk Kadiv/Superadmin.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {Array<string>} params.pegawaiIds
 * @param {string} params.kategoriKepegawaian - 'PNS' | 'PPPK_FUNGSIONAL' | 'PPPK_PELAKSANA' | 'PPPK_PARUH_WAKTU' | 'PJLP'
 */
function dir_batchAssign(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.KADIV, ROLE.SUPERADMIN], null);

      var ids = params.pegawaiIds || [];
      var kat = String(params.kategoriKepegawaian || '').trim();
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

      for (var i = 0; i < rows.length; i++) {
        var pId = String(rows[i].PegawaiID || '');
        if (ids.indexOf(pId) !== -1) {
          updateRowCells(sheet, i + 2, {
            'KategoriKepegawaian': kat,
            'UpdatedAt': now,
            'UpdatedBy': session.userId
          });
          updatedCount++;
        }
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
 * Seeding otomatis dan idempoten 396 awak kapal armada PSDKP ke Master_Awak.
 */
function dir_ensureSeeded() {
  try {
    var sheet = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var rows = sheetToObjects(sheet);
    if (rows.length >= 300) {
      return { success: true, count: rows.length, message: 'Data sudah terisi.' };
    }

    if (typeof SEED_AWAK_ARMADA === 'undefined' || !Array.isArray(SEED_AWAK_ARMADA)) {
      Logger.log('[dir_ensureSeeded] SEED_AWAK_ARMADA tidak ditemukan.');
      return { success: false, error: 'Dataset SEED_AWAK_ARMADA tidak tersedia.' };
    }

    var existingIds = {};
    rows.forEach(function (r) {
      existingIds[String(r.PegawaiID || '')] = true;
    });

    var toInsert = [];
    var now = new Date();

    SEED_AWAK_ARMADA.forEach(function (a) {
      var pId = String(a.pegawaiId || '');
      if (existingIds[pId]) return;

      var jabLengkap = String(a.jabatanLengkap || a.kelompokJabatan || '');
      var kelas = normalizeKelasKapal(a.tingkatKelas, jabLengkap);
      var rmp = String(a.rumpun || extractRumpunAwak(jabLengkap));
      if (rmp.indexOf('AWAK_') === 0) rmp = rmp.substring(5);

      toInsert.push([
        pId,
        String(a.nip || ''),
        String(a.nama || ''),
        String(a.kelompokJabatan || ''),
        jabLengkap,
        kelas,
        rmp,
        'PNS', // Default baseline status ASN
        String(a.statusAktif || 'AKTIF'),
        String(a.unit || a.pangkalanId || ''), // PangkalanID
        '', // KapalID
        '', // TanggalMulaiKerja
        '', // TanggalSelesaiKontrak
        '', // NomorBukuPelaut
        'Data Impor Armada PSDKP',
        now,
        'SYSTEM_SEED'
      ]);
    });

    if (toInsert.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, toInsert.length, toInsert[0].length).setValues(toInsert);
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

  // Lookup existing berdasarkan NIP (18 digit) dan PegawaiID
  var awakMapByNip = {};
  var awakMapById = {};
  awakRows.forEach(function (r, idx) {
    var cleanNip = String(r.NIP || '').replace(/[^0-9]/g, '');
    if (cleanNip) awakMapByNip[cleanNip] = { row: r, rowIndex: idx + 2 };
    var pId = String(r.PegawaiID || '').trim();
    if (pId) awakMapById[pId] = { row: r, rowIndex: idx + 2 };
  });

  var sikapEmployees = [];
  var isSourceFromSheet = false;

  // 1. Baca dari Spreadsheet SIKAP khusus bila SIKAP_SS_ID tersedia
  if (sikapId) {
    try {
      var sikapSs = SpreadsheetApp.openById(sikapId);
      var sheetNames = ['Data_Pegawai', 'Pegawai', 'Master_Awak'];
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

  sikapEmployees.forEach(function (emp) {
    var rawNip = String(emp.NIP || emp.nip || '').trim().replace(/[^0-9]/g, '');
    var pId = String(emp.PegawaiID || emp.pegawaiId || '').trim();
    var nama = String(emp.Nama || emp.nama || '').trim();
    var jab = String(emp.JabatanLengkap || emp.jabatanLengkap || emp.KelompokJabatan || emp.kelompokJabatan || '').trim();
    var kelJab = String(emp.KelompokJabatan || emp.kelompokJabatan || '').trim();
    var rawStatus = String(emp.StatusAktif || emp.statusAktif || 'AKTIF').toUpperCase().trim();
    var isSikapActive = (rawStatus === 'AKTIF' || rawStatus === 'ACTIVE' || rawStatus === '');
    var normalizedStatus = isSikapActive ? 'AKTIF' : 'NONAKTIF';
    var unitStr = String(emp.PangkalanID || emp.pangkalanId || emp.Unit || emp.unit || '').trim();

    if (!nama) return;
    if (rawNip) sikapNipSet[rawNip] = true;
    if (pId) sikapIdSet[pId] = true;

    var existing = (rawNip && awakMapByNip[rawNip]) ? awakMapByNip[rawNip] : (pId && awakMapById[pId] ? awakMapById[pId] : null);

    if (existing) {
      matchedCount++;
      var r = existing.row;
      var needsUpdate = false;
      var patch = { 'UpdatedAt': now, 'UpdatedBy': actorUserId };

      if (nama && r.Nama !== nama) { patch.Nama = nama; needsUpdate = true; }
      if (rawNip && String(r.NIP || '').replace(/[^0-9]/g, '') !== rawNip) { patch.NIP = rawNip; needsUpdate = true; }
      if (jab && r.JabatanLengkap !== jab) { patch.JabatanLengkap = jab; needsUpdate = true; }
      if (kelJab && r.KelompokJabatan !== kelJab) { patch.KelompokJabatan = kelJab; needsUpdate = true; }
      if (unitStr && !String(r.PangkalanID || '').trim()) { patch.PangkalanID = unitStr; needsUpdate = true; }

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

      var kat = String(emp.KategoriKepegawaian || emp.kategori || emp.StatusKepegawaian || '').trim();
      if (kat && r.KategoriKepegawaian !== kat) { patch.KategoriKepegawaian = kat; needsUpdate = true; }

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
      var rmp = String(emp.Rumpun || emp.rumpun || extractRumpunAwak(jab));
      if (rmp.indexOf('AWAK_') === 0) rmp = rmp.substring(5);
      var katBaru = String(emp.KategoriKepegawaian || emp.kategori || emp.StatusKepegawaian || 'PNS').trim();

      toAppend.push([
        newId,
        rawNip || '-',
        nama,
        kelJab || 'Awak Kapal',
        jab || kelJab || 'Awak Kapal Pengawas',
        kelas || 'NON_KAPAL',
        rmp || 'DEK',
        katBaru || 'PNS',
        normalizedStatus,
        unitStr,
        String(emp.KapalID || ''),
        '',
        '',
        '',
        'Sinkronisasi SIKAP: ' + (isSourceFromSheet ? 'Spreadsheet Master' : 'Dataset Resmi'),
        now,
        actorUserId
      ]);
      addedCount++;
    }
  });

  if (toAppend.length > 0) {
    var startRow = sheetAwak.getLastRow() + 1;
    sheetAwak.getRange(startRow, 1, toAppend.length, toAppend[0].length).setValues(toAppend);
  }

  // 2B. Deteksi pegawai aktif di Master_Awak yang dihapus ("di-kick") dari sheet SIKAP
  // Guard: hanya aktif saat sumber eksternal SIKAP terbaca valid & tidak kurang dari 30% jumlah awak (mencegah false wipe)
  if (isSourceFromSheet && sikapEmployees.length > 0 && sikapEmployees.length >= Math.floor(awakRows.length * 0.3)) {
    awakRows.forEach(function (r, idx) {
      var st = String(r.StatusAktif || 'AKTIF').toUpperCase().trim();
      if (st !== 'AKTIF') return;

      var cNip = String(r.NIP || '').replace(/[^0-9]/g, '');
      var cId = String(r.PegawaiID || '').trim();
      var foundInSikap = (cNip && sikapNipSet[cNip]) || (cId && sikapIdSet[cId]);
      if (!foundInSikap) {
        updateRowCells(sheetAwak, idx + 2, {
          'StatusAktif': 'NONAKTIF',
          'Catatan': '[KELUAR SIKAP ' + todayIso + '] Tidak lagi terdaftar di data kepegawaian SIKAP',
          'UpdatedAt': now,
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
      var certSheetNames = ['Riwayat_Diklat', 'Sertifikasi', 'Data_Sertifikat', 'Pelatihan', 'Diklat_Pegawai', 'TX_Pelatihan_Awak'];
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


