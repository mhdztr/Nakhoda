/**
 * data/SheetAccess.js
 * Layer akses data generik + assertScope RBAC + hashPassword (Nakhoda)
 */

// ===========================================================================
// RBAC
// ===========================================================================

/**
 * Validasi bahwa session memiliki scope yang dibutuhkan.
 *
 * @param {Object} session
 * @param {string[]|null} allowedRoles
 * @param {string|null} requiredDivisiId
 */
function assertScope(session, allowedRoles, requiredDivisiId) {
  if (!session || !session.userId) {
    throw new Error('UNAUTHORIZED: Sesi tidak valid atau sudah berakhir. Silakan login ulang.');
  }
  if (session.status !== USER_STATUS.APPROVED) {
    throw new Error('FORBIDDEN: Akun belum disetujui atau sudah tidak aktif.');
  }
  if (allowedRoles && allowedRoles.length > 0) {
    if (allowedRoles.indexOf(session.role) === -1) {
      throw new Error('FORBIDDEN: Role ' + session.role + ' tidak memiliki akses ke operasi ini.');
    }
  }
  if (requiredDivisiId) {
    if (session.role !== ROLE.SUPERADMIN && session.role !== ROLE.DIREKTUR) {
      if (session.divisiId !== requiredDivisiId) {
        throw new Error(
          'FORBIDDEN: Akses terbatas ke divisi ' + requiredDivisiId +
          '. Akun Anda terdaftar di divisi ' + session.divisiId + '.'
        );
      }
    }
  }
}

// ===========================================================================
// HASHING — SHA-256 / HMAC dengan salt & pepper
// ===========================================================================

function hashPassword(plaintext, salt) {
  var props = PropertiesService.getScriptProperties();
  var pepper = props ? (props.getProperty(PROP_KEY.PEPPER) || '') : '';
  var toHash = String(plaintext || '') + ':' + String(salt || '') + ':' + pepper;

  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    toHash,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    var hex = (b < 0 ? b + 256 : b).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// ===========================================================================
// SHEET OPENERS
// ===========================================================================

function openMasterSheet(sheetName) {
  var ids = getSpreadsheetIds();
  var ss = null;
  if (ids.masterId) {
    try {
      ss = SpreadsheetApp.openById(ids.masterId);
    } catch (e) {
      Logger.log('[openMasterSheet] masterId ' + ids.masterId + ' gagal dibuka: ' + e.message);
    }
  }
  if (!ss) {
    var awakId = ensureAwakSpreadsheet();
    ss = SpreadsheetApp.openById(awakId);
  }
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = _autoCreateMasterSheet(ss, sheetName);
  }
  return sheet;
}

function openTransaksiSheet(sheetName) {
  return openAwakSheet(sheetName);
}

function openLogSheet(sheetName) {
  var ids = getSpreadsheetIds();
  var ss = null;
  if (ids.logId) {
    try {
      ss = SpreadsheetApp.openById(ids.logId);
    } catch (e) {
      Logger.log('[openLogSheet] logId ' + ids.logId + ' err: ' + e.message);
    }
  }
  if (!ss) {
    var awakId = ensureAwakSpreadsheet();
    ss = SpreadsheetApp.openById(awakId);
  }
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = _autoCreateLogSheet(ss, sheetName);
  }
  return sheet;
}

/**
 * Membuka sheet pada database satelit RadarPOA_Nakhoda_DB.
 * Self-healing: otomatis membuat spreadsheet dan sheet jika belum ada.
 *
 * @param {string} sheetName - nama sheet (SHEET_AWAK.*)
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function openAwakSheet(sheetName) {
  var props = PropertiesService.getScriptProperties();
  var awakId = props.getProperty(PROP_KEY.AWAK_SS_ID) || props.getProperty(PROP_KEY.NAKHODA_SS_ID);
  var ss = null;
  if (awakId) {
    try {
      ss = SpreadsheetApp.openById(awakId);
    } catch (e) {
      Logger.log('[openAwakSheet] ID lama tidak valid: ' + e.message);
    }
  }
  if (!ss) {
    awakId = ensureAwakSpreadsheet();
    ss = SpreadsheetApp.openById(awakId);
  }
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = _autoCreateAwakSheet(ss, sheetName);
  }
  return sheet;
}

/**
 * Memastikan spreadsheet satelit RadarPOA_Nakhoda_DB sudah ada.
 * Idempoten: mengembalikan ID yang tersimpan jika valid.
 * @returns {string} ID spreadsheet
 */
function ensureAwakSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var awakId = props.getProperty(PROP_KEY.AWAK_SS_ID) || props.getProperty(PROP_KEY.NAKHODA_SS_ID);
  if (awakId) {
    try {
      SpreadsheetApp.openById(awakId);
      return awakId;
    } catch (e) {
      Logger.log('[ensureAwakSpreadsheet] ID lama tidak valid, membuat baru...');
    }
  }

  var ss = SpreadsheetApp.create(SS_NAME.AWAK);
  awakId = ss.getId();
  props.setProperty(PROP_KEY.AWAK_SS_ID, awakId);
  Logger.log('[ensureAwakSpreadsheet] RadarPOA_Nakhoda_DB berhasil dibuat dengan ID: ' + awakId);

  // Inisialisasi sheet standar Pengawakan
  _autoCreateAwakSheet(ss, SHEET_AWAK.PENGAWAKAN_AKN);
  _autoCreateAwakSheet(ss, SHEET_AWAK.PENGAWAKAN_KEGIATAN);
  _autoCreateAwakSheet(ss, SHEET_AWAK.KEGIATAN_PESERTA);
  _autoCreateAwakSheet(ss, SHEET_AWAK.MASTER_AWAK);
  _autoCreateAwakSheet(ss, SHEET_AWAK.PELATIHAN_AWAK);
  _autoCreateAwakSheet(ss, SHEET_AWAK.PENUGASAN_KAPAL);
  _autoCreateAwakSheet(ss, SHEET_AWAK.KONFIRMASI_MINGGUAN);
  _autoCreateAwakSheet(ss, SHEET_AWAK.MASTER_STANDAR_PELATIHAN);
  _autoCreateAwakSheet(ss, SHEET_AWAK.MASTER_SAFE_MANNING);
  _autoCreateAwakSheet(ss, SHEET_AWAK.EVIDENCE);

  // Hapus Sheet1 default
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() === 'Sheet1' && sheets.length > 1) {
      try { ss.deleteSheet(sheets[i]); } catch (err) {}
      break;
    }
  }

  return awakId;
}

function _autoCreateAwakSheet(ss, sheetName) {
  var existing = ss.getSheetByName(sheetName);
  if (existing) return existing;

  var headers = [];
  if (sheetName === SHEET_AWAK.PENGAWAKAN_AKN) {
    headers = STD_COLS.concat(['Scope', 'Kategori', 'Jumlah', 'Keterangan', 'BatchID']);
  } else if (sheetName === SHEET_AWAK.PENGAWAKAN_KEGIATAN) {
    headers = STD_COLS.concat([
      'JudulKegiatan', 'JenisKegiatan', 'TanggalMulai', 'TanggalSelesai',
      'Wilayah', 'JumlahPeserta', 'Deskripsi', 'EvidenceUrl'
    ]);
  } else if (sheetName === SHEET_AWAK.KEGIATAN_PESERTA) {
    headers = STD_COLS.concat(['ParentRowID', 'PegawaiID', 'Catatan']);
  } else if (sheetName === SHEET_AWAK.MASTER_AWAK) {
    headers = [
      'PegawaiID', 'NIP', 'Nama', 'KelompokJabatan', 'JabatanLengkap',
      'KelasKapal', 'Rumpun', 'KategoriKepegawaian', 'StatusAktif',
      'PangkalanID', 'KapalID', 'TanggalMulaiKerja', 'TanggalSelesaiKontrak',
      'NomorBukuPelaut', 'Catatan', 'UpdatedAt', 'UpdatedBy'
    ];
  } else if (sheetName === SHEET_AWAK.PELATIHAN_AWAK) {
    headers = STD_COLS.concat([
      'PegawaiID', 'KodePelatihan', 'NamaPelatihan', 'StatusKelulusan',
      'NomorSertifikat', 'TahunPelatihan', 'TanggalTerbit', 'BerlakuSampai',
      'PenerbitLembaga', 'EvidenceID'
    ]);
  } else if (sheetName === SHEET_AWAK.PENUGASAN_KAPAL) {
    headers = STD_COLS.concat([
      'PegawaiID', 'KapalID', 'PosSijil', 'TanggalNaik', 'TanggalTurun', 'Keterangan'
    ]);
  } else if (sheetName === SHEET_AWAK.KONFIRMASI_MINGGUAN) {
    headers = STD_COLS.concat(['Catatan']);
  } else if (sheetName === SHEET_AWAK.MASTER_STANDAR_PELATIHAN) {
    headers = [
      'KodePelatihan', 'KelompokJabatan', 'TingkatKelas', 'Kategori',
      'NamaPelatihan', 'MasaBerlakuBulan', 'Wajib', 'Urutan'
    ];
  } else if (sheetName === SHEET_AWAK.MASTER_SAFE_MANNING) {
    headers = ['ManningID', 'KelasKapal', 'PosSijil', 'Minimum', 'BerlakuMulai', 'Sumber'];
  } else if (sheetName === SHEET_AWAK.EVIDENCE) {
    headers = [
      'EvidenceID', 'RefSheet', 'RefRowID', 'DriveFileID', 'FileName',
      'FileType', 'SourceMode', 'UploadedBy', 'UploadedAt', 'Status', 'Catatan'
    ];
  } else {
    headers = STD_COLS;
  }

  var created = ss.insertSheet(sheetName);
  created.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#E8EAF6');
  created.setFrozenRows(1);
  Logger.log('[_autoCreateAwakSheet] Sheet ' + sheetName + ' dibuat otomatis di DB Nakhoda.');
  return created;
}

function _autoCreateMasterSheet(ss, sheetName) {
  var existing = ss.getSheetByName(sheetName);
  if (existing) return existing;

  var headers = [];
  var seedRows = [];

  if (sheetName === SHEET_MASTER.USERS) {
    headers = [
      'UserID', 'Nama', 'Email', 'NIP', 'PasswordHash', 'Salt',
      'DivisiID', 'Role', 'Status', 'ApprovedBy', 'RegisteredAt', 'ApprovedAt'
    ];
  } else if (sheetName === SHEET_MASTER.DIVISI) {
    headers = ['DivisiID', 'NamaResmi', 'NamaDashboard', 'Kode'];
    seedRows = [
      ['DIV-AWAK', 'Subdirektorat Pengawakan Armada', 'Pengawakan', 'AWAK'],
      ['DIV-TU', 'Subbagian Tata Usaha', 'Tata Usaha', 'TU']
    ];
  } else if (sheetName === SHEET_MASTER.OPSI) {
    headers = ['Kode', 'Urutan', 'Label', 'LabelTampil', 'Aktif', 'DibuatOleh', 'DibuatAt'];
  } else if (sheetName === SHEET_MASTER.KAPAL) {
    headers = ['KapalID', 'NamaKapal', 'JenisKapal', 'KelasKapal', 'PangkalanID', 'StatusOperasi'];
  } else {
    headers = ['ID', 'Nama', 'Keterangan'];
  }

  var created = ss.insertSheet(sheetName);
  created.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#E8EAF6');
  created.setFrozenRows(1);

  if (seedRows.length > 0) {
    created.getRange(2, 1, seedRows.length, seedRows[0].length).setValues(seedRows);
  }
  return created;
}

function _autoCreateLogSheet(ss, sheetName) {
  var existing = ss.getSheetByName(sheetName);
  if (existing) return existing;

  var headers = [];
  if (sheetName === SHEET_LOG.APPROVAL_QUEUE) {
    headers = [
      'QueueID', 'UserID', 'RoleDilamar', 'DivisiID', 'Status',
      'KeputusanOleh', 'KeputusanAt', 'AlasanReject', 'CreatedAt'
    ];
  } else if (sheetName === SHEET_LOG.AUDIT_LOG) {
    headers = ['LogID', 'UserID', 'Aksi', 'SheetTarget', 'RowIDTarget', 'Alasan', 'Sebelum', 'Sesudah', 'Timestamp'];
  } else if (sheetName === SHEET_LOG.NOTIFICATIONS) {
    headers = ['NotifID', 'UserID', 'Jenis', 'Pesan', 'IsRead', 'CreatedAt'];
  } else {
    headers = ['LogID', 'UserID', 'Aksi', 'Timestamp'];
  }

  var created = ss.insertSheet(sheetName);
  created.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#F1F5F9');
  created.setFrozenRows(1);
  return created;
}

// ===========================================================================
// ROW READING & WRITING HELPERS
// ===========================================================================

function sheetToObjects(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function findRowByField(sheet, colName, value) {
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  var colIdx = headers.indexOf(colName);
  if (colIdx === -1) return null;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(value)) {
      var obj = {};
      headers.forEach(function (h, j) { obj[h] = data[i][j]; });
      return { obj: obj, rowIndex: i + 1 };
    }
  }
  return null;
}

function findRowById(sheet, rowId) {
  return findRowByField(sheet, 'RowID', rowId);
}

function bumpTxVersion(sheetName) {
  try {
    var cache = CacheService.getScriptCache();
    var key = 'tx_ver_' + String(sheetName || 'global');
    var curr = parseInt(cache.get(key) || '0', 10);
    cache.put(key, String(curr + 1), 21600);
  } catch (e) {
    Logger.log('[bumpTxVersion] ' + e.message);
  }
}

function appendRowData(sheet, dataObj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = headers.map(function (h) {
    return dataObj[h] !== undefined ? dataObj[h] : '';
  });
  sheet.appendRow(newRow);
  bumpTxVersion(sheet.getName());
}

function updateRowCells(sheet, rowIndex, updates) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Object.keys(updates).forEach(function (key) {
    var colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      sheet.getRange(rowIndex, colIdx + 1).setValue(updates[key]);
    }
  });
  bumpTxVersion(sheet.getName());
}

// ===========================================================================
// OPSI HELPERS
// ===========================================================================

function getOpsiList(kode) {
  try {
    var sheet = openMasterSheet(SHEET_MASTER.OPSI);
    var rows = sheetToObjects(sheet);
    return rows.filter(function (r) {
      return String(r['Kode']) === String(kode) && (r['Aktif'] === true || String(r['Aktif']).toUpperCase() === 'TRUE');
    }).map(function (r) {
      return String(r['Label']);
    });
  } catch (e) {
    Logger.log('[getOpsiList] ' + e.message);
    return [];
  }
}

function getOpsiLabelMap(kode) {
  try {
    var sheet = openMasterSheet(SHEET_MASTER.OPSI);
    var rows = sheetToObjects(sheet);
    var map = {};
    rows.filter(function (r) {
      return String(r['Kode']) === String(kode);
    }).forEach(function (r) {
      map[String(r['Label'])] = String(r['LabelTampil'] || r['Label']);
    });
    return map;
  } catch (e) {
    Logger.log('[getOpsiLabelMap] ' + e.message);
    return {};
  }
}

function getOpsiItems(kode) {
  try {
    var sheet = openMasterSheet(SHEET_MASTER.OPSI);
    var rows = sheetToObjects(sheet);
    return rows.filter(function (r) {
      return String(r['Kode']) === String(kode) && (r['Aktif'] === true || String(r['Aktif']).toUpperCase() === 'TRUE');
    }).map(function (r) {
      return { token: String(r['Label']), label: String(r['LabelTampil'] || r['Label']) };
    });
  } catch (e) {
    Logger.log('[getOpsiItems] ' + e.message);
    return [];
  }
}

function logAudit(userId, aksi, sheetTarget, rowIdTarget, alasan, sebelum, sesudah) {
  try {
    var sheet = openLogSheet(SHEET_LOG.AUDIT_LOG);
    var logId = 'AWAK-AUD-' + Utilities.getUuid().substring(0, 10).toUpperCase();
    var row = [
      logId,
      String(userId || 'SYSTEM'),
      String(aksi || 'UNKNOWN'),
      String(sheetTarget || ''),
      String(rowIdTarget || ''),
      String(alasan || ''),
      sebelum ? JSON.stringify(sebelum) : '',
      sesudah ? JSON.stringify(sesudah) : '',
      new Date().toISOString()
    ];
    sheet.appendRow(row);
  } catch (e) {
    Logger.log('[logAudit] err: ' + e.message);
  }
}
