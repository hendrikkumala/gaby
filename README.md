# Gabriella (Gaby)

Asisten suara pribadi seperti Jarvis. Ngobrol langsung pakai suara, tanpa menyentuh layar.

## Cara pakai

1. Buka link aplikasinya di Chrome (laptop / Android) atau Safari (iPhone).
2. Masukkan **API key Gemini** (gratis dari https://aistudio.google.com/apikey). Cukup sekali per perangkat.
3. Ketuk **Mulai** dan izinkan mikrofon.
4. Pertama kali, Gaby akan bertanya: *"Hai! Aku Gaby. Kamu mau aku panggil apa?"*
5. Setelah itu panggil saja: **"Hai Gaby"** (di Android: ketuk bola cahaya).
6. *(Disarankan)* Isi juga **kunci Groq** gratis di Pengaturan → Otak Gaby supaya Rara bisa browsing internet
   dan Lukas makin cepat menggambar (lihat *Teman-teman Gaby* di bawah).

### Pasang seperti aplikasi biasa
- **iPhone (Safari):** tombol Bagikan → *Tambahkan ke Layar Utama*
- **Android (Chrome):** menu ⋮ → *Tambahkan ke layar utama* / *Instal aplikasi*
- **Laptop (Chrome/Edge):** ikon instal di ujung kanan kolom alamat

## Teman-teman Gaby
Gaby bekerja bersama tiga teman AI, dan dia kenal mereka (tanya saja: *"teman-temanmu siapa aja?"*):

| Teman | Tugas | Pakai apa |
|---|---|---|
| 🔎 **Rara** | Riset internet dengan teliti: berita, harga, skor, kurs, info kesehatan. Sumbernya tampil di kartu kecil di layar | Kunci **Groq** (GPT-OSS 120B + browsing). Cadangan: Gemini, lalu pencarian cepat Gaby |
| 🎨 **Lukas** | Menulis perintah gambar yang rinci dari kata-katamu, lalu menggambar | Kunci **Groq** (Qwen3 32B). Foto kamera & cadangan: Gemini |
| 📝 **Meri** | Menulis catatan harian dan merapikan ingatan ke laci-laci saat Gaby tidur | Gemini |
| 🗺️ **Pandu** | Menyusun rencana berlangkah (liburan, proyek, acara, diet, belanja, bandingkan produk) dengan bantuan Rara | Kunci **OpenRouter** (Nemotron gratis, disarankan) atau **Groq** (GPT-OSS 120B) |
| ✅ **Vera** | Mengecek hasil Rara (fakta vs sumber), Lukas (gambar vs permintaan), dan Pandu (hitungan, tanggal, pantangan) | Kunci **Groq** (Qwen3 32B, Llama 4 untuk gambar) |

Saat teman-teman bekerja, **papan kerja** di bawah status menunjukkan siapa yang sedang bekerja dan langkahnya (ketuk untuk detail).

**Kunci OpenRouter untuk Pandu (gratis, disarankan):** Groq gratis membatasi token per menit, sehingga rencana panjang bisa
mentok. OpenRouter menghitung per permintaan. Buat kunci di https://openrouter.ai/keys, izinkan model gratis di
https://openrouter.ai/settings/privacy, lalu tempel di Pengaturan → Otak Gaby. Pemakaian hari ini tampil di sana.

**Membuat kunci Groq (gratis):** buka https://console.groq.com/keys → masuk pakai akun Google → **Create API Key** →
salin kunci (diawali `gsk_`) → tempel di Pengaturan → Otak Gaby → **Simpan key**. Kunci hanya tersimpan di HP-mu.
Kalau Rara gagal, alasannya tampil di Pengaturan → Fitur → *Pencarian internet (Rara)*, lengkap dengan tombol **Coba Rara lagi**.

## Rencana bersama Pandu
- *"Rencanakan liburan 3 hari ke Bali bulan Desember, budget 5 juta"* → Pandu bekerja ±1–2 menit, dicek Vera, lalu muncul
  **Kartu Rencana #N** (biaya, hotel, jadwal; *Lihat detail*, *Masukkan ke catatan & pengingat*) dan Gaby mengabarkan sendiri.
  Kalau Gaby sedang tidur, kabarnya disampaikan saat dibuka lagi (di aplikasi Android juga muncul notifikasi).
- Semua rencana **bernomor dan tersimpan**: *"buka rencana 3"*, *"rencana Bali kemarin budgetnya berapa?"*,
  *"ganti hotel rencana 1 yang dekat pantai"* (jadi rencana baru, yang lama tetap ada), *"bandingin rencana 1 dengan 3"*,
  *"ada berapa rencana?"*, *"hapus rencana 2"*, *"hapus semua rencana"* (langsung; bilang *"eh batal"* dalam 1 menit untuk mengembalikan).
- Bukan cuma liburan: *"rencana bikin aplikasi kasir untuk warung"* (tujuan, fitur, alat, tahapan, biaya, risiko),
  acara, belajar, olahraga, sampai *"bandingin 3 HP di bawah 5 juta"*. Pandu merencanakan, bukan membuatkan aplikasinya.
- Rencana perjalanan berisi pilihan **💸 hemat / ⚖️ seimbang / 🛋️ nyaman** untuk maskapai/kereta dan hotel (✅ = dipakai di total
  biaya), plus rekomendasi tempat makan. Bilang *"ganti ke yang paling murah"* untuk versi hemat, lalu bandingkan. Harga & jadwal
  perkiraan dari internet, cek ulang saat memesan.
- **💾 Simpan ke HP** (gambar rapi) atau **📤 Kirim teks** (WhatsApp/Catatan) dari Kartu Rencana, atau bilang *"simpan rencana 1 ke HP"*.
- Daftar juga ada di Pengaturan → 🗺️ Rencana.

## Yang bisa Gaby lakukan
- Ngobrol santai, dengan emosi (warna cahaya ikut berubah)
- Ingat nama panggilan dan hal penting tentang kamu (tersimpan di perangkat masing-masing)
- Jam & tanggal, cuaca, cari info terbaru lewat **Rara** (kartu sumber muncul di atas layar;
  sudah dicek Vera: ✅ cocok, ⚠️ sumber berbeda, ❓ belum pasti)
- 🗂️ **Kartu bernama**: Kartu Berita, Kartu Rencana, Kartu Perbandingan, Kartu Daftar Rencana, Kartu Catatan, Kartu Peta,
  Kartu Gambar, Galeri. Tutup dengan suara: *"tutup kartu berita"*, *"tutup semua kartu"*.
- Pengingat / timer ("Gaby, ingatkan aku 10 menit lagi angkat jemuran"). Di aplikasi Android berbunyi dengan nada notifikasi HP, juga saat HP terkunci (cek Pengaturan → Fitur → Pengingat sekali).
- ⏰ **Alarm sungguhan** ("Gaby, pasang alarm jam 5 pagi", "bangunkan aku tiap hari kerja jam 6"):
  Android (aplikasi) langsung dipasang di aplikasi **Jam** HP; iPhone lewat tombol + Pintasan **"Gaby Alarm"**
  (buat sekali, langkahnya ada di Pengaturan → Fitur); perangkat lain dijadikan pengingat.
  Ketuk tombol **Tambahkan ke Kalender** supaya tetap berbunyi walau Gaby ditutup.
- 📷 **Kamera**: "Gaby, lihat ini" — Gaby melihat dan mengomentari benda yang kamu tunjukkan.
  Di laptop juga bisa **bagikan layar**.
- 🎨 **Gambar** (oleh **Lukas**): "Gaby, tambahkan anjing tidur di bantal ini" atau "gambarin kucingku tidur, buat wallpaper HP".
  Lukas ingat hal tentangmu (misal nama & warna kucingmu) dan memilih bentuk gambar (persegi / tegak / mendatar).
  Gambar tampil di layar; pilih **Simpan**, **Ulang**, atau **Buang** (bisa lewat suara), atau minta
  *"ulang, tapi kucingnya pakai topi"*.
  Mesin bawaan **Gratis** (Pollinations). Mesin **Google** (Pengaturan) lebih bagus dan bisa mengedit foto asli,
  tapi butuh billing; kalau gagal, otomatis pakai yang gratis.
- 📍 **Lokasi & peta**: "toko mochi enak dekat sini di mana?" atau "tunjukin jalan ke Surabaya".
  Kartu peta menampilkan rute, jarak, dan perkiraan waktu (🚗/🏍️/🚶, tanpa data macet) + tombol **Buka di Google Maps**.
  Di iPhone, izin lokasi diatur lewat Pengaturan → Privasi → Layanan Lokasi → **Situs Web Safari**.
- 📔 **Catatan harian & ingatan berlaci**: setiap Gaby tidur, Meri meringkas obrolan; fakta tentang kamu disimpan di
  **18 laci** (tentang kamu, keluarga, kerja, kontak, tanggal penting, rencana, kebiasaan, makanan, olahraga, musik,
  film & hiburan, jalan-jalan, kesehatan, keuangan, teknologi, ilmu pengetahuan, pelajaran, lainnya) dengan tanda
  👍 suka / 👎 tidak suka. Gaby membuka laci yang nyambung dengan obrolan dan tidak menyarankan hal yang kamu tidak suka.
  Lihat, cari, ubah, atau hapus di Pengaturan → **📚 Buka Ingatan Gaby** (tombol **🧹 Minta Meri rapikan**).
  Semua tersimpan di perangkat, tanpa login.
- 📝 **Catatan / to-do**: "catat ke toko roti dan call Joni", "catatan aku apa aja?", "aku udah call Joni" (dicentang & dicoret).
  Tugas dengan waktu ("ingatkan jam 3 call Joni") jadi pengingat + tombol kalender dan ikut tampil di daftar.
  Yang sudah dicentang hilang otomatis keesokan harinya; yang belum ditanyakan saat briefing pagi.
- 🌅 **Briefing pagi & sapaan malam**: cuaca, catatan, dan pengingat saat pertama dibuka (bisa dimatikan di Pengaturan → Fitur).
- 🎵 **Musik**: "putar lagu Tulus" → YouTube Music / YouTube / Spotify (pilih di Pengaturan → Fitur).
- 🧾 **Baca & hitung**: "baca struk ini, totalnya berapa?" — Gaby mengambil foto tajam dari kamera.
- 🎭 **Merasakan nada suara** (eksperimental): otomatis dilewati kalau model belum mendukung.
- 📱 **Buka aplikasi**: WhatsApp, Telegram, Instagram, Facebook, Threads, X, TikTok, YouTube, Netflix, Prime Video,
  Shopee, Tokopedia, Google Maps, browser, email, telepon, SMS. Contoh: "cari sepatu lari di Shopee",
  "WA ke Joni bilang aku telat" (nomor disimpan di ingatan kategori 📇 Kontak). Di HP muncul satu tombol:
  aplikasinya terbuka kalau terpasang, versi web kalau tidak. Pesan tidak terkirim otomatis.
- Membuka situs lain
- ✨ **Cerita update**: setelah update, Gaby menceritakan hal barunya sekali saja. Daftar lengkap di Pengaturan → ✨ Apa yang baru.
- Bilang "udah dulu ya Gaby" supaya dia tidur lagi

## Otak Gaby (cadangan otomatis)
1. Gemini Live (gratis), model terbaik yang tersedia
2. Model Gemini Live lain (gratis, kuota terpisah)
3. OpenAI Realtime (berbayar, hanya kalau key OpenAI diisi di Pengaturan)

## Catatan
- Gaby hanya mendengar selama aplikasi **terbuka di layar**. Pengingat tanpa kalender juga hanya berbunyi saat Gaby terbuka.
- Di iPhone, setiap membuka aplikasi perlu satu ketukan dulu (aturan Apple).
- Kalau Gaby mendengar suaranya sendiri, pakai earphone atau nyalakan *Mode anti-gema* di Pengaturan.
- Di layanan gratis, Google boleh memakai percakapan untuk melatih AI-nya. Jangan ceritakan hal yang sangat rahasia.

## Untuk yang ingin mengubah
- Kepribadian Gaby: `js/persona.js`
- Kemampuan (alat): `js/tools.js`
- Rara (riset internet): `js/research.js`, `js/groq.js` · Lukas (gambar): `js/imagegen.js` · Meri: `js/journal.js`
- Pandu (perencana): `js/pandu.js` · Vera (pemeriksa): `js/vera.js` · Papan kerja tim: `js/teamboard.js` · Isi/gambar/teks rencana: `js/planexport.js`
- Laci ingatan: `js/memory.js` · Daftar "apa yang baru" (isi setiap rilis): `js/whatsnew.js`
- Tampilan bola cahaya: `js/visual.js`
- PIN: `js/config.js`
