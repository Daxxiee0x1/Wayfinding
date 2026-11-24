# Landmark Guide: Wayfinding Landmark Centre

**Aplikasi navigasi gedung 3D dan 2D yang membantu pengunjung menemukan lokasi di Landmark Centre, dari area parkir sampai ruangan tujuan.**

**Live demo:** [daxxiee0x1.github.io/Wayfinding](https://daxxiee0x1.github.io/Wayfinding/)

![Beranda Landmark Guide](docs/screenshots/01-beranda.png)

Proyek kelompok mata kuliah **Web Client Development (WCD)**, dirancang dengan pendekatan
**Human-Centered Design** (ISO 9241-210).

## Latar belakang

Landmark Centre punya lima area dengan banyak titik keputusan: Area Luar, Ground Floor, Lobby,
Lantai 4, dan Basement. Pengunjung harus berpindah dari gerbang, ke lobby, lalu ke lantai tujuan,
dengan pilihan lift zona G-19 dan 19-33, lift barang, eskalator, dan tangga darurat. Mahasiswa
baru, tamu, dan pengunjung luar belum punya peta mental gedung, sementara pengguna kursi roda,
stroller, atau troli butuh rute tanpa tangga.

Dari pemetaan perjalanan pengguna, titik kebingungan tertinggi ada saat **pindah lantai**.
Landmark Guide menjawabnya dengan petunjuk rute per lantai dan piktogram lift yang berbeda warna
untuk tiap zona.

## Fitur

| Kebutuhan pengguna | Fitur |
| --- | --- |
| "Saya mau ke toilet / masjid / kelas." | Pencarian tujuan di semua lantai, hasil dikelompokkan per lantai, plus pintasan tujuan populer |
| "Saya sekarang ada di mana?" | Penanda "Anda di sini" yang bisa diatur dengan tap di peta |
| "Lewat mana kalau beda lantai?" | Petunjuk rute per lantai, dengan tombol "Lihat" untuk berpindah ke lantai terkait |
| "Saya pakai kursi roda." | Mode rute tanpa tangga: tangga dan eskalator dihindari, lift jadi pilihan |
| "Peta 3D berat di HP saya." | Denah 2D yang ringan sebagai alternatif, dengan rute yang sama |
| "I don't read Indonesian." | Bahasa Indonesia dan English |

Detail lainnya:

- **Peta 3D** yang bisa diputar 360°, dengan kontrol kamera (tampilan awal, putar kiri/kanan, utara ke atas)
- **Lima area**: Area Luar (gate, parkir A-G, area merokok, pintu basement), Ground Floor, Lobby, Lantai 4, Basement
- **Pemuatan bertahap yang jujur**: peta 3D menampilkan tahap nyata (mesin, model lantai, frame pertama) dan menawarkan Denah 2D jika perangkat lambat
- **Fallback tanpa WebGL**: aplikasi menjelaskan masalahnya dan membuka Denah 2D
- **Kualitas grafis adaptif**: bayangan dan resolusi render diturunkan otomatis di ponsel dan perangkat berspesifikasi rendah
- **Navigasi keyboard** di kolom pencarian (panah atas/bawah, Enter, Esc)
- **Preferensi tersimpan** (bahasa, label nama, rute tanpa tangga) di `localStorage`

## Screenshot

| Peta 3D | Denah 2D |
| --- | --- |
| ![Peta 3D dengan rute](docs/screenshots/02-peta-3d.png) | ![Denah 2D](docs/screenshots/03-denah-2d.png) |

| Pencarian | Tampilan ponsel |
| --- | --- |
| ![Pencarian tujuan lintas lantai](docs/screenshots/04-pencarian.png) | ![Beranda di ponsel](docs/screenshots/05-mobile.png) |

## Proses desain (Human-Centered Design)

1. **Memahami konteks**: proto-persona berdasarkan jenis pengunjung (mahasiswa baru, tamu bisnis, pengguna kursi roda) dan user journey dari gerbang sampai ruangan.
2. **Menentukan kebutuhan**: tujuan pengguna diterjemahkan menjadi fitur (pencarian, orientasi, rute antarlantai, aksesibilitas, fleksibilitas, multibahasa).
3. **Membuat solusi desain**: lima elemen UX Jesse James Garrett, arsitektur informasi (maksimal tiga ketukan ke rute), sistem piktogram, lalu prototype 3D/2D.
4. **Mengevaluasi**: audit heuristik Nielsen, dengan rencana usability testing (SUS target ≥ 68 dan indeks Lostness < 0,4).

### Sistem visual

Satu warna untuk satu makna, konsisten di peta 2D, pin 3D, daftar, dan keterangan:

| Warna | Makna | Hex |
| --- | --- | --- |
| Hijau | Tangga darurat dan pintu keluar | `#15803D` |
| Merah | "Anda di sini" dan peringatan | `#DC2626` |
| Biru | Lift zona A (G-19) | `#2F6FED` |
| Ungu | Lift zona B (19-33) | `#7C3AED` |
| Oranye | Garis rute (dengan tepi putih) | `#F97316` |
| Emas | Resepsionis dan kantor | `#8A6A37` |

Layout mengikuti hukum Fitts (panel tujuan berupa bottom sheet di area jempol, target sentuh minimal 44 px),
hukum Hick (daftar lokasi difilter per lantai), hukum Miller (6 sampai 9 piktogram per keterangan lantai),
dan ambang Doherty (umpan balik pemuatan di bawah 400 ms).

## Teknologi

| Teknologi | Kegunaan |
| --- | --- |
| React 19 + TypeScript | Antarmuka dan logika aplikasi |
| Vite 8 | Dev server dan build |
| Tailwind CSS v4 | Styling |
| three.js, React Three Fiber, drei | Peta 3D gedung (model prosedural, tanpa aset 3D yang diunduh) |
| SVG | Denah 2D dan piktogram |
| GitHub Pages | Hosting statis dari branch `gh-pages` |

## Menjalankan secara lokal

Butuh Node.js 22 dan pnpm 10.

```bash
git clone https://github.com/Daxxiee0x1/Wayfinding.git
cd Wayfinding
pnpm install
pnpm dev        # http://localhost:8443
pnpm build      # hasil build di dist/
```

## Struktur kode

```
src/
├── App.tsx            Shell aplikasi: beranda, peta 3D/2D, panel tujuan, menu
├── Home.tsx           Beranda: pencarian, tujuan populer, pilihan tampilan dan lantai
├── Wayfinding.tsx     Data lantai, pencarian rute antarlantai, teks petunjuk
├── search.ts          Pencarian tujuan lintas lantai
├── Map3D.tsx          Kanvas 3D dan tahapan pemuatan
├── Building3D.tsx     Model gedung prosedural
├── TopView.tsx        Kontrol kamera
├── Plan2D.tsx         Denah 2D
├── RouteMarkers.tsx   Garis rute dan penanda
├── Outdoor.tsx, Lobby.tsx, Floor4.tsx, Basement.tsx      Tiap area
├── *Data.tsx          Lokasi, piktogram, dan warna per area
├── Pictos.tsx, Tags.tsx, palette.ts                      Sistem piktogram dan warna
├── prefs.ts           Preferensi (bahasa, label, rute tanpa tangga) dan terjemahan nama tempat
└── quality.ts         Deteksi perangkat untuk kualitas grafis adaptif
```

## Deploy

Live demo di-hosting oleh GitHub Pages dari branch `gh-pages`, yang berisi hasil build `dist/`.
Karena situsnya ada di subpath `/Wayfinding/`, build harus memakai `BASE_PATH`:

```bash
./scripts/deploy-gh-pages.sh
```

Skrip itu menjalankan `BASE_PATH=/Wayfinding/ pnpm build`, lalu mem-push isi `dist/` ke branch `gh-pages`.
Pengaturan repository: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / `(root)`**.

## Pengembangan lanjutan

- Posisi otomatis lewat QR "Anda di sini" pada signage fisik atau beacon BLE
- Data real-time: status lift, area tidak beroperasi, dan keramaian
- Panduan suara untuk pengguna tunanetra
- Bahasa visual yang sama antara aplikasi dan papan arah fisik

---

<p align="center"><em>Pahami manusianya, maka teknologi akan mengikuti.</em></p>
