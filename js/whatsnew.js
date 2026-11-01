// Daftar "apa yang baru" per versi. Gaby menceritakannya SEKALI setelah update
// (lihat newsCue di app.js); daftar lengkap tampil di Pengaturan → ✨ Apa yang baru.
// Tulis dengan bahasa santai dari sudut pandang Gaby. Item pertama = paling penting.
// quiet: true = perbaikan kecil; hanya tampil di Pengaturan, tidak diceritakan Gaby.

export const WHATS_NEW = [
  {
    version: '1.17.1',
    quiet: true,
    items: [
      'Kartu sumber Rara sekarang langsung berganti (tidak menumpuk), dan bisa ditutup pakai suara: "tutup beritanya" atau "tutup semua"',
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

// Hal baru sejak versi `seen` (yang terbaru dulu), maksimal `max` item.
export function newsSince(seen, max = 3) {
  return WHATS_NEW.filter((v) => !v.quiet && cmpVersion(v.version, seen) > 0).flatMap((v) => v.items).slice(0, max);
}
