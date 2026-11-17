const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  extractKelasKapal,
  normalizeKelasKapal,
  extractRumpunAwak,
  maskNip
} = require('../pure/Kelas.js');

test('Kelas — Ekstraksi Kelas I s.d. V dari teks jabatan', () => {
  assert.equal(extractKelasKapal('Nahkoda Kapal Pengawas Kelas I'), 'KELAS_I');
  assert.equal(extractKelasKapal('Mualim I Kapal Pengawas Kelas II'), 'KELAS_II');
  assert.equal(extractKelasKapal('Kepala Kamar Mesin Kapal Pengawas Kelas III'), 'KELAS_III');
  assert.equal(extractKelasKapal('Juru Mudi KP Kelas IV'), 'KELAS_IV');
  assert.equal(extractKelasKapal('Kelasi Kapal Pengawas Kelas V'), 'KELAS_V');
  assert.equal(extractKelasKapal('Juru Mudi Kapal Kelas II Kapal Pengawas Kelautan dan Perikanan'), 'KELAS_II');
  assert.equal(extractKelasKapal('Juru Mudi Kapal Kelas III Kapal Pengawas Kelautan dan Perikanan'), 'KELAS_III');
  assert.equal(extractKelasKapal('Masinis I Kapal Kelas IV'), 'KELAS_IV');
  assert.equal(extractKelasKapal('Nakhoda Kapal Kelas V Kapal Pengawas Kelautan dan Perikanan'), 'KELAS_V');
  assert.equal(extractKelasKapal('Staf Administrasi Pangkalan'), 'NON_KAPAL');
});

test('Kelas — Normalisasi token dan koreksi tingkatKelas SeedAwak.js', () => {
  assert.equal(normalizeKelasKapal('KELAS_I', 'Juru Mudi Kapal Kelas II Kapal Pengawas Kelautan dan Perikanan'), 'KELAS_II');
  assert.equal(normalizeKelasKapal('NON_JENJANG', 'Nakhoda Kapal Kelas V Kapal Pengawas Kelautan dan Perikanan'), 'KELAS_V');
  assert.equal(normalizeKelasKapal('Kelas III', 'Awak Kapal'), 'KELAS_III');

  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'SeedAwak.js'), 'utf8'), ctx);
  const seed = ctx.SEED_AWAK_ARMADA;
  assert.ok(Array.isArray(seed) && seed.length > 0);
  seed.forEach((a) => {
    const expected = extractKelasKapal(a.jabatanLengkap);
    if (expected !== 'NON_KAPAL') {
      assert.equal(a.tingkatKelas, expected, `Mismatch for ${a.pegawaiId} (${a.jabatanLengkap})`);
    }
  });
});

test('Kelas — Penentuan Rumpun Dek vs Mesin', () => {
  assert.equal(extractRumpunAwak('Nahkoda Kapal Pengawas Kelas I'), 'DEK');
  assert.equal(extractRumpunAwak('Mualim II Kapal Pengawas Kelas II'), 'DEK');
  assert.equal(extractRumpunAwak('Serang Kapal Pengawas Kelas III'), 'DEK');
  assert.equal(extractRumpunAwak('Juru Mudi'), 'DEK');
  assert.equal(extractRumpunAwak('Kelasi'), 'DEK');

  assert.equal(extractRumpunAwak('Kepala Kamar Mesin (KKM) Kelas I'), 'MESIN');
  assert.equal(extractRumpunAwak('Masinis I Kapal Pengawas Kelas II'), 'MESIN');
  assert.equal(extractRumpunAwak('Juru Minyak Kapal Pengawas Kelas III'), 'MESIN');

  assert.equal(extractRumpunAwak('Pengelola BMN'), 'NON_AWAK');
});

test('Kelas — Masking NIP pegawai untuk akun biasa vs privileged', () => {
  const nip = '198501012010011001';
  assert.equal(maskNip(nip, true), '198501012010011001'); // Privileged melihat penuh
  assert.equal(maskNip(nip, false), '198501••••••••1001'); // Non-privileged disamarkan
});

