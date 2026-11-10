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
| `js/planexport.js` | Isi rencana per bagian (`planSections`) — satu sumber untuk Kartu Rencana, PDF, teks (`planText`) & bacaan Vera |
| `js/planpdf.js` | Kartu Rencana / Perbandingan → **PDF** (v1.25.1, `planPdf`/`comparePdf`): dibuat sendiri tanpa pustaka, A4 putih berhalaman, Helvetica WinAnsi (`toWin`: emoji & aksara non-Latin dibuang), jadwal per hari + tanggal, centang hijau = pilihan dipakai, tautan sumber bisa diketuk |
| `js/teamboard.js` | Papan kerja tim di bawah status (siapa bekerja, bar, langkah; ketuk untuk detail) |
| `js/openrouter.js` | Otak Pandu lewat OpenRouter (jatah per permintaan): pilih model gratis + tools (Nemotron Ultra 550B → Super 120B → …), hitung pemakaian harian, istirahat saat jatah/izin bermasalah |
| `js/groq.js` | Satu kunci Groq untuk Rara (GPT-OSS + `browser_search`), Lukas (Qwen3 32B → …), Vera (Qwen3 / Llama 4 penglihatan) & Pandu cadangan; penjaga token per menit (`waitNeeded`), pilih model pengganti dari daftar model Groq |
| `js/native.js` | Jembatan ke APK: notifikasi pengingat, alarm, cek update APK |
| `js/calendar.js`, `camera.js`, `gallery.js`, `imagegen.js`, `wake.js` | Kalender (.ics), kamera/layar, galeri, gambar (**Lukas** menulis prompt via Gemini teks, lalu Pollinations gratis / Google berbayar), "Hai Gaby" (tidak aktif di Android) |
| `js/office.js` | **Ruang Kerja** (🏢, v1.21): kantor 2.5D tim Gaby, dimuat saat dibuka (`import()`), berhenti total saat ditutup. Mesin dari prototipe + pengatur adegan dari kejadian asli |
| `js/office-art.js` | Gambar Ruang Kerja (karakter 2.5D, meja, denah) — gabungan prototipe/karakter.js + karakter25.js + meja.js + kantor.js |
| `js/officebus.js` | Jalur kabar kecil aplikasi → Ruang Kerja (`officeEmit`/`officeListen`, `officeState`) |
| `css/office.css` | Tampilan & gerakan Ruang Kerja (semua dibatasi `#office`) |
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
  (BUKAN Hapus data). Sejak v1.24.0 `sw.js` memakai `fetch(e.request, { cache: 'no-cache' })` (gagal → `fetch` biasa → salinan cache), jadi versi baru langsung masuk.
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
- **Pandu/Rara/Vera v1.25 (keluhan pemilik 10 Nov 2026: rencana Harbin 8 hari, jadwal berhenti di hari 3 & perbaikan tidak pernah selesai).**
  Penyebab: simpan_rencana harus menulis SELURUH rencana sekali jalan (batas panjang jawaban model), perbaikan = tulis ulang semua,
  `normalizePlan` memotong jadwal di 30 baris, Vera hanya membaca 6.000 huruf JSON, rencana lama di "lengkapi" dipotong 4.000 huruf,
  Rara kena batas per menit → tunggu ≤6 dtk lalu Groq ditandai habis **1 jam**. Perbaikan:
  **Draf** (`tulis_draf`, `mergeDraft`): kolom kosong = pertahankan, jadwal digabung PER HARI (`mergeSchedule`, `dayOf` dari vera.js);
  simpan_rencana menggabung draf; rencana turunan mulai dari draf = isi rencana lama (Pandu cukup menulis yang berubah).
  OpenRouter: `max_tokens` 16.000, timeout 300 dtk, tulis lengkap sekaligus (`MODE.openrouter`); batas per menit → tunggu 20/40/60 dtk.
  Groq: `MODE.groq` = tulis bertahap (a) transportasi+tempat+kuliner, (b) biaya+risiko+checklist+pengingat, (c) jadwal 2 hari per
  panggilan; argumen draf lama di riwayat diganti penanda (`shrinkDrafts`) supaya muat TPM. Terpotong (`finish_reason: length`) →
  `repairJson` menyelamatkan bagian utuh + "LANJUTKAN" (bukan "ringkas"). Hari yang belum ada → `scheduleGaps` → "lanjutkan hari X"
  dulu (tanpa Vera, tidak dihitung perbaikan; diulang SELAMA hari kosong berkurang, maks `MAX_FILL` 15); `maxFixes` = 2 untuk OpenRouter & Groq;
  `MAX_TURNS` 24; jadwal maks **150** baris & kuliner maks **30** (pertanyaan pemilik "12 hari bisa?": dulu 80/10 → 12 hari × 7 kegiatan = 84
  memotong check-out & pulang, kuliner hari 11–12 hilang). Uji 12 hari (7 kegiatan/hari) & 20/30 hari: lengkap di OpenRouter (lengkap/
  malas/terpotong) dan Groq saja (±13 menit tiruan untuk 12 hari, ±21 menit untuk 30 hari); PDF 12 hari = 5 halaman.
  Otak gagal → otak berikutnya MELANJUTKAN percakapan & draf yang sama (tidak ada lagi "salvage"/simpan seadanya); Groq 'day' tidak
  melompati model Groq lain (jatah per model). Semua otak gagal & sudah ada kerja → **titik simpan** `localStorage['gaby.panduResume']`
  (2 hari) + `PanduPaused` → papan "⏸️ Tertunda" (`job.pause`), Gaby mengabari, alat suara **`lanjutkan_rencana`** (`resumePlan` di
  app.js) meneruskan tanpa riset ulang; `panduStatus` & `friendStatus` menyebut pekerjaan tertunda.
  **Aturan sabar (keputusan pemilik):** `groqPatient` (groq.js) — batas per menit → tunggu sesuai `retry-after`/"try again in" (2–65 dtk)
  lalu ulang, **maks 3x; tidak pulih = dianggap jatah harian habis** (`error 'day'`, `stuck`). 429 tidak jelas = 'minute' (dulu 'hour').
  Rara: coba model GPT-OSS lain dulu, lalu tunggu; 'toolarge' → jatah jawaban 1.024 lalu model lain; habis harian dicatat sampai waktu
  "try again in" dari Groq atau besok 08:00 UTC (tidak ada lagi tanda "habis 1 jam" karena batas per menit). Gemini sama (3x `retryDelay`).
  Vera: `askVera` memakai `groqPatient`; `checkPlan(plan, fixes, { onWait, onPart })` membaca **teks ringkas utuh** (`planDigest`, jadwal per
  hari) dan kalau > 5.500 huruf dibagi bacaan (`digestParts`: isi utama + jadwal beberapa hari), catatan digabung; sebagian tak terjawab →
  catatan "Vera hanya sempat membaca N dari M bagian". Papan kerja: "☕ Menunggu jatah … (±N dtk)" → Ruang Kerja gelembung "☕ nunggu jatah"
  (kabar `job` kind `wait`, tanpa elemen baru; `js/office.js` kini sedikit beda dari `prototipe/v123/office.js`). Papan kerja menganggap
  macet hanya kalau DIAM > 6 menit (`job.active`), bukan 6 menit sejak mulai.
  Uji 10 Nov 2026 (Node 62/62 + Chromium 11/11, waktu tiruan; Groq tiruan dengan TPM nyata + 413; OpenRouter tiruan "lengkap/malas/terpotong"): Harbin 8 hari
  lengkap hari 1–8 + check-out + pulang di semua skenario (OpenRouter, OR malas, OR terpotong, Vera menolak → tambal biaya visa, Groq saja
  ±9 menit tiruan, OR habis → Groq lanjut, jeda → lanjutkan tanpa riset ulang), Rara 3x tidak pulih → habis harian, Rara 3 pencarian
  beruntun → menunggu lalu berhasil, Vera 3 bacaan; Chromium: buat_rencana → kartu, jeda → papan "Tertunda" → lanjutkan_rencana.
- Rencana v1.19: `jenis` (perjalanan/proyek/acara/belajar/kesehatan/belanja/lainnya) + bagian `transportasi` (nama maskapai/kereta,
  "cek ulang saat pesan"), `kuliner` (nama resto), `tujuan`, `fitur` (wajib/nanti), `alat`, `risiko`. Vera menolak perjalanan tanpa
  transportasi/kuliner bernama dan proyek tanpa tujuan/fitur. Pandu merencanakan proyek (misal bikin aplikasi), BUKAN membuatnya.
  Simpan ke HP: tombol 📄 Simpan PDF / 📤 Kirim teks di Kartu Rencana & Perbandingan, alat `simpan_rencana_hp` (bentuk `pdf`/`teks`).
  **v1.25.1: gambar PNG panjang (buram di galeri/WA) DIGANTI PDF** (keputusan pemilik 10 Nov 2026: ganti total, kertas putih; rencana
  tidak lagi masuk Galeri Gaby; `renderImage` dihapus). Teks > 3.000 huruf → catatan untuk Gaby: sarankan PDF kalau WhatsApp memotong.
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
- Repo publik di GitHub; GitHub Pages dari cabang `main`. Cadangan: cabang `backup-v1.24.0` (= versi sebelum v1.25.0, 10 Nov 2026), `backup-v1.12.2`, `backup-v1.13.0`, `backup-v1.14.0`, `backup-v1.15.0`, `backup-v1.16.1`, `backup-v1.17.1` (versi stabil yang sudah diuji, 1 Nov 2026), `backup-v1.18.0`, `backup-v1.18.1`, `backup-v1.18.2`, `backup-v1.19.0`, `backup-v1.19.1` (= versi sebelum v1.20.0, 3 Nov 2026).
- APK: https://github.com/hendrikkumala/gaby/releases/download/apk-terbaru/Gaby.apk
  Ditandatangani dengan **kunci tetap** (GitHub Secrets `GABY_KEYSTORE` dan `GABY_KEYSTORE_PASSWORD`; alias `gaby`).
  Berkas cadangan kunci ada di pemilik, bukan di repo. Kalau hilang dan secret terhapus, pengguna harus uninstall (data APK hilang).
- Kartu update APK di aplikasi membandingkan nomor perakitan di nama rilis ("Gaby APK (perakitan #N)") dengan versionCode terpasang.
- Cabang `ci-check` sisa uji coba, boleh dihapus (belum bisa lewat sesi cloud).

## Status saat ini — per 10 Nov 2026
**v1.25.1 TERBIT 10 Nov 2026** (pemilik "terbitkan"; cabang `claude/inspiring-hawking-ioxiae` digabung fast-forward ke `main`):
v1.25.0 (Pandu menyelesaikan rencana panjang 8–30 hari, Rara/Vera sabar menunggu jatah, titik simpan + "lanjutkan rencananya") + v1.25.1
(PDF). Belum dicoba pemilik di HP. Versi sebelumnya: v1.24.0 (cadangan `backup-v1.24.0`). **APK tidak perlu dirakit ulang** untuk v1.25.x (semua perubahan di file web;
PDF memakai plugin Share & Filesystem yang sudah ada sejak APK #7). WebKit tidak tersedia di sesi cloud → iPhone Safari belum diuji
otomatis (hanya Chromium dengan emulasi iPhone 15 Pro / Pixel 7: muat aplikasi, Pengaturan, prompt Gaby, alat baru — 10/10).

## Status sebelumnya — per 3 Nov 2026
**v1.24.0 (cadangan data + update langsung) sudah di-commit lokal 4 Nov 2026, menunggu pemilik push.** **Yang terbit (cabang `main` / GitHub Pages): v1.23.0 · APK #7** (android-app 1.0.4, plugin Share & Filesystem; APK tidak berubah sejak v1.19).
Run Pages `1ddf6e2` sukses & `config.js` live = 1.21.5. Uji otomatis 3 Nov 2026 (Edge + tiruan): Ruang Kerja 30/30, alur Pandu/Vera lulus,
HP (CPU 4×) ±53 FPS. ✅ **Pemilik menguji v1.21.5 di iPhone 17 Pro dan Android (Oppo Find N5, APK): berjalan baik, tidak restart lagi.**

**v1.21.0 — 🏢 Ruang Kerja di aplikasi (beta) TERBIT 3 Nov 2026** (run Pages `178d58c` sukses, `config.js` live = 1.21.0) — lihat "Proyek berjalan" di bawah.
Angka FPS Ruang Kerja disembunyikan atas permintaan pemilik (v1.21.1); tampilkan dengan menambah `?fps` di alamat untuk pengujian.
**iPhone menutup paksa halaman** ("A problem repeatedly occurred on …/gaby/", 3 Nov 2026, saat didiamkan) — dugaan: memori penuh oleh
foto-foto besar "mode ringan" (dinyalakan otomatis di HP) di layar 3×. v1.21.2: mode ringan TIDAK dipakai di iPhone/Safari
(`IS_WEBKIT_SAFARI`), foto lebih kecil (`sc` 1,25) di Android, versi karakter dibuat saat pertama dibutuhkan (`Actor.make`).
Tidak cukup → akhirnya diselesaikan dengan mode hemat v1.21.5 (lihat di bawah).
v1.21.3: iPhone (masih v1.21.0 karena cache) crash lagi saat mengetuk kanvas Lukas (galeri dibuka di atas kantor) → selama
layar penuh (`#memories`, `#viewer`, `#settings`, `#gate`) terbuka, Ruang Kerja dijeda (`.office.paused`: SVG disembunyikan,
animasi CSS berhenti, `tick` tidak menggambar).
**v1.21.4 — kamera "lembaran" (pemilik: Oppo Find N5 berkedip & lag saat layar digeser):** dulu kamera mengubah `viewBox` tiap
gambar (seluruh ±3.000 elemen digambar ulang) + "mode ringan" foto yang dicetak ulang tiap ganti skala (berkedip). Sekarang
`#of-scene` berukuran kantor × skala zoom dan DIGESER dengan `transform: translate3d()` (GPU); cetak ulang hanya sekali setelah zoom
selesai (`applyCam`, `printS`); sisi cetakan dibatasi `MAXPX` 4096 px asli (zoom minimum `minW`); seret jari langsung (tanpa
jeda). Mode ringan TIDAK dipakai lagi (`setLight` tersisa tapi tidak dipanggil). Emulasi HP CPU 4×: digeser 9 → ±35–49 FPS,
diam 18 → ±30–45 FPS. `toScreen()` dipakai untuk posisi layar (bukan `getScreenCTM`).
**v1.21.5 — MODE HEMAT** (pemilik: Oppo Find N5 sudah mulus di v1.21.4, tapi iPhone 17 Pro v1.21.4 TETAP restart/"A problem
repeatedly occurred"). Tidak bisa ditiru: WebKit Playwright (Windows) 3 menit tanpa tumbang & tanpa kebocoran (elemen/animasi stabil)
→ dugaan batas memori/GPU khas iOS. `LITE` (iPhone/iPad/Safari, atau `localStorage['gaby.officeLite']='1'`): kelas `#office.lite`
(tanpa animasi variabel CSS `--al/--ar/--ll/--lr`, gerak sederhana), cetakan `PRINT_RES` 0,6 (memori gambar ±1/3), `MAXPX` 2048,
maks 3 teman beraktivitas bersamaan. **Pendeteksi tumbang** (app.js): `sessionStorage['gaby.officeOpen']` diisi saat Ruang Kerja dibuka,
dihapus saat ditutup / `pagehide`; kalau masih ada saat aplikasi dimuat (halaman restart saat Ruang Kerja terbuka) → mode hemat
permanen + notifikasi. ✅ **Dikonfirmasi pemilik (3 Nov 2026): iPhone 17 Pro & Android (Oppo Find N5, APK) v1.21.5 berjalan baik, tidak restart lagi.** Belum ada tombol untuk kembali dari mode hemat (ide: Pengaturan "Ruang Kerja: Otomatis / Lengkap / Hemat").
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
**Push to talk = tombol nyala/mati** (keputusan pemilik): ON → Gaby (lari balik kalau sedang jalan-jalan) mengambil mic & mendengarkan,
waktu bebas berhenti; OFF → mic ditaruh di meja, Gaby **ngulet** (pose `ngulet`: tangan & kaki diregangkan), lalu **WAKTU BEBAS**
untuk semua (Gaby ikut jalan-jalan). Selesai ngobrol BUKAN tidur ("takutnya tidur semua off"). Di aplikasi: fase `sleep` Gaby
(tidak mendengarkan) = waktu bebas di kantor; "Malam" (Gaby tidur) hanya opsional.
**Mode kantor mengikuti mic** (tombol "Waktu bebas" dihapus): mic OFF = bebas (bobot `s`: pantry, game, tidur di bean bag, gosip…),
mic ON = **standby** (`setBebas(false)`: yang jauh kembali ke ruangannya; masih boleh jalan-jalan & aktivitas ringan, bobot `w`;
`w: 0` untuk tidur/microwave/gosip). Awal = bebas. **Barang khas ditaruh di meja saat keluar ruangan** (`go()` → `putDown`, versi
karakter `-free` tanpa barang, `DESK_ITEM` per teman) dan diambil lagi saat sampai di meja (`pickUp` di `step`). Gaby: mic (`gabyMic`).

**v1.21.0 — Ruang Kerja di aplikasi (pemilik bilang "gas", 3 Nov 2026):** tombol 🏢 (`.corner-office`, sebelah galeri) →
`#office` (z-index 7: di bawah kartu 9 / notifikasi 20 / pengaturan 30; papan kerja disembunyikan, bola hologram dijeda
`visual.paused`). Kabar dari aplikasi lewat `officebus.js`: `render()` → 'gaby' (status), `onUserText/onGabyText/onTurnComplete/
onInterrupted` → 'say' (gelembung ucapan ASLI di atas Gaby & "Kamu: …"), `onToolCall` → 'tool'/'toolDone' (`ingat` → Meri menyimpan
ke laci kategori; `buka_ingatan` → Meri mengambil map; alat lain → Gaby mengetik di hologram), `teamboard.js` → 'job'
(start/pass/progress/end). Pengatur adegan (`onJob`/`jobStep`): tugas → catatan tempel dari Gaby, teman lari ke tempat kerja
(Rara bola bumi, Pandu papan peta, Lukas kanvas); pass ke Vera → map diantar, Vera memeriksa; pass dari Vera → **ditunda 600 ms**:
kalau pekerjaan langsung selesai = disetujui (✅), kalau tidak = ditolak (⚠️, map kembali); end → pesawat kertas ke layar Gaby.
Rantai kejadian per pekerjaan berurutan; animasi kerja TIDAK ditunggu; kalau tertinggal (`pending > 1` / sudah selesai) jalan kaki
dilompati (teleport) supaya tidak terlambat dari kartu. Peserta pekerjaan dicatat (`parts`) agar semua dilepas. Mic: status
connecting/listening/thinking/speaking = mic ON (standby), sleep = waktu bebas (ngulet). Tombol bawah "🎤 Bicara / 🔇 Selesai bicara"
& layar hologram = `officePtt()` (sama dengan mengetuk bola). Benda diketuk: papan Pandu → `showPlanList`, kanvas Lukas → galeri,
laci Meri → daftar ingatan, bola bumi Rara → kartu berita terakhir (`lastSources`). Kartu yang muncul saat Ruang Kerja terbuka
diberi "bayangan" yang terbang dari layar hologram (`MutationObserver` pada kartu). Saat dibuka: `syncAll()` menyamakan mic &
pekerjaan yang sedang berjalan. Di HP (pointer: coarse) mode ringan langsung menyala. Uji: 28/28 (Gemini/OpenRouter/Groq tiruan,
skrip di folder sementara) + uji v1.20 tetap lulus. Kinerja emulasi HP layar tajam + CPU 4× lebih lambat: ±20–31 FPS (beban utama:
karakter bergerak). FPS di HP asli BELUM diukur (angka FPS tampil kecil di kanan atas Ruang Kerja).
Ide berikutnya (belum disetujui): optimasi kalau HP asli berat; ucapan panjang Gaby lebih dari satu baris; "Malam" otomatis.

**v1.22 — animasi penuh Pandu/Vera/Lukas (pemilik bilang "gas", 3 Nov 2026), SYARAT PEMILIK: iPhone jangan sampai restart lagi.**
Cara kerja yang disepakati: cadangan `backup-v1.21.5` (lokal, belum di-push) → prototipe dulu → terbit **satu teman per rilis**
(Pandu → Vera → Lukas terakhir, karena gambar asli paling berat) → pemilik tes di iPhone tiap rilis. Aturan hemat: elemen dibuat
SEKALI & dipakai ulang (jumlah tetap), mode hemat (`LITE`) lebih sederhana, uji tahan lama WebKit ≥ 5 menit, pendeteksi tumbang
→ kembali ke perilaku v1.21.5 + tombol nyala/mati di Pengaturan (belum dibuat).
**Prototipe `prototipe/v122/`** (https://hendrikkumala.github.io/gaby/prototipe/v122/): `office.js` = SALINAN `js/office.js`
(impor `../../js/…`) + tambahan; `index.html` = kantor + panel 🧪 Uji (alur lengkap, alur + Vera menolak, 3/5/8 langkah, 🔁 uji tahan
lama yang mengulang terus + angka elemen + pencatat restart `proto122.crash`). Mode hemat prototipe memakai kunci `proto122.lite`
(bukan `gaby.officeLite`, supaya aplikasi asli di alamat yang sama tidak ikut berubah).
- **Pandu — TERBIT DI APLIKASI sebagai v1.22.0 (live):** papan rute = peta bersih + maks 8 paku bernomor + 7 benang (`routeG`, dibuat sekali di `R.pandu.fx0`).
  Kabar BARU `job` `steps` {list} & `step` {i, text} (Vera tidak jadi paku: `/^Vera\b/`). Pandu lari ke paku langkah ke-i, menancapkan
  (pose `reaching`), benang ditarik (`pullString`), gelembung "📍 <langkah>"; minta Rara = pesawat kertas; selesai → paku hijau satu per
  satu + 🏁, rute tetap di papan sampai rencana berikutnya. `route` dicatat walau Ruang Kerja tertutup (`routeEvent`), digambar di `syncAll`.
  `teamboard.js` mengirim `steps` (saat `startJob` dengan langkah & `setSteps`) dan `step` {i, text} (di `step(i, msg)`). Pandu sering
  mengirim langkah yang SAMA berkali-kali → `route.pinned`: hanya gelembung diganti, benang tidak ditarik ulang.
  `js/office.js` v1.22.0 = prototipe dengan impor `./…` & kunci `gaby.officeLite` (dibuat dengan sed dari `prototipe/v122/office.js`).
  Uji: Edge 13/14 (yang "gagal" = elemen +63 karena versi karakter dibuat sekali), Edge HP 8 menit/10 putaran elemen datar ±3.460 &
  heap ±4 MB, WebKit UA iPhone (lite) 5 menit/6 putaran tanpa tumbang/error. ✅ Pemilik menonton prototipe (4 Nov 2026): "smooth, gak restart", lalu "gas".
  Uji v1.22.0 di aplikasi: Ruang Kerja 33/33 (+ paku dari langkah asli OpenRouter tiruan, hijau setelah selesai), alur Pandu/Vera 15/16
  (yang gagal = tes lama mengharap versi 1.21.0), WebKit iPhone 3 menit tanpa tumbang ("Gaby tersambung" gagal = WebKit tanpa mic tiruan,
  sudah begitu sebelumnya), Ruang Kerja ditutup saat Pandu bekerja lalu dibuka → papan langsung sesuai. Berikutnya: prototipe **Vera**.
- **Rara menghadap bola bumi (keluhan pemilik 4 Nov 2026: "kerjanya membelakangi bola dunia"):** dulu `RARA_KERJA` = kursi `raraK`
  (7,3 ; 5,4) + `faceFront` → bola di punggungnya. Prototipe: berdiri di (7,4 ; 3,3) di kanan bola, `view: 'back', face: -1` → bola &
  layar tetap terlihat. Ikut terbit di v1.22.0.
- **Bug kecil di `js/office.js` (v1.21.x):** `SHOW_FPS = /[?&]fps<BACKSPACE>/` (karakter \x08 dari skrip patch lama) → `?fps` tidak
  pernah jalan. Diperbaiki di v1.22.0. Awas saat menulis `\b` lewat skrip Python (pakai r'…').

**v1.23 — TERBIT sebagai v1.23.0 (4 Nov 2026, pemilik "gas" setelah uji iPhone + Safari OK; live). `js/office.js` = `prototipe/v123/office.js` lewat sed (impor `./…`, kunci `gaby.officeLite`); CSS duduk sudah di `css/office.css`. Uji app: office22 33/33, browser 16/16, webkit hanya gagal lama (tanpa mic tiruan). Prototipe: `prototipe/v123/`** = salinan `js/office.js` v1.22.0 (impor `../../js/…`, kunci
`proto123.lite`) + tambahan di bawah; panel 🧪 Uji: rencana/berita/gambar × lolos/ditolak, 🔁 uji tahan lama semua jenis. CSS duduk
(salinan di `<style>` `prototipe/v123/index.html`, resmi di `css/office.css`).
- **Vera — meja periksa:** kertas sesuai pemilik pekerjaan (`docKind`: pandu = daftar centang 4 baris, rara = koran, lukas = foto
  berbingkai), elemen dibuat SEKALI (`veraDocs`, 4 `veraMarks`, `roundTag`). `startInspect(j)`: centang muncul satu per satu (baris
  terakhir menunggu hasil asli), lalu Vera bergumam (`DOC_THINK`). `stamp(ok, j)`: ✓ semua / ✗ di baris terakhir + stempel
  "RENCANA/FAKTA/GAMBAR LOLOS" atau "PERBAIKI". Ditolak → gelembung **alasan ASLI** (`reasonOf`): dari teks kabar `pass`/`step`
  "Memperbaiki (ke-N): …" (Pandu: `onFix` → `pass`; Lukas: `step(iFix, 'Memperbaiki: <missing>')`); Rara ("Vera minta cek ulang…") →
  "sumbernya kurang kuat". `j.veraRounds` dihitung tiap `pass` ke Vera → label "Putaran N" (≥ 2), lolos setelahnya → "Sekarang sudah
  beres!". Tempat pengantar `vera.drop` dipindah ke (7,4 ; 3,7) di samping kanan meja (dulu di depan meja, menutupi kertas).
- **DUDUK di kursi (keluhan pemilik 4 Nov 2026: "tidak ada yang benar-benar duduk, semua berdiri di kursi"):** dulu z tempat duduk
  0,2–0,35 dengan kaki lurus. Sekarang angka z di `NAV…spots` = TINGGI DUDUKAN (pantry 0,6, kursi baca Rara 0,75, sofa 0,6, bean bag
  0,45 `deep`), kursi meja `SEAT_TOP` (Gaby 0,75, Vera 0,9); `sitZ(top, back)` = top − `HIP` 0,6 − `SIT_DROP` 0,35 (pinggul di tepi
  depan dudukan; membelakangi kamera / bean bag: tanpa SIT_DROP). `Actor.place()` memberi kelas `.sit` (kaki `scaleY(.5)` dari
  pinggul, bayangan kaki disembunyikan) dan `.sit-back` (duduk membelakangi: kaki disembunyikan). Tanpa elemen baru.
  Uji: Edge 20/20 (Vera semua jenis + duduk), WebKit UA iPhone (lite) 6 menit/13 putaran tanpa tumbang, elemen datar ±3.500.
- **Lukas — kanvas bertahap (pemilik 4 Nov 2026: "sekalian Lukas biar nanti sekalian" → v1.23 memuat Vera + duduk + Lukas):** `easel` (state: job,
  stage −1…5, gal) + `easelG` (overlay di `R.lukas.fx0`, di BAWAH karakter; sempat di `overG` → menutupi kepala Lukas, ketahuan di iPhone) dengan 7 bagian dibuat SEKALI (`eP`: cover,
  sketch, sky, hill, sun, detail, glow) + 3 bingkai kecil di dinding (`eFrames`, di `R.lukas.fx0`). `easelEvent(d)` dicatat SELALU (juga
  saat tertutup, hanya angka); `setStage(n)` menampilkan bagian bila `n >= EASEL_MIN[k]` (fade `opacity` inline, dimatikan di LITE).
  Alur: start → kanvas kosong (0); langkah "menggambar" → `easelLoop` naik 1 tahap/2,3 dtk sampai 4 (detail); `Memperbaiki: …` → turun
  ke 3 + Lukas "🖌️ alasan"; end ok → 5 (bingkai emas + 3 kilau) + bingkai dinding +1 (maks 3); gagal → −1 (lukisan lama). Gambar ASLI
  sengaja TIDAK dimuat (risiko memori iPhone); ini lukisan hiasan.

## Riwayat rilis (ringkas)
| Versi | Isi |
|---|---|
| 1.25.1 | 📄 Kartu Rencana/Perbandingan disimpan sebagai PDF (A4 putih, berhalaman, jadwal per hari bertanggal, tajam & bisa dicari, utuh di WhatsApp sebagai dokumen) menggantikan gambar PNG panjang. Uji Chromium 15/15 (unduhan laptop, tombol dari suara, saran PDF untuk teks panjang, perbandingan, APK tiruan menulis .pdf ke menu Bagikan) |
| 1.25.0 | Pandu menyelesaikan rencana panjang (draf bertahap, lanjut kalau terpotong, isi hari yang kurang, perbaikan sebagian, jadwal maks 150 & kuliner 30 — cukup 12–30 hari, OpenRouter 16.000 token); Rara & Vera menunggu jatah Groq pulih (maks 3x → habis harian); Vera membaca rencana utuh bertahap; titik simpan 2 hari + "lanjutkan rencananya" (`lanjutkan_rencana`) |
| 1.24.0 | 💾 Cadangan data: Pengaturan → Tentang kamu → Simpan cadangan / Pulihkan dari file (`memory.exportData/checkBackup/importData`; file `gaby-cadangan-YYYY-MM-DD.json` berisi nama, ingatan, harian, to-do, pengingat, rencana; TANPA API key/pengaturan/riwayat/galeri; pulihkan = GANTI semua setelah konfirmasi, data lama disimpan di `gaby.sebelumPulih`, lalu muat ulang; APK lewat `nativeShareFile`, HP browser lewat `navigator.share`, laptop lewat unduhan). `sw.js` `cache: 'no-cache'` → update langsung masuk. Uji: test-backup 17/17, offline Edge+WebKit OK |
| 1.23.0 | Ruang Kerja: karakter benar-benar duduk di kursi (meja, pantry, sofa, bean bag); meja periksa Vera (kertas sesuai pekerjaan, alasan penolakan asli, "Putaran N"); Lukas melukis bertahap di kanvas (sketsa → warna → detail → bingkai emas + bingkai dinding), gambar asli sengaja tidak dimuat |
| 1.22.0 | Ruang Kerja: papan rute Pandu (paku + benang mengikuti langkah asli, hijau setelah lolos Vera), pesawat kertas Pandu → Rara, Rara bekerja menghadap bola bumi, `?fps` diperbaiki |
| 1.21.0 | 🏢 Ruang Kerja (beta): kantor 2.5D tim Gaby yang bergerak sesuai pekerjaan & ucapan asli, mic ON = standby / OFF = waktu bebas, kartu keluar dari hologram, benda bisa diketuk |
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
- ~~Pengaturan mode Ruang Kerja (Otomatis/Lengkap/Hemat)~~ DITOLAK pemilik 4 Nov 2026: kalau pengguna gonta-ganti, iPhone bisa restart lagi. Mode tetap otomatis saja.
- ~~Gambar asli di kanvas Lukas~~ DITOLAK pemilik 4 Nov 2026 (risiko memori iPhone).
- APK berdiri sendiri (offline penuh dari `www`) atau pindah hosting — hanya kalau pemilik ingin lepas dari GitHub.
- "Hai Gaby" tanpa sentuh di Android (butuh layanan latar depan + notifikasi tetap; ditolak untuk sekarang).
- Aplikasi iPhone asli (butuh Apple Developer $99/tahun; belum perlu).
- PIN (pemilik belum menentukan).
