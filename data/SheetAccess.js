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
  if (sheetName === SHEET_MASTER.USERS) {
    _ensureDefaultUsersSeeded(sheet);
  }
  return sheet;
}

/**
 * Memastikan akun-akun default (Superadmin, Katimja, Staf) ter-seed secara idempoten.
 */
function _ensureDefaultUsersSeeded(usersSheet) {
  try {
    var data = usersSheet.getDataRange().getValues();
    if (data.length <= 1) {
      // Sheet kosong atau hanya header -> seed ketiga akun
      _appendDefaultUsers(usersSheet);
      return;
    }

    var headers = data[0];
    var emailIdx = headers.indexOf('Email');
    var nipIdx = headers.indexOf('NIP');
    var existingEmails = {};
    for (var i = 1; i < data.length; i++) {
      if (emailIdx !== -1 && data[i][emailIdx]) {
        existingEmails[String(data[i][emailIdx]).trim().toLowerCase()] = true;
      }
    }

    if (!existingEmails['superadmin@nakhoda.go.id']) {
      _appendDefaultUsers(usersSheet);
    }
  } catch (e) {
    Logger.log('[_ensureDefaultUsersSeeded] ' + e.message);
  }
}

function _appendDefaultUsers(usersSheet) {
  var now = new Date();
  var defaultUsers = [
    {
      'UserID': 'USR-SUPERADMIN-001',
      'Nama': 'Super Administrator Nakhoda',
      'Email': 'superadmin@nakhoda.go.id',
      'NIP': '198501012010011001',
      'PasswordHash': hashPassword('Nakhoda2026!'),
      'DivisiID': DIVISI_ID.AWAK,
      'Role': ROLE.SUPERADMIN,
      'Status': USER_STATUS.APPROVED,
      'ApprovedBy': 'SYSTEM',
      'RegisteredAt': now,
      'ApprovedAt': now
    },
    {
      'UserID': 'USR-KATIMJA-AWAK-001',
      'Nama': 'Ketua Timja Pengawakan',
      'Email': 'katimja.awak@nakhoda.go.id',
      'NIP': '198207152006041002',
      'PasswordHash': hashPassword('Katimja2026!'),
      'DivisiID': DIVISI_ID.AWAK,
      'Role': ROLE.KADIV,
      'Status': USER_STATUS.APPROVED,
      'ApprovedBy': 'USR-SUPERADMIN-001',
      'RegisteredAt': now,
      'ApprovedAt': now
    },
    {
      'UserID': 'USR-STAF-AWAK-001',
      'Nama': 'Staf Pengawakan Armada',
      'Email': 'staf.awak@nakhoda.go.id',
      'NIP': '199402102019021003',
      'PasswordHash': hashPassword('StafAwak2026!'),
      'DivisiID': DIVISI_ID.AWAK,
      'Role': ROLE.STAF,
      'Status': USER_STATUS.APPROVED,
      'ApprovedBy': 'USR-KATIMJA-AWAK-001',
      'RegisteredAt': now,
      'ApprovedAt': now
    }
  ];

  defaultUsers.forEach(function (u) {
    appendRowData(usersSheet, u);
  });
  Logger.log('[_appendDefaultUsers] 3 akun default Nakhoda berhasil di-seed.');
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
      'KelasKapal', 'Rumpun', 'KategoriKepegawaian', 'StatusAktif', 'StatusPenempatan',
      'PangkalanID', 'KapalID', 'TanggalMulaiKerja', 'TanggalSelesaiKontrak',
      'NomorSKPenempatan', 'DokumenPenempatanURL', 'UkuranBaju', 'UkuranSepatu',
      'Catatan', 'UpdatedAt', 'UpdatedBy'
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
  created.getRange(1, 1, 1, headers.length).setValues([headers]);
  applyFormalSheetFormatting(created, sheetName);
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
  created.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (seedRows.length > 0) {
    created.getRange(2, 1, seedRows.length, seedRows[0].length).setValues(seedRows);
  }
  applyFormalSheetFormatting(created, sheetName);
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
  created.getRange(1, 1, 1, headers.length).setValues([headers]);
  applyFormalSheetFormatting(created, sheetName);
  return created;
}

// ===========================================================================
// STANDAR FORMAT SHEET FORMAL & HUMAN-READABLE (SheetFormatter)
// ===========================================================================

var _FMT_COL_WIDTHS = {
  RowID: 145, PegawaiID: 120, QueueID: 140, LogID: 140, NotifID: 140,
  EvidenceID: 140, ManningID: 125, UserID: 145, BatchID: 175, ParentRowID: 145,
  DivisiID: 100, Periode: 115, NIP: 165, NomorSertifikat: 165, NomorSKPenempatan: 175,
  Nama: 240, Email: 210, KelompokJabatan: 165, JabatanLengkap: 260, PosSijil: 145,
  KelasKapal: 110, TingkatKelas: 110, Rumpun: 110, KategoriKepegawaian: 155,
  Kategori: 155, Scope: 150, Status: 115, StatusAktif: 120, StatusPenempatan: 165,
  StatusKelulusan: 140, PangkalanID: 120, KapalID: 160, NamaKapal: 185, Wilayah: 180,
  JudulKegiatan: 260, JenisKegiatan: 160, KodePelatihan: 125, NamaPelatihan: 260,
  PenerbitLembaga: 220, DokumenPenempatanURL: 220, EvidenceUrl: 220,
  UkuranBaju: 105, UkuranSepatu: 105, Jumlah: 95, Minimum: 95, JumlahPeserta: 115,
  TahunPelatihan: 115, MasaBerlakuBulan: 125, Urutan: 80,
  TanggalMulai: 120, TanggalSelesai: 120, TanggalMulaiKerja: 120, TanggalSelesaiKontrak: 135,
  TanggalTerbit: 120, BerlakuSampai: 120, TanggalNaik: 120, TanggalTurun: 120, BerlakuMulai: 120,
  Timestamp: 155, UpdatedAt: 155, UploadedAt: 155, VoidedAt: 155, RegisteredAt: 155, ApprovedAt: 155,
  Catatan: 300, Keterangan: 300, Deskripsi: 320, VoidReason: 240, Alasan: 240, Sumber: 220
};

var _FMT_PLAIN_TEXT_COLS = {
  NIP: true, NomorSertifikat: true, NomorSKPenempatan: true, UkuranSepatu: true,
  PegawaiID: true, RowID: true, BatchID: true, ParentRowID: true, EvidenceID: true,
  KodePelatihan: true, ManningID: true
};

var _FMT_ISO_DATE_COLS = {
  TanggalMulai: true, TanggalSelesai: true, TanggalMulaiKerja: true,
  TanggalSelesaiKontrak: true, TanggalTerbit: true, BerlakuSampai: true,
  TanggalNaik: true, TanggalTurun: true, BerlakuMulai: true
};

var _FMT_TIMESTAMP_COLS = {
  Timestamp: true, UpdatedAt: true, UploadedAt: true, VoidedAt: true,
  RegisteredAt: true, ApprovedAt: true, CreatedAt: true, KeputusanAt: true
};

var _FMT_NUMBER_COLS = {
  Jumlah: true, Minimum: true, JumlahPeserta: true,
  TahunPelatihan: true, MasaBerlakuBulan: true, Urutan: true
};

var _FMT_CENTER_COLS = {
  PegawaiID: true, NIP: true, DivisiID: true, Periode: true, Status: true,
  StatusAktif: true, StatusPenempatan: true, KelasKapal: true, TingkatKelas: true,
  Rumpun: true, Kategori: true, KategoriKepegawaian: true, Scope: true,
  UkuranBaju: true, UkuranSepatu: true, KodePelatihan: true, ManningID: true,
  TanggalMulai: true, TanggalSelesai: true, TanggalMulaiKerja: true,
  TanggalSelesaiKontrak: true, TanggalTerbit: true, BerlakuSampai: true,
  TanggalNaik: true, TanggalTurun: true, BerlakuMulai: true,
  Timestamp: true, UpdatedAt: true, UploadedAt: true, VoidedAt: true
};

var _FMT_WRAP_COLS = {
  Catatan: true, Keterangan: true, Deskripsi: true, VoidReason: true,
  Alasan: true, Sumber: true, JabatanLengkap: true, NamaPelatihan: true
};

function _formatIsoDateString(val) {
  if (!val && val !== 0) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.formatDate === 'function') {
      return Utilities.formatDate(val, 'GMT+7', 'yyyy-MM-dd');
    }
    var y = val.getFullYear();
    var m = val.getMonth() + 1;
    var d = val.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
  }
  var s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  return s;
}

function _normalizeWriteValue(colName, val) {
  if (val === undefined || val === null) return '';
  if (_FMT_ISO_DATE_COLS[colName] && val !== '') {
    return _formatIsoDateString(val);
  }
  if (_FMT_PLAIN_TEXT_COLS[colName] && val !== '') {
    return String(val);
  }
  return val;
}

/**
 * Menerapkan pemformatan Google Sheet formal & human-readable pada suatu sheet:
 * - Header Slate (#0F172A untuk Master, #1E293B untuk Transaksi), teks putih tebal, tinggi 34px, baris beku
 * - Data 26px, zebra banding (#FFFFFF / #F8FAFC), border #E2E8F0, vertikal MIDDLE
 * - Format teks '@' untuk NIP & nomor seri agar tidak menjadi notasi ilmiah
 * - Tanggal ISO yyyy-mm-dd, angka #,##0, lebar kolom proporsional
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} [sheetName]
 */
function applyFormalSheetFormatting(sheet, sheetName) {
  try {
    if (!sheet || typeof sheet.getLastColumn !== 'function') return;
    var lastCol = sheet.getLastColumn();
    var lastRow = typeof sheet.getLastRow === 'function' ? sheet.getLastRow() : 1;
    if (lastCol < 1 || lastRow < 1) return;

    var name = String(sheetName || (typeof sheet.getName === 'function' ? sheet.getName() : '')).trim();
    var isMaster = name.indexOf('Master') === 0 || name === 'Users' || name === 'Divisi' || name === 'Opsi' || name === 'Kapal';
    var headerBg = isMaster ? '#0F172A' : '#1E293B';

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
    var headerRange = sheet.getRange(1, 1, 1, lastCol);

    if (typeof headerRange.setBackground === 'function') headerRange.setBackground(headerBg);
    if (typeof headerRange.setFontColor === 'function') headerRange.setFontColor('#FFFFFF');
    if (typeof headerRange.setFontFamily === 'function') headerRange.setFontFamily('Arial');
    if (typeof headerRange.setFontSize === 'function') headerRange.setFontSize(10);
    if (typeof headerRange.setFontWeight === 'function') headerRange.setFontWeight('bold');
    if (typeof headerRange.setVerticalAlignment === 'function') headerRange.setVerticalAlignment('middle');
    if (typeof headerRange.setWrap === 'function') headerRange.setWrap(true);
    if (typeof sheet.setFrozenRows === 'function') sheet.setFrozenRows(1);
    if (typeof sheet.setRowHeight === 'function') sheet.setRowHeight(1, 34);

    // Atur perataan header & lebar kolom
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c] || '').trim();
      var colIdx = c + 1;
      var colWidth = _FMT_COL_WIDTHS[h] || 140;
      if (typeof sheet.setColumnWidth === 'function') {
        sheet.setColumnWidth(colIdx, colWidth);
      }
      var align = _FMT_NUMBER_COLS[h] ? 'right' : (_FMT_CENTER_COLS[h] ? 'center' : 'left');
      var hCell = sheet.getRange(1, colIdx);
      if (typeof hCell.setHorizontalAlignment === 'function') hCell.setHorizontalAlignment(align);
    }

    if (lastRow < 2) return;
    var numDataRows = lastRow - 1;
    var dataRange = sheet.getRange(2, 1, numDataRows, lastCol);

    if (typeof dataRange.setFontFamily === 'function') dataRange.setFontFamily('Arial');
    if (typeof dataRange.setFontSize === 'function') dataRange.setFontSize(10);
    if (typeof dataRange.setFontColor === 'function') dataRange.setFontColor('#0F172A');
    if (typeof dataRange.setVerticalAlignment === 'function') dataRange.setVerticalAlignment('middle');
    if (typeof dataRange.setBorder === 'function') {
      dataRange.setBorder(true, true, true, true, true, true, '#E2E8F0', null);
    }

    // Zebra banding
    if (typeof dataRange.setBackgrounds === 'function') {
      var bgs = [];
      for (var r = 0; r < numDataRows; r++) {
        var rowBg = (r % 2 === 1) ? '#F8FAFC' : '#FFFFFF';
        var rowColors = [];
        for (var k = 0; k < lastCol; k++) rowColors.push(rowBg);
        bgs.push(rowColors);
      }
      dataRange.setBackgrounds(bgs);
    }

    if (typeof sheet.setRowHeights === 'function') {
      sheet.setRowHeights(2, numDataRows, 26);
    } else if (typeof sheet.setRowHeight === 'function') {
      var maxRowHeightApply = Math.min(numDataRows, 200);
      for (var ri = 2; ri < 2 + maxRowHeightApply; ri++) {
        sheet.setRowHeight(ri, 26);
      }
    }

    // Format kolom data secara batch per kolom
    for (var ci = 0; ci < headers.length; ci++) {
      var colName = String(headers[ci] || '').trim();
      var colRange = sheet.getRange(2, ci + 1, numDataRows, 1);

      if (_FMT_PLAIN_TEXT_COLS[colName] && typeof colRange.setNumberFormat === 'function') {
        colRange.setNumberFormat('@');
      } else if (_FMT_ISO_DATE_COLS[colName] && typeof colRange.setNumberFormat === 'function') {
        colRange.setNumberFormat('yyyy-mm-dd');
      } else if (_FMT_TIMESTAMP_COLS[colName] && typeof colRange.setNumberFormat === 'function') {
        colRange.setNumberFormat('yyyy-mm-dd hh:mm:ss');
      } else if (_FMT_NUMBER_COLS[colName] && typeof colRange.setNumberFormat === 'function') {
        colRange.setNumberFormat('#,##0');
      }

      if (typeof colRange.setHorizontalAlignment === 'function') {
        var colAlign = _FMT_NUMBER_COLS[colName] ? 'right' : (_FMT_CENTER_COLS[colName] ? 'center' : 'left');
        colRange.setHorizontalAlignment(colAlign);
      }
      if (typeof colRange.setWrap === 'function') {
        colRange.setWrap(!!_FMT_WRAP_COLS[colName]);
      }
    }
  } catch (eFmt) {
    Logger.log('[applyFormalSheetFormatting] Notice: ' + eFmt.message);
  }
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
    return _normalizeWriteValue(h, dataObj[h]);
  });
  sheet.appendRow(newRow);
  var newRowIdx = typeof sheet.getLastRow === 'function' ? sheet.getLastRow() : 0;
  if (newRowIdx >= 2) {
    for (var i = 0; i < headers.length; i++) {
      if (_FMT_PLAIN_TEXT_COLS[headers[i]]) {
        var c = sheet.getRange(newRowIdx, i + 1);
        if (typeof c.setNumberFormat === 'function') c.setNumberFormat('@');
      }
    }
  }
  bumpTxVersion(sheet.getName());
}

function updateRowCells(sheet, rowIndex, updates) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Object.keys(updates).forEach(function (key) {
    var colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      var cell = sheet.getRange(rowIndex, colIdx + 1);
      if (_FMT_PLAIN_TEXT_COLS[key] && typeof cell.setNumberFormat === 'function') {
        cell.setNumberFormat('@');
      }
      cell.setValue(_normalizeWriteValue(key, updates[key]));
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
