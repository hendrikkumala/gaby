# Gaby (Gabriella) — asisten suara ala Jarvis

Pemilik: Hendrik (GitHub `hendrikkumala`). Berbahasa Indonesia, pengalaman coding ±5%:
**jelaskan dengan bahasa sederhana, langkah demi langkah, dan jangan memakai istilah teknis tanpa penjelasan.**

## Aturan kerja dengan pemilik
- Kalau diminta "diskusi dulu" / "jangan sentuh code": hanya periksa dan beri rencana, tunggu kata **"gas"**.
- Sebelum perubahan besar: buat cabang cadangan (`backup-vX.Y.Z`) dan push.
- Uji dulu (Playwright dengan tiruan WebSocket/media) sebelum commit; cek tidak ada fitur yang tumpang tindih
  dan tetap sinkron dengan ingatan (`js/memory.js`), catatan/to-do, pengingat.
- **Jangan pernah minta atau terima API key di chat.** Kunci tanda tangan APK (`*.keystore`) tidak boleh masuk repo.
- Jawaban ke pemilik dalam bahasa Indonesia yang santai dan ringkas.

## Apa ini
PWA statis (tanpa build, ES modules) di GitHub Pages: https://hendrikkumala.github.io/gaby/
Berjalan di laptop, iPhone (Safari), dan Android (browser atau APK Capacitor di `android-app/`).
Suara memakai **Gemini Live API** (WebSocket) dengan cadangan **OpenAI Realtime** (berbayar).
Persona: ramah, jenaka, lucu, punya emosi. Sapaan pertama: "Hai! Aku Gaby. Kamu mau aku panggil apa?".
Data pengguna **hanya di perangkat** (localStorage/IndexedDB); tidak ada server, tidak ada login.

## Peta kode
| File | Isi |
|---|---|
| `index.html`, `css/style.css` | Tampilan, kartu (gambar, to-do, peta), pengaturan |
| `js/app.js` | Pengendali utama: fase (locked/sleep/connecting/active), tombol, kartu, pengaturan, pengingat, alarm, update APK |
| `js/brain.js`, `gemini.js`, `openai.js` | Penyedia otak AI, urutan cadangan, tingkat fitur (LEVELS) kalau setup ditolak |
| `js/audio.js`, `vad.js` | Mikrofon, pemutar, ducking, deteksi bicara lokal |
| `js/visual.js`, `mood.js` | Tampilan hologram & warna emosi |
| `js/persona.js` | Prompt Gaby + daftar alat yang boleh dipakai |
| `js/tools.js` | Alat yang dipanggil Gaby (ingat, catatan, pengingat, pasang_alarm, rute, buka_aplikasi, kamera, gambar, dll.) |
| `js/memory.js` | Semua ingatan: profil per laci (18 kategori + tanda 👍/👎), penjaga laci `recall()`, jurnal, to-do, pengingat, pengaturan, key |
| `js/daily.js`, `journal.js` | Briefing pagi/sapaan malam, ringkasan harian & perapi ingatan (**Meri**, jalan saat Gaby tidur) |
| `js/location.js`, `map.js` | GPS, cari tempat, rute (OSRM), kartu peta (Leaflet) |
| `js/apps.js` | Buka WhatsApp/YouTube/dll. (Android intent, iOS universal link) |
| `js/whatsnew.js` | Daftar "apa yang baru" per versi (Gaby cerita sekali setelah update; Pengaturan → ✨ Apa yang baru) |
| `js/research.js` | **Rara**, agen riset internet `cari_info`: bertingkat Groq GPT-OSS 120B + browser_search → Gemini 3.x → 2.5 (+ Google Search), catat jatah habis & alasan, mode pencarian cepat |
| `js/pandu.js` | **Pandu**, perencana: otak OpenRouter (Nemotron) → Groq (GPT-OSS 120B) dengan alat (langkah, Rara, cuaca, jarak, laci, jadwal, simpan_rencana), `normalizePlan`, `pickOne`, `panduStatus` |
| `js/vera.js` | **Vera**, pemeriksa: `checkFacts` (Rara), `checkImage` (Lukas, model penglihatan), `checkPlan` (Pandu: cek pasti + Qwen3) |
| `js/planexport.js` | Isi rencana per bagian (`planSections`) — satu sumber untuk Kartu Rencana, gambar PNG (`renderImage`, canvas) & teks (`planText`) |
| `js/teamboard.js` | Papan kerja tim di bawah status (siapa bekerja, bar, langkah; ketuk untuk detail) |
| `js/openrouter.js` | Otak Pandu lewat OpenRouter (jatah per permintaan): pilih model gratis + tools (Nemotron Ultra 550B → Super 120B → …), hitung pemakaian harian, istirahat saat jatah/izin bermasalah |
| `js/groq.js` | Satu kunci Groq untuk Rara (GPT-OSS + `browser_search`), Lukas (Qwen3 32B → …), Vera (Qwen3 / Llama 4 penglihatan) & Pandu cadangan; penjaga token per menit (`waitNeeded`), pilih model pengganti dari daftar model Groq |
| `js/native.js` | Jembatan ke APK: notifikasi pengingat, alarm, cek update APK |
| `js/calendar.js`, `camera.js`, `gallery.js`, `imagegen.js`, `wake.js` | Kalender (.ics), kamera/layar, galeri, gambar (**Lukas** menulis prompt via Gemini teks, lalu Pollinations gratis / Google berbayar), "Hai Gaby" (tidak aktif di Android) |
| `sw.js` | Service worker: tetap bisa dibuka walau GitHub down |
| `android-app/` | Cangkang Android (Capacitor 6). Memuat Gaby dari GitHub Pages; plugin native sendiri: `GabyAlarmPlugin.java` |
| `.github/workflows/android-apk.yml` | Merakit APK otomatis & menerbitkannya di Releases `apk-terbaru` |

## Cara menjalankan & menguji
- Lokal: `python -m http.server 8000` lalu buka http://localhost:8000 (mikrofon boleh di localhost).
  Data di localhost terpisah dari github.io. Tekan Ctrl+Shift+R kalau service worker menyimpan salinan lama.
- Naikkan `VERSION` di `js/config.js` setiap rilis. Isi web terbit otomatis lewat GitHub Pages (±1 menit) setelah push ke `main`.
  **Tunggu pemasangan Pages sebelumnya selesai** sebelum push ke `main` lagi: kalau masih berjalan, pemasangan baru GAGAL ("in progress
  deployment") dan website tetap versi lama (terjadi pada v1.18.2, 1 Nov 2026). Perbaikan: jalankan ulang SELURUH run Pages
  (`rerun_workflow_run`, bukan hanya job yang gagal — artefaknya tidak ikut dibuat ulang). Selalu cek hasil run Pages setelah terbit.
- **Dari laptop pemilik (VS Code lokal):** Claude TIDAK bisa `git push` (tidak ada login GitHub di shell non-interaktif) → commit lokal
  (pesan commit lewat berkas `git commit -F`, karena PowerShell 5.1 merusak `-m` bertanda kutip), lalu pemilik klik **Push origin** di
  GitHub Desktop. `gh` tidak terpasang: cek Pages lewat `https://api.github.com/repos/hendrikkumala/gaby/actions/runs?per_page=3` dan
  `VERSION` di `https://hendrikkumala.github.io/gaby/js/config.js`. Uji lokal: Node (modul Gaby + `fetch`/`localStorage` tiruan) dan
  `playwright-core` + Edge terpasang (`channel: 'msedge'`) di folder sementara — Playwright penuh tidak terpasang.
- Setelah terbit, HP/browser bisa masih memakai versi lama sampai **±10 menit** (GitHub Pages `Cache-Control: max-age=600`, dan `sw.js`
  memanggil `fetch(e.request)` biasa yang ikut memakai cache itu). Solusi pengguna: tunggu, tutup-buka Gaby / Ctrl+Shift+R; APK: Hapus cache
  (BUKAN Hapus data). Ide perbaikan (belum disetujui): `fetch(e.request, { cache: 'no-cache' })` di `sw.js`.
- Perubahan di `android-app/**` memicu perakitan APK (versionCode = nomor run). Setelah selesai, di HP: Pengaturan → Fitur → Cek update aplikasi.
  Naikkan `version` di `android-app/package.json` kalau hanya ingin memicu perakitan.
- Uji otomatis memakai Playwright dengan WebSocket Gemini palsu, kamera/mikrofon palsu, UA iPhone/Android, dan jembatan Capacitor tiruan (`window.Capacitor`).

## Keputusan penting (jangan dibongkar tanpa alasan)
- **Tanpa PIN** saat ini (`PIN_HASH` kosong di `js/config.js`; pemilik belum memberi PIN).
- Gaby tidak mendengarkan di latar belakang. Saat kembali dari aplikasi lain: ketuk sekali ("Ketuk di mana saja untuk lanjut"). Pemilik sudah memutuskan ini lebih praktis daripada "Hai Gaby" tanpa sentuh.
- Android: "Hai Gaby" dimatikan (pengenal suara Android berbunyi "tetung" terus). Pakai ketuk bola / selalu dengar.
- iPhone: mikrofon **tidak dilepas** saat pindah aplikasi (iOS menanyakan izin lagi), hanya dijeda.
- Gemini: `thinkingBudget: 0`, VAD lokal (Gaby menentukan selesai bicara, 650 ms), alat memori NON_BLOCKING; ada tingkat cadangan kalau server menolak setup.
- Gambar: default Pollinations gratis (butuh key gratis di header `Authorization`, jangan di URL); Google berbayar opsional.
- Peta: tile OSM digelapkan dengan filter CSS (CARTO butuh API key). Geocode kota besar diprioritaskan berdasarkan `importance`.
- Alat `rute` punya parameter `dari` (titik awal selain GPS).
- Pengingat vs alarm vs catatan: `buat_pengingat` = tugas ber-waktu (otomatis juga masuk to-do, notifikasi HP di APK / tombol kalender di browser);
  `pasang_alarm` = alarm bangun (Android: aplikasi Jam via plugin; iPhone: tombol Pintasan "Gaby Alarm"; lainnya: jadi pengingat); `catatan` = to-do tanpa waktu.
- Di APK, nada "ting" buatan Gaby tidak dibunyikan untuk pengingat yang sudah dijadwalkan sebagai notifikasi HP; Gaby bicara 2,5 dtk setelah nada.
  Pengingat yang jatuh tempo saat Gaby di latar belakang disampaikan Gaby ketika dibuka lagi (`missed` di `app.js`).
- Ingatan berlaci (v1.15): 18 laci di `CATEGORIES`, tiap fakta punya `rasa` ('suka' 👍 / 'tidak' 👎 / ''). Kalau ingatan > 40 (`DRAWER_LIMIT`),
  prompt hanya membawa laci penting (`ALWAYS_CATS`) + semua 👎 + daftar isi laci; Gaby membuka laci lain lewat alat `buka_ingatan`
  (penjaga laci = pencocokan kata kunci lokal, tanpa AI). Ingatan lama dipindah otomatis (kata kunci) lalu dipilah ulang AI sekali (`needResort`).
  Penyisipan konteks di tengah sesi Live sengaja tidak dipakai (bisa memotong Gaby bicara); pakai alat saja.
- Anti muter-muter: prompt punya bagian "CARA MEMAKAI INGATAN", catatan harian yang dibawa hanya 5 terakhir.
- Internet (v1.16/1.17): Google Search bawaan Gaby **dimatikan**; semua info faktual lewat alat `cari_info` (`js/research.js`).
  Tingkat (yang tak punya kunci dilewati): Groq GPT-OSS 120B + `browser_search` (kunci Groq `keys.groq`, diisi pemilik di Pengaturan → Otak Gaby)
  → Gemini 3.x Flash (jatah bulanan) → Gemini 2.5 Flash (jatah harian). Kunci Groq salah (401) / gangguan jaringan → lanjut Gemini, alasan tampil. Batas per menit = coba lagi sekali, bukan habis.
  Jatah habis dicatat di `localStorage['gaby.research']` sampai 08:00 UTC (harian) / tgl 1 bulan depan (bulanan).
  Dua-duanya habis → `switchToQuickSearch` di `app.js` menyambung ulang setelah Gaby selesai bicara dengan Google Search bawaan
  ("pencarian cepat", `cari_info` disembunyikan) lalu menjawab pertanyaan tadi lewat `pendingCue`. Kartu sumber `#srccard` (atas, 60 dtk),
  tidak tampil kalau kartu peta terbuka; kartu baru menggantikan yang lama dan tombol besar "↗ Buka" (`bigButton`) saling menggantikan
  dengan kartu sumber (v1.17.1). Alat suara `tutup_kartu` (sumber / semua). Hasil pencarian tidak disimpan ke ingatan. Status di Pengaturan → Fitur → "Pencarian internet (Rara)".
  Alasan penolakan disimpan (`st.why`, gangguan di `st.lastFail`) dan tampil di Pengaturan → Fitur + tombol "🔄 Coba Rara lagi" (`resetResearch`);
  "limit: 0" = kunci tidak diberi jatah (`nofree`). Kunci Gemini gratis pemilik ditolak Google Search grounding (1 Nov 2026) → solusi v1.17: Groq.
- Teman AI Gaby (v1.16), dikenal Gaby lewat bagian "TEMAN-TEMANMU" di prompt: **Rara** (internet, `cari_info`),
  **Lukas** (gambar: `writeImagePrompt` di `imagegen.js`: Groq Qwen3 32B kalau ada kunci Groq & tanpa foto; foto kamera / tanpa Groq →
  Gemini 2.5 Flash → Flash-Lite; status model terakhir di `localStorage['gaby.lukasModel']`; terima kata-kata pengguna + draf Gaby +
  isi laci yang nyambung + foto kamera; pilih bentuk persegi/tegak/mendatar; `gambar_aksi ulang` + `perubahan` = Lukas memperbaiki
  prompt lama; gagal → draf Gaby), **Meri** (catatan harian & perapian ingatan). Penjaga laci (kata kunci) bukan AI.
  Penjaga laci mengenali akhiran -ku/-mu/-nya/-lah/-kah ("kucingku" → laci keluarga).
- Tim v1.18 (semua lewat satu kunci Groq): **Vera** (Qwen3 32B berpikir; sengaja beda keluarga dari GPT-OSS) mengecek
  Rara (`researchChecked`: bukti dari browsing Groq / groundingSupports Gemini; lemah → Rara cari ulang sekali; balasan Vera tak jelas =
  "belum dicek", BUKAN dibuang), Lukas (Llama 4 penglihatan → cadangan Gemini; kurang → Lukas memperbaiki sekali; Pengaturan → Fitur
  "Vera mengecek gambar Lukas"), dan Pandu (cek pasti: hal 👎, bentrok tanggal; Qwen3: masuk akal; ditolak → Pandu memperbaiki sekali).
  **Pandu** jalan di belakang layar (`startPlan`/`runPlanJob` di `app.js`), satu misi sekaligus; selesai → `memory.addPlan` (nomor
  urut, tidak dipakai ulang; hapus semua → mulai #1), Kartu Rencana, lalu `announce()`: Gaby bicara sendiri saat jeda (tidak memotong:
  cek `audio.isSpeaking`, `thinking`, `vad.active`), atau disimpan di `planNews` + notifikasi HP (`nativeNotifyNow`) kalau Gaby tidur.
  Pengingat bertanggal lampau dibuang otomatis; total = jumlah rincian (dihitung ulang). Papan kerja menahan Gaby supaya tidak tertidur.
- Kartu bernama & satu kartu tampil sekaligus (`hideCards`): Kartu Berita (`#srccard`), Kartu Rencana / Perbandingan / Daftar Rencana
  (`#plancard`, `dataset.kind`), Kartu Catatan, Kartu Peta, Kartu Gambar, Galeri. `tutup_kartu` per nama; gambar belum disimpan ditanya dulu.
  Alat rencana: `buat_rencana` (+`dari_nomor` = turunan), `buka_rencana`, `daftar_rencana` (>5 → kartu daftar), `bandingkan_rencana`
  (2–3), `hapus_rencana` (langsung, tombol/ucapan "batal" 1 menit → `batal_hapus_rencana`), `rencana_ke_catatan`.
- Pandu v1.19 (setelah pemilik melapor Pandu selalu gagal kena batas token per menit Groq): otak berurutan **OpenRouter**
  (`keys.openrouter`, Nemotron Ultra 550B gratis, tanpa batas token per menit, hasil riset dikirim lengkap, `max_tokens` 8000,
  `reasoning.effort low`) → **Groq** (GPT-OSS 120B; jatah jawaban 1.700, sampai 2.500 kalau masih muat di 7.600 token).
  Maks **3 pencarian gabungan per topik** (transportasi semua maskapai / penginapan per kelas / kuliner & wisata), jawaban Rara rinci
  (`research(q, { small, detail })`), **tanpa Vera per pencarian** (Vera hanya mengecek rencana akhir). Rara di dalam Pandu memilih model
  Groq yang jatahnya paling lega (`waitNeeded`). "Request too large" (413) → `toolarge`: padatkan keras + 1.700 lalu coba lagi.
  Otak gagal → pindah otak berikutnya; kalau sudah ada data, otak berikutnya dipaksa `simpan_rencana` (catatan "sebagian perkiraan").
  Alasan gagal & otak terakhir di `localStorage['gaby.pandu']` → Pengaturan (🗺️ Pandu / 🧭 OpenRouter: "N/50 permintaan hari ini").
  Pilihan berjenjang: `transportasi`/`tempat` (hotel) punya `kelas` hemat/seimbang/nyaman + tepat satu `dipilih` (dipakai di total;
  `pickOne` memilih seimbang kalau model lupa). "Ganti ke yang paling murah" = rencana turunan.
- Pandu × Vera v1.20: ditolak Vera → Pandu memperbaiki maks **2 kali lewat OpenRouter**, 1 kali lewat Groq (`maxFixes`); hasil terakhir
  dicek ulang di `runPlanJob`. Masih ada catatan serius → Gaby menawarkan SATU kali "Mau aku minta Pandu lengkapi?" → `buat_rencana`
  `dari_nomor` = rencana turunan; `userContext(base)` memberi Pandu catatan Vera rencana lama ("WAJIB dibereskan"). `plan.vera.issues` =
  catatan serius saja (rencana lama: semua catatan), `notes` = catatan serius (⚠️) + catatan kecil; Kartu Rencana menaruh "Catatan Vera" di
  depan kalau `vera.ok === false`; `buka_rencana` membawa `catatan_vera`. Perjalanan: `tanggal_selesai` baru, jadwal "Hari N, jam" (maks 30),
  `tripScheduleIssues` (tanpa AI) mewajibkan setiap hari sampai hari terakhir (lama dari tanggal_mulai–selesai / "12–14 Des" / "3 hari";
  tidak terbaca → dilewati), check-out kalau ada hotel, dan perjalanan pulang ("kembali ke hotel" tidak dihitung).
  Uji G (harness): Groq tiruan menolak > 8.000 token/menit dan "too large" (isi + jatah jawaban; browsing +3.500), OpenRouter tiruan.
- Batas token per menit Groq (v1.18.1): `groqChat` mencatat pemakaian 60 dtk terakhir per model (usage asli / perkiraan
  ±3,5 huruf per token) + header `x-ratelimit-*` kalau terbaca, lalu MENUNGGU dulu kalau jatah belum cukup (`waitNeeded`, bawaan 8.000/menit,
  maks 60 dtk; papan kerja menulis "Menunggu jatah Groq per menit"). 429 per menit → tunggu `retry-after` lalu ulang.
  Pandu hemat token (v1.18.1; diperketat di v1.19: maks 3 pencarian, lihat di atas): alat ringkas, hasil alat lama dipadatkan, minta panggil beberapa alat sekaligus,
  Rara di dalam Pandu memakai GPT-OSS **20B** (jatah terpisah dari Pandu 120B), Pandu pindah model untuk satu giliran kalau 120B harus
  menunggu > 8 dtk. Satu misi ±10–15 ribu token → wajar 1–3 menit. Awas: `/20b/` juga cocok dengan "120b" — pakai `/gpt-oss-20b/`.
- Rencana v1.19: `jenis` (perjalanan/proyek/acara/belajar/kesehatan/belanja/lainnya) + bagian `transportasi` (nama maskapai/kereta,
  "cek ulang saat pesan"), `kuliner` (nama resto), `tujuan`, `fitur` (wajib/nanti), `alat`, `risiko`. Vera menolak perjalanan tanpa
  transportasi/kuliner bernama dan proyek tanpa tujuan/fitur. Pandu merencanakan proyek (misal bikin aplikasi), BUKAN membuatnya.
  Simpan ke HP: tombol 💾 / 📤 di Kartu Rencana & Perbandingan, alat `simpan_rencana_hp` (gambar/teks). Gambar selalu masuk Galeri Gaby.
  APK: plugin `@capacitor/share` + `@capacitor/filesystem` (tulis ke CACHE → menu Bagikan Android; `FileProvider` sudah ada);
  APK lama tanpa plugin → saran update. Browser: menu Bagikan/unduhan butuh ketukan → dari suara tampil tombol "Ketuk untuk simpan ke HP".
  Tombol Simpan/Bagikan di Galeri juga memakai menu Bagikan Android di APK.
- Kunci belum diisi (v1.18.2): prompt punya "STATUS TEMAN SAAT INI" (`friendStatus` di `persona.js`). Teman yang belum bisa →
  Gaby bilang santai sekali per obrolan ("Wah, Rara belum bisa dimintai tolong nih, kunci Groq-nya belum dimasukin…") lalu kerjakan
  sendiri sebisanya (Rara → pencarian cepat / pengetahuan sendiri tanpa mengarang angka; Lukas → draf Gaby; Vera → "belum dicek").
  Pandu wajib Groq: minta isi kunci + tawarkan garis besar sederhana buatan Gaby (tidak tersimpan, tidak bernomor).
- Papan kerja bisa ditutup (✕ / `tutup_kartu` jenis `papan` / "tutup semua"); teman tetap bekerja, papan muncul lagi saat ada pekerjaan
  baru. Pekerjaan yang macet > 6 menit dihapus dari papan.
- Uji: mikrofon tiruan Chromium berbunyi "bip" sehingga `vad.active` sering true; pakai `--use-file-for-fake-audio-capture=<wav hening>`.
- OpenRouter hanya untuk OTAK Pandu (v1.19), bukan untuk browsing: pencarian web OpenRouter berbayar, jadi Rara tetap di Groq/Gemini.
  Model gratis OpenRouter: ±20 permintaan/menit, 50/hari (1.000/hari kalau akun pernah isi saldo ≥ $10); permintaan gagal ikut dihitung;
  pemilik harus mengizinkan model gratis di https://openrouter.ai/settings/privacy, kalau tidak → error "data policy" (`privacy`).
- Cerita update: `newsCue` di `app.js` sekali per versi saat dibuka biasa (tap/wake/open, bukan resume/pengingat), maks 4 item dari
  `WHATS_NEW` (`newsSince`: item pertama tiap versi yang terlewat pasti ikut, diceritakan urut dari versi lama ke baru); `memory.seenVersion` (pengguna baru langsung = VERSION, pengguna lama tanpa catatan = 1.14.0).
  **Setiap rilis: tambahkan entri di `js/whatsnew.js`** (bahasa santai, sudut pandang Gaby, item terpenting dulu;
  `quiet: true` untuk perbaikan kecil = hanya di Pengaturan, tidak diceritakan).
- Pratinjau kamera (`#cam-box`): `fitCamBox()` menyamakan bentuk kotak dengan `videoWidth/videoHeight` dan `object-fit: contain`
  (dulu kotak 3:4 + `cover` memotong gambar mendatar, sehingga tampak di-zoom padahal Gaby melihat gambar utuh).
- Service worker network-first; respons error (404/500) tidak pernah disimpan, jatuh ke salinan terakhir.

## Rilis & infrastruktur
- Repo publik di GitHub; GitHub Pages dari cabang `main`. Cadangan: cabang `backup-v1.12.2`, `backup-v1.13.0`, `backup-v1.14.0`, `backup-v1.15.0`, `backup-v1.16.1`, `backup-v1.17.1` (versi stabil yang sudah diuji, 1 Nov 2026), `backup-v1.18.0`, `backup-v1.18.1`, `backup-v1.18.2`, `backup-v1.19.0`, `backup-v1.19.1` (= versi sebelum v1.20.0, 3 Nov 2026).
- APK: https://github.com/hendrikkumala/gaby/releases/download/apk-terbaru/Gaby.apk
  Ditandatangani dengan **kunci tetap** (GitHub Secrets `GABY_KEYSTORE` dan `GABY_KEYSTORE_PASSWORD`; alias `gaby`).
  Berkas cadangan kunci ada di pemilik, bukan di repo. Kalau hilang dan secret terhapus, pengguna harus uninstall (data APK hilang).
- Kartu update APK di aplikasi membandingkan nomor perakitan di nama rilis ("Gaby APK (perakitan #N)") dengan versionCode terpasang.
- Cabang `ci-check` sisa uji coba, boleh dihapus (belum bisa lewat sesi cloud).

## Status saat ini — per 3 Nov 2026
**Yang terbit (cabang `main` / GitHub Pages): v1.20.0 · APK #7** (android-app 1.0.4, plugin Share & Filesystem). v1.20.0 terbit 3 Nov 2026
(web saja, APK tidak berubah; run Pages `66f1775` sukses & `config.js` live = 1.20.0). Pemilik mencoba tepat setelah terbit dan masih
melihat versi lama → cache 10 menit (lihat "Cara menjalankan & menguji"); belum dikonfirmasi pemilik sudah melihat 1.20.0.

**Sedang dikerjakan: 🏢 Ruang Kerja Gaby** (tahap sketsa, BELUM ada kode di aplikasi) — lihat bagian "Proyek berjalan" di bawah.
Pemilik akan melanjutkan pengembangan juga dari VS Code lokal (pull → ubah → push). Selalu `git pull` dulu sebelum bekerja, dan
jangan push ke `main` dari dua tempat sekaligus (pemasangan Pages bisa bentrok, lihat "Cara menjalankan & menguji").

**Sudah jalan & diuji pemilik:**
- Percakapan suara Gemini, persona & emosi (hologram), kamera/layar, gambar (gratis & galeri), lokasi/tempat/rute/peta,
  ingatan & profil, jurnal, briefing pagi, to-do + pengingat, musik, buka aplikasi + kontak.
- APK Android dengan kunci tetap & kartu update (update ke #6 lewat kartu berhasil).
- Pengingat berbunyi saat HP terkunci + `pasang_alarm` ke aplikasi Jam di Android (31 Okt 2026).
- `pasang_alarm` di iPhone (1 Nov 2026): ketuk kartu alarm → app Jam → pemilik menekan Simpan sendiri (iOS tidak mengizinkan otomatis).
- Lukas (v1.16, Groq Qwen3 di v1.17): gambar "lebih presisi sesuai permintaan", "aman banget, keren" (1 Nov 2026).
- Rara via Groq GPT-OSS 120B + browser_search (v1.17.0): jalan dan memberi kartu sumber berita (1 Nov 2026).
- Tanda 👍/👎 di Pengaturan → Ingatan sudah terlihat (v1.15, 1 Nov 2026).
- **Pandu v1.19.0 lewat OpenRouter (2 Nov 2026): "sudah sukses, keren laporannya", "walau menunggu tapi hasilnya nyata"**; Vera ikut
  memberi catatan (contoh: "belum ada jadwal hari terakhir dan check-out hotel"). Kunci OpenRouter sudah diisi pemilik.
  Pertanyaan pemilik: kenapa catatan Vera tidak dikembalikan ke Pandu sampai beres → v1.20.0 (disetujui pemilik 3 Nov 2026):
  2 putaran perbaikan lewat OpenRouter + tawaran "lengkapi rencana" + Vera mengecek jadwal per hari/check-out/pulang.
  Catatan: kunci Gemini gratis pemilik **ditolak** Google Search grounding, jadi Rara bergantung pada kunci Groq.

**Masalah yang dilaporkan pemilik & sudah ditangani:**
- Pandu selalu gagal (1 Nov 2026) — penyebab: batas token per menit Groq habis sebelum semenit berlalu (Rara browsing + Vera per
  pencarian + Pandu). Ditangani di v1.19.0 (otak OpenRouter, 3 pencarian, tanpa Vera per pencarian, jatah 1.700/2.500, tahan banting)
  — ✅ dikonfirmasi pemilik 2 Nov 2026.
- Pratinjau kamera tampak di-zoom di APK & Mac (2 Nov 2026) → v1.19.1 (terbit, belum dicoba pemilik).
- Riwayat versi di Pengaturan terlalu panjang (2 Nov 2026) → v1.19.1 tombol lipat (terbit, belum dicoba pemilik).

**Belum dites langsung oleh pemilik:**
- v1.20.0: Pandu memperbaiki 2× setelah ditolak Vera, tawaran "lengkapi" → rencana turunan, cek jadwal tiap hari/check-out/pulang.
  Diuji otomatis (Node: logika Pandu/Vera dengan otak tiruan; Edge + playwright-core: alur buat_rencana → kabar → lengkapi).
- v1.19.0: pilihan hemat/seimbang/nyaman, jenis rencana (proyek dll.), simpan kartu ke HP (APK butuh update ke #7 — kartu update muncul otomatis
  besoknya, atau Pengaturan → Fitur → Cek update aplikasi).
- v1.18: Pandu & rencana bernomor (buka/bandingkan/hapus/batal/ke catatan, kabar otomatis), Vera (cek Rara/Lukas/Pandu), papan kerja,
  kartu bernama + `tutup_kartu` per nama, Gaby bilang santai kalau kunci teman belum diisi.
- v1.17.1: kartu sumber tidak menumpuk + "tutup beritanya" / "tutup semua".
- v1.16: cerita update sekali per versi, "ulang dengan perubahan" untuk gambar. v1.15: `buka_ingatan` (> 40 ingatan), anti muter-muter.
- Pencarian cepat (Google Search bawaan) saat semua jatah Rara habis.
- Belum pasti di dunia nyata: Nemotron Ultra 550B gratis masih ada & cukup cepat? model penglihatan Llama 4 masih ada di Groq?
  kualitas harga Indonesia dari pencarian.

**Ketergantungan pada GitHub (pertanyaan pemilik, 2 Nov 2026):** APK memuat Gaby dari GitHub Pages (`server.url` di
`android-app/capacitor.config.json`). Kalau repo/Pages dihapus: pengguna yang sudah pernah membuka tetap jalan dari salinan service
worker (data aman di HP, semua AI tetap jalan), tapi tidak ada update/unduhan APK, pengguna baru tidak bisa, dan kalau cache/data app
dihapus atau APK dipasang ulang → Gaby tidak terbuka. Salinan `www` di dalam APK belum dipakai sebagai cadangan, dan datanya terikat
alamat github.io (pindah alamat = perlu ekspor/impor ingatan). Jangan hapus/ganti repo atau alamat Pages tanpa rencana pindah.

Kalau pemilik melaporkan masalah: Pandu/rencana → `js/pandu.js`, `js/openrouter.js`, `runPlanJob`/`announce` di `js/app.js` + baris 🗺️ Pandu / 🧭 OpenRouter
di Pengaturan → Otak Gaby; Vera → `js/vera.js`; pengingat/alarm → `js/native.js`, `GabyAlarmPlugin.java`, `fireReminder`/`setAlarm` di `js/app.js`;
Rara → Pengaturan → Fitur → alasan di bawah "Pencarian internet (Rara)" + `js/research.js`, `js/groq.js`; Lukas → `js/imagegen.js`;
kamera → `fitCamBox` di `js/app.js`, `js/camera.js`.

## Proyek berjalan: 🏢 Ruang Kerja Gaby (ide pemilik, 3 Nov 2026)
Tombol **🏢 Ruang Kerja** (bawah tengah, di antara kamera & galeri) → layar kantor kartun **2.5D (isometrik)** berisi tim Gaby yang
bergerak sesuai pekerjaan SUNGGUHAN. Obrolan tidak terputus saat pindah layar. Tanpa perubahan Android.

**Sketsa (disetujui pemilik)** — di `D:\HK\APP Project\Gaby Assistent\sketsa-ruang-kerja\` (di LUAR repo, hanya di laptop pemilik):
`karakter.html` (18 pilihan karakter + "⭐ Tim terpilih"), `meja.html` (18 pilihan ruangan), `kantor.html` (denah utuh). Kode gambarnya
SVG murni tanpa gambar luar: `karakter.js` (fungsi `character(o)`, chibi), `meja.js` (mesin isometrik: `P(x,y,z)`, `box`, `faceX/faceY`,
`textX/textY`, `at`, `charAt`, `room`, sekat `lowX/lowY`, `onL/onR`), `kantor.js` (`officeSvg`). Kode ini akan dipakai ulang di aplikasi.
- **Karakter terpilih:** Gaby = Bos Hologram (bob biru, jas putih, TANPA headset, pegang mic) · Meri = Pustakawan (sanggul, kacamata
  bulat, kardigan hijau, map) · Rara = Kutu Buku (rambut panjang hitam, sweater ungu, headphone, teh; mode kerja = kacamata hologram +
  tablet) · Pandu = Penjelajah (topi safari, rompi khaki, kompas) · Vera = Detektif dengan jas **abu-abu tua** (beda dari khaki Pandu) ·
  Lukas = Klasik (baret merah, celemek cat, kuas).
- **Ruangan terpilih:** Gaby = Kokpit Hologram (layar hologram melayang PUSH TO TALK di ATAS kepala Gaby, meja putih bercahaya) · Meri =
  Lemari Laci Ajaib (18 laci bergambar = `CATEGORIES` di `memory.js`, lampu hias, meja bundar + laptop + teh) · Rara = Observatorium
  (dinding berbintang; santai: kursi baca di sebelah lemari buku menghadap bola bumi + meja teh besar; kerja: panggung hologram bumi
  berputar dengan titik merah/kuning/biru + layar hologram) · Pandu = Basecamp (papan gabus peta, pin & benang merah) · Vera = Kantor
  Detektif (papan bukti ✅/⚠️, lampu hijau, stempel) · Lukas = Atelier Klasik (penyangga kanvas, cipratan cat).
- **Denah (kantor terbuka 29×29 satuan):** pemilik menolak ruangan menempel ("kayak dikurung di kotak") dan lorong abu-abu bergaris
  ("kayak jalan raya"). Sekarang: ruangan 8×8 dengan **lorong 2,5 berlantai kayu hangat**, karpet bundar toska + tanaman + dispenser air di
  persimpangan, hanya dinding luar yang tinggi (jendela di bagian lorong), antar-ruangan **sekat kaca setinggi pinggang dengan pintu di
  tengah**, papan nama melayang di atas kepala karakter.
  ```
  [ Rara ] ░ [ Pandu ] ░ [ Lukas ]
  [ Meri ] ░ [ GABY  ] ░ [ Vera  ]
  [   Pantry   ] ░ [ Ruang Game  ]
  ```
  Pantry: kulkas, meja dapur + mesin kopi + microwave, papan "MENU HARI INI", dispenser, meja bundar + gorengan. Ruang game: TV + konsol,
  sofa, ping-pong, arcade, bean bag, papan neon "GAME ON".

**Alur animasi yang disepakati** (dipicu kejadian nyata; animasi TIDAK BOLEH menunda jawaban Gaby):
- Meri ↔ Gaby: `ingat` → kartu di layar Gaby jadi pesawat kertas → Meri menangkap → laci kategori menyala/terbuka → disimpan ✨.
  `buka_ingatan` → "🔍 butuh: <laci>" + sinyal ke Meri → Meri lari ke laci → map terbang ke Gaby → layar Gaby menyala (baris tulisan
  berjalan) → Gaby menjawab sambil pegang mic. Gaby tidur → Meri menulis jurnal & merapikan laci. Meri TIDAK lewat Vera.
- Tim: Gaby bicara ke interkom → lampu meja teman berkedip + catatan tempel terbang → teman lari ke meja kerja → kerja **buru-buru**
  (💦, garis kecepatan, bar progres = papan kerja asli) → hasil jadi map, teman lari mengantar ke Vera → Vera menyapu dengan kaca pembesar,
  centang satu per satu → ✅ DOK! (lolos) atau ⚠️ (map kembali, teman mengerjakan ulang = putaran perbaikan Pandu maks 2×) → map ✅ jadi
  pesawat kertas ke Gaby → layar Gaby menyala → Gaby menyampaikan. Pandu bisa lari ke Rara saat butuh riset.
- Santai: Gaby kopi/peregangan (tidur: "Zzz" di meja), Meri kemoceng, Rara baca + teh, Pandu putar kompas, Vera lap kaca pembesar/koran,
  Lukas sketsa. Sesekali ke pantry (gosip, gelembung emoji) atau ruang game; ada tugas → lari balik (kadang masih menggigit gorengan).
- Sumber sinyal di kode: papan kerja (`startJob`/`pass`/`step`/`done`/`fail` di `teamboard.js`, termasuk `pass('vera')`), `onToolCall`
  di `app.js` (`ingat`, `buka_ingatan`, `cari_info`, `buat_rencana`, gambar…), status Gaby (`audio.isSpeaking`, `thinking`, `vad.active`,
  `phase`), `announce()` saat hasil disampaikan.

**Prototipe bergerak (3 Nov 2026): `prototipe/`** (di repo, ikut terbit: https://hendrikkumala.github.io/gaby/prototipe/, `noindex`;
juga bisa dibuka langsung dari file). Salinan sketsa ada di sana juga (`karakter.html`, `meja.html`, `kantor.html`). Isi: `proto.js`
(dibungkus IIFE — nama global `HEAD`/`ITEMS`/`poly` bentrok dengan `karakter.js`/`meja.js`), `index.html` (tombol uji, CSS animasi).
Cara kerja: `window.PROTO = true` → `charAt` mencatat kursi ke `window.PROTO_SEATS` dan memotong gambar ruangan di `<!--SLOT-->`;
`officeLayers()` (kantor.js) mengembalikan per ruangan `back` / `front2`. Di DOM: tiap ruangan = back · fx0 · slot · front · over, plus
`afterG` untuk yang lewat lorong; pemain di ruangan masuk `slotG` kalau y lokal < `NAV[room].frontY`, di lorong diselipkan sebelum
ruangan pertama yang pasti di depannya. Jalan: graf visibilitas pojok perabot (`NAV.obs` + sekat berpintu, ruang Gaby tertutup untuk
dilintasi), Dijkstra. Adegan: simpan ingatan, butuh ingatan, Rara → Vera → Gaby (+ Vera menolak ⚠️), waktu santai (pantry gosip,
ping-pong; tugas masuk → teman lari balik, Vera ditunggu duduk dulu), Gaby tidur (malam, Zzz, Meri menulis jurnal), push to talk
(ketuk layar hologram). Kecepatan 0,5–2×, kamera ikut, papan nama, penghitung FPS, "mode ringan" (gambar diam dijadikan foto).
Uji laptop (Edge headless): ±100–120 FPS, emulasi HP ±58 FPS; FPS di HP asli pemilik BELUM diukur.
**Revisi 2 (masukan pemilik: "karakter masih seperti kertas", "tangan diam saat kerja", "santai membosankan", "Gaby minim
aktivitas", "di HP seperti apa?"):** `karakter25.js` = karakter 2.5D (tampak ¾ + tampak belakang saat berjalan menjauh, bayangan
sisi/wajah/leher, garis tepi) dengan lengan/kaki terpisah; sudut lengan lewat CSS `@property --al/--ar`, kaki `--ll/--lr`; barang
tangan kanan `.ritem` & kiri `.lprop` diputar balik supaya tetap tegak. Pose CSS di `.flipG`: working, painting, stamping, reaching,
sipL/sipR, stretch, waving, dance, talking, sleeping; berjalan = lengan mengayun + kaki melangkah. **Kantor hidup** (`ACTS` di
proto.js, ±40 aktivitas berbobot jam kerja `w` / santai `s`, berdua `n: 2`, tempat dipesan lewat `TAKEN`): Gaby (kopi, peregangan,
cek laporan, bersenandung, putar kursi, melambai, bola hologram), Meri (kemoceng laci, merapikan map, jurnal, teh), Rara (baca, teh,
ketiduran, cek bola bumi), Pandu (kompas, pin peta, mondar-mandir, ransel), Vera (lap kaca pembesar, koran, latihan stempel, topi),
Lukas (melukis, mengagumi lukisan, sketsa, cuci kuas), bersama (kopi/microwave/air/kulkas pantry, arcade, bean bag, konsol, joget,
siram tanaman, lari di lorong, lihat jendela, gosip, ping-pong, ngobrol di lorong, berkunjung, tos). Saat santai Gaby boleh keluar
ruangan. Tugas masuk → `claim()` membatalkan aktivitas (`cancelAct`) dan teman lari balik. HP: panel uji dilipat ("🧪 Tombol uji"),
tombol pintas ruangan, `hp.html` = pratinjau bingkai HP tegak & miring. Kinerja: kamera bergerak memaksa seluruh SVG digambar ulang
(laptop 34 FPS) → **mode ringan otomatis** kalau < 40 FPS selama 3 dtk (gambar diam jadi foto); emulasi HP lemah (CPU 6×) ±30–36 FPS.
Pemilik: "sudah cakep" (3 Nov 2026); kecepatan animasi bawaan **1,5×** (1× "kayak siput") — pakai juga di aplikasi nanti.

**Langkah berikutnya:** (1) pemilik mencoba prototipe (di HP: cek FPS & rasa animasi) dan memberi masukan; perbaiki di
`prototipe/` sampai pemilik bilang lucu & lancar; (2) v1.21: tombol + kantor di aplikasi + animasi Gaby/Meri/Rara; (3) v1.22:
Pandu/Vera/Lukas lengkap. Di HP tegak: kamera mendekat ke ruangan yang sibuk + bisa digeser jari; benda tinggi di ruangan depan bisa
dibuat transparan saat fokus ke Gaby. Animasi berhenti saat layar Ruang Kerja tertutup (hemat baterai). Tetap minta "gas" sebelum
menyentuh kode aplikasi.

## Riwayat rilis (ringkas)
| Versi | Isi |
|---|---|
| 1.20.0 | Pandu memperbaiki sampai 2× (OpenRouter) setelah ditolak Vera; masih kurang → Gaby menawarkan "lengkapi" (rencana turunan membawa catatan Vera); Vera mewajibkan jadwal tiap hari sampai hari terakhir + check-out + pulang; catatan Vera serius tampil di depan Kartu Rencana |
| 1.19.1 | Pratinjau kamera mengikuti bentuk asli gambar (tidak dipotong/terlihat di-zoom); riwayat versi di Pengaturan bisa dilipat (quiet) |
| 1.19.0 | Pandu: OpenRouter (Nemotron Ultra 550B) + cadangan Groq, irit (3 pencarian, tanpa Vera per pencarian, 1.700/2.500 token) & tahan banting; pilihan hemat/seimbang/nyaman; jenis rencana (proyek, acara, belajar, dll.), transportasi & kuliner bernama; simpan kartu ke HP; APK + plugin Share & Filesystem (android-app 1.0.4) |
| 1.18.2 | Gaby memberi tahu dengan santai kalau teman belum bisa karena kunci belum diisi, lalu mengerjakan sendiri sebisanya (quiet) |
| 1.18.1 | Penjaga batas token per menit Groq, Pandu lebih hemat token, Rara 20B saat dipanggil Pandu; papan kerja bisa ditutup (✕ / suara). "Perbaikan bug kecil" (quiet) |
| 1.18.0 | Teman baru Pandu (perencana) & Vera (pemeriksa), papan kerja tim, kartu bernama + `tutup_kartu` per nama, rencana bernomor (buka/bandingkan/hapus/batal/ke catatan), kabar otomatis + notifikasi HP |
| 1.17.1 | Kartu sumber tidak menumpuk, `tutup_kartu` pakai suara; cerita update runtut (maks 4 hal, urut lama → baru). "Perbaikan bug kecil" (quiet) |
| 1.17.0 | Kunci Groq di Pengaturan → Otak Gaby: Rara GPT-OSS 120B + browser_search, Lukas Qwen3 32B; catatan v1.16.1 dihapus dari Apa yang baru |
| 1.16.1 | Alasan penolakan Google tampil di Pengaturan + tombol "Coba Rara lagi" |
| 1.16.0 | Teman Gaby: Rara (`cari_info` + kartu sumber, Google Search bawaan dimatikan, pencarian cepat saat habis), Lukas (prompt gambar rinci, bentuk, ulang dengan perubahan), Meri; cerita update sekali; akhiran -ku/-mu/-nya |
| 1.15.0 | 18 laci ingatan + 👍/👎, `buka_ingatan`, mode laci > 40 ingatan, anti muter-muter, pemilahan ulang AI |
| 1.14.0 | Pengingat berbunyi saat HP terkunci, `pasang_alarm` (APK #6) |

## Ide berikutnya (belum disetujui / belum dimulai)
- `sw.js`: ambil file dengan `cache: 'no-cache'` supaya versi baru langsung masuk tanpa menunggu cache 10 menit GitHub Pages.
- Ekspor/impor ingatan & rencana ke satu file (berguna kalau pindah alamat/hosting atau ganti HP).
- APK berdiri sendiri (offline penuh dari `www`) atau pindah hosting — hanya kalau pemilik ingin lepas dari GitHub.
- "Hai Gaby" tanpa sentuh di Android (butuh layanan latar depan + notifikasi tetap; ditolak untuk sekarang).
- Aplikasi iPhone asli (butuh Apple Developer $99/tahun; belum perlu).
- PIN (pemilik belum menentukan).
