const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveCarryForward,
  resolveMatrix,
  validateAknMatrix,
  AKN_SCOPES,
  AKN_KATEGORIS
} = require('../pure/Carry.js');

test('CarryForward — Mengembalikan null jika tidak ada data sama sekali', () => {
  const result = resolveCarryForward([], 'AKN_KESELURUHAN', 'PNS', '2026-11-W01');
  assert.equal(result, null);
});

test('CarryForward — Mengembalikan data periode berjalan jika ada baris aktif', () => {
  const rows = [
    {
      Scope: 'AKN_KESELURUHAN',
      Kategori: 'PNS',
      Jumlah: 45,
      Periode: '2026-11-W01',
      Status: 'ACTIVE',
      Timestamp: '2026-11-01T08:00:00Z'
    }
  ];
  const result = resolveCarryForward(rows, 'AKN_KESELURUHAN', 'PNS', '2026-11-W01');
  assert.deepEqual(result, {
    jumlah: 45,
    periodeSumber: '2026-11-W01',
    carried: false,
    rowId: '',
    keterangan: ''
  });
});

test('CarryForward — Mewarisi nilai periode sebelumnya jika periode berjalan kosong (carried = true)', () => {
  const rows = [
    {
      Scope: 'AKN_KESELURUHAN',
      Kategori: 'PNS',
      Jumlah: 42,
      Periode: '2026-10-W04',
      Status: 'ACTIVE',
      Timestamp: '2026-10-25T08:00:00Z',
      RowID: 'AWAK-AKN-01',
      Keterangan: 'Baseline'
    }
  ];
  const result = resolveCarryForward(rows, 'AKN_KESELURUHAN', 'PNS', '2026-11-W01');
  assert.deepEqual(result, {
    jumlah: 42,
    periodeSumber: '2026-10-W04',
    carried: true,
    rowId: 'AWAK-AKN-01',
    keterangan: 'Baseline'
  });
});

test('CarryForward — Mengabaikan baris masa depan (Periode > targetPeriode)', () => {
  const rows = [
    {
      Scope: 'AKN_POA',
      Kategori: 'PJLP',
      Jumlah: 15,
      Periode: '2026-12-W01',
      Status: 'ACTIVE',
      Timestamp: '2026-12-01T08:00:00Z'
    }
  ];
  const result = resolveCarryForward(rows, 'AKN_POA', 'PJLP', '2026-11-W01');
  assert.equal(result, null);
});

test('CarryForward — Mengabaikan baris berstatus VOID atau SUPERSEDED', () => {
  const rows = [
    {
      Scope: 'AKN_KESELURUHAN',
      Kategori: 'PNS',
      Jumlah: 50,
      Periode: '2026-10-W04',
      Status: 'VOID',
      Timestamp: '2026-10-25T08:00:00Z'
    },
    {
      Scope: 'AKN_KESELURUHAN',
      Kategori: 'PNS',
      Jumlah: 38,
      Periode: '2026-09-W04',
      Status: 'ACTIVE',
      Timestamp: '2026-09-25T08:00:00Z',
      RowID: 'AWAK-AKN-VALID',
      Keterangan: ''
    }
  ];
  const result = resolveCarryForward(rows, 'AKN_KESELURUHAN', 'PNS', '2026-11-W01');
  assert.deepEqual(result, {
    jumlah: 38,
    periodeSumber: '2026-09-W04',
    carried: true,
    rowId: 'AWAK-AKN-VALID',
    keterangan: ''
  });
});

test('resolveMatrix — Menyusun matriks 2x5 dan menghitung total masing-masing scope', () => {
  const rows = [
    { Scope: 'AKN_KESELURUHAN', Kategori: 'PNS', Jumlah: 100, Periode: '2026-11-W01', Status: 'ACTIVE' },
    { Scope: 'AKN_POA', Kategori: 'PNS', Jumlah: 40, Periode: '2026-11-W01', Status: 'ACTIVE' },
    { Scope: 'AKN_KESELURUHAN', Kategori: 'PJLP', Jumlah: 50, Periode: '2026-11-W01', Status: 'ACTIVE' },
    { Scope: 'AKN_POA', Kategori: 'PJLP', Jumlah: 20, Periode: '2026-11-W01', Status: 'ACTIVE' }
  ];

  const res = resolveMatrix(rows, '2026-11-W01');
  assert.equal(res.totals.AKN_KESELURUHAN, 150);
  assert.equal(res.totals.AKN_POA, 60);
  assert.equal(res.isFullyCarried, false);
});

test('validateAknMatrix — Menolak bila POA > Keseluruhan', () => {
  const invalidMatrix = {
    AKN_KESELURUHAN: { PNS: 10, P3K: 5, P3K_PARUH_WAKTU: 0, PJLP: 0 },
    AKN_POA: { PNS: 15, P3K: 5, P3K_PARUH_WAKTU: 0, PJLP: 0 } // PNS 15 > 10
  };

  const check = validateAknMatrix(invalidMatrix);
  assert.equal(check.valid, false);
  assert.match(check.errors[0], /tidak boleh melebihi Keseluruhan/);
});

test('validateAknMatrix — Lolos jika semua nilai valid 4 kategori dan POA <= Keseluruhan', () => {
  assert.deepEqual(AKN_KATEGORIS, ['PNS', 'P3K', 'P3K_PARUH_WAKTU', 'PJLP']);
  const validMatrix = {
    AKN_KESELURUHAN: { PNS: 100, P3K: 80, P3K_PARUH_WAKTU: 10, PJLP: 20 },
    AKN_POA: { PNS: 40, P3K: 35, P3K_PARUH_WAKTU: 5, PJLP: 10 }
  };

  const check = validateAknMatrix(validMatrix);
  assert.equal(check.valid, true);
  assert.equal(check.errors.length, 0);
  assert.equal(check.totalKeseluruhan, 210);
  assert.equal(check.totalPoa, 90);
});

test('CarryForward — Menggabungkan data historis PPPK_FUNGSIONAL + PPPK_PELAKSANA ke P3K', () => {
  const rows = [
    { Scope: 'AKN_KESELURUHAN', Kategori: 'PPPK_FUNGSIONAL', Jumlah: 74, Periode: '2026-10-W04', Status: 'ACTIVE' },
    { Scope: 'AKN_KESELURUHAN', Kategori: 'PPPK_PELAKSANA', Jumlah: 48, Periode: '2026-10-W04', Status: 'ACTIVE' }
  ];
  const res = resolveCarryForward(rows, 'AKN_KESELURUHAN', 'P3K', '2026-11-W01');
  assert.equal(res.jumlah, 122);
  assert.equal(res.periodeSumber, '2026-10-W04');
  assert.equal(res.carried, true);
});

test('akn_aggregateAwakRows — Mengagregasi data pegawai aktif ke 4 kategori dan StatusPenempatan', () => {
  const { akn_aggregateAwakRows } = require('../pure/Carry.js');
  const sampleAwak = [
    { Nama: 'AWAK SATU', StatusAktif: 'AKTIF', KategoriKepegawaian: 'PNS', StatusPenempatan: 'PUSAT_POA' },
    { Nama: 'AWAK DUA', StatusAktif: 'AKTIF', KategoriKepegawaian: 'PNS', Unit: 'Pangkalan PSDKP Batam' },
    { Nama: 'AWAK TIGA', StatusAktif: 'AKTIF', KategoriKepegawaian: 'PPPK_FUNGSIONAL', Unit: 'Armada Kapal Pengawas (Pusat)' },
    { Nama: 'AWAK EMPAT', StatusAktif: 'AKTIF', KategoriKepegawaian: 'PPPK_PELAKSANA', StatusPenempatan: 'DIPERBANTUKAN_UPT' },
    { Nama: 'AWAK LIMA', StatusAktif: 'AKTIF', KategoriKepegawaian: 'PJLP', Unit: 'Stasiun PSDKP Pontianak' },
    { Nama: 'AWAK ENAM', StatusAktif: 'NON_AKTIF', KategoriKepegawaian: 'PNS', StatusPenempatan: 'PUSAT_POA' }
  ];

  const res = akn_aggregateAwakRows(sampleAwak);
  assert.equal(res.totalAktif, 5);
  assert.equal(res.totalPoa, 3);
  assert.equal(res.AKN_KESELURUHAN.PNS, 2);
  assert.equal(res.AKN_POA.PNS, 1);
  assert.equal(res.AKN_KESELURUHAN.P3K, 2);
  assert.equal(res.AKN_POA.P3K, 2);
  assert.equal(res.AKN_KESELURUHAN.PJLP, 1);
  assert.equal(res.AKN_POA.PJLP, 0);
});
