class NoiseField3D {
  private perm: Uint8Array = new Uint8Array(512);
  private permMod12: Uint8Array = new Uint8Array(512);

  private static readonly grad3: number[][] = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  ];

  private static readonly F3 = 1.0 / 3.0;
  private static readonly G3 = 1.0 / 6.0;

  constructor(randomFn: () => number = Math.random) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    for (let i = 255; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  private dot(g: number[], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  sample(xin: number, yin: number, zin: number): number {
    const { perm, permMod12 } = this;
    const grad3 = NoiseField3D.grad3;
    const F3 = NoiseField3D.F3;
    const G3 = NoiseField3D.G3;

    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;

    const X0 = i - t, Y0 = j - t, Z0 = k - t;
    const x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;

    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;

    const ii = i & 255, jj = j & 255, kk = k & 255;

    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) {
      const gi0 = permMod12[ii + perm[jj + perm[kk]]];
      t0 *= t0;
      n0 = t0 * t0 * this.dot(grad3[gi0], x0, y0, z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) {
      const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
      t1 *= t1;
      n1 = t1 * t1 * this.dot(grad3[gi1], x1, y1, z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) {
      const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
      t2 *= t2;
      n2 = t2 * t2 * this.dot(grad3[gi2], x2, y2, z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) {
      const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];
      t3 *= t3;
      n3 = t3 * t3 * this.dot(grad3[gi3], x3, y3, z3);
    }

    return 32 * (n0 + n1 + n2 + n3);
  }
}

interface RippleOptions {
  flowColors?: string[];
  lineWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  fillOpacity?: number;
  lineCount?: number;
}

class RippleField {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private noise: NoiseField3D;
  private animationId = 0;
  private width = 0;
  private height = 0;
  private t = 0;

  private flowColors: string[];
  private lineWidth: number;
  private backgroundFill: string;
  private blur: number;
  private step: number;
  private fillOpacity: number;
  private lineCount: number;

  constructor(canvas: HTMLCanvasElement, options: RippleOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
    this.noise = new NoiseField3D();

    this.flowColors = options.flowColors ?? [
      "#38bdf8",
      "#818cf8",
      "#c084fc",
      "#e879f9",
      "#22d3ee",
    ];
    this.lineWidth = options.lineWidth ?? 50;
    this.backgroundFill = options.backgroundFill ?? "black";
    this.blur = options.blur ?? 10;
    this.step = options.speed === "slow" ? 0.001 : 0.002;
    this.fillOpacity = options.fillOpacity ?? 0.5;
    this.lineCount = options.lineCount ?? 5;

    this.setup();
    window.addEventListener("resize", () => this.setup());
    this.animate();
  }

  private setup(): void {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.ctx.filter = `blur(${this.blur}px)`;
  }

  private drawLines(count: number): void {
    this.t += this.step;
    for (let i = 0; i < count; i++) {
      this.ctx.beginPath();
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.strokeStyle = this.flowColors[i % this.flowColors.length];
      for (let x = 0; x < this.width; x += 5) {
        const y = this.noise.sample(x / 800, 0.3 * i, this.t) * 100;
        this.ctx.lineTo(x, y + this.height * 0.5);
      }
      this.ctx.stroke();
      this.ctx.closePath();
    }
  }

  private animate = (): void => {
    this.ctx.fillStyle = this.backgroundFill;
    this.ctx.globalAlpha = this.fillOpacity;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawLines(this.lineCount);
    this.animationId = requestAnimationFrame(this.animate);
  };

  destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("ripple-canvas") as HTMLCanvasElement | null;
  if (canvas) {
    new RippleField(canvas, {
      flowColors: ["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"],
      backgroundFill: "black",
      speed: "fast",
      fillOpacity: 0.5,
      lineWidth: 50,
      blur: 10,
    });
  }
});