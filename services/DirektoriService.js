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

    var rumpunFilter = String(p.rumpun || '').toUpperCase().trim();
    var kelasFilter = String(p.kelasKapal || '').toUpperCase().trim();
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
      if (kelasFilter && String(r.KelasKapal || '').toUpperCase() !== kelasFilter) {
        return false;
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
        kelasKapal: String(r.KelasKapal || 'NON_KAPAL'),
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
        kelasKapal: String(a.KelasKapal || 'NON_KAPAL'),
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
      var kelasKapal = String(params.kelasKapal || extractKelasKapal(jabLengkap)).trim();
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
      var kelas = String(a.tingkatKelas || extractKelasKapal(jabLengkap));
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
        '', // PangkalanID
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
 * Sinkronisasi data awak kapal dengan Master Database Pegawai SIKAP Ditjen PSDKP.
 * Melakukan pembaruan profil aparatur dan pengimporan idempoten personil awak armada.
 *
 * @param {string|Object} tokenOrParams
 */
function dir_syncSikap(tokenOrParams) {
  try {
    return withLock(function () {
      var token = typeof tokenOrParams === 'string' ? tokenOrParams : (tokenOrParams && tokenOrParams.token ? tokenOrParams.token : '');
      var session = _requireSession(token);
      assertScope(session, [ROLE.SUPERADMIN, ROLE.KADIV], null);

      var props = PropertiesService.getScriptProperties();
      var sikapId = props.getProperty(PROP_KEY.SIKAP_SS_ID) || props.getProperty(PROP_KEY.MASTER_SS_ID);

      var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
      var awakRows = sheetToObjects(sheetAwak);

      // Buat lookup map existing berdasarkan NIP (18 digit ter-normalisasi) dan PegawaiID
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

      // 1. Coba baca dari Spreadsheet SIKAP jika ID tersedia
      if (sikapId) {
        try {
          var sikapSs = SpreadsheetApp.openById(sikapId);
          var sheetNames = ['Data_Pegawai', 'Pegawai', 'Master_Awak', 'Users'];
          var sSheet = null;
          for (var i = 0; i < sheetNames.length; i++) {
            sSheet = sikapSs.getSheetByName(sheetNames[i]);
            if (sSheet) break;
          }
          if (!sSheet) sSheet = sikapSs.getSheets()[0];

          if (sSheet) {
            var rawSikap = sheetToObjects(sSheet);
            if (rawSikap && rawSikap.length > 0) {
              sikapEmployees = rawSikap;
              isSourceFromSheet = true;
            }
          }
        } catch (eSs) {
          Logger.log('[dir_syncSikap] Info: Gagal membuka spreadsheet SIKAP: ' + eSs.message);
        }
      }

      // 2. Fallback / Baseline ke SEED_AWAK_ARMADA jika belum terhubung langsung ke spreadsheet SIKAP fisik
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
      var updatedCount = 0;
      var addedCount = 0;
      var matchedCount = 0;
      var toAppend = [];

      sikapEmployees.forEach(function (emp) {
        var rawNip = String(emp.NIP || emp.nip || '').trim().replace(/[^0-9]/g, '');
        var pId = String(emp.PegawaiID || emp.pegawaiId || '').trim();
        var nama = String(emp.Nama || emp.nama || '').trim();
        var jab = String(emp.JabatanLengkap || emp.jabatanLengkap || emp.KelompokJabatan || emp.kelompokJabatan || '').trim();
        var kelJab = String(emp.KelompokJabatan || emp.kelompokJabatan || '').trim();
        var status = String(emp.StatusAktif || emp.statusAktif || 'AKTIF').trim();

        if (!nama) return;

        var existing = (rawNip && awakMapByNip[rawNip]) ? awakMapByNip[rawNip] : (pId && awakMapById[pId] ? awakMapById[pId] : null);

        if (existing) {
          matchedCount++;
          var r = existing.row;
          var needsUpdate = false;
          var patch = { 'UpdatedAt': now, 'UpdatedBy': session.userId };

          // Perbarui data demografis yang berubah di SIKAP tanpa menimpa data maritim
          if (nama && r.Nama !== nama) { patch.Nama = nama; needsUpdate = true; }
          if (rawNip && String(r.NIP || '').replace(/[^0-9]/g, '') !== rawNip) { patch.NIP = rawNip; needsUpdate = true; }
          if (jab && r.JabatanLengkap !== jab) { patch.JabatanLengkap = jab; needsUpdate = true; }
          if (kelJab && r.KelompokJabatan !== kelJab) { patch.KelompokJabatan = kelJab; needsUpdate = true; }
          if (status && r.StatusAktif !== status) { patch.StatusAktif = status; needsUpdate = true; }
          var kat = String(emp.KategoriKepegawaian || emp.kategori || emp.StatusKepegawaian || '').trim();
          if (kat && r.KategoriKepegawaian !== kat) { patch.KategoriKepegawaian = kat; needsUpdate = true; }

          if (needsUpdate) {
            updateRowCells(sheetAwak, existing.rowIndex, patch);
            updatedCount++;
          }
        } else {
          // Personil baru di SIKAP yang masuk ke awak armada
          var newId = pId || ('PEG-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase());
          var kelas = String(emp.TingkatKelas || emp.tingkatKelas || extractKelasKapal(jab));
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
            status || 'AKTIF',
            String(emp.PangkalanID || ''),
            String(emp.KapalID || ''),
            '',
            '',
            '',
            'Sinkronisasi SIKAP: ' + (isSourceFromSheet ? 'Spreadsheet Master' : 'Dataset Resmi'),
            now,
            session.userId
          ]);
          addedCount++;
        }
      });

      if (toAppend.length > 0) {
        var startRow = sheetAwak.getLastRow() + 1;
        sheetAwak.getRange(startRow, 1, toAppend.length, toAppend[0].length).setValues(toAppend);
      }

      // 3. Sinkronisasi Data Sertifikasi & Diklat dari SIKAP jika lembar sertifikat tersedia
      var certSyncedCount = 0;
      if (sikapId && isSourceFromSheet) {
        try {
          var sikapSs = SpreadsheetApp.openById(sikapId);
          var certSheetNames = ['Riwayat_Diklat', 'Sertifikasi', 'Data_Sertifikat', 'Pelatihan', 'Diklat_Pegawai', 'TX_Pelatihan_Awak'];
          var sCertSheet = null;
          for (var c = 0; c < certSheetNames.length; c++) {
            sCertSheet = sikapSs.getSheetByName(certSheetNames[c]);
            if (sCertSheet) break;
          }

          if (sCertSheet) {
            var rawCerts = sheetToObjects(sCertSheet);
            if (rawCerts && rawCerts.length > 0) {
              var sheetSrt = openAwakSheet(SHEET_AWAK.PELATIHAN_AWAK);
              var existingSrt = sheetToObjects(sheetSrt);

              // Index existing active certificates by PegawaiID + KodePelatihan and PegawaiID + NomorSertifikat
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

              // Fresh lookup NIP -> PegawaiID dari sheetAwak terkini
              var freshAwak = sheetToObjects(sheetAwak);
              var nipToPid = {};
              freshAwak.forEach(function (a) {
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
                  var cPatch = { 'UpdatedAt': now, 'UpdatedBy': session.userId };
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
                  var periode = getPeriodeFromDate(tglTerbit || Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd'));
                  certsToAppend.push([
                    newRowId,
                    DIVISI_ID.AWAK,
                    periode,
                    session.userId,
                    now,
                    ROW_STATUS.ACTIVE,
                    '', // SupersedesRowID
                    '', '', '', // Void fields
                    targetPid,
                    kdPel,
                    namaPel,
                    'SUDAH_LULUS',
                    noSert,
                    thn,
                    tglTerbit,
                    berlakuSampai,
                    lembaga,
                    ''  // EvidenceID
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
          Logger.log('[dir_syncSikap] Info: Gagal sinkronisasi sertifikat SIKAP: ' + eCert.message);
        }
      }

      _auditLog(session.userId, 'SYNC_SIKAP', SHEET_AWAK.MASTER_AWAK, 'SYNC',
        'Sinkronisasi SIKAP berhasil: ' + matchedCount + ' cocok, ' + updatedCount + ' dimutakhirkan, ' + addedCount + ' personil baru, ' + certSyncedCount + ' sertifikat disinkronkan.');

      if (typeof akn_syncFromAwak === 'function') {
        try { akn_syncFromAwak(session.userId, 'Sinkronisasi SIKAP: ' + updatedCount + ' mutasi, ' + addedCount + ' awak baru'); } catch (eAkn) {}
      }

      return {
        success: true,
        data: {
          source: isSourceFromSheet ? 'SPREADSHEET_SIKAP' : 'SEED_BASELINE_SIKAP',
          totalSikap: sikapEmployees.length,
          matched: matchedCount,
          updated: updatedCount,
          added: addedCount,
          sertifikatSynced: certSyncedCount,
          timestamp: now.toISOString()
        }
      };
    });
  } catch (e) {
    Logger.log('[dir_syncSikap] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Alias untuk kepatuhan ARCHITECTURE.md §3.4
 */
function dir_importDariSikap(tokenOrParams, extraParams) {
  return dir_syncSikap(tokenOrParams);
}


