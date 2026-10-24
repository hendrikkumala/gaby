// Kamera & bagikan layar: Gaby bisa melihat apa yang kamu tunjukkan.

export class Camera {
  constructor(video) {
    this.video = video;
    this.stream = null;
    this.source = null;      // 'kamera' | 'layar'
    this.facing = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'environment' : 'user';
    this.canvas = document.createElement('canvas');
  }

  get active() {
    return !!(this.stream && this.stream.active);
  }

  static get canShareScreen() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
      && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  async start(facing = this.facing) {
    this.stop();
    this.facing = facing;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    this.source = 'kamera';
    await this.attach();
  }

  async startScreen() {
    this.stop();
    this.stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false });
    this.source = 'layar';
    this.stream.getVideoTracks()[0].addEventListener('ended', () => this.onEnded && this.onEnded());
    await this.attach();
  }

  async attach() {
    this.video.srcObject = this.stream;
    this.video.classList.toggle('mirror', this.source === 'kamera' && this.facing === 'user');
    await this.video.play().catch(() => {});
  }

  flip() {
    return this.start(this.facing === 'user' ? 'environment' : 'user');
  }

  stop() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.source = null;
    this.video.srcObject = null;
  }

  // Ambil satu gambar JPEG (base64 tanpa awalan) dari kamera/layar.
  frame(maxSide = 768, quality = 0.7) {
    const v = this.video;
    if (!this.active || !v.videoWidth) return null;
    const scale = Math.min(1, maxSide / Math.max(v.videoWidth, v.videoHeight));
    this.canvas.width = Math.round(v.videoWidth * scale);
    this.canvas.height = Math.round(v.videoHeight * scale);
    this.canvas.getContext('2d').drawImage(v, 0, 0, this.canvas.width, this.canvas.height);
    return this.canvas.toDataURL('image/jpeg', quality).split(',')[1];
  }
}
