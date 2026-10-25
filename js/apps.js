// Daftar aplikasi yang bisa dibuka Gaby. Di HP, tombol memakai tautan khusus supaya
// yang terbuka aplikasinya (kalau terpasang), atau versi web kalau tidak ada.

const q = encodeURIComponent;

export const APPS = {
  whatsapp: { name: 'WhatsApp', pkg: 'com.whatsapp', home: 'https://wa.me/' },
  telegram: { name: 'Telegram', pkg: 'org.telegram.messenger', home: 'https://t.me/' },
  instagram: { name: 'Instagram', pkg: 'com.instagram.android', home: 'https://www.instagram.com/', search: (s) => `https://www.instagram.com/explore/search/keyword/?q=${q(s)}` },
  facebook: { name: 'Facebook', pkg: 'com.facebook.katana', home: 'https://www.facebook.com/', search: (s) => `https://www.facebook.com/search/top?q=${q(s)}` },
  threads: { name: 'Threads', pkg: 'com.instagram.barcelona', home: 'https://www.threads.net/', search: (s) => `https://www.threads.net/search?q=${q(s)}` },
  x: { name: 'X', pkg: 'com.twitter.android', home: 'https://x.com/', search: (s) => `https://x.com/search?q=${q(s)}` },
  tiktok: { name: 'TikTok', pkg: 'com.ss.android.ugc.trill', home: 'https://www.tiktok.com/', search: (s) => `https://www.tiktok.com/search?q=${q(s)}` },
  youtube: { name: 'YouTube', pkg: 'com.google.android.youtube', home: 'https://www.youtube.com/', search: (s) => `https://www.youtube.com/results?search_query=${q(s)}` },
  youtube_music: { name: 'YouTube Music', pkg: 'com.google.android.apps.youtube.music', home: 'https://music.youtube.com/', search: (s) => `https://music.youtube.com/search?q=${q(s)}` },
  spotify: { name: 'Spotify', pkg: 'com.spotify.music', home: 'https://open.spotify.com/', search: (s) => `https://open.spotify.com/search/${q(s)}` },
  netflix: { name: 'Netflix', pkg: 'com.netflix.mediaclient', home: 'https://www.netflix.com/', search: (s) => `https://www.netflix.com/search?q=${q(s)}` },
  prime_video: { name: 'Prime Video', pkg: 'com.amazon.avod.thirdpartyclient', home: 'https://www.primevideo.com/', search: (s) => `https://www.primevideo.com/search?phrase=${q(s)}` },
  shopee: { name: 'Shopee', pkg: 'com.shopee.id', home: 'https://shopee.co.id/', search: (s) => `https://shopee.co.id/search?keyword=${q(s)}` },
  tokopedia: { name: 'Tokopedia', pkg: 'com.tokopedia.tkpd', home: 'https://www.tokopedia.com/', search: (s) => `https://www.tokopedia.com/search?q=${q(s)}` },
  google_maps: { name: 'Google Maps', pkg: 'com.google.android.apps.maps', home: 'https://www.google.com/maps', search: (s) => `https://www.google.com/maps/search/${q(s)}` },
  browser: { name: 'Browser', home: 'https://www.google.com/', search: (s) => `https://www.google.com/search?q=${q(s)}` },
  email: { name: 'Email' },
  telepon: { name: 'Telepon' },
  sms: { name: 'SMS' },
};

// 0812-3456-789 → 628123456789 (format internasional untuk WhatsApp).
export function normalizePhone(raw) {
  let d = String(raw || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('0')) d = `62${d.slice(1)}`;
  return d.length >= 8 ? d : '';
}

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Bangun tautan untuk satu aplikasi. opts: { cari, nomor, pesan, email, subjek }
// Hasil: { url, web, needsTap } — url untuk HP (bisa tautan khusus), web untuk komputer.
export function buildAppLink(key, opts = {}) {
  const app = APPS[key];
  if (!app) return null;
  const nomor = normalizePhone(opts.nomor);

  if (key === 'telepon') {
    if (!nomor && !opts.nomor) return { error: 'Nomor teleponnya berapa?' };
    const tel = `tel:${String(opts.nomor).replace(/[^\d+]/g, '')}`;
    return { url: tel, web: tel };
  }
  if (key === 'sms') {
    if (!opts.nomor) return { error: 'Nomor tujuannya berapa?' };
    const num = String(opts.nomor).replace(/[^\d+]/g, '');
    const body = opts.pesan ? `${isIOS() ? '&' : '?'}body=${q(opts.pesan)}` : '';
    return { url: `sms:${num}${body}`, web: `sms:${num}${body}` };
  }
  if (key === 'email') {
    const params = new URLSearchParams();
    if (opts.subjek) params.set('subject', opts.subjek);
    if (opts.pesan) params.set('body', opts.pesan);
    const qs = params.toString().replace(/\+/g, '%20');
    const mail = `mailto:${opts.email || ''}${qs ? `?${qs}` : ''}`;
    return { url: mail, web: mail };
  }

  let web = app.home;
  if (key === 'whatsapp') {
    web = `https://wa.me/${nomor}${opts.pesan ? `?text=${q(opts.pesan)}` : ''}`;
  } else if (key === 'telegram' && opts.cari) {
    web = `https://t.me/${String(opts.cari).replace(/^@/, '')}`;
  } else if (opts.cari && app.search) {
    web = app.search(opts.cari);
  }
  const android = /Android/i.test(navigator.userAgent);
  const url = android && app.pkg
    ? `intent://${web.replace(/^https:\/\//, '')}#Intent;scheme=https;package=${app.pkg};S.browser_fallback_url=${q(web)};end`
    : web;
  return { url, web };
}
