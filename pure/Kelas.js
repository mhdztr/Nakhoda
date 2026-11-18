/**
 * pure/Kelas.js
 * Ekstraksi Kelas Kapal Pengawas (Kelas I s.d. V), Rumpun, Masking NIP,
 * dan Normalisasi Nama Kanonik (HURUF BESAR A-Z tanpa gelar/simbol).
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

var KELOMPOK_JABATAN_STD = [
  'Nahkoda', 'Mualim', 'KKM', 'Masinis', 'Markonis',
  'Serang', 'Juru Mudi', 'Kelasi', 'Juru Minyak', 'Juru Masak'
];

/**
 * Membersihkan & menormalisasi nama personel menjadi HURUF BESAR (A-Z dan spasi tunggal saja):
 * - Menghapus awalan gelar kehormatan/akademik (Capt., Prof., Dr., Drs., Dra., Ir., H., Hj.)
 * - Menghapus gelar akademik/pelaut di belakang nama (koma + gelar, S.Tr.Pi, A.Md, M.Mar, ANT/ATT, dll.)
 * - Menghapus tanda petik/apostrof tanpa spasi tambahan ("Ma'ruf" -> "MARUF")
 * - Menghapus titik, koma, tanda hubung, dan angka
 *
 * @param {string} rawNama
 * @returns {string}
 */
function sanitizeNamaPersonel(rawNama) {
  if (!rawNama || typeof rawNama !== 'string') return '';
  var s = String(rawNama).toUpperCase().trim();

  // Hapus gelar kehormatan/akademik di awal nama (diulang maks 5x untuk gelar bertumpuk mis. Capt. Prof. Dr. H.)
  for (var i = 0; i < 5; i++) {
    s = s.replace(/^(?:CAPT|PROF|DR|DRS|DRA|IR|HJ|H)(?:\.|\s+)+(?=[A-Z])/i, '');
  }

  // Hapus gelar setelah tanda koma (mis. ", S.Tr.Pi", ", A.Md, S.P.", ", A.Md, S.PKP")
  s = s.replace(/,\s*(?:S\.?|M\.?|A\.?|D\.?|P\.?|B\.?|L\.?|DR|IR|SE|SH|ST|MM|MH|MSI|MT|SP|ANT|ATT).*$/i, '');
  s = s.replace(/,\s*[A-Z.\s]{2,15}$/, function (m) {
    return /\b(?:AMD|SST|STR|SPI|SIK|SKEL|SPD|SKOM|SSOS|SPKP|MMAR|MSI|SE|SH|ST|SP|MM|MH)\b/.test(m.replace(/\./g, '')) ? '' : m;
  });

  // Hapus gelar akademik/profesi yang menempel di akhir tanpa koma (ulang 2x untuk gelar ganda)
  for (var j = 0; j < 2; j++) {
    s = s.replace(/\s+(?:A\.?\s*MD(?:\.?\s*PI)?|S\.?\s*ST(?:\.?\s*PI)?|S\.?\s*TR(?:\.?\s*PI)?|S\.?\s*PI|S\.?\s*IK|S\.?\s*KEL|S\.?\s*PKP|S\.?\s*KOM|S\.?\s*SOS|S\.?\s*PD|S\.?\s*H|S\.?\s*E|S\.?\s*T|S\.?\s*P|M\.?\s*MAR|M\.?\s*SI|M\.?\s*M|M\.?\s*H|ANT[\s-]*[IV1-4]+|ATT[\s-]*[IV1-4]+)\.?$/i, '');
  }

  // Hapus apostrof/petik tanpa spasi tambahan agar "Ma'ruf" -> "MARUF"
  s = s.replace(/['’`´]/g, '');

  // Karakter non A-Z lainnya (titik, koma, angka, simbol) diubah ke spasi lalu dirapikan
  s = s.replace(/[^A-Z\s]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Mengekstrak Kelas Kapal (KELAS_I, KELAS_II, KELAS_III, KELAS_IV, KELAS_V)
 * dari teks jabatan awak kapal armada.
 *
 * Contoh input:
 *   - "Nahkoda Kapal Pengawas Kelas I" -> "KELAS_I"
 *   - "Mualim I Kapal Pengawas Kelas II" -> "KELAS_II"
 *   - "Kepala Kamar Mesin Kapal Pengawas Kelas III" -> "KELAS_III"
 *   - "Juru Mudi KP Kelas IV" -> "KELAS_IV"
 *   - "Kelasi Kapal Pengawas Kelas V" -> "KELAS_V"
 *   - "Staf Administrasi Pangkalan" -> "NON_KAPAL"
 *
 * @param {string} jabatanText
 * @returns {string} Token Kelas Kapal
 */
function extractKelasKapal(jabatanText) {
  if (!jabatanText || typeof jabatanText !== 'string') return 'NON_KAPAL';

  var text = jabatanText.toUpperCase();

  // Urutan dari romawi terpanjang (III, II, IV, V, I) agar "Kelas II/III" tidak pernah cocok sebagai "Kelas I"
  if (/(?:KELAS|KLS)[\s._-]*(?:III|3)(?![IVX0-9])/i.test(text)) {
    return 'KELAS_III';
  }
  if (/(?:KELAS|KLS)[\s._-]*(?:II|2)(?![IVX0-9])/i.test(text)) {
    return 'KELAS_II';
  }
  if (/(?:KELAS|KLS)[\s._-]*(?:IV|4)(?![IVX0-9])/i.test(text)) {
    return 'KELAS_IV';
  }
  if (/(?:KELAS|KLS)[\s._-]*(?:V|5)(?![IVX0-9])/i.test(text)) {
    return 'KELAS_V';
  }
  if (/(?:KELAS|KLS)[\s._-]*(?:I|1)(?![IVX0-9])/i.test(text)) {
    return 'KELAS_I';
  }

  return 'NON_KAPAL';
}

/**
 * Menormalisasi token kelas kapal dari nilai tersimpan maupun teks jabatan.
 * Mengutamakan kelas eksplisit pada jabatan bila terdeteksi agar tidak mewarisi bug substring lama.
 *
 * @param {string} rawKelas
 * @param {string} [jabatanText]
 * @returns {string}
 */
function normalizeKelasKapal(rawKelas, jabatanText) {
  var fromJab = extractKelasKapal(jabatanText || '');
  if (fromJab !== 'NON_KAPAL') return fromJab;

  var raw = String(rawKelas || '').toUpperCase().trim().replace(/\s+/g, '_');
  if (raw === 'KELAS_1') raw = 'KELAS_I';
  else if (raw === 'KELAS_2') raw = 'KELAS_II';
  else if (raw === 'KELAS_3') raw = 'KELAS_III';
  else if (raw === 'KELAS_4') raw = 'KELAS_IV';
  else if (raw === 'KELAS_5') raw = 'KELAS_V';

  if (/^KELAS_(I|II|III|IV|V)$/.test(raw)) return raw;
  return 'NON_KAPAL';
}

/**
 * Menentukan rumpun awak (DEK / MESIN / PENUNJANG / NON_AWAK) berdasarkan jabatan.
 *
 * @param {string} jabatanText
 * @returns {string} 'DEK' | 'MESIN' | 'PENUNJANG' | 'NON_AWAK'
 */
function extractRumpunAwak(jabatanText) {
  if (!jabatanText || typeof jabatanText !== 'string') return 'NON_AWAK';

  var t = jabatanText.toUpperCase();

  // Rumpun Penunjang Kapal (Juru Masak / Koki / Steward)
  if (/JURU[\s_-]*MASAK|KOKI|STEWARD|PELAYAN[\s_-]*KAPAL|COOK/i.test(t)) {
    return 'PENUNJANG';
  }

  // Rumpun Mesin (termasuk Oiler / Juru Minyak)
  if (/MESIN|KKM|MASINIS|JURU[\s_-]*MINYAK|OILER|MOTORIS|LISTRIK/i.test(t)) {
    return 'MESIN';
  }

  // Rumpun Dek
  if (/NAHKODA|NAKHODA|MUALIM|MARKONIS|SERANG|JURU[\s_-]*MUDI|KELASI|DEK|JURU[\s_-]*MUDY/i.test(t)) {
    return 'DEK';
  }

  return 'NON_AWAK';
}

/**
 * Masking NIP untuk privasi akun non-privileged (hanya tampilkan 6 digit awal & 4 digit akhir).
 * Contoh: 198501012010011001 -> 198501••••••••1001
 *
 * @param {string} nip
 * @param {boolean} isPrivileged - true jika Kadiv/Superadmin
 * @returns {string}
 */
function maskNip(nip, isPrivileged) {
  var s = String(nip || '').trim();
  if (!s || isPrivileged) return s || '-';
  if (s.length < 10) return s;
  var front = s.substring(0, 6);
  var back = s.substring(s.length - 4);
  var dots = '••••••••';
  return front + dots + back;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    KELOMPOK_JABATAN_STD: KELOMPOK_JABATAN_STD,
    sanitizeNamaPersonel: sanitizeNamaPersonel,
    extractKelasKapal: extractKelasKapal,
    normalizeKelasKapal: normalizeKelasKapal,
    extractRumpunAwak: extractRumpunAwak,
    maskNip: maskNip
  };
}

