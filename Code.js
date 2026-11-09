/**
 * Code.js — Entry point Google Apps Script (Nakhoda)
 * Build: v1.0.8-revised
 *
 * doGet()  : serve SPA frontend
 * doPost() : tidak dipakai — semua komunikasi lewat google.script.run
 */

/**
 * Serve SPA frontend.
 *
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('html/Index')
    .evaluate()
    .setTitle('Nakhoda — Timja Pengawakan Dit. POA KKP RI')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper untuk include file HTML template partial.
 * Contoh di template: <?!= html_include('html/Style'); ?>
 *
 * @param {string} filename
 * @returns {string} konten HTML
 */
function html_include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Registrasi Triggers Otomatis (Cron Jobs).
 * Dijalankan sekali saat inisialisasi sistem oleh Superadmin.
 */
function setup_installTriggers() {
  try {
    // Hapus triggers lama agar tidak duplikat
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function (t) {
      var fn = t.getHandlerFunction();
      if (fn.indexOf('trigger_') === 0) {
        ScriptApp.deleteTrigger(t);
      }
    });

    // 1. Pemindai Harian Kedaluwarsa Dokumen (06:00 WIB)
    ScriptApp.newTrigger('trigger_dailyScan')
      .timeBased()
      .everyDays(1)
      .atHour(6)
      .create();

    // 2. Pengingat Mingguan Pelaporan Staf (Senin 07:00 WIB)
    ScriptApp.newTrigger('trigger_weeklyReminder')
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay.MONDAY)
      .atHour(7)
      .create();

    // 3. Pencadangan Terjadwal Basis Data (Minggu 02:00 WIB)
    ScriptApp.newTrigger('trigger_weeklyBackup')
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay.SUNDAY)
      .atHour(2)
      .create();

    Logger.log('[setup_installTriggers] 3 Triggers otomatis berhasil dipasang.');
    return { success: true, message: 'Triggers otomatis berhasil dipasang.' };
  } catch (err) {
    Logger.log('[setup_installTriggers] err: ' + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Handler Trigger Harian: Scan sertifikat kedaluwarsa & kontrak
 */
function trigger_dailyScan() {
  if (typeof notif_runDailyScan === 'function') {
    return notif_runDailyScan();
  }
}

/**
 * Handler Trigger Mingguan: Pengingat pelaporan hari Senin
 */
function trigger_weeklyReminder() {
  if (typeof notif_runWeeklyReminder === 'function') {
    return notif_runWeeklyReminder();
  }
}

/**
 * Handler Trigger Mingguan: Backup snapshot database hari Minggu
 */
function trigger_weeklyBackup() {
  if (typeof notif_runWeeklyBackup === 'function') {
    return notif_runWeeklyBackup();
  }
}
