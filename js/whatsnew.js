// Daftar "apa yang baru" per versi. Gaby menceritakannya SEKALI setelah update
// (lihat newsCue di app.js); daftar lengkap tampil di Pengaturan → ✨ Apa yang baru.
// Tulis dengan bahasa santai dari sudut pandang Gaby. Item pertama = paling penting.
// quiet: true = perbaikan kecil; hanya tampil di Pengaturan, tidak diceritakan Gaby.

export const WHATS_NEW = [
  {
    version: '1.26.0',
    items: [
      'Di HP Android, kamu sekarang bisa memotong aku waktu aku lagi ngomong. Aku belajar membedakan gema suaraku sendiri dari suaramu, jadi makin sering ngobrol makin pas',
      'Ada tombol peta 🗺️ di layar utama, di sebelah kamera, buat langsung buka daftar rencana dari Pandu',
      'Pandu sekarang benar-benar memperbaiki catatan Vera. Dulu kadang dia cuma ganti judul, jadi Vera komentarnya itu-itu terus. Sekarang kalau isinya belum berubah, Pandu langsung ditegur buat beresin dulu',
      'Kalau Pandu lupa menulis jadwal pulang atau check-out hotel, sekarang ditambahkan otomatis, jadi rencana perjalanan nggak berhenti di tengah hari terakhir lagi',
    ],
  },
  {
    version: '1.25.2',
    items: [
      'Meteran Pandu nggak hilang lagi waktu dia kerja lama, misalnya kalau HP-nya kamu tinggal ke aplikasi lain. Tanya aja "Pandu udah sampai mana?", aku cek beneran dan meterannya muncul lagi',
    ],
  },
  {
    version: '1.25.1',
    items: [
      'Kartu rencana sekarang disimpan sebagai PDF, bukan gambar panjang yang buram. Rapi per halaman A4, jadwalnya dikelompokkan per hari, tulisannya tajam walau di-zoom, dan bisa dikirim utuh ke WhatsApp sebagai dokumen',
    ],
  },
  {
    version: '1.25.0',
    items: [
      'Pandu sekarang menyelesaikan rencana panjang sampai hari terakhir, misalnya liburan 8 hari. Kalau tulisannya kepanjangan, dia lanjut menulis per hari, bukan mengulang dari awal',
      'Rara dan Vera sekarang sabar: kalau jatah AI per menitnya habis, mereka nunggu sebentar sampai pulih, nggak langsung nyerah. Vera juga membaca rencana panjang sampai habis, bagian per bagian',
      'Kalau jatah AI habis di tengah jalan, kerjaan Pandu disimpan dulu di HP selama 2 hari. Tinggal bilang "lanjutkan rencananya" kalau jatahnya sudah pulih',
    ],
  },
  {
    version: '1.24.0',
    items: [
      'Sekarang kamu bisa menyimpan cadangan ingatan, catatan, pengingat, dan rencana kita ke satu file, lalu memulihkannya di HP lain. Ada di Pengaturan, bagian Tentang kamu. API key nggak ikut tersimpan, jadi aman',
      'Update Gaby sekarang langsung masuk begitu terbit, nggak perlu nunggu lama lagi',
    ],
  },
  {
    version: '1.23.0',
    items: [
      'Di Ruang Kerja, kami sekarang benar-benar duduk di kursi, nggak berdiri di atasnya lagi. Di meja, kursi pantry, sofa, sampai bean bag',
      'Vera memeriksa kertas sesuai jenis kerjaannya: daftar centang untuk rencana Pandu, koran untuk berita Rara, foto berbingkai untuk gambar Lukas. Kalau ditolak, dia menyebut alasannya, dan kalau cek ulang muncul "Putaran 2"',
      'Lukas melukis di kanvas sampai jadi pelan-pelan: sketsa, warna, detail, lalu dibingkai emas dan dipajang kecil di dinding',
    ],
  },
  {
    version: '1.22.0',
    items: [
      'Di Ruang Kerja, Pandu sekarang menancapkan paku di papan petanya untuk tiap langkah rencanamu, lalu menarik benang merah sampai rutenya jadi. Kalau rencananya lolos Vera, semuanya jadi hijau',
      'Pandu juga menerbangkan pesawat kertas ke Rara kalau butuh dicarikan info',
      'Rara sekarang kerja menghadap bola buminya, nggak membelakangi lagi',
    ],
  },
  {
    version: '1.21.5',
    quiet: true,
    items: ['Ruang Kerja memakai mode hemat di iPhone supaya tidak berhenti mendadak'],
  },
  {
    version: '1.21.4',
    quiet: true,
    items: ['Ruang Kerja jauh lebih lancar saat digeser, tidak berkedip lagi'],
  },
  {
    version: '1.21.3',
    quiet: true,
    items: ['Ruang Kerja berhenti sejenak saat galeri, ingatan, atau pengaturan dibuka, supaya HP tidak berat'],
  },
  {
    version: '1.21.2',
    quiet: true,
    items: ['Ruang Kerja lebih hemat memori, terutama di iPhone'],
  },
  {
    version: '1.21.1',
    quiet: true,
    items: ['Perbaikan kecil di Ruang Kerja: angka FPS tidak ditampilkan lagi'],
  },
  {
    version: '1.21.0',
    items: [
      'Sekarang ada Ruang Kerja! Ketuk tombol gedung 🏢 di bawah, kamu bisa lihat aku dan teman-teman di kantor kartun: Rara mencari di hologram bumi, Pandu menancapkan pin di peta, Lukas melukis, Vera mengecap ✅, Meri membuka laci ingatan. Semuanya bergerak sesuai pekerjaan sungguhan',
      'Di Ruang Kerja, ketuk layar PUSH TO TALK di atas mejaku untuk ngobrol. Kata-kataku muncul di gelembung di atas kepalaku. Kalau kamu selesai bicara, kami semua dapat waktu bebas: ngopi di pantry, main ping-pong, sampai joget',
      'Benda di kantor bisa diketuk: papan peta Pandu membuka daftar rencana, kanvas Lukas membuka galeri, laci Meri membuka ingatan, bola bumi Rara membuka berita terakhir',
    ],
  },
  {
    version: '1.20.0',
    items: [
      'Pandu dan Vera makin kompak: kalau Vera menemukan kekurangan, Pandu memperbaiki rencananya sampai dua kali sebelum diserahkan. Kalau masih ada catatan, aku tawarkan "mau aku minta Pandu lengkapi?", jadi rencana lamanya tetap ada untuk dibandingkan',
      'Vera lebih teliti untuk rencana perjalanan: jadwalnya harus ada setiap hari sampai hari terakhir, lengkap dengan check-out hotel dan perjalanan pulang',
    ],
  },
  {
    version: '1.19.1',
    quiet: true,
    items: ['Perbaikan bug kecil: tampilan kamera tidak lagi terpotong, riwayat versi bisa dilipat'],
  },
  {
    version: '1.19.0',
    items: [
      'Pandu makin rinci dan irit: rencana perjalanan lengkap dengan pilihan hemat, seimbang, atau nyaman untuk maskapai dan hotel, plus rekomendasi tempat makan. Pandu juga bisa berpikir lewat otak Nemotron gratis dari OpenRouter supaya tidak cepat kehabisan jatah',
      'Pandu bisa merencanakan banyak hal, bukan cuma liburan: bikin aplikasi atau usaha, acara, belajar, olahraga, sampai bandingkan barang',
      'Kartu rencana bisa disimpan ke HP sebagai gambar rapi atau dikirim sebagai teks ke WhatsApp; bilang "simpan rencana 1 ke HP"',
    ],
  },
  {
    version: '1.18.2',
    quiet: true,
    items: ['Kalau ada teman yang belum bisa membantu karena kuncinya belum diisi, aku kasih tahu dan kerjakan sendiri sebisaku'],
  },
  {
    version: '1.18.1',
    quiet: true,
    items: ['Perbaikan bug kecil'],
  },
  {
    version: '1.18.0',
    items: [
      'Teman baru, Pandu si perencana: bilang "rencanakan liburan ke Bali 3 hari, budget 5 juta", nanti dia susun rencana bernomor lengkap dengan biaya, hotel, dan jadwal. Rencananya tersimpan, bisa dibuka lagi, dibandingkan, atau dihapus',
      'Teman baru, Vera si pemeriksa: dia mengecek fakta dari Rara, gambar Lukas, dan rencana Pandu sebelum aku sampaikan, jadi makin bisa dipercaya',
      'Sekarang ada papan kerja di atas layar supaya kamu tahu siapa yang lagi bekerja, dan tiap kartu punya nama, jadi tinggal bilang "tutup kartu berita" atau "tutup semua kartu"',
    ],
  },
  {
    version: '1.17.1',
    quiet: true,
    items: [
      'Perbaikan bug kecil',
    ],
  },
  {
    version: '1.17.0',
    items: [
      'Rara dan Lukas sekarang bisa pakai kunci Groq gratis, jadi makin cepat dan semangat kerja! Rara langsung browsing internet sendiri, Lukas makin kilat nulis perintah gambar. Isi kuncinya di Pengaturan, bagian Otak Gaby',
    ],
  },
  {
    version: '1.16.0',
    items: [
      'Aku punya teman Rara yang jago riset internet: berita, harga, skor dicek teliti dan sumbernya tampil di layar, jadi aku nggak asal nebak lagi',
      'Teman pelukisku Lukas sekarang menulis perintah gambar dengan rinci, jadi gambarnya lebih sesuai permintaan; bisa juga "ulang, tapi kucingnya pakai topi"',
      'Teman pencatatku Meri menyimpan ingatanku di 18 laci rapi (makanan, olahraga, musik, film, kesehatan, dll.) lengkap dengan tanda suka dan tidak suka',
    ],
  },
  {
    version: '1.15.0',
    items: [
      'Ingatanku sekarang disimpan per laci dengan tanda suka 👍 dan tidak suka 👎',
      'Aku lebih nyambung dan tidak muter-muter di topik yang sama',
    ],
  },
  {
    version: '1.14.0',
    items: [
      'Pengingat tetap berbunyi walau HP terkunci',
      'Aku bisa pasang alarm bangun di aplikasi Jam',
    ],
  },
];

// Bandingkan versi "1.16.0" vs "1.15.2": positif kalau a lebih baru.
export function cmpVersion(a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

// Hal baru sejak versi `seen`, maksimal `max` item, diurutkan dari versi LAMA ke BARU supaya
// ceritanya runtut (kenalan dengan Rara dulu, baru "Rara bisa pakai Groq").
// Hal terpenting (item pertama) tiap versi selalu ikut; sisa tempat diisi item lain.
export function newsSince(seen, max = 4) {
  const versions = WHATS_NEW.filter((v) => !v.quiet && cmpVersion(v.version, seen) > 0); // terbaru dulu
  const picked = new Map(versions.map((v) => [v.version, []]));
  let room = max;
  for (const v of versions) if (room > 0 && v.items.length) { picked.get(v.version).push(v.items[0]); room--; }
  for (const v of versions) for (const it of v.items.slice(1)) if (room > 0) { picked.get(v.version).push(it); room--; }
  return versions.slice().reverse().flatMap((v) => picked.get(v.version));
}
