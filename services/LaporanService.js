/**
 * services/LaporanService.js
 * Layanan Dasbor Ringkasan Eksekutif, Laporan Dinas Konsolidasi, & Ekspor.
 * Sesuai PRD §3.6 (Sub-Modul F), §3.7 (Sub-Modul G), ARCHITECTURE §3.7, DESIGN §8.0
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
 * Mengambil metrik terpadu untuk Dasbor Ringkasan (KPI 4-strip, Komposisi AKN,
 * Papan Sijil Safe Manning, status kelaikan kompetensi, tren 12 minggu,
 * rekap kegiatan, dan kalimat temuan berbasis data).
 *
 * @param {string} token
 * @param {Object} [filter] { tahun: number }
 */
function ringkasan_get(token, filter) {
  try {
    var session = _requireSession(token);
    assertScope(session, null, null);

    filter = filter || {};
    var tahun = filter.tahun || new Date().getFullYear();

    // 1. Ambil Data Komposisi AKN Terkini (Carry Forward) & Tren 12 Minggu
    var aknResult = akn_getPapan(token, '');
    var aknData = (aknResult && aknResult.success && aknResult.data) ? aknResult.data : null;

    var trenResult = akn_getTren(token, 12);
    var aknTren = (trenResult && trenResult.success && trenResult.data && Array.isArray(trenResult.data.series))
      ? trenResult.data.series
      : [];

    // 2. Ambil Statistik Direktori Awak Kapal
    var dirResult = dir_list({ token: token, limit: 500 });
    var allAwak = (dirResult && dirResult.success && dirResult.data && Array.isArray(dirResult.data.items))
      ? dirResult.data.items
      : [];
    var dirStats = (dirResult && dirResult.success && dirResult.data && dirResult.data.stats)
      ? dirResult.data.stats
      : { total: allAwak.length, dek: 0, mesin: 0, perluDilengkapi: 0 };

    var countPns = 0;
    var countPppk = 0;
    var countNonAsn = 0;

    allAwak.forEach(function (a) {
      var kat = String(a.kategoriKepegawaian || '').toUpperCase();
      if (kat === 'PNS') countPns++;
      else if (kat.indexOf('PPPK') !== -1) countPppk++;
      else countNonAsn++;
    });

    // 3. Ambil Papan Sijil Safe Manning
    var sijilResult = sijil_getPapanArmada(token);
    var sijilPayload = (sijilResult && sijilResult.success && sijilResult.data) ? sijilResult.data : {};
    var sijilMetrics = sijilPayload.metrics || {
      totalKapal: 0,
      laikOperasi: 0,
      kurangAwak: 0,
      kritis: 0,
      totalAwakBertugas: 0,
      totalKekuranganKursi: 0
    };
    var kapalList = Array.isArray(sijilPayload.kapal) ? sijilPayload.kapal : [];

    // Urutkan ringkasan kapal: utamakan yang kurang awak di atas, lalu Kelas I
    var sortedKapalRingkas = kapalList.slice().sort(function (a, b) {
      if ((b.kekuranganKursi || 0) !== (a.kekuranganKursi || 0)) {
        return (b.kekuranganKursi || 0) - (a.kekuranganKursi || 0);
      }
      return String(a.kelasKapal || '').localeCompare(String(b.kelasKapal || ''));
    }).slice(0, 8);

    // 4. Ambil Statistik Sertifikasi STCW-F & Kedaluwarsa
    var komResult = kom_getDashboard(token);
    var komPayload = (komResult && komResult.success && komResult.data) ? komResult.data : {};
    var komMetrics = komPayload.metrics || {
      totalTercatat: 0,
      berlaku: 0,
      segeraHabis: 0,
      kedaluwarsa: 0,
      awakLengkap: 0,
      totalAwak: dirStats.total,
      kelaikanPersen: 100
    };
    var antreanSertifikat = Array.isArray(komPayload.antrean) ? komPayload.antrean : [];

    // 5. Ambil Log Kegiatan Terbaru
    var kegResult = keg_list({ token: token, limit: 5 });
    var kegiatanTerbaru = (kegResult && kegResult.success && kegResult.data && Array.isArray(kegResult.data.items))
      ? kegResult.data.items
      : [];

    // 6. Kalimat Temuan Berbasis Data (DESIGN.md §1.2 & §5.1)
    var totalUrgentCert = (komMetrics.segeraHabis || 0) + (komMetrics.kedaluwarsa || 0);
    var kurangKapal = sijilMetrics.kurangAwak || 0;
    var findingParts = [];

    if (totalUrgentCert > 0) {
      findingParts.push(totalUrgentCert + ' sertifikat habis dalam 90 hari atau kedaluwarsa');
    } else {
      findingParts.push('Seluruh sertifikat keselamatan STCW-F aktif berlaku');
    }

    if (kurangKapal > 0) {
      findingParts.push(kurangKapal + ' kapal pengawas kurang awak dari standar sijil (' + (sijilMetrics.totalKekuranganKursi || kurangKapal) + ' kursi kosong)');
    } else {
      findingParts.push('seluruh ' + (sijilMetrics.totalKapal || 0) + ' kapal pengawas memenuhi formasi sijil minimum');
    }

    var findingSubtitle = findingParts.join('; ') + '.';

    var narasi = [findingSubtitle];
    if (komMetrics.kedaluwarsa > 0) {
      narasi.push('Terdapat ' + komMetrics.kedaluwarsa + ' sertifikat awak kapal berstatus kedaluwarsa yang wajib segera direvalidasi sebelum penugasan laut berikutnya.');
    }
    if (dirStats.perluDilengkapi > 0) {
      narasi.push('Sebanyak ' + dirStats.perluDilengkapi + ' profil personil di direktori masih memerlukan pelengkapan nomor buku pelaut atau kategori kepegawaian.');
    }

    var totalAknKeseluruhan = (aknData && aknData.totals) ? aknData.totals.AKN_KESELURUHAN : dirStats.total;
    var totalAknPoa = (aknData && aknData.totals) ? aknData.totals.AKN_POA : 0;
    var prevAknKeseluruhan = (aknData && aknData.prevTotals) ? aknData.prevTotals.AKN_KESELURUHAN : totalAknKeseluruhan;
    var deltaAkn = totalAknKeseluruhan - prevAknKeseluruhan;

    var ringkasanPayload = {
      tahun: tahun,
      findingSubtitle: findingSubtitle,
      kpi: {
        totalAwak: dirStats.total,
        totalAknKeseluruhan: totalAknKeseluruhan,
        totalAknPoa: totalAknPoa,
        deltaAkn: deltaAkn,
        totalKapal: sijilMetrics.totalKapal,
        laikOperasi: sijilMetrics.laikOperasi,
        kurangAwakKapal: kurangKapal,
        kritisKapal: sijilMetrics.kritis || 0,
        totalKekuranganKursi: sijilMetrics.totalKekuranganKursi || 0,
        awakKompetensiLengkap: komMetrics.awakLengkap || 0,
        kelaikanPersen: komMetrics.kelaikanPersen || 100,
        sertifikatExpired: komMetrics.kedaluwarsa || 0,
        sertifikatSegeraHabis: komMetrics.segeraHabis || 0,
        sertifikatUrgentTotal: totalUrgentCert,
        perluDilengkapi: dirStats.perluDilengkapi || 0
      },
      demografi: {
        dek: dirStats.dek || 0,
        mesin: dirStats.mesin || 0,
        pns: countPns,
        pppk: countPppk,
        nonAsn: countNonAsn
      },
      aknTerbaru: aknData ? aknData.matrix : null,
      aknTotals: aknData ? aknData.totals : { AKN_POA: 0, AKN_KESELURUHAN: 0 },
      aknPrevTotals: aknData ? aknData.prevTotals : { AKN_POA: 0, AKN_KESELURUHAN: 0 },
      aknMeta: aknData ? {
        periode: aknData.periode,
        prevPeriode: aknData.prevPeriode,
        isCarried: aknData.isCarried,
        sourcePeriode: aknData.sourcePeriode
      } : null,
      aknTren: aknTren,
      sijilSummary: {
        totalKapal: sijilMetrics.totalKapal,
        laikOperasi: sijilMetrics.laikOperasi,
        kurangAwak: sijilMetrics.kurangAwak,
        kritis: sijilMetrics.kritis || 0,
        totalAwakBertugas: sijilMetrics.totalAwakBertugas || 0,
        totalKekuranganKursi: sijilMetrics.totalKekuranganKursi || 0
      },
      sijilKapalRingkas: sortedKapalRingkas,
      sertifikatSummary: {
        totalSertifikat: komMetrics.totalTercatat || 0,
        berlaku: komMetrics.berlaku || 0,
        segeraHabis: komMetrics.segeraHabis || 0,
        expired: komMetrics.kedaluwarsa || 0,
        awakLengkap: komMetrics.awakLengkap || 0,
        kelaikanPersen: komMetrics.kelaikanPersen || 100
      },
      antreanSertifikatUrgent: antreanSertifikat.slice(0, 7),
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
    var sijilRes = sijil_getPapanArmada(token);
    if (sijilRes.success && sijilRes.data && Array.isArray(sijilRes.data.kapal)) {
      kapalDetailList = sijilRes.data.kapal;
    }

    var payload = {
      nomorDokumen: 'ND.AWAK/' + new Date().getFullYear() + '/POA-PSDKP',
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
      var dirRes = dir_list({ token: token, limit: 2000 });
      var items = (dirRes.success && dirRes.data && Array.isArray(dirRes.data.items)) ? dirRes.data.items : [];
      csvRows.push(['PegawaiID', 'Nama', 'NIP', 'Jabatan', 'Rumpun', 'Kelas_Kapal', 'Kategori_Kepegawaian', 'Kapal_Aktif', 'Status']);
      items.forEach(function (it) {
        csvRows.push([
          it.pegawaiId || '',
          '"' + String(it.nama || '').replace(/"/g, '""') + '"',
          it.nipDisplay || '',
          '"' + String(it.jabatanLengkap || it.kelompokJabatan || '').replace(/"/g, '""') + '"',
          it.rumpun || '',
          it.kelasKapal || '',
          it.kategoriKepegawaian || '',
          '"' + String(it.kapalId || '-').replace(/"/g, '""') + '"',
          it.statusAktif || 'AKTIF'
        ]);
      });
    } else if (modul === 'SIJIL') {
      var sijilRes = sijil_getPapanArmada(token);
      var kapalList = (sijilRes.success && sijilRes.data && Array.isArray(sijilRes.data.kapal)) ? sijilRes.data.kapal : [];
      csvRows.push(['KapalID', 'Nama_Kapal', 'Kelas_Kapal', 'Pangkalan', 'Kebutuhan_Min', 'Terisi', 'Kekurangan_Kursi', 'Status_Kelaikan']);
      kapalList.forEach(function (k) {
        csvRows.push([
          k.kapalId || '',
          '"' + String(k.namaKapal || '').replace(/"/g, '""') + '"',
          k.kelasKapal || '',
          '"' + String(k.pangkalanId || '').replace(/"/g, '""') + '"',
          k.kebutuhanMinimum || 0,
          k.jumlahAwakBertugas || 0,
          k.kekuranganKursi || 0,
          k.statusOperasi || ''
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
