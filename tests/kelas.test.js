const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  sanitizeNamaPersonel,
  extractKelasKapal,
  normalizeKelasKapal,
  extractRumpunAwak,
  maskNip
} = require('../pure/Kelas.js');
const {
  dateToAknPeriode,
  resolvePeriodeWindow
} = require('../utils/DateUtil.js');

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
  assert.equal(extractRumpunAwak('Oiler'), 'MESIN');
  assert.equal(extractRumpunAwak('Juru Masak (Koki)'), 'PENUNJANG');

  assert.equal(extractRumpunAwak('Pengelola BMN'), 'NON_AWAK');
});

test('Nama — sanitizeNamaPersonel huruf besar tanpa gelar/simbol/petik/angka & bersih di SeedAwak', () => {
  assert.equal(sanitizeNamaPersonel("Capt. Amir Ma'Ruf, S.Tr.Pi"), 'AMIR MARUF');
  assert.equal(sanitizeNamaPersonel('ADE RAROTA NATANAEL  S A.Md'), 'ADE RAROTA NATANAEL S');
  assert.equal(sanitizeNamaPersonel('EDUARDO DA COSTA FERNANDES, A.Md, S.P.'), 'EDUARDO DA COSTA FERNANDES');
  assert.equal(sanitizeNamaPersonel('M.Arsyu Makin 123'), 'M ARSYU MAKIN');
  assert.equal(sanitizeNamaPersonel('Abdul Mu`In'), 'ABDUL MUIN');

  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'SeedAwak.js'), 'utf8'), ctx);
  assert.equal(ctx.SEED_AWAK_ARMADA.length, 396);
  ctx.SEED_AWAK_ARMADA.forEach((a) => {
    assert.match(a.nama, /^[A-Z ]+$/, `Nama harus HURUF BESAR A-Z spasi untuk ${a.pegawaiId}: ${a.nama}`);
    assert.ok(!/^\d+$/.test(a.nama), `Nama tidak boleh angka untuk ${a.pegawaiId}`);
  });
});

test('DateUtil — resolvePeriodeWindow & dateToAknPeriode (TW1-TW4, SEM1-SEM2, kalender)', () => {
  assert.equal(dateToAknPeriode('2026-11-17'), '2026-11-W03');
  const tw1 = resolvePeriodeWindow({ mode: 'TW1', tahun: 2026 });
  assert.equal(tw1.startDateStr, '2026-01-01');
  assert.equal(tw1.endDateStr, '2026-03-31');
  assert.equal(tw1.targetPeriode, '2026-03-W04');

  const sem2 = resolvePeriodeWindow({ mode: 'SEM2', tahun: 2026 });
  assert.equal(sem2.startDateStr, '2026-07-01');
  assert.equal(sem2.endDateStr, '2026-12-31');
});

test('Kelas — Masking NIP pegawai untuk akun biasa vs privileged', () => {
  const nip = '198501012010011001';
  assert.equal(maskNip(nip, true), '198501012010011001'); // Privileged melihat penuh
  assert.equal(maskNip(nip, false), '198501••••••••1001'); // Non-privileged disamarkan
});

