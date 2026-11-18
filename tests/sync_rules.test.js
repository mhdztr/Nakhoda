const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { sanitizeNamaPersonel } = require('../pure/Kelas.js');
const { normalizeAknKategori, AKN_KATEGORIS } = require('../pure/Carry.js');
const { resolvePeriodeWindow } = require('../utils/DateUtil.js');

function createMockSheet(name, headers, dataRows) {
  const rows = [headers.slice()].concat((dataRows || []).map((r) => r.slice()));
  const calls = {
    backgrounds: [],
    fontColors: [],
    frozenRows: null,
    rowHeights: {},
    colWidths: {},
    numberFormats: {},
    appended: []
  };

  function makeRange(row, col, numRows, numCols) {
    return {
      getValues() {
        const out = [];
        for (let r = row - 1; r < row - 1 + numRows; r++) {
          const src = rows[r] || [];
          const line = [];
          for (let c = col - 1; c < col - 1 + numCols; c++) {
            line.push(src[c] !== undefined ? src[c] : '');
          }
          out.push(line);
        }
        return out;
      },
      setValues(vals) {
        vals.forEach((v, idx) => {
          rows[row - 1 + idx] = v.slice();
        });
      },
      setValue(v) {
        if (!rows[row - 1]) rows[row - 1] = [];
        rows[row - 1][col - 1] = v;
      },
      setBackground(c) { calls.backgrounds.push({ row, col, numRows, numCols, color: c }); },
      setBackgrounds(bgs) { calls.backgrounds.push({ row, col, grid: bgs }); },
      setFontColor(c) { calls.fontColors.push({ row, color: c }); },
      setFontFamily() {},
      setFontSize() {},
      setFontWeight() {},
      setVerticalAlignment() {},
      setHorizontalAlignment() {},
      setWrap() {},
      setBorder() {},
      setNumberFormat(fmt) {
        for (let c = col; c < col + numCols; c++) {
          calls.numberFormats[headers[c - 1]] = fmt;
        }
      }
    };
  }

  return {
    rows,
    calls,
    getName: () => name,
    getLastColumn: () => headers.length,
    getLastRow: () => rows.length,
    getRange: makeRange,
    setFrozenRows(n) { calls.frozenRows = n; },
    setRowHeight(r, h) { calls.rowHeights[r] = h; },
    setRowHeights(r, count, h) { calls.rowHeights[`${r}..${r + count - 1}`] = h; },
    setColumnWidth(c, w) { calls.colWidths[headers[c - 1]] = w; },
    appendRow(arr) { rows.push(arr.slice()); calls.appended.push(arr.slice()); }
  };
}

test('SyncRules — sanitizeNamaPersonel menghapus gelar, apostrof, titik, koma, tanda hubung, dan angka', () => {
  assert.equal(sanitizeNamaPersonel("Ma'ruf, S.St.Pi."), 'MARUF');
  assert.equal(sanitizeNamaPersonel("Capt. Prof. Dr. H. Slamet Riyadi, M.Mar"), 'SLAMET RIYADI');
  assert.equal(sanitizeNamaPersonel("A. Rahman-Hakim 02, A.Md.Pi"), 'A RAHMAN HAKIM');
  assert.equal(sanitizeNamaPersonel("12345!!!"), '');
});

test('SyncRules — 4 Kategori AKN konsisten menggabungkan PPPK Fungsional & Pelaksana ke P3K', () => {
  assert.deepEqual(Array.from(AKN_KATEGORIS), ['PNS', 'P3K', 'P3K_PARUH_WAKTU', 'PJLP']);
  assert.equal(normalizeAknKategori('PPPK_FUNGSIONAL'), 'P3K');
  assert.equal(normalizeAknKategori('PPPK_PELAKSANA'), 'P3K');
  assert.equal(normalizeAknKategori('PPPK_PARUH_WAKTU'), 'P3K_PARUH_WAKTU');
  assert.equal(normalizeAknKategori('PJLP'), 'PJLP');
  assert.equal(normalizeAknKategori('PNS'), 'PNS');
});

test('SyncRules — Filter periode TW1-TW4, SEM1-SEM2, dan CUSTOM kalender akurat', () => {
  const tw1 = resolvePeriodeWindow({ mode: 'TW1', tahun: 2026 });
  const tw2 = resolvePeriodeWindow({ mode: 'TW2', tahun: 2026 });
  const tw3 = resolvePeriodeWindow({ mode: 'TW3', tahun: 2026 });
  const tw4 = resolvePeriodeWindow({ mode: 'TW4', tahun: 2026 });
  const sem1 = resolvePeriodeWindow({ mode: 'SEM1', tahun: 2026 });
  const custom = resolvePeriodeWindow({ mode: 'CUSTOM', startDate: '2026-02-10', endDate: '2026-05-20' });

  assert.equal(tw1.startDateStr, '2026-01-01');
  assert.equal(tw1.endDateStr, '2026-03-31');
  assert.equal(tw2.startDateStr, '2026-04-01');
  assert.equal(tw2.endDateStr, '2026-06-30');
  assert.equal(tw3.startDateStr, '2026-07-01');
  assert.equal(tw3.endDateStr, '2026-09-30');
  assert.equal(tw4.startDateStr, '2026-10-01');
  assert.equal(tw4.endDateStr, '2026-12-31');
  assert.equal(sem1.startDateStr, '2026-01-01');
  assert.equal(sem1.endDateStr, '2026-06-30');
  assert.equal(custom.startDateStr, '2026-02-10');
  assert.equal(custom.endDateStr, '2026-05-20');
});

test('SheetFormatter — applyFormalSheetFormatting memformat Master_Awak dengan header #0F172A, NIP @, & zebra banding', () => {
  const ctx = { Logger: { log() {} }, Utilities: { formatDate: () => '2026-11-18' } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'SheetAccess.js'), 'utf8'), ctx);

  const headers = ['PegawaiID', 'NIP', 'Nama', 'KelompokJabatan', 'TanggalMulaiKerja', 'UpdatedAt'];
  const mockSheet = createMockSheet('Master_Awak', headers, [
    ['PEG-0001', '198501012010011001', 'BUDI SANTOSO', 'Nakhoda', '2024-01-15', '2026-11-18 07:00:00'],
    ['PEG-0002', '', 'MARUF', 'Juru Masak', '2025-02-01', '2026-11-18 07:00:00']
  ]);

  ctx.applyFormalSheetFormatting(mockSheet, 'Master_Awak');
  assert.equal(mockSheet.calls.frozenRows, 1);
  assert.equal(mockSheet.calls.rowHeights[1], 34);
  assert.equal(mockSheet.calls.rowHeights['2..3'], 26);
  assert.equal(mockSheet.calls.backgrounds[0].color, '#0F172A');
  assert.equal(mockSheet.calls.fontColors[0].color, '#FFFFFF');
  assert.equal(mockSheet.calls.backgrounds[1].grid[0][0], '#FFFFFF');
  assert.equal(mockSheet.calls.backgrounds[1].grid[1][0], '#F8FAFC');
  assert.equal(mockSheet.calls.numberFormats['NIP'], '@');
  assert.equal(mockSheet.calls.numberFormats['PegawaiID'], '@');
  assert.equal(mockSheet.calls.numberFormats['TanggalMulaiKerja'], 'yyyy-mm-dd');
});

test('DirektoriService — dir_save validasi kondisional NIP (wajib ASN/P3K, opsional/kosong PJLP) & push sync DISPARITAS_NAKHODA', () => {
  const awakHeaders = [
    'PegawaiID', 'NIP', 'Nama', 'KelompokJabatan', 'JabatanLengkap', 'KelasKapal',
    'Rumpun', 'KategoriKepegawaian', 'StatusAktif', 'StatusPenempatan', 'PangkalanID',
    'KapalID', 'TanggalMulaiKerja', 'TanggalSelesaiKontrak', 'NomorSKPenempatan',
    'DokumenPenempatanURL', 'UkuranBaju', 'UkuranSepatu', 'Catatan', 'UpdatedAt', 'UpdatedBy'
  ];
  const sikapHeaders = [
    'PegawaiID', 'NIP', 'Nama', 'UnitKerja', 'LingkupData', 'KelompokJabatan',
    'JabatanLengkap', 'TingkatKelas', 'KategoriRumpun', 'StatusKepegawaian', 'StatusAktif',
    'StatusPenempatan', 'KapalPenempatan', 'UkuranBaju', 'UkuranSepatu',
    'SumberSinkronisasi', 'StatusKelengkapanTU', 'CatatanDisparitas', 'UpdatedAt', 'UpdatedBy'
  ];

  const awakSheet = createMockSheet('Master_Awak', awakHeaders, []);
  const sikapSheet = createMockSheet('Master_Pegawai_POA', sikapHeaders, []);
  const auditSheet = createMockSheet('Audit_Log', ['LogID', 'UserID', 'Aksi', 'SheetTarget', 'RowIDTarget', 'Alasan', 'Sebelum', 'Sesudah', 'Timestamp'], []);
  const kapalSheet = createMockSheet('Kapal', ['KapalID', 'NamaKapal'], [['KPL-01', 'KP. Hiu 01']]);

  function sheetToObjects(sheet) {
    const hdr = sheet.rows[0] || [];
    return sheet.rows.slice(1).map((r) => {
      const o = {};
      hdr.forEach((h, i) => { o[h] = r[i] !== undefined ? r[i] : ''; });
      return o;
    });
  }

  const ctx = {
    sanitizeNamaPersonel,
    normalizeKelasKapal: (k) => k || 'KELAS_I',
    extractRumpunAwak: (j) => String(j).toLowerCase().indexOf('masak') !== -1 ? 'PENUNJANG' : 'DEK',
    normalizeAknKategori,
    maskNip: (n) => n,
    Logger: { log() {} },
    Utilities: {
      formatDate: () => '2026-11-18 07:30:00',
      getUuid: () => 'TESTUUID123456'
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k === 'SIKAP_SS_ID' ? 'MOCK_SIKAP_SS' : ''),
        setProperty() {}
      })
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (name) => (name === 'Master_Pegawai_POA' ? sikapSheet : null)
      })
    },
    ROLE: { SUPERADMIN: 'SUPERADMIN', KADIV: 'KADIV', STAF: 'STAF' },
    ROW_STATUS: { ACTIVE: 'ACTIVE' },
    SHEET_AWAK: { MASTER_AWAK: 'Master_Awak', PENUGASAN_KAPAL: 'TX_Penugasan_Kapal', KAPAL: 'Kapal' },
    SHEET_MASTER: { KAPAL: 'Kapal' },
    SHEET_LOG: { AUDIT_LOG: 'Audit_Log' },
    PROP_KEY: { SIKAP_SS_ID: 'SIKAP_SS_ID' },
    _requireSession: () => ({ userId: 'USR-01', role: 'SUPERADMIN', divisiId: 'DIV-AWAK', status: 'APPROVED' }),
    assertScope() {},
    withLock: (fn) => fn(),
    openAwakSheet: () => awakSheet,
    openMasterSheet: () => kapalSheet,
    openLogSheet: () => auditSheet,
    sheetToObjects,
    applyFormalSheetFormatting() {},
    appendRowData(sheet, obj) {
      const hdr = sheet.rows[0];
      sheet.appendRow(hdr.map((h) => (obj[h] !== undefined ? obj[h] : '')));
    },
    updateRowCells() {},
    logAudit() {},
    _auditLog() {},
    findRowByField() { return null; }
  };

  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'services', 'DirektoriService.js'), 'utf8'), ctx);

  // 1. PNS tanpa NIP 18 digit harus ditolak
  const resPnsBad = ctx.dir_save({
    token: 't',
    nama: "Budi Santoso, S.Pi",
    kelompokJabatan: 'Nakhoda',
    kelasKapal: 'KELAS_I',
    kategoriKepegawaian: 'PNS',
    nip: '12345'
  });
  assert.equal(resPnsBad.success, false);
  assert.match(resPnsBad.error, /18 digit/);

  // 2. P3K Paruh Waktu tanpa NIP 18 digit harus ditolak
  const resP3kPwBad = ctx.dir_save({
    token: 't',
    nama: "Slamet Riyadi",
    kelompokJabatan: 'Juru Mudi',
    kelasKapal: 'KELAS_II',
    kategoriKepegawaian: 'P3K_PARUH_WAKTU',
    nip: ''
  });
  assert.equal(resP3kPwBad.success, false);
  assert.match(resP3kPwBad.error, /18 digit/);

  // 3. PJLP tanpa NIP lolos, NIP dikosongkan, Nama disanitasi, & push sync menandai DISPARITAS_NAKHODA di SIKAP
  const resPjlpOk = ctx.dir_save({
    token: 't',
    nama: "Ma'ruf, S.Pi.",
    kelompokJabatan: 'Juru Masak',
    kelasKapal: 'KELAS_II',
    kategoriKepegawaian: 'PJLP',
    nip: '1999',
    statusPenempatan: 'DIPERBANTUKAN_UPT',
    pangkalanId: 'Pangkalan PSDKP Jakarta',
    kapalId: 'KPL-01',
    ukuranBaju: 'XL',
    ukuranSepatu: '42'
  });
  assert.equal(resPjlpOk.success, true, resPjlpOk.error);
  assert.equal(awakSheet.rows.length, 2);
  assert.equal(awakSheet.rows[1][1], ''); // NIP dikosongkan untuk PJLP
  assert.equal(awakSheet.rows[1][2], 'MARUF'); // Nama HURUF BESAR bersih

  assert.equal(sikapSheet.rows.length, 2);
  const sikapObj = sheetToObjects(sikapSheet)[0];
  assert.equal(sikapObj.Nama, 'MARUF');
  assert.equal(sikapObj.SumberSinkronisasi, 'PUSH_NAKHODA');
  assert.equal(sikapObj.StatusKelengkapanTU, 'DISPARITAS_NAKHODA');
  assert.equal(sikapObj.StatusPenempatan, 'DIPERBANTUKAN_UPT');
  assert.equal(sikapObj.UkuranBaju, 'XL');
  assert.equal(sikapObj.UkuranSepatu, '42');
});
