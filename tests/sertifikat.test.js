const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CERT_STATUS,
  evaluateSertifikatStatus,
  calculateKelaikanKompetensi
} = require('../pure/Sertifikat.js');

test('Sertifikat — Mengembalikan BELUM_ADA jika objek sertifikat kosong', () => {
  const res = evaluateSertifikatStatus(null);
  assert.equal(res.status, CERT_STATUS.BELUM_ADA);
  assert.equal(res.isExpired, false);
});

test('Sertifikat — Mengembalikan BERLAKU permanen jika tanpa masa berlaku', () => {
  const res = evaluateSertifikatStatus({
    NomorSertifikat: 'SKP-001',
    BerlakuSampai: ''
  });
  assert.equal(res.status, CERT_STATUS.BERLAKU);
  assert.equal(res.sisaHari, null);
});

test('Sertifikat — Mendeteksi KEDALUWARSA jika tanggal berlaku sudah lewat', () => {
  const res = evaluateSertifikatStatus(
    { NomorSertifikat: 'BST-001', BerlakuSampai: '2026-01-01' },
    '2026-03-01'
  );
  assert.equal(res.status, CERT_STATUS.KEDALUWARSA);
  assert.equal(res.isExpired, true);
  assert.ok(res.sisaHari < 0);
});

test('Sertifikat — Mendeteksi SEGERA_HABIS jika sisa hari <= 90 hari', () => {
  const res = evaluateSertifikatStatus(
    { NomorSertifikat: 'BST-002', BerlakuSampai: '2026-04-15' },
    '2026-03-01' // selisih 45 hari
  );
  assert.equal(res.status, CERT_STATUS.SEGERA_HABIS);
  assert.equal(res.isWarning, true);
  assert.equal(res.isExpired, false);
  assert.equal(res.sisaHari, 45);
});

test('Sertifikat — Mendeteksi BERLAKU jika sisa hari > 90 hari', () => {
  const res = evaluateSertifikatStatus(
    { NomorSertifikat: 'BST-003', BerlakuSampai: '2026-10-01' },
    '2026-03-01' // selisih > 200 hari
  );
  assert.equal(res.status, CERT_STATUS.BERLAKU);
  assert.equal(res.isWarning, false);
});

test('Sertifikat — calculateKelaikanKompetensi menghitung persentase kelaikan', () => {
  const standar = [
    { kode: 'TRN-01', wajib: true },
    { kode: 'TRN-02', wajib: true },
    { kode: 'TRN-03', wajib: true },
    { kode: 'TRN-04', wajib: true }
  ];

  const mapSertifikat = {
    'TRN-01': { NomorSertifikat: 'A1', BerlakuSampai: '2028-01-01' }, // Berlaku
    'TRN-02': { NomorSertifikat: 'A2', BerlakuSampai: '2026-03-20' }, // Segera Habis (masih berlaku)
    'TRN-03': { NomorSertifikat: 'A3', BerlakuSampai: '2025-01-01' }  // Kedaluwarsa
    // TRN-04: Belum Ada
  };

  const res = calculateKelaikanKompetensi(standar, mapSertifikat, '2026-03-01');
  assert.equal(res.totalWajib, 4);
  assert.equal(res.terpenuhi, 2); // TRN-01 dan TRN-02
  assert.equal(res.segeraHabis, 1);
  assert.equal(res.kedaluwarsa, 1);
  assert.equal(res.belumAda, 1);
  assert.equal(res.persen, 50); // 2 dari 4 = 50%
  assert.equal(res.isLaik, false);
});

