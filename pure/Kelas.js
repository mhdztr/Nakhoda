/**
 * pure/Kelas.js
 * Ekstraksi Kelas Kapal Pengawas (Kelas I s.d. V) dari formatur jabatan lengkap.
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

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
 * Menentukan rumpun awak (DEK / MESIN / NON_AWAK) berdasarkan jabatan.
 *
 * @param {string} jabatanText
 * @returns {string} 'DEK' | 'MESIN' | 'NON_AWAK'
 */
function extractRumpunAwak(jabatanText) {
  if (!jabatanText || typeof jabatanText !== 'string') return 'NON_AWAK';

  var t = jabatanText.toUpperCase();

  // Rumpun Mesin
  if (/MESIN|KKM|MASINIS|JURU MINYAK|MOTORIS|LISTRIK/i.test(t)) {
    return 'MESIN';
  }

  // Rumpun Dek
  if (/NAHKODA|NAKHODA|MUALIM|MARKONIS|SERANG|JURU MUDI|KELASI|DEK|JURU MUDY/i.test(t)) {
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
    extractKelasKapal: extractKelasKapal,
    normalizeKelasKapal: normalizeKelasKapal,
    extractRumpunAwak: extractRumpunAwak,
    maskNip: maskNip
  };
}

