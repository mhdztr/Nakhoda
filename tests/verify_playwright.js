/**
 * tests/verify_playwright.js
 * End-to-End Visual & Functional Verification Suite for Nakhoda
 * Runs across desktop (1440x900) and mobile (390x844) viewports.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const pw = require('/home/pinefeast/node_modules/playwright');

const PORT = 4321;
const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 1. Build Standalone HTML with Embedded Mock RPC Engine
function buildHtml() {
  let indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'html/Index.html'), 'utf8');

  const mockHeadScript = `
  <script>
    (function() {
      console.log('[MOCK ENGINE] Inisialisasi Mock Google Apps Script RPC');

      var rpcHandlers = {
        auth_login: function(params) {
          var self = this;
          setTimeout(function() {
            if (params && params.password === 'Nakhoda2026!') {
              self._onSuccess({
                success: true,
                data: {
                  token: 'mock-superadmin-token-12345',
                  user: {
                    userId: 'USR-SUPERADMIN',
                    nama: 'Super Administrator Nakhoda',
                    nip: '198501012010011001',
                    email: 'superadmin@nakhoda.go.id',
                    role: 'SUPERADMIN',
                    divisiId: 'DIV-AWAK',
                    status: 'APPROVED'
                  }
                }
              });
            } else {
              self._onSuccess({ success: false, error: 'Password atau email salah' });
            }
          }, 10);
        },

        auth_getSessionInfo: function(token) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                userId: 'USR-SUPERADMIN',
                nama: 'Super Administrator Nakhoda',
                nip: '198501012010011001',
                email: 'superadmin@nakhoda.go.id',
                role: 'SUPERADMIN',
                divisiId: 'DIV-AWAK',
                status: 'APPROVED'
              }
            });
          }, 10);
        },

        ringkasan_get: function(token, filter) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                tahun: 2026,
                findingSubtitle: '4 kapal pengawas kurang awak dari standar formasi sijil (5 kursi kosong); 6 sertifikat habis dalam 90 hari.',
                kpi: {
                  totalAwak: 396,
                  totalAknKeseluruhan: 396,
                  totalAknPoa: 142,
                  deltaAkn: 2,
                  awakLengkap: 348,
                  pctAwakLengkap: '87.9',
                  sertifikatUrgent: 6,
                  kapalLaik: 24,
                  kapalKurangAwak: 4,
                  totalKapal: 28,
                  kelaikanPersen: 85.7
                },
                akn: {
                  periode: '2026-W09',
                  totals: { AKN_POA: 142, AKN_KESELURUHAN: 396 },
                  prevTotals: { AKN_POA: 140, AKN_KESELURUHAN: 394 },
                  matrix: {
                    'PNS': { AKN_POA: 78, AKN_KESELURUHAN: 218 },
                    'PPPK_FUNGSIONAL': { AKN_POA: 26, AKN_KESELURUHAN: 74 },
                    'PPPK_PELAKSANA': { AKN_POA: 18, AKN_KESELURUHAN: 48 },
                    'PPPK_PARUH_WAKTU': { AKN_POA: 8, AKN_KESELURUHAN: 22 },
                    'PJLP': { AKN_POA: 12, AKN_KESELURUHAN: 34 }
                  }
                },
                sijilSummary: {
                  totalKapal: 28,
                  laikOperasi: 24,
                  kurangAwak: 4,
                  kritis: 1,
                  kapalRingkas: [
                    { kapalId: 'KPL-001', namaKapal: 'KP. Orca 01', kelasKapal: 'Kelas I', kebutuhanMinimum: 18, jumlahAwakBertugas: 16, kekuranganKursi: 2, statusOperasi: 'KRITIS' },
                    { kapalId: 'KPL-002', namaKapal: 'KP. Orca 02', kelasKapal: 'Kelas I', kebutuhanMinimum: 18, jumlahAwakBertugas: 17, kekuranganKursi: 1, statusOperasi: 'KURANG_AWAK' },
                    { kapalId: 'KPL-003', namaKapal: 'KP. Hiu 01', kelasKapal: 'Kelas II', kebutuhanMinimum: 14, jumlahAwakBertugas: 13, kekuranganKursi: 1, statusOperasi: 'KURANG_AWAK' },
                    { kapalId: 'KPL-004', namaKapal: 'KP. Macan 01', kelasKapal: 'Kelas III', kebutuhanMinimum: 10, jumlahAwakBertugas: 9, kekuranganKursi: 1, statusOperasi: 'KURANG_AWAK' },
                    { kapalId: 'KPL-005', namaKapal: 'KP. Barracuda 01', kelasKapal: 'Kelas II', kebutuhanMinimum: 14, jumlahAwakBertugas: 14, kekuranganKursi: 0, statusOperasi: 'LAIK' }
                  ]
                },
                aknTerbaru: {
                  'PNS': { AKN_POA: 78, AKN_KESELURUHAN: 218 },
                  'PPPK_FUNGSIONAL': { AKN_POA: 26, AKN_KESELURUHAN: 74 },
                  'PPPK_PELAKSANA': { AKN_POA: 18, AKN_KESELURUHAN: 48 },
                  'PPPK_PARUH_WAKTU': { AKN_POA: 8, AKN_KESELURUHAN: 22 },
                  'PJLP': { AKN_POA: 12, AKN_KESELURUHAN: 34 }
                },
                sijilKapalRingkas: [
                  { kapalId: 'KPL-001', namaKapal: 'KP. Orca 01', kelasKapal: 'Kelas I', pangkalanId: 'Pangkalan PSDKP Batam', kebutuhanMinimum: 18, jumlahAwakBertugas: 16, kekuranganKursi: 2, statusOperasi: 'KRITIS' },
                  { kapalId: 'KPL-002', namaKapal: 'KP. Orca 02', kelasKapal: 'Kelas I', pangkalanId: 'Pangkalan PSDKP Benoa', kebutuhanMinimum: 18, jumlahAwakBertugas: 17, kekuranganKursi: 1, statusOperasi: 'KURANG_AWAK' },
                  { kapalId: 'KPL-003', namaKapal: 'KP. Hiu 01', kelasKapal: 'Kelas II', pangkalanId: 'Pangkalan PSDKP Jakarta', kebutuhanMinimum: 14, jumlahAwakBertugas: 13, kekuranganKursi: 1, statusOperasi: 'KURANG_AWAK' },
                  { kapalId: 'KPL-004', namaKapal: 'KP. Macan 01', kelasKapal: 'Kelas III', pangkalanId: 'Pangkalan PSDKP Lampulo', kebutuhanMinimum: 10, jumlahAwakBertugas: 9, kekuranganKursi: 1, statusOperasi: 'KURANG_AWAK' },
                  { kapalId: 'KPL-005', namaKapal: 'KP. Barracuda 01', kelasKapal: 'Kelas II', pangkalanId: 'Pangkalan PSDKP Tual', kebutuhanMinimum: 14, jumlahAwakBertugas: 14, kekuranganKursi: 0, statusOperasi: 'LAIK' }
                ],
                antreanSertifikatUrgent: [
                  { rowId: 'SRT-001', pegawaiId: 'AWAK-001', namaAwak: 'Bambang Supriyanto', jabatan: 'Nakhoda Kapal Pengawas Kelas I', namaPelatihan: 'BST (Basic Safety Training)', nomorSertifikat: 'BST-2021-9842', berlakuSampai: '2026-03-25', status: 'SEGERA_HABIS', sisaHari: 44 },
                  { rowId: 'SRT-002', pegawaiId: 'AWAK-002', namaAwak: 'Hendro Prasetyo', jabatan: 'KKM Kelas I', namaPelatihan: 'AFF (Advanced Fire Fighting)', nomorSertifikat: 'AFF-2021-4190', berlakuSampai: '2026-03-10', status: 'SEGERA_HABIS', sisaHari: 29 },
                  { rowId: 'SRT-003', pegawaiId: 'AWAK-003', namaAwak: 'Dedi Kurniawan', jabatan: 'Mualim I', namaPelatihan: 'MEFA (Medical First Aid)', nomorSertifikat: 'MEFA-2021-1120', berlakuSampai: '2026-01-15', status: 'KEDALUWARSA', sisaHari: -25 }
                ],
                kegiatanTerbaru: [
                  { rowId: 'KEG-001', judulKegiatan: 'Penyegaran Keterampilan Taktik Menembak Awak TW I', jenisKegiatan: 'PENYEGARAN_TAKTIK', tanggalMulai: '2026-02-15', wilayah: 'Pangkalan PSDKP Batam', jumlahPeserta: 32 },
                  { rowId: 'KEG-002', judulKegiatan: 'Revalidasi Sertifikasi BST & AFF Awak Kapal Pengawas', jenisKegiatan: 'SERTIFIKASI_LAUT', tanggalMulai: '2026-02-01', wilayah: 'BP3IP Jakarta', jumlahPeserta: 24 }
                ]
              }
            });
          }, 10);
        },

        akn_getPapan: function(token, targetPeriode) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                periode: '2026-W09',
                timestamp: '2026-03-01T08:00:00Z',
                submittedBy: 'USR-SUPERADMIN',
                isCarried: false,
                totals: { AKN_POA: 142, AKN_KESELURUHAN: 396 },
                prevTotals: { AKN_POA: 140, AKN_KESELURUHAN: 394 },
                matrix: {
                  'PNS': { AKN_POA: 78, AKN_KESELURUHAN: 218 },
                  'PPPK_FUNGSIONAL': { AKN_POA: 26, AKN_KESELURUHAN: 74 },
                  'PPPK_PELAKSANA': { AKN_POA: 18, AKN_KESELURUHAN: 48 },
                  'PPPK_PARUH_WAKTU': { AKN_POA: 8, AKN_KESELURUHAN: 22 },
                  'PJLP': { AKN_POA: 12, AKN_KESELURUHAN: 34 }
                },
                prevMatrix: {
                  'PNS': { AKN_POA: 77, AKN_KESELURUHAN: 217 },
                  'PPPK_FUNGSIONAL': { AKN_POA: 26, AKN_KESELURUHAN: 73 },
                  'PPPK_PELAKSANA': { AKN_POA: 18, AKN_KESELURUHAN: 48 },
                  'PPPK_PARUH_WAKTU': { AKN_POA: 7, AKN_KESELURUHAN: 22 },
                  'PJLP': { AKN_POA: 12, AKN_KESELURUHAN: 34 }
                }
              }
            });
          }, 10);
        },

        akn_getTren: function(token, count) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                series: [
                  { periode: '2025-W50', totalKeseluruhan: 388, totalPoa: 136 },
                  { periode: '2025-W51', totalKeseluruhan: 388, totalPoa: 136 },
                  { periode: '2025-W52', totalKeseluruhan: 390, totalPoa: 137 },
                  { periode: '2026-W01', totalKeseluruhan: 390, totalPoa: 138 },
                  { periode: '2026-W02', totalKeseluruhan: 391, totalPoa: 138 },
                  { periode: '2026-W03', totalKeseluruhan: 391, totalPoa: 139 },
                  { periode: '2026-W04', totalKeseluruhan: 392, totalPoa: 139 },
                  { periode: '2026-W05', totalKeseluruhan: 392, totalPoa: 140 },
                  { periode: '2026-W06', totalKeseluruhan: 394, totalPoa: 140 },
                  { periode: '2026-W07', totalKeseluruhan: 394, totalPoa: 140 },
                  { periode: '2026-W08', totalKeseluruhan: 394, totalPoa: 140 },
                  { periode: '2026-W09', totalKeseluruhan: 396, totalPoa: 142 }
                ]
              }
            });
          }, 10);
        },

        akn_getRiwayat: function(token, limit) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: [
                { rowId: 'AKN-01', periode: '2026-W09', aknPoa: 142, aknKeseluruhan: 396, submittedBy: 'USR-SUPERADMIN', timestamp: '2026-03-01T08:00:00Z', isCarried: false, status: 'ACTIVE' },
                { rowId: 'AKN-02', periode: '2026-W08', aknPoa: 140, aknKeseluruhan: 394, submittedBy: 'USR-SUPERADMIN', timestamp: '2026-02-22T08:00:00Z', isCarried: false, status: 'ACTIVE' }
              ]
            });
          }, 10);
        },

        dir_list: function(params) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                items: [
                  { pegawaiId: 'AWAK-001', nama: 'Bambang Supriyanto', nip: '198207152006041002', nipDisplay: '198207152006041002', jabatanLengkap: 'Nakhoda Kapal Pengawas Kelas I', rumpun: 'DEK', kelasKapal: 'Kelas I', kategoriKepegawaian: 'PNS', kapalId: 'KP. Orca 01', statusAktif: 'AKTIF' },
                  { pegawaiId: 'AWAK-002', nama: 'Hendro Prasetyo', nip: '198904122014031001', nipDisplay: '198904122014031001', jabatanLengkap: 'Kepala Kamar Mesin (KKM) Kelas I', rumpun: 'MESIN', kelasKapal: 'Kelas I', kategoriKepegawaian: 'PNS', kapalId: 'KP. Orca 01', statusAktif: 'AKTIF' },
                  { pegawaiId: 'AWAK-003', nama: 'Dedi Kurniawan', nip: '199105202019021004', nipDisplay: '199105202019021004', jabatanLengkap: 'Mualim I Kapal Pengawas', rumpun: 'DEK', kelasKapal: 'Kelas II', kategoriKepegawaian: 'PPPK_FUNGSIONAL', kapalId: 'KP. Hiu 01', statusAktif: 'AKTIF' },
                  { pegawaiId: 'AWAK-004', nama: 'Siti Rahmawati', nip: '199508112022032008', nipDisplay: '199508112022032008', jabatanLengkap: 'Juru Mudi Kelas III', rumpun: 'DEK', kelasKapal: 'Kelas III', kategoriKepegawaian: 'PPPK_PELAKSANA', kapalId: 'KP. Macan 01', statusAktif: 'AKTIF' },
                  { pegawaiId: 'AWAK-005', nama: 'Agus Setiawan', nip: '199703142024011003', nipDisplay: '199703142024011003', jabatanLengkap: 'Kelasi Kapal Pengawas', rumpun: 'DEK', kelasKapal: 'Kelas II', kategoriKepegawaian: 'PJLP', kapalId: '-', statusAktif: 'AKTIF' }
                ],
                total: 5,
                stats: { total: 396, dek: 238, mesin: 158, perluDilengkapi: 2 },
                isPrivileged: true
              }
            });
          }, 10);
        },

        dir_getDetail: function(token, pegId) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                awak: {
                  PegawaiID: pegId,
                  Nama: 'Bambang Supriyanto',
                  NIP: '198207152006041002',
                  KelompokJabatan: 'Nakhoda Kapal Pengawas Kelas I',
                  Rumpun: 'DEK',
                  KelasKapal: 'Kelas I',
                  KategoriKepegawaian: 'PNS',
                  NoBukuPelaut: 'B.091248-INA',
                  StatusAktif: 'AKTIF'
                },
                sertifikat: [
                  { JenisSertifikat: 'BST (Basic Safety Training)', NomorSertifikat: 'BST-2021-9842', TanggalBerlaku: '2026-03-25', StatusBerlaku: 'SEGERA_HABIS' },
                  { JenisSertifikat: 'ANT-III', NomorSertifikat: 'ANT3-2018-0412', TanggalBerlaku: '', StatusBerlaku: 'BERLAKU' }
                ],
                penugasan: [
                  { NamaKapal: 'KP. Orca 01', PosisiSijil: 'Nakhoda', TanggalMulai: '2024-01-01', TanggalSelesai: '', StatusPenugasan: 'AKTIF' }
                ]
              }
            });
          }, 10);
        },

        dir_syncSikap: function(params) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                source: 'SPREADSHEET_SIKAP',
                totalSikap: 396,
                matched: 396,
                updated: 0,
                added: 0,
                timestamp: new Date().toISOString()
              }
            });
          }, 10);
        },

        kom_getDashboard: function(token) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                metrics: {
                  totalTercatat: 1140,
                  berlaku: 1082,
                  segeraHabis: 34,
                  kedaluwarsa: 24,
                  awakLengkap: 348,
                  totalAwak: 396,
                  kelaikanPersen: 87.9
                },
                findingSubtitle: '34 sertifikat segera habis dalam 90 hari; 24 sertifikat kedaluwarsa memerlukan revalidasi.',
                antrean: [
                  { sertifikatId: 'SRT-001', pegawaiId: 'AWAK-001', nama: 'Bambang Supriyanto', nip: '198207152006041002', jenisSertifikat: 'BST (Basic Safety Training)', tanggalBerlaku: '2026-03-25', statusBerlaku: 'SEGERA_HABIS', sisaHari: 44, namaKapal: 'KP. Orca 01' },
                  { sertifikatId: 'SRT-002', pegawaiId: 'AWAK-002', nama: 'Hendro Prasetyo', nip: '198904122014031001', jenisSertifikat: 'AFF (Advanced Fire Fighting)', tanggalBerlaku: '2026-03-10', statusBerlaku: 'SEGERA_HABIS', sisaHari: 29, namaKapal: 'KP. Orca 01' },
                  { sertifikatId: 'SRT-003', pegawaiId: 'AWAK-003', nama: 'Dedi Kurniawan', nip: '199105202019021004', jenisSertifikat: 'MEFA (Medical First Aid)', tanggalBerlaku: '2026-01-15', statusBerlaku: 'KEDALUWARSA', sisaHari: -25, namaKapal: 'KP. Hiu 01' }
                ]
              }
            });
          }, 10);
        },

        kom_listAwakKompetensi: function(token, params) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                items: [
                  { pegawaiId: 'AWAK-001', nama: 'Bambang Supriyanto', nip: '198207152006041002', jabatan: 'Nakhoda', rumpun: 'DEK', kelasKapal: 'Kelas I', kepatuhanPersen: 90, statusKelaikan: 'SEGERA_HABIS', sertifikatValidCount: 9, sertifikatTotalReq: 10 },
                  { pegawaiId: 'AWAK-002', nama: 'Hendro Prasetyo', nip: '198904122014031001', jabatan: 'KKM', rumpun: 'MESIN', kelasKapal: 'Kelas I', kepatuhanPersen: 90, statusKelaikan: 'SEGERA_HABIS', sertifikatValidCount: 9, sertifikatTotalReq: 10 },
                  { pegawaiId: 'AWAK-003', nama: 'Dedi Kurniawan', nip: '199105202019021004', jabatan: 'Mualim I', rumpun: 'DEK', kelasKapal: 'Kelas II', kepatuhanPersen: 75, statusKelaikan: 'KEDALUWARSA', sertifikatValidCount: 6, sertifikatTotalReq: 8 }
                ],
                total: 3
              }
            });
          }, 10);
        },

        sijil_getPapanArmada: function(token) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                metrics: {
                  totalKapal: 28,
                  laikOperasi: 24,
                  kurangAwak: 4,
                  kritis: 1,
                  totalAwakBertugas: 342,
                  totalKekuranganKursi: 5
                },
                findingSubtitle: '4 kapal pengawas kurang awak dari standar minimum sijil (5 kursi kosong terpantau).',
                matrixCols: [
                  { key: 'nakhoda', label: 'Nakhoda' },
                  { key: 'mualim', label: 'Mualim' },
                  { key: 'kkm', label: 'KKM' },
                  { key: 'masinis', label: 'Masinis' },
                  { key: 'markonis', label: 'Markonis' },
                  { key: 'serang', label: 'Serang' },
                  { key: 'juruMudi', label: 'Juru Mudi' },
                  { key: 'kelasi', label: 'Kelasi' },
                  { key: 'juruMinyak', label: 'Juru Minyak' }
                ],
                kapal: [
                  {
                    kapalId: 'KPL-001',
                    namaKapal: 'KP. Orca 01',
                    kelasKapal: 'Kelas I',
                    pangkalanId: 'Pangkalan PSDKP Batam',
                    kebutuhanMinimum: 18,
                    jumlahAwakBertugas: 16,
                    kekuranganKursi: 2,
                    statusOperasi: 'KRITIS',
                    positions: {
                      nakhoda: { req: 1, act: 1, dev: 0 },
                      mualim: { req: 3, act: 2, dev: -1 },
                      kkm: { req: 1, act: 1, dev: 0 },
                      masinis: { req: 3, act: 2, dev: -1 },
                      markonis: { req: 1, act: 1, dev: 0 },
                      serang: { req: 1, act: 1, dev: 0 },
                      juruMudi: { req: 3, act: 3, dev: 0 },
                      kelasi: { req: 3, act: 3, dev: 0 },
                      juruMinyak: { req: 2, act: 2, dev: 0 }
                    }
                  },
                  {
                    kapalId: 'KPL-002',
                    namaKapal: 'KP. Orca 02',
                    kelasKapal: 'Kelas I',
                    pangkalanId: 'Pangkalan PSDKP Benoa',
                    kebutuhanMinimum: 18,
                    jumlahAwakBertugas: 17,
                    kekuranganKursi: 1,
                    statusOperasi: 'KURANG_AWAK',
                    positions: {
                      nakhoda: { req: 1, act: 1, dev: 0 },
                      mualim: { req: 3, act: 3, dev: 0 },
                      kkm: { req: 1, act: 1, dev: 0 },
                      masinis: { req: 3, act: 2, dev: -1 },
                      markonis: { req: 1, act: 1, dev: 0 },
                      serang: { req: 1, act: 1, dev: 0 },
                      juruMudi: { req: 3, act: 3, dev: 0 },
                      kelasi: { req: 3, act: 3, dev: 0 },
                      juruMinyak: { req: 2, act: 2, dev: 0 }
                    }
                  },
                  {
                    kapalId: 'KPL-003',
                    namaKapal: 'KP. Hiu 01',
                    kelasKapal: 'Kelas II',
                    pangkalanId: 'Pangkalan PSDKP Jakarta',
                    kebutuhanMinimum: 14,
                    jumlahAwakBertugas: 14,
                    kekuranganKursi: 0,
                    statusOperasi: 'LAIK',
                    positions: {
                      nakhoda: { req: 1, act: 1, dev: 0 },
                      mualim: { req: 2, act: 2, dev: 0 },
                      kkm: { req: 1, act: 1, dev: 0 },
                      masinis: { req: 2, act: 2, dev: 0 },
                      markonis: { req: 1, act: 1, dev: 0 },
                      serang: { req: 1, act: 1, dev: 0 },
                      juruMudi: { req: 2, act: 2, dev: 0 },
                      kelasi: { req: 2, act: 2, dev: 0 },
                      juruMinyak: { req: 2, act: 2, dev: 0 }
                    }
                  }
                ]
              }
            });
          }, 10);
        },

        keg_list: function(params) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                items: [
                  {
                    rowId: 'AWAK-KEG-01',
                    judulKegiatan: 'Penyegaran Keterampilan Menembak dan Penindakan Taktis Awak TW I',
                    jenisKegiatan: 'PENYEGARAN_TAKTIK',
                    tanggalMulai: '2026-02-15',
                    tanggalSelesai: '2026-02-18',
                    wilayah: 'Pangkalan PSDKP Batam',
                    jumlahPeserta: 32,
                    deskripsi: 'Pelatihan rutin penembakan sasaran laut dan simulasi boarding inspection kapal ikan ilegal.',
                    status: 'ACTIVE',
                    evidenceCount: 2,
                    submittedBy: 'USR-SUPERADMIN',
                    timestamp: '2026-02-19T08:00:00Z'
                  },
                  {
                    rowId: 'AWAK-KEG-02',
                    judulKegiatan: 'Revalidasi Sertifikasi Keselamatan Laut (BST & AFF) Awak Kapal Pengawas',
                    jenisKegiatan: 'SERTIFIKASI_LAUT',
                    tanggalMulai: '2026-02-01',
                    tanggalSelesai: '2026-02-05',
                    wilayah: 'BP3IP Jakarta',
                    jumlahPeserta: 24,
                    deskripsi: 'Program revalidasi diklat keselamatan pelaut bekerjasama dengan Balai Besar Pendidikan Penyegaran Pelayaran.',
                    status: 'ACTIVE',
                    evidenceCount: 3,
                    submittedBy: 'USR-SUPERADMIN',
                    timestamp: '2026-02-06T08:00:00Z'
                  }
                ],
                total: 2,
                metrics: { totalKegiatan: 2, totalPeserta: 56, totalLampiran: 5, kegiatanBulanIni: 2 },
                findingSubtitle: '2 agenda pembinaan personil aktif tercatat · 56 personil telah terlatih.',
                userRole: 'SUPERADMIN'
              }
            });
          }, 10);
        },

        keg_getDetail: function(token, rowId) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                kegiatan: {
                  RowID: rowId,
                  JudulKegiatan: 'Penyegaran Keterampilan Menembak dan Penindakan Taktis Awak TW I',
                  JenisKegiatan: 'PENYEGARAN_TAKTIK',
                  TanggalMulai: '2026-02-15',
                  TanggalSelesai: '2026-02-18',
                  Wilayah: 'Pangkalan PSDKP Batam',
                  JumlahPeserta: 32,
                  Deskripsi: 'Pelatihan rutin penembakan sasaran laut dan simulasi boarding inspection kapal ikan ilegal.',
                  Status: 'ACTIVE',
                  SubmittedBy: 'Super Administrator',
                  Timestamp: '2026-02-19T08:00:00Z'
                },
                evidence: [
                  { JudulFile: 'Daftar Hadir Penembakan Batam.pdf', FileUrl: '#', Timestamp: '2026-02-19' },
                  { JudulFile: 'Dokumentasi Lapangan Menembak.jpg', FileUrl: '#', Timestamp: '2026-02-19' }
                ]
              }
            });
          }, 10);
        },

        lap_getPreviewData: function(token, params) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                nomorDokumen: 'ND.AWAK/2026/POA-PSDKP',
                tanggalCetak: '2026-03-01T08:00:00Z',
                pencetak: 'Super Administrator Nakhoda',
                jenisLaporan: 'KOMPREHENSIF',
                ringkasan: {
                  findingSubtitle: '4 kapal pengawas kurang awak dari standar formasi sijil (5 kursi kosong); 6 sertifikat habis dalam 90 hari.',
                  kpi: { totalAwak: 396, totalKapal: 28, kelaikanPersen: 85.7 },
                  sijilSummary: { totalKapal: 28, laikOperasi: 24, kurangAwak: 4 },
                  narasiTemuan: [
                    '4 kapal pengawas kurang awak dari standar sijil minimum (5 kursi kosong).',
                    'Terdapat 24 sertifikat awak kapal berstatus kedaluwarsa yang memerlukan revalidasi.'
                  ],
                  akn: {
                    matrix: {
                      'PNS': { AKN_POA: 78, AKN_KESELURUHAN: 218 },
                      'PPPK_FUNGSIONAL': { AKN_POA: 26, AKN_KESELURUHAN: 74 },
                      'PPPK_PELAKSANA': { AKN_POA: 18, AKN_KESELURUHAN: 48 },
                      'PPPK_PARUH_WAKTU': { AKN_POA: 8, AKN_KESELURUHAN: 22 },
                      'PJLP': { AKN_POA: 12, AKN_KESELURUHAN: 34 }
                    }
                  }
                },
                armada: [
                  { namaKapal: 'KP. Orca 01', kelasKapal: 'Kelas I', kebutuhanMinimum: 18, jumlahAwakBertugas: 16, kekuranganKursi: 2, statusOperasi: 'KRITIS' },
                  { namaKapal: 'KP. Orca 02', kelasKapal: 'Kelas I', kebutuhanMinimum: 18, jumlahAwakBertugas: 17, kekuranganKursi: 1, statusOperasi: 'KURANG_AWAK' },
                  { namaKapal: 'KP. Hiu 01', kelasKapal: 'Kelas II', kebutuhanMinimum: 14, jumlahAwakBertugas: 14, kekuranganKursi: 0, statusOperasi: 'LAIK' }
                ]
              }
            });
          }, 10);
        },

        lap_exportData: function(token, params) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                filename: 'Nakhoda_Export_' + (params.modul || 'DIREKTORI') + '.csv',
                csv: 'PegawaiID,Nama,NIP\\nAWAK-001,Bambang Supriyanto,198207152006041002'
              }
            });
          }, 10);
        },

        admin_getUsers: function(token) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: [
                { userId: 'USR-01', nama: 'Super Administrator Nakhoda', email: 'superadmin@nakhoda.go.id', nip: '198501012010011001', role: 'SUPERADMIN', divisiId: 'DIV-AWAK', namaDivisi: 'Timja Pengawakan', status: 'APPROVED', registeredAt: '2026-01-01' },
                { userId: 'USR-02', nama: 'Ir. H. Syarifuddin, M.Si', email: 'katimja.awak@nakhoda.go.id', nip: '198207152006041002', role: 'KADIV', divisiId: 'DIV-AWAK', namaDivisi: 'Timja Pengawakan', status: 'APPROVED', registeredAt: '2026-01-05' },
                { userId: 'USR-03', nama: 'Staf Pengawakan Lapangan', email: 'staf.awak@nakhoda.go.id', nip: '199402102019021003', role: 'STAF', divisiId: 'DIV-AWAK', namaDivisi: 'Timja Pengawakan', status: 'APPROVED', registeredAt: '2026-01-10' }
              ]
            });
          }, 10);
        },

        auth_getPendingApprovals: function(token) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: [
                { userId: 'USR-PENDING-01', nama: 'Rudi Hartono, S.St.Pi', email: 'rudi.hartono@kkp.go.id', nip: '199203152019031002', role: 'STAF', divisiId: 'DIV-AWAK', namaDivisi: 'Timja Pengawakan', registeredAt: '2026-03-01' }
              ]
            });
          }, 10);
        },

        admin_getAuditLog: function(token, params) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: [
                { logId: 'LOG-001', aksi: 'UPDATE', sheetTarget: 'TX_Sijil_Penugasan', rowIdTarget: 'AWAK-SIJ-098', alasan: 'Pencatatan mutasi kru kapal', timestamp: '2026-03-01T08:12:00Z', userId: 'USR-01', userName: 'Super Administrator', userRole: 'SUPERADMIN' },
                { logId: 'LOG-002', aksi: 'INSERT', sheetTarget: 'TX_Pelatihan_Awak', rowIdTarget: 'AWAK-SRT-441', alasan: 'Perekaman sertifikat baru STCW-F', timestamp: '2026-03-01T07:45:00Z', userId: 'USR-02', userName: 'Ir. H. Syarifuddin, M.Si', userRole: 'KADIV' }
              ]
            });
          }, 10);
        }
      };

      function createRunner(successCb, failureCb) {
        var runner = {};
        runner._onSuccess = successCb || function() {};
        runner._onFailure = failureCb || function() {};
        runner.withSuccessHandler = function(s) {
          return createRunner(s, this._onFailure);
        };
        runner.withFailureHandler = function(f) {
          return createRunner(this._onSuccess, f);
        };
        for (var key in rpcHandlers) {
          (function(k) {
            runner[k] = function() {
              var args = Array.prototype.slice.call(arguments);
              rpcHandlers[k].apply(runner, args);
            };
          })(key);
        }
        return runner;
      }

      window.google = {
        script: {
          run: createRunner()
        }
      };
    })();
  </script>
  `;

  // Inject into <head>
  indexHtml = indexHtml.replace('<head>', '<head>' + mockHeadScript);

  // Expand all <?!= html_include('...') ?> calls
  const includeRegex = /<\?!=\s*html_include\(['"]([^'"]+)['"]\);\s*\?>/g;
  indexHtml = indexHtml.replace(includeRegex, (match, relPath) => {
    let fullPath = path.join(ROOT_DIR, relPath.endsWith('.html') ? relPath : relPath + '.html');
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
    console.warn('[BuildHtml] Include not found:', fullPath);
    return '<!-- include not found: ' + relPath + ' -->';
  });

  return indexHtml;
}

// 2. Start HTTP server
function startServer() {
  const htmlContent = buildHtml();
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlContent);
    });
    server.listen(PORT, () => {
      console.log(`[Test Server] Running at http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

// 3. Playwright Verification Runner
async function runVisualTests() {
  const server = await startServer();
  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // ── TEST A: DESKTOP (1440x900) ──
    console.log('\n--- 1. Testing Desktop Viewport (1440x900) ---');
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    
    // Set authenticated token and user
    await page.goto(`http://localhost:${PORT}`);
    await page.evaluate(() => {
      localStorage.setItem('nakhoda_token', 'mock-superadmin-token-12345');
      localStorage.setItem('nakhoda_user', JSON.stringify({
        userId: 'USR-SUPERADMIN',
        nama: 'Super Administrator Nakhoda',
        nip: '198501012010011001',
        email: 'superadmin@nakhoda.go.id',
        role: 'SUPERADMIN',
        divisiId: 'DIV-AWAK',
        status: 'APPROVED'
      }));
    });

    // Reload with authenticated shell
    await page.goto(`http://localhost:${PORT}`);
    await page.waitForTimeout(600);

    // 1. Ringkasan Eksekutif
    console.log('  [Screen 01] Ringkasan Eksekutif');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_ringkasan_desktop.png') });

    // 2. Komposisi AKN
    console.log('  [Screen 02] Komposisi AKN');
    await page.click('button[data-route="komposisi"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_komposisi_desktop.png') });

    // 3. Direktori Awak
    console.log('  [Screen 03] Direktori Awak');
    await page.click('button[data-route="direktori"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_direktori_desktop.png') });

    // Open Direktori Slide-Over Sheet
    await page.click('#dir-list-tbody tr:first-child button');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03b_direktori_sheet.png') });
    await page.click('#sheet-dir-panel .modal-close');
    await page.waitForTimeout(300);

    // 4. Kompetensi & BST
    console.log('  [Screen 04] Kompetensi & BST');
    await page.click('button[data-route="kompetensi"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_kompetensi_desktop.png') });

    // 5. Papan Sijil Kapal (2D Matrix Table)
    console.log('  [Screen 05] Papan Sijil Kapal (2D Matrix Table)');
    await page.click('button[data-route="sijil"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_sijil_desktop.png') });

    // 6. Log Kegiatan
    console.log('  [Screen 06] Log Kegiatan');
    await page.click('button[data-route="kegiatan"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_kegiatan_desktop.png') });

    // Switch to timeline tab
    await page.click('#tab-keg-timeline');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06b_kegiatan_timeline.png') });

    // 7. Laporan Eksekutif
    console.log('  [Screen 07] Laporan Eksekutif');
    await page.click('button[data-route="laporan"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_laporan_desktop.png') });

    // 8. Pengguna & Hak Akses
    console.log('  [Screen 08] Pengguna & Akses');
    await page.click('button[data-route="admin-users"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_admin_users_desktop.png') });

    // 9. Catatan Audit
    console.log('  [Screen 09] Catatan Audit');
    await page.click('button[data-route="admin-audit"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_admin_audit_desktop.png') });

    await page.close();

    // ── TEST B: MOBILE VIEWPORT (390x844 iPhone 14) ──
    console.log('\n--- 2. Testing Mobile Viewport (390x844) ---');
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobilePage.goto(`http://localhost:${PORT}`);
    await mobilePage.evaluate(() => {
      localStorage.setItem('nakhoda_token', 'mock-superadmin-token-12345');
      localStorage.setItem('nakhoda_user', JSON.stringify({
        userId: 'USR-SUPERADMIN',
        nama: 'Super Administrator Nakhoda',
        nip: '198501012010011001',
        email: 'superadmin@nakhoda.go.id',
        role: 'SUPERADMIN',
        divisiId: 'DIV-AWAK',
        status: 'APPROVED'
      }));
    });
    await mobilePage.goto(`http://localhost:${PORT}`);
    await mobilePage.waitForTimeout(600);

    console.log('  [Screen 10] Mobile Ringkasan Eksekutif');
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '10_ringkasan_mobile.png') });

    console.log('  [Screen 11] Mobile Drawer Navigation');
    await mobilePage.click('#mobile-topbar button');
    await mobilePage.waitForTimeout(400);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '11_mobile_nav.png') });

    await mobilePage.close();

    console.log('\n======================================================');
    console.log('PLAYWRIGHT VISUAL VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log(`Saved 11 screenshots to ${SCREENSHOT_DIR}`);
    console.log('======================================================');
  } catch (err) {
    console.error('Playwright verification error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

runVisualTests();
