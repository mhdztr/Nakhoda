/**
 * utils/Constants.js
 * Nakhoda (Naungan Awak Kapal Armada) — Timja Pengawakan Dit. POA
 */

var SS_NAME = {
  MASTER: 'RadarPOA_Master_DB',
  AWAK: 'RadarPOA_Nakhoda_DB',
  NAKHODA: 'RadarPOA_Nakhoda_DB'
};

var SHEET_AWAK = {
  PENGAWAKAN_AKN: 'TX_Pengawakan_AKN',
  PENGAWAKAN_KEGIATAN: 'TX_Pengawakan_Kegiatan',
  KEGIATAN_PESERTA: 'TX_Kegiatan_Peserta',
  PELATIHAN_AWAK: 'TX_Pelatihan_Awak',
  PENUGASAN_KAPAL: 'TX_Penugasan_Kapal',
  KONFIRMASI_MINGGUAN: 'TX_Konfirmasi_Mingguan',
  MASTER_AWAK: 'Master_Awak',
  MASTER_STANDAR_PELATIHAN: 'Master_Standar_Pelatihan',
  MASTER_SAFE_MANNING: 'Master_SafeManning',
  EVIDENCE: 'TX_Evidence'
};

var SHEET_TX = SHEET_AWAK;

var SHEET_MASTER = {
  USERS: 'Users',
  DIVISI: 'Divisi',
  OPSI: 'Opsi',
  KAPAL: 'Kapal'
};

var SHEET_LOG = {
  APPROVAL_QUEUE: 'Approval_Queue',
  AUDIT_LOG: 'Audit_Log',
  NOTIFICATIONS: 'Notifications'
};

var STD_COLS = [
  'RowID', 'DivisiID', 'Periode', 'SubmittedBy', 'Timestamp',
  'Status', 'SupersedesRowID', 'VoidReason', 'VoidedBy', 'VoidedAt'
];

var ROLE = {
  SUPERADMIN: 'SUPERADMIN',
  DIREKTUR: 'DIREKTUR',
  KADIV: 'KADIV',
  STAF: 'STAF'
};

var USER_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NONAKTIF: 'NONAKTIF'
};

var ROW_STATUS = {
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  VOID: 'VOID'
};

var DIVISI_ID = {
  AWAK: 'DIV-AWAK',
  TU: 'DIV-TU'
};

var OPSI_KODE = {
  AWAK_SCOPE: 'AWAK_SCOPE',
  AWAK_KATEGORI: 'AWAK_KATEGORI',
  AWAK_JENIS_KEGIATAN: 'AWAK_JENIS_KEGIATAN',
  AWAK_RUMPUN: 'AWAK_RUMPUN',
  AWAK_STATUS_AKTIF: 'AWAK_STATUS_AKTIF',
  AWAK_POS_SIJIL: 'AWAK_POS_SIJIL',
  KAPAL_JENIS: 'KAPAL_JENIS'
};

var PROP_KEY = {
  MASTER_SS_ID: 'MASTER_SS_ID',
  AWAK_SS_ID: 'AWAK_SS_ID',
  NAKHODA_SS_ID: 'NAKHODA_SS_ID',
  SIKAP_SS_ID: 'SIKAP_SS_ID',
  LOG_SS_ID: 'LOG_SS_ID',
  PEPPER: 'AUTH_PEPPER',
  CERT_WARN_DAYS: 'CERT_WARN_DAYS',
  CERT_CRIT_DAYS: 'CERT_CRIT_DAYS',
  SETUP_COMPLETED: 'SETUP_COMPLETED'
};

var EVIDENCE_ROOT_FOLDER = 'POA_Evidence_Nakhoda';
var EVIDENCE_LIMIT_BYTES = {
  FILE: 15 * 1024 * 1024,
  VIDEO: 50 * 1024 * 1024
};

function getSpreadsheetIds() {
  var props = PropertiesService.getScriptProperties();
  var masterId = props.getProperty(PROP_KEY.MASTER_SS_ID);
  var awakId = props.getProperty(PROP_KEY.AWAK_SS_ID) || props.getProperty(PROP_KEY.NAKHODA_SS_ID);

  if (!awakId && !masterId) {
    if (typeof ensureAwakSpreadsheet === 'function') {
      try {
        awakId = ensureAwakSpreadsheet();
      } catch (e) {
        Logger.log('[getSpreadsheetIds] ensureAwakSpreadsheet err: ' + e.message);
      }
    }
  }

  var resolvedMaster = masterId || awakId;
  var resolvedAwak = awakId || masterId;
  var logId = props.getProperty(PROP_KEY.LOG_SS_ID) || resolvedMaster;

  if (!resolvedMaster && !resolvedAwak) {
    throw new Error('[Nakhoda] Spreadsheet ID belum tersimpan.');
  }

  return {
    masterId: resolvedMaster,
    transaksiId: resolvedAwak,
    logId: logId,
    awakId: resolvedAwak
  };
}
