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

  // Pola pencocokan angka romawi kelas
  if (/KELAS\s+(I|1)\b/i.test(text) && !/KELAS\s+(II|III|IV|V)/i.test(text)) {
    return 'KELAS_I';
  }
  if (/KELAS\s+(II|2)\b/i.test(text)) {
    return 'KELAS_II';
  }
  if (/KELAS\s+(III|3)\b/i.test(text)) {
    return 'KELAS_III';
  }
  if (/KELAS\s+(IV|4)\b/i.test(text)) {
    return 'KELAS_IV';
  }
  if (/KELAS\s+(V|5)\b/i.test(text)) {
    return 'KELAS_V';
  }

  // Cek jika ada penyebutan nama kapal kelas tertentu
  if (/KELAS\s*I\b/.test(text)) return 'KELAS_I';
  if (/KELAS\s*II\b/.test(text)) return 'KELAS_II';
  if (/KELAS\s*III\b/.test(text)) return 'KELAS_III';
  if (/KELAS\s*IV\b/.test(text)) return 'KELAS_IV';
  if (/KELAS\s*V\b/.test(text)) return 'KELAS_V';

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
    extractRumpunAwak: extractRumpunAwak,
    maskNip: maskNip
  };
}

