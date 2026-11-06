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
        return {
          success: true,
          data: { pegawaiId: pId, message: 'Profil personil berhasil diperbarui.' }
        };
      } else {
        var newId = 'PEG-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
        record.PegawaiID = newId;
        appendRowData(sheet, record);
        _auditLog(session.userId, 'CREATE_AWAK', SHEET_AWAK.MASTER_AWAK, newId, 'Perekaman personil baru: ' + nama);
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

