const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCarryForward } = require('../pure/Carry.js');

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
    carried: false
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
      Timestamp: '2026-10-25T08:00:00Z'
    }
  ];
  const result = resolveCarryForward(rows, 'AKN_KESELURUHAN', 'PNS', '2026-11-W01');
  assert.deepEqual(result, {
    jumlah: 42,
    periodeSumber: '2026-10-W04',
    carried: true
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
      Timestamp: '2026-09-25T08:00:00Z'
    }
  ];
  const result = resolveCarryForward(rows, 'AKN_KESELURUHAN', 'PNS', '2026-11-W01');
  assert.deepEqual(result, {
    jumlah: 38,
    periodeSumber: '2026-09-W04',
    carried: true
  });
});

