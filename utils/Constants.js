/**
 * Nakhoda (Portal Timja Harwat) — Radar POA
 */
var SS_NAME = { MASTER: 'RadarPOA_Master_DB', HARWAT: 'RadarPOA_Harwat_DB' };
var SHEET_HARWAT = { KESEHATAN_KAPAL: 'TX_KESEHATAN_KAPAL', DOCKING: 'TX_DOCKING', PEKERJAAN_HARWAT: 'TX_PEKERJAAN_HARWAT' };
var SHEET_MASTER = { KAPAL: 'Kapal', DIVISI: 'Divisi', USERS: 'Users', OPSI: 'Opsi', WPP: 'WPP' };
var SHEET_LOG = { APPROVAL_QUEUE: 'Approval_Queue', AUDIT_LOG: 'Audit_Log', NOTIFICATIONS: 'Notifications' };
var STD_COLS = ['RowID', 'DivisiID', 'Periode', 'SubmittedBy', 'Timestamp', 'Status', 'SupersedesRowID', 'VoidReason', 'VoidedBy', 'VoidedAt'];
var ROLE = { SUPERADMIN: 'SUPERADMIN', DIREKTUR: 'DIREKTUR', KADIV: 'KADIV', STAF: 'STAF' };
var USER_STATUS = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', NONAKTIF: 'NONAKTIF' };
var ROW_STATUS = { ACTIVE: 'ACTIVE', SUPERSEDED: 'SUPERSEDED', VOID: 'VOID' };
var DIVISI_ID = { TU: 'DIV-TU', OPS: 'DIV-OPS', INTEL: 'DIV-INTEL', PANTAU: 'DIV-PANTAU', RAWAT: 'DIV-RAWAT', LOG: 'DIV-LOG', AWAK: 'DIV-AWAK' };
var OPSI_KODE = { RAWAT_LOKASI: 'RAWAT_LOKASI', RAWAT_TAHAP: 'RAWAT_TAHAP', RAWAT_KATEGORI: 'RAWAT_KATEGORI', KAPAL_JENIS: 'KAPAL_JENIS' };
var PROP_KEY = { MASTER_SS_ID: 'MASTER_SS_ID', HARWAT_SS_ID: 'HARWAT_SS_ID', SETUP_COMPLETED: 'SETUP_COMPLETED', CARTO_API_KEY: 'CARTO_API_KEY' };
function getCartoApiKey() { return PropertiesService.getScriptProperties().getProperty(PROP_KEY.CARTO_API_KEY) || ''; }
function utils_getCartoKey() { return getCartoApiKey(); }
function getSpreadsheetIds() {
  var props = PropertiesService.getScriptProperties();
  var masterId = props.getProperty(PROP_KEY.MASTER_SS_ID);
  var harwatId = props.getProperty(PROP_KEY.HARWAT_SS_ID);
  if (!masterId) throw new Error('[Nakhoda] Spreadsheet ID belum tersimpan.');
  return { masterId: masterId, transaksiId: null, logId: harwatId || null, tuId: null };
}
