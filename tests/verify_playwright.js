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
                    AKN_POA: {
                      PNS: { jumlah: 78 },
                      P3K: { jumlah: 44 },
                      P3K_PARUH_WAKTU: { jumlah: 8 },
                      PJLP: { jumlah: 12 }
                    },
                    AKN_KESELURUHAN: {
                      PNS: { jumlah: 218 },
                      P3K: { jumlah: 122 },
                      P3K_PARUH_WAKTU: { jumlah: 22 },
                      PJLP: { jumlah: 34 }
                    }
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
                  AKN_POA: {
                    PNS: { jumlah: 78 },
                    P3K: { jumlah: 44 },
                    P3K_PARUH_WAKTU: { jumlah: 8 },
                    PJLP: { jumlah: 12 }
                  },
                  AKN_KESELURUHAN: {
                    PNS: { jumlah: 218 },
                    P3K: { jumlah: 122 },
                    P3K_PARUH_WAKTU: { jumlah: 22 },
                    PJLP: { jumlah: 34 }
                  }
                },
                rekapJabatan: [
                  { jabatan: 'Nakhoda', rumpun: 'DEK', eksisting: 26, kebutuhan: 28, selisih: -2 },
                  { jabatan: 'KKM', rumpun: 'MESIN', eksisting: 27, kebutuhan: 28, selisih: -1 },
                  { jabatan: 'Juru Mudi', rumpun: 'DEK', eksisting: 72, kebutuhan: 70, selisih: 2 },
                  { jabatan: 'Juru Masak', rumpun: 'PENUNJANG', eksisting: 12, kebutuhan: 14, selisih: -2 }
                ],
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
                  AKN_POA: {
                    PNS: { jumlah: 78 },
                    P3K: { jumlah: 44 },
                    P3K_PARUH_WAKTU: { jumlah: 8 },
                    PJLP: { jumlah: 12 }
                  },
                  AKN_KESELURUHAN: {
                    PNS: { jumlah: 218 },
                    P3K: { jumlah: 122 },
                    P3K_PARUH_WAKTU: { jumlah: 22 },
                    PJLP: { jumlah: 34 }
                  }
                },
                prevMatrix: {
                  AKN_POA: {
                    PNS: { jumlah: 77 },
                    P3K: { jumlah: 44 },
                    P3K_PARUH_WAKTU: { jumlah: 7 },
                    PJLP: { jumlah: 12 }
                  },
                  AKN_KESELURUHAN: {
                    PNS: { jumlah: 217 },
                    P3K: { jumlah: 121 },
                    P3K_PARUH_WAKTU: { jumlah: 22 },
                    PJLP: { jumlah: 34 }
                  }
                },
                rekapJabatan: [
                  { jabatan: 'Nakhoda', rumpun: 'DEK', eksisting: 26, kebutuhan: 28, selisih: -2 },
                  { jabatan: 'KKM', rumpun: 'MESIN', eksisting: 27, kebutuhan: 28, selisih: -1 },
                  { jabatan: 'Juru Mudi', rumpun: 'DEK', eksisting: 72, kebutuhan: 70, selisih: 2 },
                  { jabatan: 'Juru Masak', rumpun: 'PENUNJANG', eksisting: 12, kebutuhan: 14, selisih: -2 }
                ]
              }
            });
          }, 10);
        },

        akn_recalculate: function(token) {
          return this.akn_getPapan(token, '2026-W09');
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
                  { pegawaiId: 'AWAK-001', nama: 'BAMBANG SUPRIYANTO', nip: '198207152006041002', nipDisplay: '198207152006041002', kelompokJabatan: 'Nakhoda', rumpun: 'DEK', kelasKapal: 'Kelas I', kategoriKepegawaian: 'PNS', statusPenempatan: 'KAPAL', kapalId: 'KP. Orca 01', durasiKapalTeks: '1 tahun 4 bulan', bstStatus: 'AKTIF', bstExpiry: '2028-05-12', statusAktif: 'AKTIF' },
                  { pegawaiId: 'AWAK-002', nama: 'HENDRO PRASETYO', nip: '198904122014031001', nipDisplay: '198904122014031001', kelompokJabatan: 'KKM', rumpun: 'MESIN', kelasKapal: 'Kelas I', kategoriKepegawaian: 'PNS', statusPenempatan: 'KAPAL', kapalId: 'KP. Orca 01', durasiKapalTeks: '2 tahun 1 bulan', bstStatus: 'SEGERA_HABIS', bstExpiry: '2026-04-10', statusAktif: 'AKTIF' },
                  { pegawaiId: 'AWAK-003', nama: 'DEDI KURNIAWAN', nip: '199105202019021004', nipDisplay: '199105202019021004', kelompokJabatan: 'Mualim I', rumpun: 'DEK', kelasKapal: 'Kelas II', kategoriKepegawaian: 'P3K', statusPenempatan: 'KAPAL', kapalId: 'KP. Hiu 01', durasiKapalTeks: '8 bulan', bstStatus: 'AKTIF', bstExpiry: '2029-01-15', statusAktif: 'AKTIF' },
                  { pegawaiId: 'AWAK-004', nama: 'SITI RAHMAWATI', nip: '199508112022032008', nipDisplay: '199508112022032008', kelompokJabatan: 'Juru Mudi', rumpun: 'DEK', kelasKapal: 'Kelas III', kategoriKepegawaian: 'P3K_PARUH_WAKTU', statusPenempatan: 'KAPAL', kapalId: 'KP. Macan 01', durasiKapalTeks: '4 bulan', bstStatus: 'KEDALUWARSA', bstExpiry: '2025-11-20', statusAktif: 'AKTIF' },
                  { pegawaiId: 'AWAK-005', nama: 'AGUS SETIAWAN', nip: '', nipDisplay: 'NON-ASN / PJLP', kelompokJabatan: 'Juru Masak', rumpun: 'PENUNJANG', kelasKapal: 'Kelas II', kategoriKepegawaian: 'PJLP', statusPenempatan: 'BELUM_DITEMPATKAN', kapalId: '-', durasiKapalTeks: '-', bstStatus: 'BELUM_TERCATAT', bstExpiry: '', statusAktif: 'AKTIF' }
                ],
                total: 5,
                stats: { total: 396, dek: 230, mesin: 154, penunjang: 12, onBoard: 378, standby: 18, bstExpired: 14 },
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
                  Nama: 'BAMBANG SUPRIYANTO',
                  NIP: '198207152006041002',
                  KelompokJabatan: 'Nakhoda',
                  Rumpun: 'DEK',
                  KelasKapal: 'Kelas I',
                  KategoriKepegawaian: 'PNS',
                  StatusPenempatan: 'KAPAL',
                  NoSkPenempatan: 'SK-42/POA/2026',
                  SkPenempatanEvidenceId: 'EV-SK-001',
                  UkuranBaju: 'L',
                  UkuranSepatu: '42',
                  StatusAktif: 'AKTIF'
                },
                sertifikat: [
                  { JenisSertifikat: 'BST (Basic Safety Training)', NomorSertifikat: 'BST-2021-9842', TanggalBerlaku: '2026-03-25', StatusBerlaku: 'SEGERA_HABIS' },
                  { JenisSertifikat: 'ANT-III', NomorSertifikat: 'ANT3-2018-0412', TanggalBerlaku: '', StatusBerlaku: 'BERLAKU' }
                ],
                penugasan: [
                  { NamaKapal: 'KP. Orca 01', PosisiSijil: 'NAKHODA', TanggalMulai: '2024-01-01', TanggalSelesai: '', StatusPenugasan: 'AKTIF', DurasiTeks: '1 tahun 4 bulan' }
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
                sertifikatSynced: 0,
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

        kom_getFormOptions: function(token) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                awakOptions: [
                  { pegawaiId: 'PEG-0001', nama: 'Budi Setyawan', nipDisplay: '19880312 201201 1 001', kelompokJabatan: 'Juru Mudi', jabatanStd: 'Juru Mudi', rumpun: 'DEK', kapalId: 'KP-HIU-02' },
                  { pegawaiId: 'PEG-0002', nama: 'Bambang Supriyanto', nipDisplay: '19820715 200604 1 002', kelompokJabatan: 'Nahkoda', jabatanStd: 'Nahkoda', rumpun: 'DEK', kapalId: 'KP-ORCA-01' },
                  { pegawaiId: 'PEG-0003', nama: 'Hendro Prasetyo', nipDisplay: '19890412 201403 1 001', kelompokJabatan: 'Kepala Kamar Mesin', jabatanStd: 'Kepala Kamar Mesin Kapal', rumpun: 'MESIN', kapalId: 'KP-ORCA-01' }
                ],
                certOptions: [
                  { kodePelatihan: 'TRN-NKH-02', namaPelatihan: 'Basic Safety Training Fisheries (BST / BST-F)', kategori: 'SERTIFIKASI_LAUT', masaBerlakuBulan: 60, source: 'SIKAP', jabatanMap: { 'Nahkoda': true, 'Juru Mudi': true } },
                  { kodePelatihan: 'TRN-NKH-01', namaPelatihan: 'Sertifikat Keahlian Pelaut Nautika (ANKAPIN Tingkat I / II / ANT)', kategori: 'SERTIFIKASI_LAUT', masaBerlakuBulan: 60, source: 'SIKAP', jabatanMap: { 'Nahkoda': true } },
                  { kodePelatihan: 'TRN-NKH-03', namaPelatihan: 'Advanced Fire Fighting (AFF)', kategori: 'SERTIFIKASI_LAUT', masaBerlakuBulan: 60, source: 'SIKAP', jabatanMap: { 'Nahkoda': true } },
                  { kodePelatihan: 'TRN-JMD-01', namaPelatihan: 'Sertifikat Rating Dinas Jaga Navigasi (Rating Dek) / SKK 60 Mil', kategori: 'SERTIFIKASI_LAUT', masaBerlakuBulan: 60, source: 'STANDAR', jabatanMap: { 'Juru Mudi': true } },
                  { kodePelatihan: 'TRN-NKH-05', namaPelatihan: 'Medical First Aid (MFA) / Medical Care', kategori: 'SERTIFIKASI_LAUT', masaBerlakuBulan: 60, source: 'SIKAP', jabatanMap: { 'Nahkoda': true } }
                ]
              }
            });
          }, 10);
        },

        kom_saveSertifikat: function(params) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: { rowId: 'AWAK-SRT-NEW01', message: 'Sertifikat berhasil direkam.' }
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
                  { key: 'juruMinyak', label: 'Juru Minyak' },
                  { key: 'juruMasak', label: 'Juru Masak' }
                ],
                kapal: [
                  {
                    kapalId: 'KPL-001',
                    namaKapal: 'KP. Orca 01',
                    kelasKapal: 'Kelas I',
                    pangkalanId: 'Pangkalan PSDKP Batam',
                    kebutuhanMinimum: 19,
                    jumlahAwakBertugas: 17,
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
                      juruMinyak: { req: 2, act: 2, dev: 0 },
                      juruMasak: { req: 1, act: 1, dev: 0 }
                    }
                  },
                  {
                    kapalId: 'KPL-002',
                    namaKapal: 'KP. Orca 02',
                    kelasKapal: 'Kelas I',
                    pangkalanId: 'Pangkalan PSDKP Benoa',
                    kebutuhanMinimum: 19,
                    jumlahAwakBertugas: 18,
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
                      juruMinyak: { req: 2, act: 2, dev: 0 },
                      juruMasak: { req: 1, act: 1, dev: 0 }
                    }
                  },
                  {
                    kapalId: 'KPL-003',
                    namaKapal: 'KP. Hiu 01',
                    kelasKapal: 'Kelas II',
                    pangkalanId: 'Pangkalan PSDKP Jakarta',
                    kebutuhanMinimum: 15,
                    jumlahAwakBertugas: 15,
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
                      juruMinyak: { req: 2, act: 2, dev: 0 },
                      juruMasak: { req: 1, act: 1, dev: 0 }
                    }
                  }
                ]
              }
            });
          }, 10);
        },

        sijil_getAwakOptions: function(token) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: [
                { pegawaiId: 'PEG-0001', nama: 'Zulfikar', nipDisplay: '19820514 200801 1 002', kelompokJabatan: 'Nahkoda', rumpun: 'DEK', kapalId: 'KPL-001' },
                { pegawaiId: 'PEG-0002', nama: 'Sunaryo', nipDisplay: '19871103 201101 1 004', kelompokJabatan: 'Mualim I', rumpun: 'DEK', kapalId: 'KPL-001' },
                { pegawaiId: 'PEG-0003', nama: 'Untung Kurniawan', nipDisplay: '19840319 200912 1 001', kelompokJabatan: 'Kepala Kamar Mesin', rumpun: 'MESIN', kapalId: 'KPL-001' },
                { pegawaiId: 'PEG-0004', nama: 'Dede Handoyo', nipDisplay: '19890227 201402 1 003', kelompokJabatan: 'Masinis I', rumpun: 'MESIN', kapalId: 'KPL-001' },
                { pegawaiId: 'PEG-0005', nama: 'Lucky Hermanto', nipDisplay: '19910815 201601 1 005', kelompokJabatan: 'Masinis II', rumpun: 'MESIN', kapalId: 'KPL-001' },
                { pegawaiId: 'PEG-0006', nama: 'Dimas Ade Virgiawan', nipDisplay: '19930412 201801 1 002', kelompokJabatan: 'Serang', rumpun: 'DEK', kapalId: 'KPL-001' },
                { pegawaiId: 'PEG-0007', nama: 'Rahmad Idris', nipDisplay: '19940722 201903 1 004', kelompokJabatan: 'Juru Mudi', rumpun: 'DEK', kapalId: 'KPL-001' },
                { pegawaiId: 'PEG-0008', nama: 'Agung Nugraha', nipDisplay: '19951010 202012 1 001', kelompokJabatan: 'Juru Mudi', rumpun: 'DEK', kapalId: 'KPL-001' },
                { pegawaiId: 'PEG-0009', nama: 'Hermanto', nipDisplay: '19960105 202102 1 003', kelompokJabatan: 'Juru Mudi', rumpun: 'DEK', kapalId: 'KPL-001' },
                { pegawaiId: 'PEG-0010', nama: 'Capt. Slamet Riyadi, M.Mar', nipDisplay: '19800412 200501 1 001', kelompokJabatan: 'Nahkoda', rumpun: 'DEK', kapalId: '' },
                { pegawaiId: 'PEG-0011', nama: 'Bambang Supriyanto', nipDisplay: '19850620 201001 1 003', kelompokJabatan: 'Mualim II', rumpun: 'DEK', kapalId: '' },
                { pegawaiId: 'PEG-0012', nama: 'Hendro Prasetyo', nipDisplay: '19880911 201201 1 002', kelompokJabatan: 'Masinis III', rumpun: 'MESIN', kapalId: '' },
                { pegawaiId: 'PEG-0013', nama: 'Dedi Kurniawan', nipDisplay: '19920317 201502 1 005', kelompokJabatan: 'Markonis', rumpun: 'DEK', kapalId: '' }
              ]
            });
          }, 10);
        },

        sijil_getDetailKapal: function(token, kapalId) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                kapalId: kapalId || 'KPL-001',
                namaKapal: (kapalId === 'KPL-001' ? 'KP. Orca 01' : 'KP. Hiu Macan Tutul 02'),
                jenisKapal: 'Kapal Pengawas',
                kelasKapal: 'KELAS_I',
                pangkalanId: 'Pangkalan PSDKP Batam',
                evaluasi: {
                  isLaikOperasi: false,
                  totalTerisi: 16,
                  totalKebutuhan: 18,
                  kekuranganKursi: 2,
                  posisiRincian: [
                    { posSijil: 'NAKHODA', minimum: 1, terisi: 1, kurang: 0, status: 'TERPENUHI' },
                    { posSijil: 'MUALIM_I', minimum: 1, terisi: 1, kurang: 0, status: 'TERPENUHI' },
                    { posSijil: 'MUALIM_II', minimum: 1, terisi: 1, kurang: 0, status: 'TERPENUHI' },
                    { posSijil: 'MUALIM_III', minimum: 1, terisi: 0, kurang: 1, status: 'KURANG' },
                    { posSijil: 'KKM', minimum: 1, terisi: 1, kurang: 0, status: 'TERPENUHI' },
                    { posSijil: 'MASINIS_I', minimum: 1, terisi: 1, kurang: 0, status: 'TERPENUHI' },
                    { posSijil: 'MASINIS_II', minimum: 1, terisi: 1, kurang: 0, status: 'TERPENUHI' },
                    { posSijil: 'MASINIS_III', minimum: 1, terisi: 0, kurang: 1, status: 'KURANG' }
                  ]
                },
                awakBertugas: [
                  {
                    rowId: 'AWAK-TGS-01',
                    pegawaiId: 'PEG-0001',
                    nama: 'Zulfikar',
                    nipDisplay: '19820514 200801 1 002',
                    posSijil: 'NAKHODA',
                    posSijilLabel: 'NAKHODA',
                    rumpun: 'DEK',
                    tanggalNaik: '2026-01-15',
                    tanggalTurun: '',
                    keterangan: 'SK Direktur POA No. 42/POA/2026',
                    suratTugas: {
                      evidenceId: 'EV-001',
                      fileName: 'SPT_Penugasan_KP_Orca_01_Zulfikar.pdf',
                      fileType: 'application/pdf',
                      driveFileId: 'mock-drive-id-12345',
                      viewUrl: 'https://drive.google.com/file/d/mock-drive-id-12345/view'
                    }
                  },
                  {
                    rowId: 'AWAK-TGS-02',
                    pegawaiId: 'PEG-0002',
                    nama: 'Sunaryo',
                    nipDisplay: '19871103 201101 1 004',
                    posSijil: 'MUALIM_I',
                    posSijilLabel: 'MUALIM I',
                    rumpun: 'DEK',
                    tanggalNaik: '2026-01-15',
                    tanggalTurun: '',
                    keterangan: '',
                    suratTugas: null
                  },
                  {
                    rowId: 'AWAK-TGS-03',
                    pegawaiId: 'PEG-0003',
                    nama: 'Untung Kurniawan',
                    nipDisplay: '19840319 200912 1 001',
                    posSijil: 'KKM',
                    posSijilLabel: 'KKM',
                    rumpun: 'MESIN',
                    tanggalNaik: '2026-01-15',
                    tanggalTurun: '',
                    keterangan: 'SPT No. 118/POA/I/2026',
                    suratTugas: {
                      evidenceId: 'EV-002',
                      fileName: 'Surat_Tugas_KKM_Untung.pdf',
                      fileType: 'application/pdf',
                      driveFileId: 'mock-drive-id-67890',
                      viewUrl: 'https://drive.google.com/file/d/mock-drive-id-67890/view'
                    }
                  }
                ],
                userRole: 'SUPERADMIN'
              }
            });
          }, 10);
        },

        sijil_assignAwak: function(params) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                rowId: 'AWAK-TGS-NEW01',
                message: 'Personil berhasil ditempatkan pada papan sijil ' + params.kapalId + '.'
              }
            });
          }, 10);
        },

        sijil_uploadSuratTugas: function(params) {
          var self = this;
          setTimeout(function() {
            self._onSuccess({
              success: true,
              data: {
                evidenceId: 'EV-NEW01',
                message: 'Surat tugas berhasil diunggah.'
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
                      AKN_POA: {
                        PNS: { jumlah: 78 },
                        P3K: { jumlah: 44 },
                        P3K_PARUH_WAKTU: { jumlah: 8 },
                        PJLP: { jumlah: 12 }
                      },
                      AKN_KESELURUHAN: {
                        PNS: { jumlah: 218 },
                        P3K: { jumlah: 122 },
                        P3K_PARUH_WAKTU: { jumlah: 22 },
                        PJLP: { jumlah: 34 }
                      }
                    }
                  },
                  rekapJabatan: [
                    { jabatan: 'Nakhoda', rumpun: 'DEK', eksisting: 26, kebutuhan: 28, selisih: -2 },
                    { jabatan: 'Juru Masak', rumpun: 'PENUNJANG', eksisting: 12, kebutuhan: 14, selisih: -2 }
                  ]
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
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });
    
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

    // 1b. Verifikasi Global Loading Indicator (Top Bar + Floating Status Pill + Refresh Spin)
    console.log('  [Screen 01b] Global Loading Indicator Active');
    await page.evaluate(() => {
      if (typeof GlobalLoader !== 'undefined') GlobalLoader.start('Syncing data SIKAP...');
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01b_loading_indicator.png') });
    await page.evaluate(() => {
      if (typeof GlobalLoader !== 'undefined') GlobalLoader.done();
    });
    await page.waitForTimeout(100);

    // 2. Komposisi AKN
    console.log('  [Screen 02] Komposisi AKN');
    await page.click('button[data-route="komposisi"]');
    await page.waitForTimeout(500);
    const aknChecks = await page.evaluate(() => {
      const modeSel = document.getElementById('akn-filter-mode');
      const oldPeriodeInput = document.getElementById('akn-periode-select');
      const matrixRows = document.querySelectorAll('#tbody-akn-matrix-display tr');
      const rekapRows = document.querySelectorAll('#akn-rekap-jabatan-tbody tr');
      return {
        hasFilterMode: !!modeSel,
        hasOldPeriodeText: !!oldPeriodeInput,
        matrixText: document.getElementById('tbody-akn-matrix-display')?.innerText || '',
        matrixRowCount: matrixRows.length,
        rekapRowCount: rekapRows.length
      };
    });
    if (!aknChecks.hasFilterMode || aknChecks.hasOldPeriodeText) {
      throw new Error('Komposisi AKN filter kontrol tidak sesuai standar kalender/preset');
    }
    if (aknChecks.matrixText.includes('PPPK tenaga fungsional') || aknChecks.matrixText.includes('PPPK tenaga pelaksana')) {
      throw new Error('Komposisi AKN masih menampilkan kategori PPPK lama');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_komposisi_desktop.png') });

    // 3. Direktori Awak
    console.log('  [Screen 03] Direktori Awak');
    await page.click('button[data-route="direktori"]');
    await page.waitForTimeout(500);
    const dirChecks = await page.evaluate(() => {
      return {
        hasOldJabatan: !!document.getElementById('awak-input-jabatan-lengkap'),
        hasOldBuku: !!document.getElementById('awak-input-buku'),
        hasPeriodePreset: !!document.getElementById('dir-filter-periode-mode'),
        hasStatusPenempatanFilter: !!document.getElementById('dir-filter-penempatan')
      };
    });
    if (dirChecks.hasOldJabatan || dirChecks.hasOldBuku || !dirChecks.hasPeriodePreset || !dirChecks.hasStatusPenempatanFilter) {
      throw new Error('Direktori Awak DOM tidak sesuai kontrak Tahap 3: ' + JSON.stringify(dirChecks));
    }
    // Uji modal Tambah Awak: sanitasi nama & kondisional NIP PJLP
    await page.click('#btn-tambah-awak');
    await page.waitForTimeout(250);
    await page.fill('#awak-input-nama', "Ma'ruf, S.Pi.");
    await page.dispatchEvent('#awak-input-nama', 'input');
    const sanitizedVal = await page.inputValue('#awak-input-nama');
    if (sanitizedVal !== 'MARUF SPI') {
      throw new Error('Sanitasi nama kanonik gagal, hasil: ' + sanitizedVal);
    }
    await page.selectOption('#awak-input-kategori', 'PJLP');
    const pjlpNipDisabled = await page.isDisabled('#awak-input-nip');
    if (!pjlpNipDisabled) {
      throw new Error('Field NIP harus dinonaktifkan saat kategori PJLP dipilih');
    }
    await page.selectOption('#awak-input-kategori', 'PNS');
    const pnsNipDisabled = await page.isDisabled('#awak-input-nip');
    if (pnsNipDisabled) {
      throw new Error('Field NIP harus aktif saat kategori PNS dipilih');
    }
    await page.click('#modal-dir-awak .modal-close');
    await page.waitForTimeout(200);
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

    // 4b. Modal Catat Sertifikat Baru (Searchable Crew + Katalog SIKAP)
    console.log('  [Screen 04b] Modal Catat Sertifikat (Katalog SIKAP & Pencarian Awak)');
    await page.click('#btn-kom-open-catat-new');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04b_kompetensi_modal_catat.png') });

    // 4c. Dropdown Sertifikat SIKAP + Opsi Input Manual
    console.log('  [Screen 04c] Dropdown Katalog Sertifikat SIKAP + Opsi Lainnya');
    await page.focus('#kom-save-cert-search-input');
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04c_kompetensi_cert_dropdown.png') });

    // 4d. Mode Input Sertifikat Tambahan (Di Luar Daftar SIKAP)
    console.log('  [Screen 04d] Mode Input Manual Sertifikat di Luar Daftar SIKAP');
    await page.click('#btn-kom-toggle-custom');
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04d_kompetensi_custom_cert.png') });

    // Tutup modal
    await page.click('#modal-kom-save .modal-close');
    await page.waitForTimeout(200);

    // 5. Papan Sijil Kapal (2D Matrix Table)
    console.log('  [Screen 05] Papan Sijil Kapal (2D Matrix Table)');
    await page.click('button[data-route="sijil"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_sijil_desktop.png') });

    // 5b. Lembar Samping Sijil Kapal & Akses Berkas Surat Tugas
    console.log('  [Screen 05b] Lembar Samping Sijil & Akses Surat Tugas (SPT)');
    await page.click('#sijil-2d-matrix-tbody tr.clickable');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05b_sijil_sheet_with_spt.png') });

    // 5c. Modal Penempatan dengan Pencarian Awak & Dropzone Berkas
    console.log('  [Screen 05c] Modal Penempatan: Pencarian Awak & Dropzone Surat Tugas');
    await page.click('#btn-sheet-add-awak');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05c_sijil_modal_assign.png') });

    // 5d. Uji Pencarian Awak (Autocomplete Dropdown 396+ Personil)
    console.log('  [Screen 05d] Autocomplete Pencarian Awak');
    await page.fill('#assign-crew-search-input', 'Zulfikar');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05d_sijil_combobox_search.png') });

    // Tutup modal dan lembar samping
    await page.click('#modal-sijil-assign .modal-close');
    await page.waitForTimeout(200);
    await page.click('#sheet-sijil-panel .modal-close');
    await page.waitForTimeout(200);

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

    if (pageErrors.length > 0) {
      throw new Error('Uncaught browser page errors: ' + pageErrors.join(' | '));
    }

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
