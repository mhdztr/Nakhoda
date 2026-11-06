# DESIGN.md — Panduan Desain & Antarmuka: Nakhoda
**Naungan Awak Kapal Armada — Timja Pengawakan, Dit. POA, Ditjen PSDKP, KKP RI**

> Dokumen ini diturunkan dari skill `design-taste-frontend` (mode **app screen**, gaya `achromatic-ledger`, seed `877942489`; hasil undian tersimpan di `.taste-skill/direction.json`). Skill disalin dari proyek SIKAP ke `.agents/skills/`. Aturan skill dipakai utuh kecuali tiga penyesuaian yang dicatat di §14.
> Dokumen ini **menggantikan** DESIGN.md sebelumnya (Apple HIG + kaca translusen + palet Maritime Navy warisan Nautika).

---

## 1. Posisi Desain

Nakhoda dipakai staf Timja Pengawakan dalam sesi kerja panjang (input mingguan, memeriksa sertifikat awak, menyusun laporan) dan oleh pimpinan dalam sekali lihat. Itu pekerjaan **buku besar**, bukan etalase. Karena itu:

- Warna ditaruh pada **data**, bukan pada chrome. Sidebar, kartu, tombol, dan tabel adalah tinta dan abu-abu netral.
- Angka adalah tipografi, bukan ubin. KPI tidak diberi kotak sendiri, ikon bulat, atau sparkline.
- Permukaan datar: pemisah adalah selisih nada atau garis 1px. Tidak ada kaca, blur, gradasi, atau bayangan pada elemen diam.
- Bahasa antarmuka memakai kosakata pekerjaan ini (sijil, kekurangan awak, sertifikat segera habis), bukan kata generik template ("Items", "Records", "Status").

### 1.1 Satu pertanyaan per layar

Setiap layar menjawab **satu pertanyaan** lebih dulu. Elemen terbesar di layar adalah yang menjawabnya.

| Layar | Pertanyaan utama | Elemen terbesar |
|---|---|---|
| Ringkasan | Apakah kekuatan awak cukup, dan apa yang perlu ditindak minggu ini? | Angka total AKN + kalimat temuan |
| Komposisi AKN | Berapa awak per kategori kepegawaian minggu ini, dan apa yang berubah dari minggu lalu? | Papan komposisi 2 scope x 5 kategori |
| Direktori awak | Siapa saja awak yang aktif, di kapal mana, dan datanya siapa yang belum lengkap? | Tabel direktori |
| Kompetensi & sertifikat | Siapa yang sertifikatnya habis atau belum memenuhi standar jabatan? | Daftar tindak lanjut, diurutkan dari yang paling mendesak |
| Papan sijil | Kapal mana yang kurang awak untuk berlayar? | Matriks kapal x jabatan |
| Log kegiatan | Kegiatan pembinaan apa yang sudah/akan berjalan dan siapa pesertanya? | Daftar kegiatan terbaru |
| Laporan | Rekap apa yang harus dikirim ke pimpinan, untuk periode berapa? | Pratinjau laporan |

### 1.2 Temuan dalam data

Kalimat temuan satu baris selalu mengikuti judul layar dan **dibangun dari data**, bukan diketik. Contoh: *"11 sertifikat BST habis dalam 90 hari; 3 kapal kekurangan Masinis."* Kalimat ini tampil di sebelah aksi yang menanganinya.

---

## 2. Wajah Produk (Product Face)

Skill mewajibkan produk punya wajah sendiri, bukan "kit yang diterapkan rapi". Wajah Nakhoda:

1. **Warna tanda: Oranye Keselamatan** (`#D9480F`). Oranye pelampung, sekoci, dan helm: warna keselamatan di laut, dan inti pekerjaan ini adalah awak yang selamat dan tersertifikasi. Bukan navy (Nautika), bukan hijau jade (SIKAP). Oranye hanya dipakai pada **elemen data utama** (bagian "terisi" pada bar, periode berjalan pada grafik) dan tidak pada tombol atau latar.
2. **Landasan kelabu dingin netral** (`#F4F5F6`) dengan kartu putih. Bukan krem, bukan slate kebiruan.
3. **Elemen khas: Papan Sijil.** *Sijil* adalah daftar susunan awak sebuah kapal. Papan Sijil memetakan kapal (baris) x jabatan (kolom); tiap sel menunjukkan sisa terhadap kebutuhan minimum. Ini komposisi grafis yang hanya dimiliki produk ini (lihat §8.1).
4. **Tanda produk: Panji November.** Kotak 2x2 (oranye, tinta, tinta, oranye) mengacu pada bendera isyarat huruf **N** (*November*, kotak-kotak) untuk "Nakhoda". SVG 24px, sudut tajam, tanpa wadah hitam dan tanpa huruf. Nama "Nakhoda" ditulis di sebelahnya sebagai teks biasa. Dipakai di puncak sidebar, layar masuk, favicon, dan kop ekspor.
5. **Orang sebagai dirinya**: tiap awak punya inisial dan **tint pucat** sendiri (selisih hue minimal 60 derajat antar awak yang berdekatan). Tint ini identitas, bukan data; tidak muncul di legenda grafik.
6. **Kosakata pekerjaan** pada label dan keadaan kosong (§11).

---

## 3. Token

### 3.1 Warna (light only; mode gelap di luar cakupan v1)

| Token | Hex | Peran | Kontras pada putih |
|---|---|---|---|
| `--ground` | `#F4F5F6` | Latar halaman dan sidebar | n/a |
| `--surface` | `#FFFFFF` | Kartu, tabel, dialog | n/a |
| `--raised` | `#ECEEF0` | Sumur, chip netral | n/a |
| `--active` | `#E7E9EC` | Item nav aktif, baris terpilih | n/a |
| `--border` | `#E3E5E8` | Tepi kartu | n/a |
| `--rule` | `#EEF0F2` | Garis baris tabel | n/a |
| `--control` | `#CDD1D6` | Tepi input dan kontrol filter | n/a |
| `--text` | `#0F1214` | Teks utama, angka kunci | 18.6:1 |
| `--muted` | `#5B626A` | Label, meta, header tabel | 6.2:1 (5.7 di atas ground) |
| `--faint` | `#66707A` | Placeholder | 5.0:1 |
| `--primary` | `#15181B` | Tombol utama (label putih) | 17.8:1 |
| `--accent` | `#D9480F` | **Warna data utama** | 4.3:1 (tanda grafis, bukan teks kecil) |
| `--accent-ink` | `#B53A06` | Teks beraksen bila perlu | 5.9:1 |
| `--chart-2` | `#7B838B` | Pembanding (kebutuhan, periode lalu) | 3.9:1 |
| `--positive` | `#247B50` | Teks perubahan baik | 5.2:1 |
| `--negative` | `#C4242A` | Teks perubahan buruk, kekurangan | 5.8:1 |
| `--pill-positive` | bg `#DCFAE5` / ink `#04250E` | Berlaku, Lengkap | 14.8:1 |
| `--pill-negative` | bg `#FFEDEA` / ink `#831C1E` | Kedaluwarsa, Kurang | 8.6:1 |
| `--pill-warning` | bg `#FFF6D6` / ink `#6B4B00` | Segera habis, Parsial | 7.4:1 |
| `--pill-neutral` | bg `#ECEEF0` / ink `#3D4348` | Belum ada, Nonaktif | 8.6:1 |
| `--focus` | `#0F1214` | Cincin fokus 2px, offset 2px | n/a |

Aturan:
- **Satu warna tanda.** Oranye tidak bersaing dengan status. Status memakai pasangan pucat dan titik 6px. Peringatan (`warning`) sengaja kuning-kunyit, bukan oranye, agar tidak tertukar dengan warna data.
- **Pangsa warna** di bawah 3% piksel layar. Layar yang memuat grafik wajib membawa oranye pada data utamanya (linter skill memberi `no-data-hue` jika tidak).
- Tidak ada navy, indigo, ungu, krem-terakota, atau gradasi apa pun. Tidak ada `rgba` untuk menciptakan efek kaca.
- **Warna menyatakan baik/buruk, bukan naik/turun.** Kenaikan kekurangan awak berwarna `--negative`; kenaikan jumlah awak `--positive` atau abu. Perubahan nol atau tak terdefinisi berwarna abu dan dicetak `0` atau tanda hubung.

### 3.2 Tipografi

- **Huruf: Geist** (400, 500, 700), fallback `Inter, system-ui, sans-serif`. **Geist Mono** hanya untuk ID teknis (NIP, RowID, nomor sertifikat, kode pelatihan seperti `TRN-NKH-01`), ukuran 14px; di tabel padat dipotong 8 karakter + elipsis dengan tombol salin 12px.
- Dimuat via `<link>` Google Fonts di `Index.html`. Uji nyata di Fase 2: `font-variant-numeric: tabular-nums` harus benar-benar mengubah lebar digit; bila tidak, pakai Inter.
- Skala (enam ukuran; batas skill sembilan):

| Peran | Ukuran / bobot | Catatan |
|---|---|---|
| Judul layar `h1` | 24px / 600 (500 bila 600 tak tersedia) | Kata benda: "Komposisi AKN", bukan sapaan |
| Angka jawaban (KPI utama) | 30px / 400 | Satu per layar; 1,3x saudaranya |
| KPI lain | 24px / 400 | |
| Judul seksi/kartu | 16px / 500 | |
| Isi, nav, sel tabel | 14px / 400 | Tinggi baris teks 20px |
| Kontrol MD | 13px / 400-500 | |
| Label, meta, pill, SM | 12px / 400-500 | Batas bawah 11px |

- Kapitalisasi kalimat. **Tidak ada huruf kapital berjarak** (`text-transform: uppercase` dilarang). Tracking 0, kecuali -0.01em pada 24px.
- Angka: `font-variant-numeric: tabular-nums` pada semua tabel, KPI, dan elemen yang berubah. Rata kanan di kolom. Pemisah ribuan titik (`1.284`), hitungan tanpa desimal, persentase satu desimal (`87,5%`).
- Tanggal ISO (`2026-11-06`) di kolom pembanding; kata ("hari ini", "6 hari lagi") untuk kedekatan.

### 3.3 Geometri, jarak, radius

- **Sistem 3-tier kontrol (aturan keras proyek, `AGENTS.md`)**:

| Tier | Tinggi | Padding X | Font | Dipakai untuk |
|---|---|---|---|---|
| **LG** | `40px` | 14px | 14px | Input form di dialog, tombol kirim utama, kolom login |
| **MD** | `32px` | 12px | 13px | Toolbar filter, pencarian, segmented/tab, tombol sekunder |
| **SM** | `26px` | 10px | 12px | Aksi baris tabel (Detail, Revisi, Anulir) |

  ```css
  --ctl-h-lg: 40px; --ctl-px-lg: 14px; --ctl-fs-lg: 14px;
  --ctl-h-md: 32px; --ctl-px-md: 12px; --ctl-fs-md: 13px;
  --ctl-h-sm: 26px; --ctl-px-sm: 10px; --ctl-fs-sm: 12px;
  ```
  Satu baris kontrol = satu tier. Kontrol berbeda tinggi tidak boleh berdampingan tanpa pembungkus `.ctl-row`, `.ctl-lg`, `.ctl-md`, `.ctl-sm`, `.ctl-stack`, atau `.ctl-fill`. **Dilarang** `style="height: ..."` pada `button`, `input`, `select`.
- **Radius: tiga nilai**: kartu `8px`, kontrol (semua tier) `6px`, chip kotak `4px` (pill status bulat penuh).
- **Jarak**: basis 4px; satu nilai celah `12px` horizontal dan vertikal; padding kartu `20px`; gutter kanvas `24px`; jarak antarseksi `32px`.
- **Baris tabel**: 44px (satu baris), 56px (dua baris dengan inisial). Header tabel 36px.
- **Bayangan**: nol pada elemen diam. Hanya yang melayang (menu, dialog, toast): `0 8px 24px rgba(15,18,20,0.12)`.

---

## 4. Shell: Open Plane

```
+-----------------+------------------------------------------------------------+
| [mark] Nakhoda  |  Komposisi AKN                          [Input komposisi]  |
| Timja Pengawakan|  11 sertifikat habis dalam 90 hari; 3 kapal kurang Masinis.|
| Dit. POA        |                                                            |
|                 |  Periode [2026-11 W01]  Scope [Semua]            [Ekspor]  |
| Ringkasan       |  --------------------------------------------------------  |
| Komposisi AKN   |  (blok jawaban terbesar)                                   |
| Direktori awak  |                                                            |
| Kompetensi      |                                                            |
| Papan sijil     |                                                            |
| Log kegiatan    |                                                            |
| Laporan         |                                                            |
|                 |                                                            |
| Pengelolaan     |                                                            |
|  Pengguna       |                                                            |
|  Audit          |                                                            |
|  Data acuan     |                                                            |
| ----------------|                                                            |
| [IN] Nama user  |                                                            |
+-----------------+------------------------------------------------------------+
```

- Sidebar 240px berlabel, **di atas warna landasan** (`--ground`), dipisah satu garis 1px `--border`. **Tidak ada top bar.** Kanvas fluid, gutter 24px, jarak dari atas ke judul 32px.
- Puncak sidebar: Panji November + "Nakhoda", dan baris cakupan "Timja Pengawakan, Dit. POA". Dasar sidebar: baris pengguna (inisial + nama + peran) dan menu keluar.
- Nav: baris 32px, jarak 34px, ikon outline 16px stroke 1.5px abu, label 14px/400. **Item aktif = pil abu `--active`**, radius 6, inset 8px; label tidak berubah. Tidak ada garis aksen kiri. Kelompok diberi label kalimat biasa 12px abu ("Pengelolaan"), jarak 24px di atasnya.
- **Hitungan di nav hanya pada antrean yang butuh tindakan** dan nominanya jelas: "Kompetensi" dengan keterangan "Sertifikat bermasalah 11". Bukan angka telanjang.
- Item nav adalah layar lain, tidak pernah anchor ke dalam halaman yang sama. Tiap layar punya hash route (`#/ringkasan`, `#/komposisi`, `#/direktori`, `#/kompetensi`, `#/sijil`, `#/kegiatan`, `#/laporan`, `#/admin/...`).
- **Ponsel (<= 768px)**: sidebar melipat menjadi bar 48px berisi nama layar + tombol menu + maksimal satu aksi; menu membuka lembar penuh berisi nav dan pengguna. Konten penuh lebar dengan margin 16px.

---

## 5. Kerangka Layar

### 5.1 Baris judul
`h1` (24px) di kiri; kalimat temuan 14px abu di bawahnya; aksi nyata di kanan (satu tombol utama near-black + satu sekunder). Cap waktu "Diperbarui 08.43" dengan tombol muat ulang berikon 16px bila data dari server.

### 5.2 Filter
Satu baris tier MD, 12px antar kontrol: periode lebih dulu, lalu filter lain, utilitas (ekspor, muat ulang) di kanan. Rentang tanggal di tingkat halaman **atau** di tiap kartu, tidak keduanya.

### 5.3 KPI
- **Satu kontainer dibagi garis 1px** menjadi kolom sama lebar; tanpa ubin per angka, tanpa ikon, tanpa sparkline. Jumlah kolom sama dengan jumlah KPI (3 atau 4).
- Label di atas nilai; label 12-14px abu kalimat biasa; nilai 24px, dan angka jawaban 30px (minimal 1,3x saudaranya; tidak ada angka lain di layar yang lebih besar).
- Satuan sebagai akhiran kecil abu ("awak", "hari"). Selisih opsional, 12px, menyebut dasar perbandingan dalam frasa yang sama: "-2 dari minggu lalu".
- **Satu angka, satu tempat**: angka di strip tidak diulang di legenda sebelahnya.

---

## 6. Komponen

### 6.1 Tombol
- Satu tombol utama terisi per layar: **near-black** `--primary`, label putih. Sekunder: putih dengan garis 1px `--control`. Tersier: teks tinta. Oranye **tidak pernah** menjadi isi tombol.
- Tombol berbahaya (Anulir): garis dan teks `--negative`; terisi hanya pada konfirmasi di dalam dialog.
- Tekan: `transform: scale(0.98)` dalam 90ms. Hanya transform dan opacity.
- Nonaktif tetap terbaca (teks 4.5:1) dan menyebut alasannya di teks bantu.

### 6.2 Input & form
- Label di atas, 14px/500, jarak 8px; **tidak ada** label mengambang dan tidak ada placeholder sebagai pengganti label.
- Input tier LG 40px, putih, garis `--control`. Jarak 16px antarbidang; 24px dari deskripsi ke label pertama; 16px ke tombol simpan.
- Batas yang tersisa (NIP 18 digit, ukuran berkas 15 MB) tampil permanen di sebelah bidang dan terhubung via `aria-describedby`.
- **Satu model simpan per tampilan**: tombol Simpan per panel (kanan bawah). Tidak dicampur dengan simpan otomatis.
- Bidang tanggal memakai pemilih tanggal.

### 6.3 Pill status
- Tinggi 20px, 12px/500, bulat penuh, `flex: none; white-space: nowrap`. **Satu penanda status per baris.**
- Kosakata baku (satu kata; tidak diganti sinonim di tempat lain):

| Domain | Nilai | Pill |
|---|---|---|
| Sertifikat | `BERLAKU` -> "Berlaku" | positive |
| | `SEGERA_HABIS` -> "Habis dalam N hari" | warning |
| | `KEDALUWARSA` -> "Kedaluwarsa" | negative |
| | `BELUM_ADA` -> tanda hubung abu | tanpa pill |
| Kelengkapan kompetensi | `LENGKAP` / `PARSIAL` / `BELUM` | positive / warning / neutral |
| Pos kapal | `CUKUP` -> "Cukup"; `KURANG` -> "Kurang N" | neutral / negative |
| Baris data | `ACTIVE` tanpa pill; `SUPERSEDED` -> "Diganti"; `VOID` -> "Dianulir" | neutral / negative |
| Akun | `PENDING` / `APPROVED` / `NONAKTIF` | warning / tanpa pill / neutral |

### 6.4 Tabel
- Header 12px abu, kalimat biasa, **tanpa pita latar**; satu garis `--border` di bawahnya (garis terkuat dalam tabel). Garis baris 1px `--rule`. **Tanpa zebra.**
- Kolom identitas mendapat sepertiga hingga setengah lebar dan tidak terpotong di desktop.
- Angka rata kanan, tabular; header angka rata kanan sejajar nilainya. Dua ukuran ditumpuk dalam satu sel (hitungan di atas, persentase abu 12px di bawah).
- Nilai hilang = tanda hubung abu; nol sungguhan dicetak `0`.
- Aksi baris: tier **SM** (26px), maksimal dua aksi teks + satu menu titik tiga; satu kolom aksi tetap di kanan. Baris yang butuh tindakan memperlihatkan aksinya sebagai tombol teks tinta, bukan abu.
- Daftar penuh: total di atas ("396 awak"), header tetap saat gulir, "1-50 dari 396" dengan muat berikutnya. Ringkasan di Beranda dibatasi 4-6 baris dengan "Lihat semua".
- Hover: garis luar 1px `--control`; baris terpilih (memicu panel detail) memakai `--active`.

### 6.5 Tab & segmented
- Tab garis bawah selalu di atas garis penuh 1px; indikator 2px selebar label. Segmented selebar pilihannya (penuh lebar hanya di bawah 480px). Keduanya tier MD.

### 6.6 Dialog, lembar samping, toast
- Dialog form: lebar 560px, radius 8, bayangan melayang, penghalang `rgba(15,18,20,0.4)` **tanpa blur**. Judul 16px/500; tombol Batal (sekunder) dan Simpan (utama) tier LG di dasar.
- Revisi dan Anulir adalah dialog tersendiri per sub-modul (Anti-Gabruk): tidak berbagi dialog antar sub-modul.
- Detail awak membuka **lembar samping** kanan 480px (bukan halaman baru) agar daftar tetap terlihat.
- Toast di kanan bawah, non-blocking, hilang otomatis 4 detik; galat menetap sampai ditutup. Tanpa bilah progres hias.

### 6.7 Pengunggah bukti (multi-evidence)
- Satu area unggah bergaris putus-putus (satu-satunya garis putus selain garis acuan grafik), menerima foto, PDF, dan video; batas (`15 MB` berkas, `50 MB` video) tampil permanen di sebelahnya.
- Tiap berkas: baris 44px dengan pratinjau 32px (radius 4), nama, ukuran, tombol hapus SM. Gambar dikompres di klien sebelum unggah.
- Daftar bukti tersimpan: tautan Drive dengan nama berkas, jenis, pengunggah, tanggal.

### 6.8 Inisial awak
Lingkaran 24-32px, 12px/500, tint pucat dengan huruf tinta; hue diturunkan dari hash `PegawaiID`, selisih 60 derajat antar awak bersebelahan. Bukan data, bukan di legenda.

### 6.9 Ikon
SVG inline, outline, stroke 1.5px; 16px (nav), 14px (inline), 12px (tabel); abu. **Tidak pernah** dalam lingkaran/kotak berwarna. Zero-Emoji Policy berlaku mutlak pada label, tombol, tabel, notifikasi, dan berkas ekspor.

---

## 7. Layar Kunci

### 7.1 Ringkasan
Pertanyaan: *apakah kekuatan awak cukup dan apa yang perlu ditindak?*
1. Baris judul + temuan + aksi "Input komposisi".
2. KPI satu kontainer, 4 kolom: **Total AKN** (angka jawaban 30px, pecahan POA dari Keseluruhan), Awak berkompetensi lengkap (%), Sertifikat habis <= 90 hari, Kapal kurang awak.
3. Dua kartu sebaris dengan tinggi seimbang: **Komposisi per kategori** (daftar bar, bar terisi oranye) dan **Tindak lanjut** (5 sertifikat paling mendesak dengan pill).
4. **Tren total AKN** per minggu (satu garis oranye, dua pertiga lebar) di samping **Kegiatan terbaru** (3-4 baris).
5. Papan Sijil ringkas: 6 kapal paling kurang awak.

### 7.2 Komposisi AKN (AWAK-A)
- **Papan komposisi**: baris = 5 kategori; kolom = `AKN_KESELURUHAN`, `AKN_POA`, selisih dari minggu lalu. Angka tabular rata kanan; bar tipis sebagai trek (`AKN_POA` terisi oranye di atas trek `AKN_KESELURUHAN` abu).
- Nilai dari carry-forward diberi penanda ("dari 2026-10 W04", abu 12px), tidak disembunyikan.
- Tombol "Input komposisi" membuka dialog **matriks 2 x 5 yang sudah terisi total terkini**; hanya sel yang diubah yang tersimpan (snapshot total, bukan selisih). Sel yang diubah diberi titik penanda dan teks "sebelumnya 41".
- Tabel riwayat di bawah: tier SM untuk Revisi dan Anulir.

### 7.3 Direktori awak
Tabel 50 baris/halaman: inisial + nama + NIP (mono), jabatan (kelompok + kelas kapal), kategori kepegawaian, kapal penempatan, status sertifikat paling bermasalah. Filter MD: pencarian, kelompok jabatan, rumpun (Dek/Mesin), kategori, kapal, status. Klik baris membuka lembar samping dengan tab *Profil | Sertifikat | Penugasan | Riwayat*.

### 7.4 Kompetensi & sertifikat
Dua tampilan, satu layar: **Daftar tindak lanjut** (default, urut hari tersisa menaik) dan **Matriks kelengkapan** (awak x standar pelatihan wajib; titik terisi = lulus, kosong = belum). Aksi cepat per baris: "Catat sertifikat" (tier SM) membuka dialog dengan nomor, tahun, berlaku sampai, dan unggah bukti.

### 7.5 Papan Sijil
Lihat §8.1. Memilih satu kapal membuka lembar samping: daftar awak per jabatan, kekurangan, dan sertifikat yang akan habis di kapal itu.

### 7.6 Log kegiatan (AWAK-B)
Daftar baris dua-garis (judul + wilayah/tanggal), jumlah peserta di kanan, jumlah bukti terlampir. Tampilan alternatif **garis waktu** (§8.2). Dialog input memuat peserta terpilih (opsional, dari direktori) dan multi-evidence.

### 7.7 Laporan
Pratinjau halaman A4 di tengah (data sama dengan yang diekspor), kontrol periode dan format (PDF, XLSX) di sisi. Tanpa dekorasi pada pratinjau.

### 7.8 Pengelolaan
Satu tampilan per area (Pengguna, Persetujuan, Audit, Data acuan), masing-masing dengan `h1` sendiri. Tindakan merusak (nonaktifkan akun, anulir massal) di bagian terakhir, dengan konsekuensi dalam kalimat dan konfirmasi yang menyebut objeknya.

### 7.9 Layar masuk
Satu kolom 360px di tengah: Panji November + "Nakhoda", satu kalimat fungsi ("Daftar awak, sertifikat, dan kegiatan pembinaan Timja Pengawakan"), bidang, dan satu tombol utama LG. Tanpa ilustrasi, tanpa kartu kaca. Lambang resmi PSDKP boleh tampil kecil (<= 32px) di dasar kolom sebagai atribusi instansi.

---

## 8. Visualisasi Data

Aturan umum (skill): satu pertanyaan, satu seri, satu warna per grafik; tidak ada 3D, gauge melingkar, pie dengan kategori > 4, atau legenda untuk seri tunggal. Skala sumbu selalu tampak; 3-5 garis grid 1px `#E5E5E5`; tanpa garis sumbu-y; garis lurus (tidak dihaluskan); tanpa penanda titik kecuali hover. Gunakan `.agents/skills/design-taste-frontend/assets/charts.js` (`Charts.line`, `bars`, `barList`, `plan`, `bullet`, `matrix`, `timeline`) dan perluas, jangan menulis ulang kode sumbu.

| Pertanyaan | Bentuk | Pembuat |
|---|---|---|
| Berapa awak per kategori? | Daftar bar horizontal terurut, bar terisi oranye | `Charts.barList` |
| Berapa dari Keseluruhan yang di POA? | Trek sepanjang Keseluruhan, bagian POA terisi | `Charts.plan` |
| Bagaimana total bergerak? | Satu garis oranye, tanpa isi (atau <= 14%) | `Charts.line` |
| Seberapa lengkap kompetensi per jabatan? | Daftar bar terisi/target | `Charts.bullet` |
| Kapal mana yang kurang? | **Papan Sijil** | `Charts.matrix` |
| Kapan kegiatan berlangsung? | Garis waktu per bulan | `Charts.timeline` |

### 8.1 Papan Sijil (spesifikasi)
- Baris: kapal, dikelompokkan di bawah subjudul **kelas kapal** (Kelas I-V). Kolom: jabatan standar (Nakhoda, Mualim I-III, KKM, Masinis I-III, Markonis, Serang, Juru Mudi, Kelasi, Juru Minyak). Sel 36x32px.
- Isi sel: sisa terhadap kebutuhan minimum (`+1`, `0`, `-1`, `-2`), angka tabular 12px. **Satu warna menanjak ke arah negatif**: `0` dan positif = latar `--surface` + teks abu; `-1` = `--pill-negative`; `-2` atau lebih = `--negative` pekat dengan teks putih. Terisi dari kebutuhan muncul saat hover (teks tanpa panah): "Masinis II, KP Hiu 05: terisi 1 dari 2".
- Tiap baris menyatakan total kekurangan di kolom terakhir. Legenda hanya memuat kategori yang tampil; setiap swatch adalah sel miniatur yang sama.
- Pada ponsel, kolom pertama (kapal) dan total tetap, sisanya bergeser horizontal.

### 8.2 Garis waktu kegiatan
Judul di kolom kiri 200px, hari melintang dengan garis hari 1px pucat, akhir pekan satu nada lebih gelap, hari ini ditandai garis 1px oranye dengan tanggal bertinta. Batang 20-24px, radius 4; label di dalam batang, atau setelah batang bila terlalu pendek. Berlangsung = isi oranye pucat + tepi kiri 3px oranye; selesai = abu; dijadwalkan = garis luar putus-putus.

---

## 9. Gerak
- **Gerak adalah umpan balik**: tekan, hover, fokus, dialog/menu membuka, baris baru masuk. Tidak ada animasi masuk halaman; tidak ada animasi tak berujung.
- Token: `--dur-press: 90ms`, `--dur-ui: 160ms`, `--dur-sheet: 240ms`; kurva `cubic-bezier(0.2, 0, 0, 1)`. Hanya `transform` dan `opacity`.
- `prefers-reduced-motion: reduce` menghapus perpindahan dan menyisakan perubahan opasitas instan.

---

## 10. Keadaan (State)

Setiap blok memiliki keadaan **kosong, nol, memuat, galat**; setiap baris/kontrol memiliki **hover, terpilih, fokus, nonaktif**.

| Keadaan | Perlakuan |
|---|---|
| Memuat | Kerangka baris nada `--raised`, tanpa kilau bergerak; angka tidak diganti 0 sementara |
| Kosong | Bingkai kartu tetap ada; satu kalimat berkosakata kerja + satu aksi ("Belum ada kegiatan bulan ini. Catat kegiatan") |
| Nol | Dicetak `0` |
| Tidak diketahui | Tanda hubung abu ("belum dilaporkan"), **bukan** 0 |
| Galat | Kalimat jelas ("Sheet Direktori tidak dapat dibuka. Muat ulang atau hubungi admin.") + tombol Coba lagi; nilai terakhir yang berhasil dimuat tetap tampil dengan cap waktu |
| Sesi berakhir | Dialog "Sesi berakhir" dengan satu tombol Masuk kembali; isi form tidak hilang |
| Sistem sibuk (Lock) | Toast "Sistem sedang memproses transaksi lain. Coba lagi dalam beberapa detik." |

---

## 11. Bahasa & Mikro-copy
- Bahasa Indonesia baku, kalimat biasa, tanpa tanda seru. Tombol bernama sesuai akibatnya: "Simpan komposisi", "Catat sertifikat", "Anulir laporan". Hindari "Submit", "OK", "Data".
- Kosakata baku: **awak** (bukan "crew"), **sijil**, **jabatan**, **kategori kepegawaian**, **scope**, **komposisi**, **kegiatan pembinaan**, **bukti**, **anulir** (bukan "hapus").
- Keadaan kosong, galat, dan pesan validasi menyebut objek konkret.
- Tidak ada angka pamer ("+12%") pada data tanpa pembanding; tulis "(baru)" atau tanda hubung.

---

## 12. Responsif & Aksesibilitas
- Dukungan layar 1366x768 sampai 4K; konten penuh sampai sekitar 1440px, lebih lebar dari itu kanvas tidak diperkecil menjadi kolom sempit di tengah.
- Titik henti: >= 1200 (penuh), 768-1199 (sidebar tetap, kartu dua kolom menjadi satu), < 768 (sidebar melipat, tabel menjadi daftar kartu dua baris).
- Target sentuh >= 44px pada ponsel (area klik diperluas dengan padding transparan tanpa mengubah tinggi visual tier).
- Semua kontrol dapat dioperasikan dengan papan ketik; urutan baca mengikuti urutan visual; `aria-label` pada tombol berikon; fokus terlihat (cincin 2px `--focus`); kontras teks minimal 4.5:1 termasuk placeholder.
- Warna tidak pernah satu-satunya pembawa makna: status selalu disertai kata; sel Papan Sijil selalu memuat angka.

---

## 13. Daftar Larangan (Negative Prompt)

Dipertahankan dari DESIGN.md sebelumnya dan diperluas oleh skill. Semuanya diperiksa oleh linter.

1. **Zero-Emoji Policy**: tidak ada karakter emoji pada label, tombol, tabel, notifikasi, dan ekspor.
2. Tidak ada kaca (`backdrop-filter`), gradasi, blob, glow, atau bayangan pada elemen diam.
3. Tidak ada ikon dalam kotak/lingkaran berwarna; tidak ada sparkline pada KPI; tidak ada kartu KPI berikon.
4. Tidak ada label kapital berjarak, lencana mini "BARU", atau eyebrow di atas judul.
5. Tidak ada pie/donut dengan kategori > 4; tidak ada gauge melingkar atau speedometer; tidak ada grafik 3D; tidak ada grafik berwarna pelangi.
6. Tidak ada navy, indigo/ungu, atau krem-terakota; tidak lebih dari satu warna tanda.
7. Tidak ada font monospace di luar ID teknis dan blok kode.
8. Tidak ada animasi berkepanjangan (wobble, shake, pulse tanpa akhir).
9. Tidak ada sapaan ("Selamat datang kembali") sebagai judul.
10. Tidak ada data tiruan: "Lorem ipsum", "John Doe", "Acme", atau statistik karangan. Seed uji harus berbentuk nyata dan jumlah-jumlahnya cocok.
11. Tidak ada `style="height: ..."` pada `button`, `input`, `select`.

---

## 14. Penyimpangan Sadar dari Skill

| Aturan skill | Penyesuaian di Nakhoda | Alasan |
|---|---|---|
| Tinggi kontrol toolbar/form default 36px | Tiga tier 40/32/26 | Aturan keras proyek di `AGENTS.md`; masih dalam rentang 28-40px yang diamati skill |
| Hue grafik `#1d5fbf` (biru) | `#D9480F` (Oranye Keselamatan) | Permintaan eksplisit pemilik proyek: bukan navy; hue diambil dari subjek (keselamatan laut) |
| `inspect.mjs` menandai monospace | Geist Mono dipakai hanya untuk ID teknis; dijalankan dengan `--allow mono` dan alasan dicatat di laporan | Skill sendiri mengizinkan mono untuk ID; NIP dan nomor sertifikat harus sejajar digitnya |

---

## 15. Alur Kerja Skill (untuk agent)

Dijalankan dari root proyek. `<skill>` = `.agents/skills/design-taste-frontend`.

```bash
# cetak ulang arahan desain yang dipilih
node <skill>/scripts/draw.mjs --show

# lint sumber (aturan app)
node <skill>/scripts/lint.mjs --app html/ services/

# inspeksi nyata pada 1440 / 768 / 390 (butuh Chrome/Chromium dan Node 22+)
node <skill>/scripts/inspect.mjs --app <path/ke/pratinjau.html> --allow mono

# audit proyek (3-tier, zero-emoji, anti-gabruk, kalkulasi server-side)
node lint_ui.js
```

Kebijakan: tiap `FAIL` diperbaiki; tiap `WARN` dianggap salah kecuali dapat dibela dalam satu kalimat. Setelah putaran terakhir, buka **setiap** tangkapan layar (semua lebar) dan tulis kritik dengan tujuh pertanyaan di `references/app-screens.md` §2.7. Maksimal tiga putaran.

Sebelum membangun sebuah layar, tulis di catatan: (1) pertanyaan layar, (2) temuan, (3) wajah yang dipilih, (4) elemen khas dan letaknya di layar pertama. Layar yang melewatkan langkah ini dianggap "kit yang diterapkan".

---

## 16. Daftar Periksa Penerimaan Desain

- [ ] Semua kontrol memakai tier 40/32/26; tidak ada inline `height` pada `button/input/select`.
- [ ] `node lint_ui.js` dan `lint.mjs --app` bersih; `inspect.mjs --app` 0 FAIL di 1440/768/390.
- [ ] Setiap layar punya satu `h1` kata benda dan kalimat temuan berbasis data.
- [ ] Oranye muncul pada data utama setiap layar berisi grafik dan tidak di tempat lain; pangsa warna < 3%.
- [ ] Papan Sijil, Panji November, dan inisial berwarna pucat tampil di layar terkait.
- [ ] Setiap angka rata kanan dan tabular; angka yang tampil dua kali berasal dari satu variabel.
- [ ] Keadaan kosong, nol, memuat, galat, hover, fokus, terpilih, dan nonaktif diperiksa di browser.
- [ ] Zero-emoji lolos pada kode, seed, dan berkas ekspor.
