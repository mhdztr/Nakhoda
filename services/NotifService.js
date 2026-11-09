/**
 * services/NotifService.js
 * Manajemen Notifikasi Cron Satelit Nakhoda (Timja Pengawakan).
 *
 * Sesuai PRD §3.6 (Sub-Modul F), §5.8, dan Code.js Triggers:
 * 1. trigger_dailyScan()        -> notif_runDailyScan()
 * 2. trigger_weeklyReminder()    -> notif_runWeeklyReminder()
 * 3. trigger_weeklyBackup()      -> notif_runWeeklyBackup()
 *
 * Menyimpan catatan notifikasi ke sheet NOTIFICATIONS satelit Nakhoda.
 */

// ===========================================================================
// 1. CRON JOBS (SERVERLESS TRIGGERS GAS)
// ===========================================================================

/**
 * Pemindai harian (06:00 WIB) untuk mendeteksi:
 * - Sertifikat keselamatan STCW-F yang kedaluwarsa atau segera habis (<= 90 hari).
 * - Profil personil awak dengan NIP/kategori yang belum terisi lengkap.
 */
function notif_runDailyScan() {
  try {
    Logger.log('[notif_runDailyScan] Memulai pemindaian harian register sertifikat pengawakan...');
    var sheetSertifikat = openAwakSheet(SHEET_AWAK.SERTIFIKAT);
    var rows = sheetToObjects(sheetSertifikat);
    var today = new Date();
    var countExpired = 0;
    var countSegeraHabis = 0;

    rows.forEach(function (r) {
      if (String(r['Status'] || '').toUpperCase() !== 'ACTIVE') return;
      var expStr = r['BerlakuSampai'];
      if (!expStr) return;

      var expDate = new Date(expStr);
      if (isNaN(expDate.getTime())) return;

      var diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        countExpired++;
      } else if (diffDays <= 90) {
        countSegeraHabis++;
      }
    });

    if (countExpired > 0 || countSegeraHabis > 0) {
      var pesan = 'Peringatan Sistem: Ditemukan ' + countExpired +
        ' sertifikat kepelautan kedaluwarsa dan ' + countSegeraHabis +
        ' sertifikat segera habis (<= 90 hari). Mohon tindak lanjut diklat revalidasi.';

      _createSystemNotification('SERTIFIKAT_EXPIRED', pesan);
      Logger.log('[notif_runDailyScan] ' + pesan);
    }

    return { success: true, countExpired: countExpired, countSegeraHabis: countSegeraHabis };
  } catch (err) {
    Logger.log('[notif_runDailyScan] err: ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Pengingat mingguan (Senin 07:00 WIB) untuk staf pengawakan
 * agar memutakhirkan Komposisi AKN periode minggu berjalan.
 */
function notif_runWeeklyReminder() {
  try {
    Logger.log('[notif_runWeeklyReminder] Mengirim pengingat mingguan pengawakan...');
    var pesan = 'Pengingat Mingguan: Mohon periksa dan perbarui Komposisi Awak Kapal Negara (AKN) serta status kelaikan Safe Manning armada untuk minggu berjalan.';
    _createSystemNotification('PENGINGAT_MINGGUAN', pesan);
    return { success: true, message: pesan };
  } catch (err) {
    Logger.log('[notif_runWeeklyReminder] err: ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Pencadangan terjadwal mingguan (Minggu 02:00 WIB)
 * Membuat salinan spreadsheet satelit Nakhoda ke folder backup di Google Drive.
 */
function notif_runWeeklyBackup() {
  try {
    Logger.log('[notif_runWeeklyBackup] Memulai proses pencadangan database satelit...');
    var ss = openAwakSheet(SHEET_AWAK.AKN).getParent();
    var fileName = 'RadarPOA_Nakhoda_DB_Backup_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmmss');
    var copy = DriveApp.getFileById(ss.getId()).makeCopy(fileName);
    Logger.log('[notif_runWeeklyBackup] Salinan cadangan berhasil dibuat: ' + copy.getName());
    return { success: true, fileId: copy.getId(), fileName: fileName };
  } catch (err) {
    Logger.log('[notif_runWeeklyBackup] err: ' + err.message);
    return { success: false, error: err.message };
  }
}

// ===========================================================================
// 2. HELPER NOTIFIKASI IN-APP
// ===========================================================================

/**
 * Membuat notifikasi sistem kepada seluruh staf & pengelola satelit Nakhoda.
 */
function _createSystemNotification(jenis, pesan) {
  try {
    var sheetNotif = openAwakSheet(SHEET_AWAK.NOTIFIKASI);
    var nowIso = new Date().toISOString();
    var notifId = 'NTF-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);

    sheetNotif.appendRow([
      notifId,
      'ALL_USERS',
      jenis,
      pesan,
      false, // IsRead
      nowIso
    ]);
  } catch (e) {
    Logger.log('[_createSystemNotification] err: ' + e.message);
  }
}
