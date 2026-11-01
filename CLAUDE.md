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
| `js/pandu.js` | **Pandu**, perencana: agen Groq GPT-OSS 120B dengan alat (langkah, Rara, cuaca, jarak, laci, jadwal, simpan_rencana), `normalizePlan` |
| `js/vera.js` | **Vera**, pemeriksa: `checkFacts` (Rara), `checkImage` (Lukas, model penglihatan), `checkPlan` (Pandu: cek pasti + Qwen3) |
| `js/teamboard.js` | Papan kerja tim di bawah status (siapa bekerja, bar, langkah; ketuk untuk detail) |
| `js/groq.js` | Satu kunci Groq untuk Rara (GPT-OSS 120B + `browser_search`) & Lukas (Qwen3 32B → Llama 3.3 70B → …), pilih model pengganti dari daftar model Groq |
| `js/native.js` | Jembatan ke APK: notifikasi pengingat, alarm, cek update APK |
| `js/calendar.js`, `camera.js`, `gallery.js`, `imagegen.js`, `wake.js` | Kalender (.ics), kamera/layar, galeri, gambar (**Lukas** menulis prompt via Gemini teks, lalu Pollinations gratis / Google berbayar), "Hai Gaby" (tidak aktif di Android) |
| `sw.js` | Service worker: tetap bisa dibuka walau GitHub down |
| `android-app/` | Cangkang Android (Capacitor 6). Memuat Gaby dari GitHub Pages; plugin native sendiri: `GabyAlarmPlugin.java` |
| `.github/workflows/android-apk.yml` | Merakit APK otomatis & menerbitkannya di Releases `apk-terbaru` |

## Cara menjalankan & menguji
- Lokal: `python -m http.server 8000` lalu buka http://localhost:8000 (mikrofon boleh di localhost).
  Data di localhost terpisah dari github.io. Tekan Ctrl+Shift+R kalau service worker menyimpan salinan lama.
- Naikkan `VERSION` di `js/config.js` setiap rilis. Isi web terbit otomatis lewat GitHub Pages (±1 menit) setelah push ke `main`.
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
- Batas token per menit Groq (v1.18.1): `groqChat` mencatat pemakaian 60 dtk terakhir per model (usage asli / perkiraan
  ±3,5 huruf per token) + header `x-ratelimit-*` kalau terbaca, lalu MENUNGGU dulu kalau jatah belum cukup (`waitNeeded`, bawaan 8.000/menit,
  maks 60 dtk; papan kerja menulis "Menunggu jatah Groq per menit"). 429 per menit → tunggu `retry-after` lalu ulang.
  Pandu hemat token: maks 4 pencarian, alat ringkas (±900 token), hasil alat lama dipadatkan, minta panggil beberapa alat sekaligus,
  Rara di dalam Pandu memakai GPT-OSS **20B** (jatah terpisah dari Pandu 120B), Pandu pindah model untuk satu giliran kalau 120B harus
  menunggu > 8 dtk. Satu misi ±10–15 ribu token → wajar 1–3 menit. Awas: `/20b/` juga cocok dengan "120b" — pakai `/gpt-oss-20b/`.
- Kunci belum diisi (v1.18.2): prompt punya "STATUS TEMAN SAAT INI" (`friendStatus` di `persona.js`). Teman yang belum bisa →
  Gaby bilang santai sekali per obrolan ("Wah, Rara belum bisa dimintai tolong nih, kunci Groq-nya belum dimasukin…") lalu kerjakan
  sendiri sebisanya (Rara → pencarian cepat / pengetahuan sendiri tanpa mengarang angka; Lukas → draf Gaby; Vera → "belum dicek").
  Pandu wajib Groq: minta isi kunci + tawarkan garis besar sederhana buatan Gaby (tidak tersimpan, tidak bernomor).
- Papan kerja bisa ditutup (✕ / `tutup_kartu` jenis `papan` / "tutup semua"); teman tetap bekerja, papan muncul lagi saat ada pekerjaan
  baru. Pekerjaan yang macet > 6 menit dihapus dari papan.
- Uji: mikrofon tiruan Chromium berbunyi "bip" sehingga `vad.active` sering true; pakai `--use-file-for-fake-audio-capture=<wav hening>`.
- OpenRouter belum dipakai: model gratisnya tidak bisa browsing gratis (pencarian berbayar). Pertimbangkan kalau Groq berhenti gratis.
- Cerita update: `newsCue` di `app.js` sekali per versi saat dibuka biasa (tap/wake/open, bukan resume/pengingat), maks 4 item dari
  `WHATS_NEW` (`newsSince`: item pertama tiap versi yang terlewat pasti ikut, diceritakan urut dari versi lama ke baru); `memory.seenVersion` (pengguna baru langsung = VERSION, pengguna lama tanpa catatan = 1.14.0).
  **Setiap rilis: tambahkan entri di `js/whatsnew.js`** (bahasa santai, sudut pandang Gaby, item terpenting dulu;
  `quiet: true` untuk perbaikan kecil = hanya di Pengaturan, tidak diceritakan).
- Service worker network-first; respons error (404/500) tidak pernah disimpan, jatuh ke salinan terakhir.

## Rilis & infrastruktur
- Repo publik di GitHub; GitHub Pages dari cabang `main`. Cadangan: cabang `backup-v1.12.2`, `backup-v1.13.0`, `backup-v1.14.0`, `backup-v1.15.0`, `backup-v1.16.1`, `backup-v1.17.1` (versi stabil yang sudah diuji, 1 Nov 2026), `backup-v1.18.0`, `backup-v1.18.1`.
- APK: https://github.com/hendrikkumala/gaby/releases/download/apk-terbaru/Gaby.apk
  Ditandatangani dengan **kunci tetap** (GitHub Secrets `GABY_KEYSTORE` dan `GABY_KEYSTORE_PASSWORD`; alias `gaby`).
  Berkas cadangan kunci ada di pemilik, bukan di repo. Kalau hilang dan secret terhapus, pengguna harus uninstall (data APK hilang).
- Kartu update APK di aplikasi membandingkan nomor perakitan di nama rilis ("Gaby APK (perakitan #N)") dengan versionCode terpasang.
- Cabang `ci-check` sisa uji coba, boleh dihapus (belum bisa lewat sesi cloud).

## Status saat ini (v1.18.2, APK #6) — per 1 Nov 2026
**Sudah jalan & diuji pemilik:**
- Percakapan suara Gemini, persona & emosi (hologram), kamera/layar, gambar (gratis & galeri), lokasi/tempat/rute/peta,
  ingatan & profil, jurnal, briefing pagi, to-do + pengingat, musik, buka aplikasi + kontak.
- APK Android dengan kunci tetap & kartu update (update ke #6 lewat kartu berhasil).
- Pengingat berbunyi saat HP terkunci + `pasang_alarm` ke aplikasi Jam di Android (31 Okt 2026).
- `pasang_alarm` di iPhone (1 Nov 2026): ketuk kartu alarm → app Jam → pemilik menekan Simpan sendiri (iOS tidak mengizinkan otomatis).
- Lukas (v1.16, Groq Qwen3 di v1.17): gambar "lebih presisi sesuai permintaan", "aman banget, keren" (1 Nov 2026).
- Rara via Groq GPT-OSS 120B + browser_search (v1.17.0): jalan dan memberi kartu sumber berita (1 Nov 2026).
- Tanda 👍/👎 di Pengaturan → Ingatan sudah terlihat (v1.15, 1 Nov 2026).
  Catatan: kunci Gemini gratis pemilik **ditolak** Google Search grounding, jadi Rara bergantung pada kunci Groq.

**Belum dites langsung oleh pemilik:**
- v1.15: `buka_ingatan` (baru terasa kalau ingatan > 40) + aturan anti muter-muter.
- v1.16: cerita update sekali per versi, Pengaturan → ✨ Apa yang baru, "ulang dengan perubahan" untuk gambar.
- v1.17.1: kartu sumber tidak menumpuk lagi + "tutup beritanya" / "tutup semua" pakai suara (`tutup_kartu`).
- **v1.18.0 (baru terbit, belum dicoba di HP):** Pandu (rencana bernomor, kartu, arsip, bandingkan, hapus/batal, ke catatan &
  pengingat, kabar otomatis), Vera (cek Rara/Lukas/Pandu), papan kerja tim, kartu bernama + tutup per nama.
  Belum pasti di dunia nyata: model penglihatan Llama 4 masih ada di Groq? batas token per menit Groq saat Pandu bekerja panjang
  (Pandu menunggu & pindah model kalau kena batas); kualitas rencana GPT-OSS untuk harga Indonesia.
- Pencarian cepat (Google Search bawaan) saat semua jatah Rara habis.

Kalau pemilik melaporkan masalah: Pandu/rencana → `js/pandu.js`, `runPlanJob`/`announce` di `js/app.js`; Vera → `js/vera.js`; pengingat/alarm → `js/native.js`, `GabyAlarmPlugin.java`, `fireReminder`/`setAlarm` di `js/app.js`;
Rara → Pengaturan → Fitur → alasan di bawah "Pencarian internet (Rara)" + `js/research.js`, `js/groq.js`; Lukas → `js/imagegen.js`.

## Riwayat rilis (ringkas)
| Versi | Isi |
|---|---|
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
- "Hai Gaby" tanpa sentuh di Android (butuh layanan latar depan + notifikasi tetap; ditolak untuk sekarang).
- Aplikasi iPhone asli (butuh Apple Developer $99/tahun; belum perlu).
- PIN (pemilik belum menentukan).
