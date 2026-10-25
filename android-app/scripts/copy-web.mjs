// Salin file Gaby (web) ke folder www sebagai cadangan offline di dalam APK.
// APK biasanya memuat versi terbaru langsung dari GitHub Pages (lihat capacitor.config.json).
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = resolve(root, 'android-app', 'www');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of ['index.html', 'manifest.webmanifest', 'css', 'js', 'icons']) {
  cpSync(resolve(root, item), resolve(out, item), { recursive: true });
}
console.log('Web Gaby disalin ke', out);
