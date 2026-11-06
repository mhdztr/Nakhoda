/**
 * services/KompetensiService.js
 * Sub-Modul D: Register Sertifikasi STCW-F & Mesin Status Kedaluwarsa
 * Nakhoda — Timja Pengawakan Dit. POA KKP RI
 */

/**
 * Mengambil ringkasan metrik kompetensi dan antrean prioritas tindak lanjut revalidasi.
 *
 * @param {string} token
 */
function kom_getDashboard(token) {
  try {
    var session = _requireSession(token);
    kom_ensureStandarSeeded();

    var sheetSrt = openAwakSheet(SHEET_AWAK.PELATIHAN_AWAK);
    var rowsSrt = sheetToObjects(sheetSrt);
    var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var rowsAwak = sheetToObjects(sheetAwak);

    var awakMap = {};
    rowsAwak.forEach(function (a) {
      awakMap[String(a.PegawaiID || '')] = a;
    });

    var countBerlaku = 0;
    var countSegeraHabis = 0;
    var countKedaluwarsa = 0;
    var antrean = [];

    var now = new Date();

    rowsSrt.forEach(function (s) {
      if (String(s.Status || '').toUpperCase() !== ROW_STATUS.ACTIVE) return;

      var evalRes = evaluateSertifikatStatus(s, now);
      var peg = awakMap[String(s.PegawaiID || '')] || {};

      if (evalRes.status === CERT_STATUS.BERLAKU) {
        countBerlaku++;
      } else if (evalRes.status === CERT_STATUS.SEGERA_HABIS) {
        countSegeraHabis++;
        countBerlaku++;
        antrean.push({
          rowId: String(s.RowID || ''),
          pegawaiId: String(s.PegawaiID || ''),
          namaAwak: String(peg.Nama || s.PegawaiID),
          jabatan: String(peg.JabatanLengkap || peg.KelompokJabatan || '-'),
          kodePelatihan: String(s.KodePelatihan || ''),
          namaPelatihan: String(s.NamaPelatihan || ''),
          nomorSertifikat: String(s.NomorSertifikat || '-'),
          berlakuSampai: String(s.BerlakuSampai || ''),
          sisaHari: evalRes.sisaHari,
          status: evalRes.status,
          label: evalRes.label,
          evidenceId: String(s.EvidenceID || '')
        });
      } else if (evalRes.status === CERT_STATUS.KEDALUWARSA) {
        countKedaluwarsa++;
        antrean.push({
          rowId: String(s.RowID || ''),
          pegawaiId: String(s.PegawaiID || ''),
          namaAwak: String(peg.Nama || s.PegawaiID),
          jabatan: String(peg.JabatanLengkap || peg.KelompokJabatan || '-'),
          kodePelatihan: String(s.KodePelatihan || ''),
          namaPelatihan: String(s.NamaPelatihan || ''),
          nomorSertifikat: String(s.NomorSertifikat || '-'),
          berlakuSampai: String(s.BerlakuSampai || ''),
          sisaHari: evalRes.sisaHari,
          status: evalRes.status,
          label: evalRes.label,
          evidenceId: String(s.EvidenceID || '')
        });
      }
    });

    // Urutkan antrean tindak lanjut: sisaHari terkecil (paling mendesak/expired) di atas
    antrean.sort(function (a, b) {
      return (a.sisaHari || 0) - (b.sisaHari || 0);
    });

    return {
      success: true,
      data: {
        metrics: {
          totalTercatat: rowsSrt.filter(function (s) { return String(s.Status || '').toUpperCase() === ROW_STATUS.ACTIVE; }).length,
          berlaku: countBerlaku,
          segeraHabis: countSegeraHabis,
          kedaluwarsa: countKedaluwarsa
        },
        antrean: antrean.slice(0, 50),
        userRole: session.role
      }
    };
  } catch (e) {
    Logger.log('[kom_getDashboard] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mengambil daftar seluruh awak kapal beserta kalkulasi kelaikan kompetensi STCW-F.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} [params.kelompokJabatan]
 * @param {string} [params.search]
 * @param {number} [params.limit]
 * @param {number} [params.offset]
 */
function kom_listAwakKompetensi(params) {
  try {
    var p = params || {};
    var session = _requireSession(p.token);
    kom_ensureStandarSeeded();

    var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var rowsAwak = sheetToObjects(sheetAwak);
    var sheetStd = openAwakSheet(SHEET_AWAK.MASTER_STANDAR_PELATIHAN);
    var rowsStd = sheetToObjects(sheetStd);
    var sheetSrt = openAwakSheet(SHEET_AWAK.PELATIHAN_AWAK);
    var rowsSrt = sheetToObjects(sheetSrt);

    // Bangun map sertifikat aktif per PegawaiID
    var certByPegawai = {};
    rowsSrt.forEach(function (s) {
      if (String(s.Status || '').toUpperCase() !== ROW_STATUS.ACTIVE) return;
      var pegId = String(s.PegawaiID || '');
      var kd = String(s.KodePelatihan || '');
      if (!certByPegawai[pegId]) certByPegawai[pegId] = {};
      certByPegawai[pegId][kd] = s;
    });

    // Kelompokkan standar wajib per KelompokJabatan
    var stdByJabatan = {};
    rowsStd.forEach(function (std) {
      var jab = String(std.KelompokJabatan || '');
      if (!stdByJabatan[jab]) stdByJabatan[jab] = [];
      if (std.Wajib === true || String(std.Wajib).toLowerCase() === 'true') {
        stdByJabatan[jab].push(std);
      }
    });

    var now = new Date();
    var searchStr = String(p.search || '').toLowerCase().trim();
    var jabFilter = String(p.kelompokJabatan || '').trim();

    var evaluated = rowsAwak.map(function (a) {
      var pegId = String(a.PegawaiID || '');
      var jab = String(a.KelompokJabatan || '');

      // Normalisasi nama jabatan ke kelompok standar
      var matchedJab = _normalizeJabatanStandar(jab);
      var stds = stdByJabatan[matchedJab] || [];
      var sMap = certByPegawai[pegId] || {};

      var kelaikan = calculateKelaikanKompetensi(stds, sMap, now);

      return {
        pegawaiId: pegId,
        nama: String(a.Nama || ''),
        nipDisplay: maskNip(String(a.NIP || ''), session.role === ROLE.SUPERADMIN || session.role === ROLE.KADIV),
        kelompokJabatan: jab,
        jabatanLengkap: String(a.JabatanLengkap || ''),
        rumpun: String(a.Rumpun || 'DEK'),
        kelasKapal: String(a.KelasKapal || 'NON_KAPAL'),
        kelaikan: kelaikan
      };
    });

    // Saring data
    var filtered = evaluated.filter(function (item) {
      if (jabFilter && item.kelompokJabatan !== jabFilter) return false;
      if (searchStr) {
        var n = item.nama.toLowerCase();
        var j = item.jabatanLengkap.toLowerCase();
        if (n.indexOf(searchStr) === -1 && j.indexOf(searchStr) === -1) return false;
      }
      return true;
    });

    var total = filtered.length;
    var limit = p.limit || 50;
    var offset = p.offset || 0;
    var paged = filtered.slice(offset, offset + limit);

    return {
      success: true,
      data: {
        items: paged,
        total: total,
        userRole: session.role
      }
    };
  } catch (e) {
    Logger.log('[kom_listAwakKompetensi] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mengambil detail matriks kompetensi lengkap seorang awak kapal
 * (Membandingkan butir standar wajib & opsional terhadap sertifikat riil).
 *
 * @param {string} token
 * @param {string} pegawaiId
 */
function kom_getAwakMatriks(token, pegawaiId) {
  try {
    var session = _requireSession(token);
    var pId = String(pegawaiId || '').trim();
    if (!pId) return { success: false, error: 'PegawaiID tidak valid.' };

    var sheetAwak = openAwakSheet(SHEET_AWAK.MASTER_AWAK);
    var foundAwak = findRowByField(sheetAwak, 'PegawaiID', pId);
    if (!foundAwak) return { success: false, error: 'Data personil tidak ditemukan.' };

    var a = foundAwak.obj;
    var matchedJab = _normalizeJabatanStandar(String(a.KelompokJabatan || ''));

    var sheetStd = openAwakSheet(SHEET_AWAK.MASTER_STANDAR_PELATIHAN);
    var rowsStd = sheetToObjects(sheetStd).filter(function (s) {
      return String(s.KelompokJabatan || '') === matchedJab;
    });

    var sheetSrt = openAwakSheet(SHEET_AWAK.PELATIHAN_AWAK);
    var rowsSrt = sheetToObjects(sheetSrt).filter(function (s) {
      return String(s.PegawaiID || '') === pId && String(s.Status || '').toUpperCase() === ROW_STATUS.ACTIVE;
    });

    var sMap = {};
    rowsSrt.forEach(function (s) {
      sMap[String(s.KodePelatihan || '')] = s;
    });

    var now = new Date();

    var matriks = rowsStd.map(function (std) {
      var kd = String(std.KodePelatihan || '');
      var cert = sMap[kd];
      var evalRes = evaluateSertifikatStatus(cert, now);

      return {
        kodePelatihan: kd,
        namaPelatihan: String(std.NamaPelatihan || ''),
        kategori: String(std.Kategori || 'SERTIFIKASI_LAUT'),
        wajib: std.Wajib === true || String(std.Wajib).toLowerCase() === 'true',
        masaBerlakuBulan: parseInt(std.MasaBerlakuBulan, 10) || 0,
        hasCert: !!cert,
        nomorSertifikat: cert ? String(cert.NomorSertifikat || '-') : '-',
        tanggalTerbit: cert ? String(cert.TanggalTerbit || '') : '',
        berlakuSampai: cert ? String(cert.BerlakuSampai || '') : '',
        penerbitLembaga: cert ? String(cert.PenerbitLembaga || '-') : '-',
        status: evalRes.status,
        sisaHari: evalRes.sisaHari,
        label: evalRes.label,
        evidenceId: cert ? String(cert.EvidenceID || '') : ''
      };
    });

    var wajibList = rowsStd.filter(function (s) { return s.Wajib === true || String(s.Wajib).toLowerCase() === 'true'; });
    var kelaikan = calculateKelaikanKompetensi(wajibList, sMap, now);

    return {
      success: true,
      data: {
        pegawaiId: pId,
        nama: String(a.Nama || ''),
        nipDisplay: maskNip(String(a.NIP || ''), session.role === ROLE.SUPERADMIN || session.role === ROLE.KADIV),
        kelompokJabatan: String(a.KelompokJabatan || ''),
        jabatanLengkap: String(a.JabatanLengkap || ''),
        kelasKapal: String(a.KelasKapal || 'NON_KAPAL'),
        rumpun: String(a.Rumpun || 'DEK'),
        kelaikan: kelaikan,
        matriks: matriks,
        userRole: session.role
      }
    };
  } catch (e) {
    Logger.log('[kom_getAwakMatriks] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Merekam atau merevalidasi sertifikat kompetensi seorang personil awak kapal.
 * Jika sertifikat sebelumnya sudah ada untuk kode pelatihan yang sama, tandai SUPERSEDED.
 *
 * @param {Object} params
 */
function kom_saveSertifikat(params) {
  try {
    return withLock(function () {
      var session = _requireSession(params.token);
      assertScope(session, [ROLE.STAF, ROLE.KADIV, ROLE.SUPERADMIN], null);

      var pId = String(params.pegawaiId || '').trim();
      var kd = String(params.kodePelatihan || '').trim();
      var namaPelatihan = String(params.namaPelatihan || '').trim();
      var noSert = String(params.nomorSertifikat || '').trim();

      if (!pId) return { success: false, error: 'PegawaiID tidak valid.' };
      if (!kd) return { success: false, error: 'Kode Pelatihan wajib diisi.' };
      if (!noSert) return { success: false, error: 'Nomor Sertifikat wajib diisi.' };

      var sheetSrt = openAwakSheet(SHEET_AWAK.PELATIHAN_AWAK);
      var rowsSrt = sheetToObjects(sheetSrt);

      var existingRow = null;
      for (var i = 0; i < rowsSrt.length; i++) {
        var r = rowsSrt[i];
        if (String(r.PegawaiID || '') === pId &&
            String(r.KodePelatihan || '') === kd &&
            String(r.Status || '').toUpperCase() === ROW_STATUS.ACTIVE) {
          existingRow = { obj: r, rowIndex: i + 2 };
          break;
        }
      }

      var now = new Date();
      var supersedesId = '';

      if (existingRow) {
        updateRowCells(sheetSrt, existingRow.rowIndex, {
          'Status': ROW_STATUS.SUPERSEDED
        });
        supersedesId = String(existingRow.obj.RowID || '');
      }

      var newRowId = 'AWAK-SRT-' + Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();

      // Unggah berkas evidence jika disertakan
      var evidenceId = '';
      if (params.fileData) {
        try {
          var uploadRes = evidence_upload(params.token, {
            refSheet: SHEET_AWAK.PELATIHAN_AWAK,
            refRowId: newRowId,
            fileName: params.fileData.fileName,
            mimeType: params.fileData.mimeType,
            dataBase64: params.fileData.dataBase64
          });
          if (uploadRes && uploadRes.success) {
            evidenceId = uploadRes.data.evidenceId;
          }
        } catch (eUp) {
          Logger.log('[kom_saveSertifikat] Upload evidence notice: ' + eUp.message);
        }
      }

      var tglTerbit = String(params.tanggalTerbit || '').trim();
      var tglExp = String(params.berlakuSampai || '').trim();
      var thn = parseInt(params.tahunPelatihan, 10) || (tglTerbit ? parseInt(tglTerbit.substring(0, 4), 10) : now.getFullYear());

      // Hitung periode minggu dari tanggal terbit
      var periode = getPeriodeFromDate(tglTerbit || Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd'));

      appendRowData(sheetSrt, {
        'RowID': newRowId,
        'DivisiID': DIVISI_ID.AWAK,
        'Periode': periode,
        'SubmittedBy': session.userId,
        'Timestamp': now,
        'Status': ROW_STATUS.ACTIVE,
        'SupersedesRowID': supersedesId,
        'VoidReason': '',
        'VoidedBy': '',
        'VoidedAt': '',
        'PegawaiID': pId,
        'KodePelatihan': kd,
        'NamaPelatihan': namaPelatihan,
        'StatusKelulusan': 'SUDAH_LULUS',
        'NomorSertifikat': noSert,
        'TahunPelatihan': thn,
        'TanggalTerbit': tglTerbit,
        'BerlakuSampai': tglExp,
        'PenerbitLembaga': String(params.penerbitLembaga || '').trim(),
        'EvidenceID': evidenceId
      });

      _auditLog(session.userId, 'REVALIDASI_SERTIFIKAT', SHEET_AWAK.PELATIHAN_AWAK, newRowId,
        'Rekam sertifikat: ' + namaPelatihan + ' (' + noSert + ') untuk ' + pId);

      return {
        success: true,
        data: {
          rowId: newRowId,
          message: 'Sertifikat kompetensi berhasil direkam / direvalidasi.'
        }
      };
    });
  } catch (e) {
    Logger.log('[kom_saveSertifikat] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Seeding otomatis 114 butir standar kompetensi STCW-F ke Master_Standar_Pelatihan.
 */
function kom_ensureStandarSeeded() {
  try {
    var sheet = openAwakSheet(SHEET_AWAK.MASTER_STANDAR_PELATIHAN);
    var rows = sheetToObjects(sheet);
    if (rows.length >= 100) return;

    if (typeof SEED_STANDAR_AWAK === 'undefined') {
      Logger.log('[kom_ensureStandarSeeded] SEED_STANDAR_AWAK tidak terdefinisi.');
      return;
    }

    var existingCodes = {};
    rows.forEach(function (r) {
      existingCodes[String(r.KodePelatihan || '')] = true;
    });

    var toInsert = [];
    var keys = Object.keys(SEED_STANDAR_AWAK);
    keys.forEach(function (jab) {
      var items = SEED_STANDAR_AWAK[jab] || [];
      items.forEach(function (item) {
        if (existingCodes[item.kode]) return;
        toInsert.push([
          item.kode,
          item.kelompokJabatan,
          item.tingkatKelas,
          item.kategori,
          item.nama,
          item.masaBerlakuBulan,
          item.wajib,
          item.urutan
        ]);
      });
    });

    if (toInsert.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, toInsert.length, toInsert[0].length).setValues(toInsert);
      Logger.log('[kom_ensureStandarSeeded] Berhasil men-seed ' + toInsert.length + ' butir standar.');
    }
  } catch (e) {
    Logger.log('[kom_ensureStandarSeeded] ' + e.message);
  }
}

/**
 * Helper pemetaan nama jabatan bebas ke 9 kelompok standar resmi.
 */
function _normalizeJabatanStandar(jabatanText) {
  var t = String(jabatanText || '').toUpperCase();
  if (/NAHKODA|NAKHODA/.test(t)) return 'Nahkoda';
  if (/MUALIM/.test(t)) return 'Mualim';
  if (/MARKONIS|RADIO/.test(t)) return 'Markonis';
  if (/SERANG/.test(t)) return 'Serang';
  if (/JURU MUDI|JURU MUDY/.test(t)) return 'Juru Mudi';
  if (/KELASI/.test(t)) return 'Kelasi Kapal';
  if (/KEPALA KAMAR MESIN|KKM/.test(t)) return 'Kepala Kamar Mesin Kapal';
  if (/MASINIS/.test(t)) return 'Masinis';
  if (/JURU MINYAK|OILER/.test(t)) return 'Juru Minyak';
  return 'Nahkoda'; // fallback
}

