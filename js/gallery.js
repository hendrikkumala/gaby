// Galeri gambar buatan Gaby, disimpan di perangkat ini (IndexedDB).

const DB = 'gaby-gallery';
const STORE = 'images';
const MAX = 40;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : out);
    t.onerror = () => reject(t.error);
  }));
}

export const gallery = {
  // item: { id, blob, url, prompt, at } — blob boleh kosong kalau hanya alamat gambar yang tersedia
  async add(blob, prompt, url = null) {
    const item = { id: `${Date.now()}`, blob, url, prompt, at: Date.now() };
    await tx('readwrite', (s) => s.put(item));
    const all = await this.list();
    for (const old of all.slice(MAX)) await tx('readwrite', (s) => s.delete(old.id));
    return item;
  },

  async list() {
    try {
      const items = await tx('readonly', (s) => s.getAll());
      return (items || []).sort((a, b) => b.at - a.at);
    } catch {
      return [];
    }
  },

  remove(id) {
    return tx('readwrite', (s) => s.delete(id));
  },
};
