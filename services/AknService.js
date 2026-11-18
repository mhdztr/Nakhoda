/**
 * services/AknService.js
 * Sub-Modul A: Komposisi Awak Kapal Negara (AKN)
 * Menyediakan endpoint RPC snapshot total, carry-forward, revisi, dan anulir.
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

/**
 * Mengambil data matriks komposisi AKN efektif untuk periode tertentu.
 * Jika pada periode tersebut belum ada input baru, nilai diwarisi dari periode sebelumnya (carry-forward).
 *
 * @param {string} token
 * @param {string} targetPeriode - Format YYYY-MM-W# atau YYYY-MM
 * @returns {Object}
 */
/**
 * Memperbaiki baris TX_Pengawakan_AKN yang terlanjur tertukar kolom DivisiID <-> Periode
 * akibat bug urutan STD_COLS pada versi seed/auto-sync sebelumnya.
 */
function _healSwappedAknRows(sheet, rows) {
  if (!sheet || !rows || rows.length === 0) return;
  var hasSwap = false;
  rows.forEach(function (r) {
    var d = String(r.DivisiID || '').trim();
    var p = String(r.Periode || '').trim();
    if (/^\d{4}-\d{2}/.test(d) && p.indexOf('DIV-') === 0) {
      r.DivisiID = p;
      r.Periode = d;
      hasSwap = true;
    }
  });
  if (hasSwap) {
    try {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var colDiv = headers.indexOf('DivisiID');
      var colPer = headers.indexOf('Periode');
      if (colDiv !== -1) {
        sheet.getRange(2, colDiv + 1, rows.length, 1).setValues(rows.map(function (r) {
          return [String(r.DivisiID || DIVISI_ID.AWAK)];
        }));
      }
      if (colPer !== -1) {
        sheet.getRange(2, colPer + 1, rows.length, 1).setValues(rows.map(function (r) {
          return [String(r.Periode || '')];
        }));
      }
    } catch (eHeal) {
      Logger.log('[_healSwappedAknRows] ' + eHeal.message);
    }
  }
}

/**
 * Memigrasikan baris historis PPPK_FUNGSIONAL + PPPK_PELAKSANA -> P3K
 * dan PPPK_PARUH_WAKTU -> P3K_PARUH_WAKTU secara non-destruktif (Append-Only).
 */
function _healAknKategori4(sheet, rows) {
  if (!sheet || !rows || rows.length === 0) return false;
  var legacyGroups = {};
  var changed = false;

  rows.forEach(function (r, idx) {
    var rawKat = String(r.Kategori || '').trim().toUpperCase();
    var status = String(r.Status || '').trim().toUpperCase();
    if (rawKat === 'PPPK_PARUH_WAKTU') {
      updateRowCells(sheet, idx + 2, { 'Kategori': 'P3K_PARUH_WAKTU' });
      r.Kategori = 'P3K_PARUH_WAKTU';
      changed = true;
    } else if (status === 'ACTIVE' && (rawKat === 'PPPK_FUNGSIONAL' || rawKat === 'PPPK_PELAKSANA')) {
      var key = String(r.Periode || '') + '|' + String(r.Scope || '');
      if (!legacyGroups[key]) {
        legacyGroups[key] = {
          periode: String(r.Periode || ''),
          scope: String(r.Scope || ''),
          total: 0,
          items: [],
          batchId: String(r.BatchID || ''),
          submittedBy: String(r.SubmittedBy || 'SYSTEM'),
          timestamp: r.Timestamp || new Date(),
          keterangan: String(r.Keterangan || '')
        };
      }
      legacyGroups[key].total += (parseInt(r.Jumlah, 10) || 0);
      legacyGroups[key].items.push({ rowIndex: idx + 2, obj: r });
    }
  });

  var groupKeys = Object.keys(legacyGroups);
  if (groupKeys.length > 0) {
    groupKeys.forEach(function (key) {
      var g = legacyGroups[key];
      // Tandai baris pecahan lama sebagai SUPERSEDED lalu append 1 baris P3K gabungan
      var alreadyMerged = rows.some(function (r) {
        return String(r.Periode || '') === g.periode &&
          String(r.Scope || '') === g.scope &&
          String(r.Kategori || '').toUpperCase() === 'P3K' &&
          String(r.Status || '').toUpperCase() === 'ACTIVE';
      });
      var firstOldId = g.items[0] ? String(g.items[0].obj.RowID || '') : '';
      g.items.forEach(function (it) {
        updateRowCells(sheet, it.rowIndex, { 'Status': ROW_STATUS.SUPERSEDED });
        it.obj.Status = ROW_STATUS.SUPERSEDED;
      });
      if (!alreadyMerged) {
        var newRow = {
          'RowID': 'AWAK-AKN-P3K-' + Utilities.getUuid().replace(/-/g, '').substring(0, 6).toUpperCase(),
          'DivisiID': DIVISI_ID.AWAK,
          'Periode': g.periode,
          'SubmittedBy': g.submittedBy,
          'Timestamp': g.timestamp,
          'Status': ROW_STATUS.ACTIVE,
          'SupersedesRowID': firstOldId,
          'VoidReason': '',
          'VoidedBy': '',
          'VoidedAt': '',
          'Scope': g.scope,
          'Kategori': 'P3K',
          'Jumlah': g.total,
          'Keterangan': g.keterangan || 'Penyatuan otomatis kategori PPPK Fungsional & Pelaksana menjadi P3K',
          'BatchID': g.batchId
        };
        appendRowData(sheet, newRow);
        rows.push(newRow);
      }
      changed = true;
    });
  }

  // Pastikan setiap periode maksimal hanya memiliki 1 batch aktif (hindari akumulasi ganda antar batch lama & baru)
  var latestBatchPerPeriode = {};
  rows.forEach(function (r) {
    if (String(r.Status || '').toUpperCase() !== ROW_STATUS.ACTIVE) return;
    var rp = String(r.Periode || '');
    if (!rp) return;
    var ts = r.Timestamp ? new Date(r.Timestamp).getTime() : 0;
    var bId = String(r.BatchID || '');
    var cur = latestBatchPerPeriode[rp];
    if (!cur || ts > cur.ts || (ts === cur.ts && bId && bId !== cur.batchId && bId.indexOf('AUTO') !== -1)) {
      latestBatchPerPeriode[rp] = { ts: ts, batchId: bId };
    }
  });
  rows.forEach(function (r, idx) {
    if (String(r.Status || '').toUpperCase() !== ROW_STATUS.ACTIVE) return;
    var rp = String(r.Periode || '');
    var best = latestBatchPerPeriode[rp];
    if (!best || !best.batchId) return;
    var bId = String(r.BatchID || '');
    if (bId && bId !== best.batchId) {
      updateRowCells(sheet, idx + 2, { 'Status': ROW_STATUS.SUPERSEDED });
      r.Status = ROW_STATUS.SUPERSEDED;
      changed = true;
    }
  });

  return changed;
}

function akn_getPapan(token, filterOrPeriode) {
  try {
    var session = _requireSession(token);
    var filterObj = (filterOrPeriode && typeof filterOrPeriode === 'object')
      ? filterOrPeriode
      : { periode: String(filterOrPeriode || '').trim(), mode: filterOrPeriode ? 'WEEK' : 'WEEK' };

    var win = typeof resolvePeriodeWindow === 'function'
      ? resolvePeriodeWindow(filterObj)
      : { mode: 'WEEK', targetPeriode: String(filterObj.periode || akn_getCurrentPeriode()).trim() || akn_getCurrentPeriode(), startMs: 0, endMs: 0, startDateStr: '', endDateStr: '', label: '' };

    var p = win.targetPeriode || akn_getCurrentPeriode();

    var sheetAkn = openAwakSheet(SHEET_AWAK.PENGAWAKAN_AKN);
    var rowsAkn = sheetToObjects(sheetAkn);

    if (rowsAkn.length === 0) {
      akn_ensureSeeded();
      rowsAkn = sheetToObjects(sheetAkn);
    }

    _healSwappedAknRows(sheetAkn, rowsAkn);
    if (_healAknKategori4(sheetAkn, rowsAkn)) {
      rowsAkn = sheetToObjects(sheetAkn);
    }

    // Hitung matriks 2x4 dengan pure/Carry.js
    var resolved = resolveMatrix(rowsAkn, p);

    // Auto-simpulkan dari Master_Awak bila periode berjalan belum memiliki snapshot aktif atau POA masih 0
    if ((resolved.totals.AKN_KESELURUHAN === 0 || resolved.totals.AKN_POA === 0) && p >= akn_getCurrentPeriode()) {
      var autoSync = akn_syncFromAwak(session.userId, 'Sinkronisasi otomatis komposisi dari Direktori Awak');
      if (autoSync && autoSync.success) {
        rowsAkn = sheetToObjects(sheetAkn);
        resolved = resolveMatrix(rowsAkn, p);
      }
    }

    // Cari sumber periode carry-forward bila diwarisi
    var sourcePeriode = '';
    if (resolved.isFullyCarried && resolved.matrix && resolved.matrix.AKN_KESELURUHAN) {
      var cats = Object.keys(resolved.matrix.AKN_KESELURUHAN);
      for (var ci = 0; ci < cats.length; ci++) {
        var cellSrc = resolved.matrix.AKN_KESELURUHAN[cats[ci]];
        if (cellSrc && cellSrc.periodeSumber) {
          sourcePeriode = cellSrc.periodeSumber;
          break;
        }
      }
    }

    // Cari periode sebelumnya untuk hitung selisih (delta)
    var allPeriodes = {};
    rowsAkn.forEach(function (r) {
      if (r.Periode && String(r.Status || '').toUpperCase() === 'ACTIVE' && String(r.Periode) < p) {
        allPeriodes[String(r.Periode)] = true;
      }
    });
    var prevPeriodeList = Object.keys(allPeriodes).sort();
    var prevPeriode = prevPeriodeList.length > 0 ? prevPeriodeList[prevPeriodeList.length - 1] : null;
    var prevResolved = prevPeriode ? resolveMatrix(rowsAkn, prevPeriode) : null;

    // Ambil riwayat transaksi (berdasarkan rentang tanggal bila mode TW/SEM/CUSTOM, atau periode exact bila WEEK)
    var isRangeMode = win.mode && win.mode !== 'WEEK' && win.mode !== 'ALL' && win.startMs && win.endMs;
    var startPer = win.startDateStr ? dateToAknPeriode(win.startDateStr) : '';
    var endPer = win.endDateStr ? dateToAknPeriode(win.endDateStr) : '';

    var riwayat = rowsAkn
      .filter(function (r) {
        var rp = String(r.Periode || '');
        if (isRangeMode && startPer && endPer) {
          return rp >= startPer && rp <= endPer;
        }
        return rp === p;
      })
      .sort(function (a, b) {
        var tA = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
        var tB = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
        return tB - tA;
      })
      .map(function (r) {
        return {
          rowId: String(r.RowID || ''),
          periode: String(r.Periode || ''),
          scope: String(r.Scope || ''),
          kategori: normalizeAknKategori(r.Kategori),
          jumlah: parseInt(r.Jumlah, 10) || 0,
          status: String(r.Status || ''),
          submittedBy: String(r.SubmittedBy || ''),
          timestamp: r.Timestamp instanceof Date ? r.Timestamp.toISOString() : String(r.Timestamp || ''),
          keterangan: String(r.Keterangan || ''),
          batchId: String(r.BatchID || ''),
          supersedesRowId: String(r.SupersedesRowID || ''),
          voidReason: String(r.VoidReason || '')
        };
      });

    // Cek status konfirmasi mingguan jika belum ada mutasi
    var isConfirmed = false;
    var konfirmasiCatatan = '';
    try {
      var sheetKfm = openAwakSheet(SHEET_AWAK.KONFIRMASI_MINGGUAN);
      var rowsKfm = sheetToObjects(sheetKfm);
      var foundKfm = rowsKfm.filter(function (k) {
        return String(k.Periode || '') === p && String(k.Status || '').toUpperCase() === 'ACTIVE';
      });
      if (foundKfm.length > 0) {
        isConfirmed = true;
        konfirmasiCatatan = String(foundKfm[0].Catatan || '');
      }
    } catch (eKfm) {
      Logger.log('[akn_getPapan] Konfirmasi check notice: ' + eKfm.message);
    }

    var rekapJabatan = typeof dir_computeRekapJabatan === 'function' ? dir_computeRekapJabatan() : [];

    return {
      success: true,
      data: {
        periode: p,
        periodeWindow: win,
        kategoris: AKN_KATEGORIS,
        rekapJabatan: rekapJabatan,
        prevPeriode: prevPeriode,
        sourcePeriode: sourcePeriode || prevPeriode || '',
        matrix: resolved.matrix,
        totals: resolved.totals,
        prevMatrix: prevResolved ? prevResolved.matrix : null,
        prevTotals: prevResolved ? prevResolved.totals : null,
        isFullyCarried: resolved.isFullyCarried,
        riwayat: riwayat,
        isConfirmed: isConfirmed,
        konfirmasiCatatan: konfirmasiCatatan,
        userRole: session.role
      }
    };
  } catch (e) {
    Logger.log('[akn_getPapan] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mengirimkan data snapshot total komposisi AKN (Form Matriks 2x5).
 * Validasi non-negatif & POA <= Keseluruhan.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.periode
 * @param {Object} params.matrix - { AKN_KESELURUHAN: {...}, AKN_POA: {...} }
 * @param {string} [params.keterangan]
 */
function akn_submit(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.STAF, ROLE.KADIV, ROLE.SUPERADMIN], null);

      var p = String(params.periode || '').trim();
      if (!p && params.date && typeof dateToAknPeriode === 'function') {
        p = dateToAknPeriode(params.date);
      }
      if (!p) return { success: false, error: 'Periode pelaporan wajib ditentukan dari kalender.' };

      var check = validateAknMatrix(params.matrix);
      if (!check.valid) {
        return { success: false, error: check.errors.join(' ') };
      }

      var sheetAkn = openAwakSheet(SHEET_AWAK.PENGAWAKAN_AKN);
      var rowsAkn = sheetToObjects(sheetAkn);
      var now = new Date();
      var batchId = 'BATCH-' + Utilities.formatDate(now, 'GMT+7', 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().substring(0, 4).toUpperCase();

      var savedCount = 0;

      AKN_SCOPES.forEach(function (scope) {
        AKN_KATEGORIS.forEach(function (kat) {
          var inputVal = parseInt(params.matrix[scope][kat], 10);
          if (isNaN(inputVal)) inputVal = 0;

          // Cek apakah di periode yang sama sudah ada entri aktif untuk cell ini
          var activeExisting = null;
          for (var i = 0; i < rowsAkn.length; i++) {
            var r = rowsAkn[i];
            if (String(r.Periode || '') === p &&
                String(r.Scope || '') === scope &&
                String(r.Kategori || '') === kat &&
                String(r.Status || '').toUpperCase() === 'ACTIVE') {
              activeExisting = { obj: r, rowIndex: i + 2 };
              break;
            }
          }

          var rowId = 'AWAK-AKN-' + Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();

          // Jika sudah ada baris aktif di periode ini dan nilainya berubah -> jadikan yang lama SUPERSEDED
          var supersedesId = '';
          if (activeExisting) {
            var oldVal = parseInt(activeExisting.obj.Jumlah, 10);
            if (oldVal === inputVal) {
              // Tidak ada perubahan untuk sel ini di periode ini -> lewati
              return;
            }
            updateRowCells(sheetAkn, activeExisting.rowIndex, {
              'Status': ROW_STATUS.SUPERSEDED
            });
            supersedesId = activeExisting.obj.RowID;
          }

          appendRowData(sheetAkn, {
            'RowID': rowId,
            'DivisiID': DIVISI_ID.AWAK,
            'Periode': p,
            'SubmittedBy': session.userId,
            'Timestamp': now,
            'Status': ROW_STATUS.ACTIVE,
            'SupersedesRowID': supersedesId,
            'VoidReason': '',
            'VoidedBy': '',
            'VoidedAt': '',
            'Scope': scope,
            'Kategori': kat,
            'Jumlah': inputVal,
            'Keterangan': String(params.keterangan || ''),
            'BatchID': batchId
          });

          savedCount++;
        });
      });

      _auditLog(session.userId, 'SUBMIT_AKN', SHEET_AWAK.PENGAWAKAN_AKN, batchId,
        'Simpan snapshot AKN ' + p + ' (' + savedCount + ' sel direkam)');

      if (typeof applyFormalSheetFormatting === 'function') {
        applyFormalSheetFormatting(sheetAkn, SHEET_AWAK.PENGAWAKAN_AKN);
      }

      return {
        success: true,
        data: {
          batchId: batchId,
          savedCount: savedCount,
          message: 'Komposisi AKN periode ' + p + ' berhasil disimpan.'
        }
      };
    });
  } catch (e) {
    Logger.log('[akn_submit] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Merevisi satu entri data AKN tertentu (misal ralat angka oleh staf).
 * Baris lama diubah menjadi SUPERSEDED, baris baru ditambahkan dengan SupersedesRowID.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.rowId
 * @param {number} params.jumlahBaru
 * @param {string} params.alasanRevisi
 */
function akn_revisi(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.STAF, ROLE.KADIV, ROLE.SUPERADMIN], null);

      var rowId = String(params.rowId || '').trim();
      var jumlahBaru = parseInt(params.jumlahBaru, 10);
      var alasan = String(params.alasanRevisi || '').trim();

      if (!rowId) return { success: false, error: 'RowID tidak valid.' };
      if (isNaN(jumlahBaru) || jumlahBaru < 0) {
        return { success: false, error: 'Jumlah personil baru harus berupa angka positif.' };
      }
      if (!alasan) {
        return { success: false, error: 'Alasan revisi wajib diisi.' };
      }

      var sheet = openAwakSheet(SHEET_AWAK.PENGAWAKAN_AKN);
      var found = findRowByField(sheet, 'RowID', rowId);
      if (!found) {
        return { success: false, error: 'Baris data transaksi tidak ditemukan.' };
      }
      if (String(found.obj.Status).toUpperCase() !== ROW_STATUS.ACTIVE) {
        return { success: false, error: 'Hanya baris berstatus ACTIVE yang dapat direvisi.' };
      }

      var oldObj = found.obj;
      var now = new Date();

      // Tandai lama sebagai SUPERSEDED
      updateRowCells(sheet, found.rowIndex, {
        'Status': ROW_STATUS.SUPERSEDED
      });

      // Tulis baris baru pengganti
      var newRowId = 'AWAK-AKN-' + Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();
      appendRowData(sheet, {
        'RowID': newRowId,
        'DivisiID': DIVISI_ID.AWAK,
        'Periode': oldObj.Periode,
        'SubmittedBy': session.userId,
        'Timestamp': now,
        'Status': ROW_STATUS.ACTIVE,
        'SupersedesRowID': rowId,
        'VoidReason': '',
        'VoidedBy': '',
        'VoidedAt': '',
        'Scope': oldObj.Scope,
        'Kategori': oldObj.Kategori,
        'Jumlah': jumlahBaru,
        'Keterangan': 'Revisi: ' + alasan,
        'BatchID': oldObj.BatchID || ('REV-' + newRowId)
      });

      _auditLog(session.userId, 'REVISI_AKN', SHEET_AWAK.PENGAWAKAN_AKN, newRowId,
        'Revisi ' + oldObj.Scope + ' ' + oldObj.Kategori + ': ' + oldObj.Jumlah + ' -> ' + jumlahBaru + ' (' + alasan + ')');

      return {
        success: true,
        data: {
          newRowId: newRowId,
          message: 'Data berhasil direvisi.'
        }
      };
    });
  } catch (e) {
    Logger.log('[akn_revisi] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Menganulir baris transaksi AKN (Hanya wewenang KADIV atau SUPERADMIN).
 * Baris diubah menjadi VOID.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.rowId
 * @param {string} params.alasanAnulir
 */
function akn_anulir(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.KADIV, ROLE.SUPERADMIN], null);

      var rowId = String(params.rowId || '').trim();
      var alasan = String(params.alasanAnulir || '').trim();

      if (!rowId) return { success: false, error: 'RowID tidak valid.' };
      if (!alasan) return { success: false, error: 'Alasan pembatalan/anulir wajib diisi.' };

      var sheet = openAwakSheet(SHEET_AWAK.PENGAWAKAN_AKN);
      var found = findRowByField(sheet, 'RowID', rowId);
      if (!found) {
        return { success: false, error: 'Baris data transaksi tidak ditemukan.' };
      }
      if (String(found.obj.Status).toUpperCase() !== ROW_STATUS.ACTIVE) {
        return { success: false, error: 'Hanya baris berstatus ACTIVE yang dapat dibatalkan.' };
      }

      var now = new Date();
      updateRowCells(sheet, found.rowIndex, {
        'Status': ROW_STATUS.VOID,
        'VoidReason': alasan,
        'VoidedBy': session.userId,
        'VoidedAt': now
      });

      _auditLog(session.userId, 'ANULIR_AKN', SHEET_AWAK.PENGAWAKAN_AKN, rowId,
        'Anulir data: ' + alasan);

      return {
        success: true,
        data: { message: 'Data berhasil dianulir.' }
      };
    });
  } catch (e) {
    Logger.log('[akn_anulir] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mengonfirmasi bahwa pada minggu berjalan tidak terjadi mutasi/perubahan personil.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.periode
 * @param {string} [params.catatan]
 */
function akn_konfirmasiTanpaMutasi(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.STAF, ROLE.KADIV, ROLE.SUPERADMIN], null);

      var p = String(params.periode || '').trim();
      if (!p) return { success: false, error: 'Periode wajib diisi.' };

      var sheet = openAwakSheet(SHEET_AWAK.KONFIRMASI_MINGGUAN);
      var rowId = 'AWAK-KFM-' + Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();
      var now = new Date();
      var catatan = String(params.catatan || 'Komposisi personil tetap sesuai minggu sebelumnya').trim();

      appendRowData(sheet, {
        'RowID': rowId,
        'DivisiID': DIVISI_ID.AWAK,
        'Periode': p,
        'SubmittedBy': session.userId,
        'Timestamp': now,
        'Status': ROW_STATUS.ACTIVE,
        'SupersedesRowID': '',
        'VoidReason': '',
        'VoidedBy': '',
        'VoidedAt': '',
        'Catatan': catatan
      });

      _auditLog(session.userId, 'KONFIRMASI_AKN', SHEET_AWAK.KONFIRMASI_MINGGUAN, rowId,
        'Pernyataan tanpa mutasi periode ' + p);

      return {
        success: true,
        data: {
          rowId: rowId,
          message: 'Pernyataan tanpa mutasi berhasil dicatat.'
        }
      };
    });
  } catch (e) {
    Logger.log('[akn_konfirmasiTanpaMutasi] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mengambil data deret waktu tren komposisi AKN untuk visualisasi grafik.
 *
 * @param {string} token
 * @param {number} [limit]
 */
function akn_getTren(token, limit) {
  try {
    _requireSession(token);
    var lim = limit || 8;

    var sheet = openAwakSheet(SHEET_AWAK.PENGAWAKAN_AKN);
    var rows = sheetToObjects(sheet);
    if (rows.length === 0) {
      akn_ensureSeeded();
      rows = sheetToObjects(sheet);
    }
    _healSwappedAknRows(sheet, rows);

    // Kumpulkan seluruh periode unik yang ada
    var periodeSet = {};
    rows.forEach(function (r) {
      if (r.Periode && String(r.Status || '').toUpperCase() === 'ACTIVE') {
        periodeSet[r.Periode] = true;
      }
    });

    var sortedPeriodes = Object.keys(periodeSet).sort();
    if (sortedPeriodes.length === 0) {
      sortedPeriodes = [akn_getCurrentPeriode()];
    }

    var selectedPeriodes = sortedPeriodes.slice(-lim);

    var tren = selectedPeriodes.map(function (p) {
      var res = resolveMatrix(rows, p);
      return {
        periode: p,
        totalKeseluruhan: res.totals.AKN_KESELURUHAN,
        totalPoa: res.totals.AKN_POA,
        matrix: res.matrix
      };
    });

    return { success: true, data: tren };
  } catch (e) {
    Logger.log('[akn_getTren] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mendapatkan format periode minggu berjalan secara otomatis (contoh: 2026-11-W01).
 */
function akn_getCurrentPeriode() {
  var d = new Date();
  var yyyy = d.getFullYear();
  var mm = d.getMonth() + 1;
  var strMm = mm < 10 ? '0' + mm : String(mm);

  // Hitung nomor minggu dalam bulan
  var day = d.getDate();
  var weekOfMonth = Math.ceil(day / 7);
  if (weekOfMonth > 4) weekOfMonth = 4;

  return yyyy + '-' + strMm + '-W0' + weekOfMonth;
}

/**
 * Inisialisasi baseline snapshot komposisi AKN (idempoten bila sheet masih kosong)
 * agar selaras dengan 396 personil pada Master_Awak.
 */
function akn_ensureSeeded() {
  try {
    var sheet = openAwakSheet(SHEET_AWAK.PENGAWAKAN_AKN);
    if (sheet.getLastRow() > 1) return;

    var curP = akn_getCurrentPeriode();
    var snapshots = [
      {
        periode: '2026-10-W02',
        kes: { PNS: 214, P3K: 116, P3K_PARUH_WAKTU: 22, PJLP: 36 },
        poa: { PNS: 80, P3K: 39, P3K_PARUH_WAKTU: 6, PJLP: 13 },
        ket: 'Snapshot komposisi rutin Oktober minggu ke-2'
      },
      {
        periode: '2026-10-W03',
        kes: { PNS: 216, P3K: 118, P3K_PARUH_WAKTU: 22, PJLP: 35 },
        poa: { PNS: 81, P3K: 40, P3K_PARUH_WAKTU: 6, PJLP: 12 },
        ket: 'Penempatan 2 perwira dek baru hasil diklat pembentukan'
      },
      {
        periode: '2026-10-W04',
        kes: { PNS: 217, P3K: 120, P3K_PARUH_WAKTU: 22, PJLP: 35 },
        poa: { PNS: 81, P3K: 41, P3K_PARUH_WAKTU: 6, PJLP: 12 },
        ket: 'Penyesuaian SK penugasan kapal pengawas wilayah barat'
      },
      {
        periode: curP,
        kes: { PNS: 218, P3K: 122, P3K_PARUH_WAKTU: 22, PJLP: 34 },
        poa: { PNS: 82, P3K: 42, P3K_PARUH_WAKTU: 6, PJLP: 12 },
        ket: 'Rekapitulasi kekuatan 396 awak kapal pengawas aktif periode berjalan'
      }
    ];

    var headers = STD_COLS.concat(['Scope', 'Kategori', 'Jumlah', 'Keterangan', 'BatchID']);
    var outRows = [];
    var now = new Date();

    snapshots.forEach(function (snap, sIdx) {
      var bId = 'BATCH-SEED-0' + (sIdx + 1);
      AKN_KATEGORIS.forEach(function (kat, kIdx) {
        outRows.push([
          'AKN-SEED-' + (sIdx + 1) + '-K' + (kIdx + 1), DIVISI_ID.AWAK, snap.periode, 'USR-KATIMJA-AWAK-001',
          now, 'ACTIVE', '', '', '', '', 'AKN_KESELURUHAN', kat, snap.kes[kat], snap.ket, bId
        ]);
        outRows.push([
          'AKN-SEED-' + (sIdx + 1) + '-P' + (kIdx + 1), DIVISI_ID.AWAK, snap.periode, 'USR-KATIMJA-AWAK-001',
          now, 'ACTIVE', '', '', '', '', 'AKN_POA', kat, snap.poa[kat], snap.ket, bId
        ]);
      });
    });

    if (outRows.length > 0) {
      sheet.getRange(2, 1, outRows.length, headers.length).setValues(outRows);
      if (typeof applyFormalSheetFormatting === 'function') {
        applyFormalSheetFormatting(sheet, SHEET_AWAK.PENGAWAKAN_AKN);
      }
    }
  } catch (e) {
    Logger.log('[akn_ensureSeeded] ' + e.message);
  }
}

/**
 * Menghitung kesimpulan komposisi AKN secara otomatis langsung dari data riil personil (Master_Awak).
 * Menjamin integritas data: Komposisi AKN tidak diisi manual lepas,
 * melainkan selalu merupakan kesimpulan agregat dari data pegawai aktif (by-name by-NIP).
 *
 * @param {string} userId - ID pengguna yang memicu pembaruan
 * @param {string} [keteranganMutasi] - Keterangan perubahan
 * @returns {Object}
 */
function akn_syncFromAwak(userId, keteranganMutasi) {
  try {
    var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var rowsAwak = sheetToObjects(sheetAwak);
    if ((!rowsAwak || rowsAwak.length === 0) && typeof dir_ensureSeeded === 'function') {
      dir_ensureSeeded();
      rowsAwak = sheetToObjects(sheetAwak);
    }
    if (!rowsAwak || rowsAwak.length === 0) {
      return { success: false, error: 'Data direktori awak kosong.' };
    }

    if (typeof _healMasterAwakKelasIfNeeded === 'function') {
      _healMasterAwakKelasIfNeeded(sheetAwak, rowsAwak);
    }

    var curPeriode = akn_getCurrentPeriode();
    var counts = akn_aggregateAwakRows(rowsAwak);

    var sheetAkn = openAwakSheet(SHEET_AWAK.PENGAWAKAN_AKN);
    var batchId = 'BATCH-AUTO-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
    var now = new Date();
    var ket = keteranganMutasi || 'Agregasi otomatis perubahan data personil awak armada';

    var categories = AKN_KATEGORIS;
    var toAppend = [];

    // Perbaiki baris tertukar bila ada, migrasi 4 kategori, lalu tandai seluruh baris aktif periode berjalan sebagai SUPERSEDED
    var existingAknRows = sheetToObjects(sheetAkn);
    _healSwappedAknRows(sheetAkn, existingAknRows);
    if (_healAknKategori4(sheetAkn, existingAknRows)) {
      existingAknRows = sheetToObjects(sheetAkn);
    }
    for (var i = 0; i < existingAknRows.length; i++) {
      var r = existingAknRows[i];
      if (String(r.Periode || '') === curPeriode && String(r.Status || '').toUpperCase() === 'ACTIVE') {
        updateRowCells(sheetAkn, i + 2, { 'Status': 'SUPERSEDED' });
      }
    }

    categories.forEach(function (k) {
      toAppend.push([
        'AKN-AUTO-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase(),
        DIVISI_ID.AWAK,
        curPeriode,
        userId || 'SYSTEM',
        now,
        'ACTIVE',
        '', '', '', '',
        'AKN_KESELURUHAN',
        k,
        counts.AKN_KESELURUHAN[k],
        ket,
        batchId
      ]);

      toAppend.push([
        'AKN-AUTO-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase(),
        DIVISI_ID.AWAK,
        curPeriode,
        userId || 'SYSTEM',
        now,
        'ACTIVE',
        '', '', '', '',
        'AKN_POA',
        k,
        counts.AKN_POA[k],
        ket,
        batchId
      ]);
    });

    if (toAppend.length > 0) {
      var startRow = sheetAkn.getLastRow() + 1;
      sheetAkn.getRange(startRow, 1, toAppend.length, toAppend[0].length).setValues(toAppend);
      if (typeof applyFormalSheetFormatting === 'function') {
        applyFormalSheetFormatting(sheetAkn, SHEET_AWAK.PENGAWAKAN_AKN);
      }
    }

    Logger.log('[akn_syncFromAwak] Komposisi AKN berhasil disimpulkan otomatis dari data pegawai untuk periode ' + curPeriode);
    return { success: true, counts: counts, periode: curPeriode };
  } catch (e) {
    Logger.log('[akn_syncFromAwak] Error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Endpoint RPC untuk rekalkulasi kesimpulan komposisi langsung dari Direktori Awak.
 *
 * @param {string} token
 * @returns {Object}
 */
function akn_recalculate(token) {
  try {
    return withLock(function () {
      var session = _requireSession(token);
      assertScope(session, [ROLE.SUPERADMIN, ROLE.KADIV, ROLE.STAF], null);
      var syncRes = akn_syncFromAwak(session.userId, 'Rekalkulasi manual kesimpulan agregat dari data riil pegawai');
      if (!syncRes.success) return syncRes;
      return akn_getPapan(token, syncRes.periode);
    });
  } catch (e) {
    Logger.log('[akn_recalculate] ' + e.message);
    return { success: false, error: e.message };
  }
}



