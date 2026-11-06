const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateRentangHari,
  getPeriodeFromDate,
  validateKegiatanInput,
  JENIS_KEGIATAN_VALID
} = require('../pure/Kegiatan.js');

test('Kegiatan — calculateRentangHari menghitung durasi hari secara inklusif', () => {
  assert.equal(calculateRentangHari('2026-03-10', '2026-03-10'), 1);
  assert.equal(calculateRentangHari('2026-03-10', '2026-03-12'), 3);
  assert.equal(calculateRentangHari('2026-03-01', '2026-03-31'), 31);
});

test('Kegiatan — getPeriodeFromDate mengekstrak periode mingguan secara benar', () => {
  assert.equal(getPeriodeFromDate('2026-11-06'), '2026-11-W01');
  assert.equal(getPeriodeFromDate('2026-11-15'), '2026-11-W03');
  assert.equal(getPeriodeFromDate('2026-11-28'), '2026-11-W04');
});

test('Kegiatan — validateKegiatanInput menolak tanggal selesai < tanggal mulai', () => {
  const check = validateKegiatanInput({
    judulKegiatan: 'Bimtek Awak',
    jenisKegiatan: 'PELATIHAN_TEKNIS',
    tanggalMulai: '2026-04-10',
    tanggalSelesai: '2026-04-05',
    jumlahPeserta: 10
  });
  assert.equal(check.valid, false);
  assert.match(check.errors[0], /tidak boleh lebih awal/);
});

test('Kegiatan — validateKegiatanInput menolak peserta < 1', () => {
  const check = validateKegiatanInput({
    judulKegiatan: 'Penyegaran Taktik',
    jenisKegiatan: 'PENYEGARAN_TAKTIK',
    tanggalMulai: '2026-05-01',
    tanggalSelesai: '2026-05-03',
    jumlahPeserta: 0
  });
  assert.equal(check.valid, false);
  assert.match(check.errors[0], /minimal 1 orang/);
});

test('Kegiatan — validateKegiatanInput lolos untuk input yang valid', () => {
  const check = validateKegiatanInput({
    judulKegiatan: 'Penyegaran Keterampilan Menembak TW I',
    jenisKegiatan: 'PENYEGARAN_TAKTIK',
    tanggalMulai: '2026-03-10',
    tanggalSelesai: '2026-03-12',
    jumlahPeserta: 24
  });
  assert.equal(check.valid, true);
  assert.equal(check.errors.length, 0);
  assert.equal(check.rentangHari, 3);
  assert.equal(check.periode, '2026-03-W02');
});

