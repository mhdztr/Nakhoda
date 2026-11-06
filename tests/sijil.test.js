const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePosSijil,
  evaluateSafeManning
} = require('../pure/Sijil.js');

test('Sijil — normalizePosSijil menormalisasi variasi teks posisi', () => {
  assert.equal(normalizePosSijil('Nahkoda'), 'NAKHODA');
  assert.equal(normalizePosSijil('Mualim I'), 'MUALIM_I');
  assert.equal(normalizePosSijil('Mualim II'), 'MUALIM_II');
  assert.equal(normalizePosSijil('Kepala Kamar Mesin (KKM)'), 'KKM');
  assert.equal(normalizePosSijil('Masinis I'), 'MASINIS_I');
  assert.equal(normalizePosSijil('Juru Mudi Kapal'), 'JURU_MUDI');
  assert.equal(normalizePosSijil('Juru Minyak'), 'JURU_MINYAK');
});

test('Sijil — evaluateSafeManning mendeteksi status KURANG_AWAK jika ada posisi kosong', () => {
  const standar = [
    { PosSijil: 'NAKHODA', Minimum: 1 },
    { PosSijil: 'MUALIM_I', Minimum: 1 },
    { PosSijil: 'KKM', Minimum: 1 },
    { PosSijil: 'JURU_MUDI', Minimum: 2 }
  ];

  const penugasanAktif = [
    { PosSijil: 'NAKHODA' },
    { PosSijil: 'KKM' },
    { PosSijil: 'JURU_MUDI' } // Kurang 1 Juru Mudi, dan Mualim I kosong
  ];

  const res = evaluateSafeManning(standar, penugasanAktif);
  assert.equal(res.totalKebutuhan, 5);
  assert.equal(res.totalTerisi, 3);
  assert.equal(res.persenTerisi, 60);
  assert.equal(res.isLaikOperasi, false);
  assert.equal(res.statusOperasi, 'KURANG_AWAK');
  assert.equal(res.defisitPosisi.length, 2);
});

test('Sijil — evaluateSafeManning mendeteksi LAIK_OPERASI jika seluruh posisi minimum terpenuhi', () => {
  const standar = [
    { PosSijil: 'NAKHODA', Minimum: 1 },
    { PosSijil: 'KKM', Minimum: 1 },
    { PosSijil: 'KELASI', Minimum: 1 }
  ];

  const penugasanAktif = [
    { PosSijil: 'NAKHODA' },
    { PosSijil: 'KKM' },
    { PosSijil: 'KELASI' },
    { PosSijil: 'KELASI' } // Lebih 1 kelasi (diperbolehkan)
  ];

  const res = evaluateSafeManning(standar, penugasanAktif);
  assert.equal(res.totalKebutuhan, 3);
  assert.equal(res.totalTerisi, 4);
  assert.equal(res.isLaikOperasi, true);
  assert.equal(res.statusOperasi, 'LAIK_OPERASI');
  assert.equal(res.defisitPosisi.length, 0);
});

