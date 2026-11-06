/**
 * services/KegiatanService.js
 * Sub-Modul B: Log Kegiatan & Pembinaan Personil Awak Kapal
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

/**
 * Mengambil daftar agenda kegiatan pengawakan dengan filter dan pencarian.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} [params.jenis]
 * @param {string} [params.search]
 * @param {number} [params.limit]
 * @param {number} [params.offset]
 */
function keg_list(params) {
  try {
    var p = params || {};
    var session = _requireSession(p.token);

    var sheetKeg = openAwakSheet(SHEET_AWAK.PENGAWAKAN_KEGIATAN);
    var rowsKeg = sheetToObjects(sheetKeg);

    var jenisFilter = String(p.jenis || '').trim();
    var searchStr = String(p.search || '').trim().toLowerCase();

    // Saring data
    var filtered = rowsKeg.filter(function (r) {
      if (jenisFilter && String(r.JenisKegiatan || '') !== jenisFilter) return false;
      if (searchStr) {
        var j = String(r.JudulKegiatan || '').toLowerCase();
        var w = String(r.Wilayah || '').toLowerCase();
        var d = String(r.Deskripsi || '').toLowerCase();
        if (j.indexOf(searchStr) === -1 && w.indexOf(searchStr) === -1 && d.indexOf(searchStr) === -1) {
          return false;
        }
      }
      return true;
    });

    // Urutkan berdasarkan TanggalMulai DESC
    filtered.sort(function (a, b) {
      var dA = String(a.TanggalMulai || '');
      var dB = String(b.TanggalSelesai || '');
      if (dA !== dB) return dB.localeCompare(dA);
      var tA = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
      var tB = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
      return tB - tA;
    });

    var total = filtered.length;
    var limit = p.limit || 50;
    var offset = p.offset || 0;
    var paged = filtered.slice(offset, offset + limit);

    // Ambil lampiran evidence count per baris
    var sheetEv = openAwakSheet(SHEET_AWAK.EVIDENCE);
    var rowsEv = sheetToObjects(sheetEv);
    var evCountMap = {};
    rowsEv.forEach(function (ev) {
      if (String(ev.RefSheet) === SHEET_AWAK.PENGAWAKAN_KEGIATAN) {
        var rId = String(ev.RefRowID || '');
        evCountMap[rId] = (evCountMap[rId] || 0) + 1;
      }
    });

    var items = paged.map(function (r) {
      var rowId = String(r.RowID || '');
      return {
        rowId: rowId,
        periode: String(r.Periode || ''),
        judulKegiatan: String(r.JudulKegiatan || ''),
        jenisKegiatan: String(r.JenisKegiatan || ''),
        tanggalMulai: String(r.TanggalMulai || ''),
        tanggalSelesai: String(r.TanggalSelesai || ''),
        wilayah: String(r.Wilayah || ''),
        jumlahPeserta: parseInt(r.JumlahPeserta, 10) || 0,
        deskripsi: String(r.Deskripsi || ''),
        status: String(r.Status || 'ACTIVE'),
        evidenceCount: evCountMap[rowId] || 0,
        evidenceUrl: String(r.EvidenceUrl || ''),
        submittedBy: String(r.SubmittedBy || ''),
        timestamp: r.Timestamp instanceof Date ? r.Timestamp.toISOString() : String(r.Timestamp || '')
      };
    });

    return {
      success: true,
      data: {
        items: items,
        total: total,
        userRole: session.role
      }
    };
  } catch (e) {
    Logger.log('[keg_list] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mengambil detail lengkap 1 kegiatan termasuk daftar peserta dan evidence.
 *
 * @param {string} token
 * @param {string} rowId
 */
function keg_getDetail(token, rowId) {
  try {
    var session = _requireSession(token);
    var rId = String(rowId || '').trim();
    if (!rId) return { success: false, error: 'RowID tidak valid.' };

    var sheetKeg = openAwakSheet(SHEET_AWAK.PENGAWAKAN_KEGIATAN);
    var foundKeg = findRowByField(sheetKeg, 'RowID', rId);
    if (!foundKeg) return { success: false, error: 'Data kegiatan tidak ditemukan.' };

    var k = foundKeg.obj;

    // Ambil daftar peserta dari TX_Kegiatan_Peserta
    var sheetPeserta = openAwakSheet(SHEET_AWAK.KEGIATAN_PESERTA);
    var rowsPeserta = sheetToObjects(sheetPeserta);
    var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var rowsAwak = sheetToObjects(sheetAwak);
    var awakMap = {};
    rowsAwak.forEach(function (a) {
      awakMap[String(a.PegawaiID || '')] = a;
    });

    var peserta = rowsPeserta
      .filter(function (p) {
        return String(p.ParentRowID || '') === rId && String(p.Status || '').toUpperCase() === 'ACTIVE';
      })
      .map(function (p) {
        var pegId = String(p.PegawaiID || '');
        var master = awakMap[pegId] || {};
        return {
          rowId: String(p.RowID || ''),
          pegawaiId: pegId,
          nama: String(master.NamaLengkap || master.Nama || pegId),
          nip: String(master.NIP || '-'),
          jabatan: String(master.Jabatan || '-'),
          catatan: String(p.Catatan || '')
        };
      });

    // Ambil lampiran berkas dari TX_Evidence
    var sheetEv = openAwakSheet(SHEET_AWAK.EVIDENCE);
    var rowsEv = sheetToObjects(sheetEv);
    var evidences = rowsEv
      .filter(function (e) {
        return String(e.RefSheet) === SHEET_AWAK.PENGAWAKAN_KEGIATAN && String(e.RefRowID) === rId;
      })
      .map(function (e) {
        var fId = String(e.DriveFileID || '');
        return {
          evidenceId: String(e.EvidenceID || ''),
          fileName: String(e.FileName || ''),
          fileType: String(e.FileType || ''),
          viewUrl: fId ? ('https://drive.google.com/file/d/' + fId + '/view') : '',
          uploadedBy: String(e.UploadedBy || ''),
          uploadedAt: e.UploadedAt instanceof Date ? e.UploadedAt.toISOString() : String(e.UploadedAt || '')
        };
      });

    return {
      success: true,
      data: {
        rowId: rId,
        periode: String(k.Periode || ''),
        judulKegiatan: String(k.JudulKegiatan || ''),
        jenisKegiatan: String(k.JenisKegiatan || ''),
        tanggalMulai: String(k.TanggalMulai || ''),
        tanggalSelesai: String(k.TanggalSelesai || ''),
        wilayah: String(k.Wilayah || ''),
        jumlahPeserta: parseInt(k.JumlahPeserta, 10) || 0,
        deskripsi: String(k.Deskripsi || ''),
        evidenceUrl: String(k.EvidenceUrl || ''),
        status: String(k.Status || 'ACTIVE'),
        submittedBy: String(k.SubmittedBy || ''),
        timestamp: k.Timestamp instanceof Date ? k.Timestamp.toISOString() : String(k.Timestamp || ''),
        voidReason: String(k.VoidReason || ''),
        supersedesRowId: String(k.SupersedesRowID || ''),
        peserta: peserta,
        evidences: evidences,
        userRole: session.role
      }
    };
  } catch (e) {
    Logger.log('[keg_getDetail] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mencatat agenda kegiatan baru beserta daftar peserta & berkas bukti Drive.
 *
 * @param {Object} params
 */
function keg_submit(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.STAF, ROLE.KADIV, ROLE.SUPERADMIN], null);

      var check = validateKegiatanInput(params);
      if (!check.valid) {
        return { success: false, error: check.errors.join(' ') };
      }

      var sheetKeg = openAwakSheet(SHEET_AWAK.PENGAWAKAN_KEGIATAN);
      var rowId = 'AWAK-KEG-' + Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();
      var now = new Date();
      var periode = check.periode;

      appendRowData(sheetKeg, {
        'RowID': rowId,
        'DivisiID': DIVISI_ID.AWAK,
        'Periode': periode,
        'SubmittedBy': session.userId,
        'Timestamp': now,
        'Status': ROW_STATUS.ACTIVE,
        'SupersedesRowID': '',
        'VoidReason': '',
        'VoidedBy': '',
        'VoidedAt': '',
        'JudulKegiatan': String(params.judulKegiatan).trim(),
        'JenisKegiatan': String(params.jenisKegiatan).trim(),
        'TanggalMulai': String(params.tanggalMulai).trim(),
        'TanggalSelesai': String(params.tanggalSelesai).trim(),
        'Wilayah': String(params.wilayah || '').trim(),
        'JumlahPeserta': parseInt(params.jumlahPeserta, 10),
        'Deskripsi': String(params.deskripsi || '').trim(),
        'EvidenceUrl': String(params.evidenceUrl || '').trim()
      });

      // Simpan peserta jika ada
      if (Array.isArray(params.pesertaIds) && params.pesertaIds.length > 0) {
        var sheetPeserta = openAwakSheet(SHEET_AWAK.KEGIATAN_PESERTA);
        params.pesertaIds.forEach(function (pegId) {
          var pId = 'AWAK-KPS-' + Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();
          appendRowData(sheetPeserta, {
            'RowID': pId,
            'DivisiID': DIVISI_ID.AWAK,
            'Periode': periode,
            'SubmittedBy': session.userId,
            'Timestamp': now,
            'Status': ROW_STATUS.ACTIVE,
            'SupersedesRowID': '',
            'VoidReason': '',
            'VoidedBy': '',
            'VoidedAt': '',
            'ParentRowID': rowId,
            'PegawaiID': String(pegId).trim(),
            'Catatan': ''
          });
        });
      }

      // Simpan file bukti ke Drive jika ada
      if (Array.isArray(params.files) && params.files.length > 0) {
        params.files.forEach(function (f) {
          try {
            evidence_upload(params.token, {
              refSheet: SHEET_AWAK.PENGAWAKAN_KEGIATAN,
              refRowId: rowId,
              fileName: f.fileName,
              mimeType: f.mimeType,
              dataBase64: f.dataBase64
            });
          } catch (eFile) {
            Logger.log('[keg_submit] Upload file note: ' + eFile.message);
          }
        });
      }

      _auditLog(session.userId, 'CREATE_KEGIATAN', SHEET_AWAK.PENGAWAKAN_KEGIATAN, rowId,
        'Catat kegiatan: ' + params.judulKegiatan);

      return {
        success: true,
        data: {
          rowId: rowId,
          message: 'Agenda kegiatan berhasil dicatat.'
        }
      };
    });
  } catch (e) {
    Logger.log('[keg_submit] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Merevisi data kegiatan (menandai baris lama sebagai SUPERSEDED).
 *
 * @param {Object} params
 */
function keg_revisi(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.STAF, ROLE.KADIV, ROLE.SUPERADMIN], null);

      var rowId = String(params.rowId || '').trim();
      var alasan = String(params.alasanRevisi || '').trim();
      if (!rowId) return { success: false, error: 'RowID tidak valid.' };
      if (!alasan) return { success: false, error: 'Alasan revisi wajib diisi.' };

      var check = validateKegiatanInput(params);
      if (!check.valid) return { success: false, error: check.errors.join(' ') };

      var sheetKeg = openAwakSheet(SHEET_AWAK.PENGAWAKAN_KEGIATAN);
      var found = findRowByField(sheetKeg, 'RowID', rowId);
      if (!found) return { success: false, error: 'Kegiatan tidak ditemukan.' };
      if (String(found.obj.Status).toUpperCase() !== ROW_STATUS.ACTIVE) {
        return { success: false, error: 'Hanya kegiatan aktif yang dapat direvisi.' };
      }

      // Tandai lama SUPERSEDED
      updateRowCells(sheetKeg, found.rowIndex, {
        'Status': ROW_STATUS.SUPERSEDED
      });

      var newRowId = 'AWAK-KEG-' + Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();
      var now = new Date();

      appendRowData(sheetKeg, {
        'RowID': newRowId,
        'DivisiID': DIVISI_ID.AWAK,
        'Periode': check.periode,
        'SubmittedBy': session.userId,
        'Timestamp': now,
        'Status': ROW_STATUS.ACTIVE,
        'SupersedesRowID': rowId,
        'VoidReason': '',
        'VoidedBy': '',
        'VoidedAt': '',
        'JudulKegiatan': String(params.judulKegiatan).trim(),
        'JenisKegiatan': String(params.jenisKegiatan).trim(),
        'TanggalMulai': String(params.tanggalMulai).trim(),
        'TanggalSelesai': String(params.tanggalSelesai).trim(),
        'Wilayah': String(params.wilayah || '').trim(),
        'JumlahPeserta': parseInt(params.jumlahPeserta, 10),
        'Deskripsi': String(params.deskripsi || '').trim() + ' [Revisi: ' + alasan + ']',
        'EvidenceUrl': String(params.evidenceUrl || found.obj.EvidenceUrl || '')
      });

      // Bawa lampiran evidence lama ke baris baru
      try {
        evidence_carry(params.token, {
          refSheet: SHEET_AWAK.PENGAWAKAN_KEGIATAN,
          fromRowId: rowId,
          toRowId: newRowId
        });
      } catch (eCarry) {
        Logger.log('[keg_revisi] Carry evidence notice: ' + eCarry.message);
      }

      _auditLog(session.userId, 'REVISI_KEGIATAN', SHEET_AWAK.PENGAWAKAN_KEGIATAN, newRowId,
        'Revisi ' + rowId + ' -> ' + newRowId + ' (' + alasan + ')');

      return {
        success: true,
        data: {
          newRowId: newRowId,
          message: 'Data kegiatan berhasil direvisi.'
        }
      };
    });
  } catch (e) {
    Logger.log('[keg_revisi] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Menganulir agenda kegiatan (Khusus KADIV atau SUPERADMIN).
 *
 * @param {Object} params
 */
function keg_anulir(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.KADIV, ROLE.SUPERADMIN], null);

      var rowId = String(params.rowId || '').trim();
      var alasan = String(params.alasanAnulir || '').trim();
      if (!rowId) return { success: false, error: 'RowID tidak valid.' };
      if (!alasan) return { success: false, error: 'Alasan pembatalan wajib diisi.' };

      var sheetKeg = openAwakSheet(SHEET_AWAK.PENGAWAKAN_KEGIATAN);
      var found = findRowByField(sheetKeg, 'RowID', rowId);
      if (!found) return { success: false, error: 'Kegiatan tidak ditemukan.' };
      if (String(found.obj.Status).toUpperCase() !== ROW_STATUS.ACTIVE) {
        return { success: false, error: 'Hanya kegiatan aktif yang dapat dibatalkan.' };
      }

      var now = new Date();
      updateRowCells(sheetKeg, found.rowIndex, {
        'Status': ROW_STATUS.VOID,
        'VoidReason': alasan,
        'VoidedBy': session.userId,
        'VoidedAt': now
      });

      _auditLog(session.userId, 'ANULIR_KEGIATAN', SHEET_AWAK.PENGAWAKAN_KEGIATAN, rowId,
        'Anulir kegiatan: ' + alasan);

      return {
        success: true,
        data: { message: 'Kegiatan berhasil dibatalkan.' }
      };
    });
  } catch (e) {
    Logger.log('[keg_anulir] ' + e.message);
    return { success: false, error: e.message };
  }
}

