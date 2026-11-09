/**
 * services/LaporanService.js
 * Layanan Dasbor Ringkasan Eksekutif, Laporan Dinas Konsolidasi, & Ekspor.
 * Sesuai PRD §3.6 (Sub-Modul F), §3.7 (Sub-Modul G), ARCHITECTURE §3.7
 *
 * Fungsi Publik:
 * - ringkasan_get(token, filter)
 * - lap_getPreviewData(token, params)
 * - lap_exportData(token, params)
 */

// ===========================================================================
// 1. DASBOR RINGKASAN EKSEKUTIF (KOKPIT PENGAWAKAN)
// ===========================================================================

/**
 * Mengambil metrik terpadu untuk Dasbor Ringkasan (KPI 4-strip, Safe Manning,
 * status kelaikan kompetensi, rekap kegiatan, dan kalimat temuan berbasis data).
 *
 * @param {string} token
 * @param {Object} filter { tahun: number }
 */
function ringkasan_get(token, filter) {
  try {
    var session = _requireSession(token);
    assertScope(session, null, null);

    filter = filter || {};
    var tahun = filter.tahun || new Date().getFullYear();

    // 1. Ambil Data Komposisi AKN Terkini (Carry Forward)
    var aknResult = akn_getPapan(token, {});
    var aknData = (aknResult && aknResult.success) ? aknResult.data : null;

    // 2. Ambil Statistik Direktori Awak Kapal
    var dirResult = dir_list(token, { limit: 1000 });
    var allAwak = (dirResult && dirResult.success && dirResult.data) ? dirResult.data.items : [];
    var totalAwak = allAwak.length;
    var countDek = 0;
    var countMesin = 0;
    var countPns = 0;
    var countPppk = 0;
    var countNonAsn = 0;
    var countPerluDilengkapi = 0;

    allAwak.forEach(function (a) {
      if (a.rumpun === 'DEK') countDek++;
      else if (a.rumpun === 'MESIN') countMesin++;

      var kat = String(a.kategori || '').toUpperCase();
      if (kat === 'PNS') countPns++;
      else if (kat === 'PPPK') countPppk++;
      else countNonAsn++;

      if (!a.nip || !a.kelasKapal || !a.kategori) countPerluDilengkapi++;
    });

    // 3. Ambil Papan Sijil Safe Manning
    var sijilResult = sijil_getPapanArmada(token, {});
    var sijilData = (sijilResult && sijilResult.success && sijilResult.data) ? sijilResult.data : {
      totalKapal: 0,
      laikOperasi: 0,
      kurangAwak: 0,
      kritis: 0,
      kapalList: []
    };

    // 4. Ambil Statistik Sertifikasi STCW-F & Kedaluwarsa
    var komResult = kom_getDashboard(token, {});
    var komData = (komResult && komResult.success && komResult.data) ? komResult.data : {
      stats: { totalSertifikat: 0, berlaku: 0, segeraHabis: 0, expired: 0, kelaikanPersen: 100 },
      antreanTindakLanjut: []
    };

    // 5. Ambil Log Kegiatan Terbaru
    var kegResult = keg_list(token, { limit: 5 });
    var kegiatanTerbaru = (kegResult && kegResult.success && kegResult.data) ? kegResult.data.items : [];

    // 6. Generator Narasi Temuan Eksekutif Berbasis Data (Data-driven Insights)
    var narasi = [];
    if (sijilData.kurangAwak > 0 || sijilData.kritis > 0) {
      narasi.push('Terdapat ' + (sijilData.kurangAwak + sijilData.kritis) + ' kapal pengawas dengan formasi personil di bawah standar Safe Manning Kepmen KP.');
    } else {
      narasi.push('Seluruh ' + sijilData.totalKapal + ' kapal pengawas armada Ditjen PSDKP memenuhi standar formasi Safe Manning.');
    }

    if (komData.stats.expired > 0) {
      narasi.push('Ditemukan ' + komData.stats.expired + ' rekaman sertifikat keselamatan awak kapal yang berstatus KEDALUWARSA dan membutuhkan revalidasi diklat segera.');
    } else if (komData.stats.segeraHabis > 0) {
      narasi.push(komData.stats.segeraHabis + ' sertifikat kepelautan akan kedaluwarsa dalam rentang <= 90 hari mendatang.');
    }

    if (countPerluDilengkapi > 0) {
      narasi.push('Sebanyak ' + countPerluDilengkapi + ' profil awak kapal masih berada pada antrean kelengkapan data (NIP/Kelas Kapal/Kategori).');
    }

    var ringkasanPayload = {
      tahun: tahun,
      kpi: {
        totalAwak: totalAwak,
        totalKapal: sijilData.totalKapal,
        kelaikanPersen: komData.stats.kelaikanPersen,
        sertifikatExpired: komData.stats.expired,
        sertifikatSegeraHabis: komData.stats.segeraHabis,
        kurangAwakKapal: sijilData.kurangAwak + sijilData.kritis,
        perluDilengkapi: countPerluDilengkapi
      },
      demografi: {
        dek: countDek,
        mesin: countMesin,
        pns: countPns,
        pppk: countPppk,
        nonAsn: countNonAsn
      },
      aknTerbaru: aknData ? aknData.matriks : null,
      aknMeta: aknData ? { periode: aknData.periode, carried: aknData.carried } : null,
      sijilSummary: {
        totalKapal: sijilData.totalKapal,
        laikOperasi: sijilData.laikOperasi,
        kurangAwak: sijilData.kurangAwak,
        kritis: sijilData.kritis
      },
      sertifikatSummary: komData.stats,
      antreanSertifikatUrgent: komData.antreanTindakLanjut.slice(0, 5),
      kegiatanTerbaru: kegiatanTerbaru,
      narasiTemuan: narasi
    };

    return { success: true, data: ringkasanPayload };
  } catch (err) {
    Logger.log('[ringkasan_get] err: ' + err.message);
    return { success: false, error: err.message };
  }
}

// ===========================================================================
// 2. PRATINJAU DOKUMEN LAPORAN DINAS KONSOLIDASI
// ===========================================================================

/**
 * Mengambil paket data terkonsolidasi untuk pratinjau cetak A4.
 *
 * @param {string} token
 * @param {Object} params { jenisLaporan: 'KOMPREHENSIF'|'SAFE_MANNING'|'KOMPETENSI'|'AKN' }
 */
function lap_getPreviewData(token, params) {
  try {
    var session = _requireSession(token);
    assertScope(session, null, null);

    params = params || {};
    var jenis = params.jenisLaporan || 'KOMPREHENSIF';

    var ringkasanRes = ringkasan_get(token, {});
    var ringkasanData = ringkasanRes.success ? ringkasanRes.data : {};

    var kapalDetailList = [];
    if (jenis === 'KOMPREHENSIF' || jenis === 'SAFE_MANNING') {
      var sijilRes = sijil_getPapanArmada(token, {});
      if (sijilRes.success && sijilRes.data) {
        kapalDetailList = sijilRes.data.kapalList;
      }
    }

    var payload = {
      nomorDokumen: 'ND.AWAK/' + new Date().getFullYear() + '/KONSOLIDASI',
      tanggalCetak: new Date().toISOString(),
      pencetak: session.nama || session.email,
      jenisLaporan: jenis,
      ringkasan: ringkasanData,
      armada: kapalDetailList
    };

    return { success: true, data: payload };
  } catch (err) {
    Logger.log('[lap_getPreviewData] err: ' + err.message);
    return { success: false, error: err.message };
  }
}

// ===========================================================================
// 3. EKSPOR DATA STRUKTUR LAPORAN (CSV / SPREADSHEET TABLE)
// ===========================================================================

/**
 * Menghasilkan representasi tabular CSV untuk diunduh langsung di peramban.
 *
 * @param {string} token
 * @param {Object} params { modul: 'DIREKTORI'|'SIJIL'|'KOMPETENSI'|'AKN' }
 */
function lap_exportData(token, params) {
  try {
    var session = _requireSession(token);
    assertScope(session, null, null);

    params = params || {};
    var modul = params.modul || 'DIREKTORI';
    var csvRows = [];
    var filename = 'Nakhoda_Export_' + modul + '_' + new Date().getTime() + '.csv';

    if (modul === 'DIREKTORI') {
      var dirRes = dir_list(token, { limit: 2000 });
      var items = (dirRes.success && dirRes.data) ? dirRes.data.items : [];
      csvRows.push(['PegawaiID', 'Nama', 'NIP', 'Jabatan', 'Rumpun', 'Kelas_Kapal', 'Kategori', 'Kapal_Aktif', 'Status']);
      items.forEach(function (it) {
        csvRows.push([
          it.pegawaiId || '',
          '"' + (it.nama || '').replace(/"/g, '""') + '"',
          it.nip || '',
          '"' + (it.jabatan || '').replace(/"/g, '""') + '"',
          it.rumpun || '',
          it.kelasKapal || '',
          it.kategori || '',
          '"' + (it.kapalAktif || '').replace(/"/g, '""') + '"',
          it.status || ''
        ]);
      });
    } else if (modul === 'SIJIL') {
      var sijilRes = sijil_getPapanArmada(token, {});
      var kapalList = (sijilRes.success && sijilRes.data) ? sijilRes.data.kapalList : [];
      csvRows.push(['KapalID', 'Nama_Kapal', 'Kelas_Kapal', 'Kebutuhan_Min', 'Terisi', 'Kekurangan', 'Status_Kelaikan']);
      kapalList.forEach(function (k) {
        csvRows.push([
          k.kapalId || '',
          '"' + (k.namaKapal || '').replace(/"/g, '""') + '"',
          k.kelasKapal || '',
          k.kebutuhanMinimum || 0,
          k.totalTerisi || 0,
          k.deviasiKekurangan || 0,
          k.statusManning || ''
        ]);
      });
    }

    var csvContent = csvRows.map(function (r) { return r.join(','); }).join('\r\n');
    return { success: true, data: { filename: filename, csv: csvContent } };
  } catch (err) {
    Logger.log('[lap_exportData] err: ' + err.message);
    return { success: false, error: err.message };
  }
}
