# Gabriella (Gaby)

Asisten suara pribadi seperti Jarvis. Ngobrol langsung pakai suara, tanpa menyentuh layar.

## Cara pakai

1. Buka link aplikasinya di Chrome (laptop / Android) atau Safari (iPhone).
2. Masukkan **API key Gemini** (gratis dari https://aistudio.google.com/apikey). Cukup sekali per perangkat.
3. Ketuk **Mulai** dan izinkan mikrofon.
4. Pertama kali, Gaby akan bertanya: *"Hai! Aku Gaby. Kamu mau aku panggil apa?"*
5. Setelah itu panggil saja: **"Hai Gaby"**.

### Pasang seperti aplikasi biasa
- **iPhone (Safari):** tombol Bagikan → *Tambahkan ke Layar Utama*
- **Android (Chrome):** menu ⋮ → *Tambahkan ke layar utama* / *Instal aplikasi*
- **Laptop (Chrome/Edge):** ikon instal di ujung kanan kolom alamat

## Yang bisa Gaby lakukan
- Ngobrol santai, dengan emosi (warna cahaya ikut berubah)
- Ingat nama panggilan dan hal penting tentang kamu (tersimpan di perangkat masing-masing)
- Jam & tanggal, cuaca, cari info terbaru di Google
- Pengingat / timer ("Gaby, ingatkan aku 10 menit lagi angkat jemuran"). Di aplikasi Android berbunyi dengan nada notifikasi HP, juga saat HP terkunci (cek Pengaturan → Fitur → Pengingat sekali).
- ⏰ **Alarm sungguhan** ("Gaby, pasang alarm jam 5 pagi", "bangunkan aku tiap hari kerja jam 6"):
  Android (aplikasi) langsung dipasang di aplikasi **Jam** HP; iPhone lewat tombol + Pintasan **"Gaby Alarm"**
  (buat sekali, langkahnya ada di Pengaturan → Fitur); perangkat lain dijadikan pengingat.
  Ketuk tombol **Tambahkan ke Kalender** supaya tetap berbunyi walau Gaby ditutup.
- 📷 **Kamera**: "Gaby, lihat ini" — Gaby melihat dan mengomentari benda yang kamu tunjukkan.
  Di laptop juga bisa **bagikan layar**.
- 🎨 **Gambar**: "Gaby, tambahkan anjing tidur di bantal ini" atau "gambarin kucing astronot".
  Gambar tampil di layar; pilih **Simpan**, **Ulang**, atau **Buang** (bisa lewat suara).
  Mesin bawaan **Gratis** (Pollinations). Mesin **Google** (Pengaturan) lebih bagus dan bisa mengedit foto asli,
  tapi butuh billing; kalau gagal, otomatis pakai yang gratis.
- 📍 **Lokasi & peta**: "toko mochi enak dekat sini di mana?" atau "tunjukin jalan ke Surabaya".
  Kartu peta menampilkan rute, jarak, dan perkiraan waktu (🚗/🏍️/🚶, tanpa data macet) + tombol **Buka di Google Maps**.
  Di iPhone, izin lokasi diatur lewat Pengaturan → Privasi → Layanan Lokasi → **Situs Web Safari**.
- 📔 **Catatan harian & profil**: setiap Gaby tidur, obrolan diringkas otomatis; fakta tentang kamu dikelompokkan
  (diri, keluarga, kerja, kesukaan, kebiasaan, tanggal penting, rencana). Lihat, cari, ubah, atau hapus di
  Pengaturan → **📚 Buka Ingatan Gaby**. Semua tersimpan di perangkat, tanpa login.
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
- Tampilan bola cahaya: `js/visual.js`
- PIN: `js/config.js`
