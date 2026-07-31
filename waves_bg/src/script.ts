class PerlinField {
  private p: Uint8Array = new Uint8Array(512);
  private gradients: number[][] = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  constructor(seed: number) {
    this.init(seed > 0 && seed < 1 ? seed : Math.random());
  }

  private init(seed: number): void {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 0; i < 256; i++) {
      const j = Math.floor(seed * (i + 1)) % 256;
      const k = p[i];
      p[i] = p[j];
      p[j] = k;
    }
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  sample(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const u = fade(x);
    const v = fade(y);
    const p = this.p;
    const grad3 = this.gradients;

    const n00 = this.dot(grad3[p[X + p[Y]] % 8], x, y);
    const n01 = this.dot(grad3[p[X + p[Y + 1]] % 8], x, y - 1);
    const n10 = this.dot(grad3[p[X + 1 + p[Y]] % 8], x - 1, y);
    const n11 = this.dot(grad3[p[X + 1 + p[Y + 1]] % 8], x - 1, y - 1);

    const lerp = (a: number, b: number, t: number) => a + t * (b - a);
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
  }
}

const meshConfig = {
  GRID_X_GAP: 10,
  GRID_Y_GAP: 32,
  GRID_WIDTH_OFFSET: 200,
  GRID_HEIGHT_OFFSET: 30,

  WAVE_TIME_X_FACTOR: 0.0125,
  WAVE_NOISE_X_FACTOR: 0.002,
  WAVE_TIME_Y_FACTOR: 0.005,
  WAVE_NOISE_Y_FACTOR: 0.0015,
  WAVE_NOISE_MAGNITUDE: 12,
  WAVE_AMPLITUDE_X: 32,
  WAVE_AMPLITUDE_Y: 16,

  POINTER_INFLUENCE_RADIUS: 175,
  POINTER_FALLOFF_FACTOR: 0.001,
  POINTER_FORCE_FACTOR: 0.00065,
  POINTER_SMOOTHING_FACTOR: 0.1,
  MAX_POINTER_VELOCITY: 100,

  TENSION_STRENGTH: 0.005,
  FRICTION: 0.925,
  DISPLACEMENT_STRENGTH: 2,
  MAX_DISPLACEMENT: 100,
};

interface MeshPoint {
  x: number;
  y: number;
  wave: { x: number; y: number };
  cursor: { x: number; y: number; vx: number; vy: number };
}

class VioletMesh {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private noise: PerlinField;
  private bounds: DOMRect | null = null;
  private lines: MeshPoint[][] = [];
  private animationId = 0;
  private strandColor: string;

  private pointer = {
    x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0,
    v: 0, vs: 0, a: 0, set: false,
  };

  constructor(container: HTMLDivElement, canvas: HTMLCanvasElement, strandColor = "#a855f7") {
    this.container = container;
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;
    this.noise = new PerlinField(Math.random());
    this.strandColor = strandColor;

    this.setSize();
    this.buildGrid();

    window.addEventListener("resize", () => {
      this.setSize();
      this.buildGrid();
    });
    window.addEventListener("mousemove", (e) => this.updatePointer(e.pageX, e.pageY));
    container.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.updatePointer(touch.clientX, touch.clientY);
      },
      { passive: false }
    );

    this.animationId = requestAnimationFrame((t) => this.tick(t));
  }

  private setSize(): void {
    this.bounds = this.container.getBoundingClientRect();
    this.canvas.width = this.bounds.width;
    this.canvas.height = this.bounds.height;
  }

  private buildGrid(): void {
    if (!this.bounds) return;
    const { width, height } = this.bounds;
    const { GRID_X_GAP, GRID_Y_GAP, GRID_WIDTH_OFFSET, GRID_HEIGHT_OFFSET } = meshConfig;

    const oWidth = width + GRID_WIDTH_OFFSET;
    const oHeight = height + GRID_HEIGHT_OFFSET;

    const totalLines = Math.ceil(oWidth / GRID_X_GAP);
    const totalPoints = Math.ceil(oHeight / GRID_Y_GAP);

    const xStart = (width - GRID_X_GAP * totalLines) / 2;
    const yStart = (height - GRID_Y_GAP * totalPoints) / 2;

    this.lines = [];
    for (let i = 0; i <= totalLines; i++) {
      const points: MeshPoint[] = [];
      for (let j = 0; j <= totalPoints; j++) {
        points.push({
          x: xStart + GRID_X_GAP * i,
          y: yStart + GRID_Y_GAP * j,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 },
        });
      }
      this.lines.push(points);
    }
  }

  private displaced(point: MeshPoint, withCursorForce = true) {
    const coords = {
      x: point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0),
      y: point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0),
    };
    coords.x = Math.round(coords.x * 10) / 10;
    coords.y = Math.round(coords.y * 10) / 10;
    return coords;
  }

  private movePoints(time: number): void {
    const {
      WAVE_TIME_X_FACTOR, WAVE_NOISE_X_FACTOR, WAVE_TIME_Y_FACTOR, WAVE_NOISE_Y_FACTOR,
      WAVE_NOISE_MAGNITUDE, WAVE_AMPLITUDE_X, WAVE_AMPLITUDE_Y, POINTER_INFLUENCE_RADIUS,
      POINTER_FALLOFF_FACTOR, POINTER_FORCE_FACTOR, TENSION_STRENGTH, FRICTION,
      DISPLACEMENT_STRENGTH, MAX_DISPLACEMENT,
    } = meshConfig;

    const pointer = this.pointer;

    this.lines.forEach((points) => {
      points.forEach((p) => {
        const noiseInputX = (p.x + time * WAVE_TIME_X_FACTOR) * WAVE_NOISE_X_FACTOR;
        const noiseInputY = (p.y + time * WAVE_TIME_Y_FACTOR) * WAVE_NOISE_Y_FACTOR;
        const move = this.noise.sample(noiseInputX, noiseInputY) * WAVE_NOISE_MAGNITUDE;
        p.wave.x = Math.cos(move) * WAVE_AMPLITUDE_X;
        p.wave.y = Math.sin(move) * WAVE_AMPLITUDE_Y;

        const dx = p.x - pointer.sx;
        const dy = p.y - pointer.sy;
        const d = Math.hypot(dx, dy);
        const influenceRadius = Math.max(POINTER_INFLUENCE_RADIUS, pointer.vs);

        if (d < influenceRadius) {
          const falloff = 1 - d / influenceRadius;
          const force = Math.cos(d * POINTER_FALLOFF_FACTOR) * falloff;
          const forceFactor = force * influenceRadius * pointer.vs * POINTER_FORCE_FACTOR;
          p.cursor.vx += Math.cos(pointer.a) * forceFactor;
          p.cursor.vy += Math.sin(pointer.a) * forceFactor;
        }

        p.cursor.vx += (0 - p.cursor.x) * TENSION_STRENGTH;
        p.cursor.vy += (0 - p.cursor.y) * TENSION_STRENGTH;
        p.cursor.vx *= FRICTION;
        p.cursor.vy *= FRICTION;
        p.cursor.x += p.cursor.vx * DISPLACEMENT_STRENGTH;
        p.cursor.y += p.cursor.vy * DISPLACEMENT_STRENGTH;
        p.cursor.x = Math.min(MAX_DISPLACEMENT, Math.max(-MAX_DISPLACEMENT, p.cursor.x));
        p.cursor.y = Math.min(MAX_DISPLACEMENT, Math.max(-MAX_DISPLACEMENT, p.cursor.y));
      });
    });
  }

  private draw(): void {
    if (!this.bounds) return;
    const { width, height } = this.bounds;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.strandColor;
    this.ctx.lineWidth = 0.5;

    this.lines.forEach((points) => {
      const first = this.displaced(points[0], false);
      this.ctx.moveTo(first.x, first.y);
      for (let i = 0; i < points.length - 1; i++) {
        const current = this.displaced(points[i], true);
        const next = this.displaced(points[i + 1], true);
        const xc = (current.x + next.x) / 2;
        const yc = (current.y + next.y) / 2;
        this.ctx.quadraticCurveTo(current.x, current.y, xc, yc);
      }
    });
    this.ctx.stroke();
  }

  private updatePointer(x: number, y: number): void {
    if (!this.bounds) return;
    const pointer = this.pointer;
    pointer.x = x - this.bounds.left;
    pointer.y = y - this.bounds.top;
    if (!pointer.set) {
      pointer.sx = pointer.x;
      pointer.sy = pointer.y;
      pointer.lx = pointer.x;
      pointer.ly = pointer.y;
      pointer.set = true;
    }
  }

  private tick(time: number): void {
    const { POINTER_SMOOTHING_FACTOR, MAX_POINTER_VELOCITY } = meshConfig;
    const pointer = this.pointer;

    pointer.sx += (pointer.x - pointer.sx) * POINTER_SMOOTHING_FACTOR;
    pointer.sy += (pointer.y - pointer.sy) * POINTER_SMOOTHING_FACTOR;

    const dx = pointer.sx - pointer.lx;
    const dy = pointer.sy - pointer.ly;
    const d = Math.hypot(dx, dy);

    pointer.v = d;
    pointer.vs += (d - pointer.vs) * POINTER_SMOOTHING_FACTOR;
    pointer.vs = Math.min(MAX_POINTER_VELOCITY, pointer.vs);
    pointer.a = Math.atan2(dy, dx);

    pointer.lx = pointer.sx;
    pointer.ly = pointer.sy;

    this.container.style.setProperty("--x", `${pointer.sx}px`);
    this.container.style.setProperty("--y", `${pointer.sy}px`);

    this.movePoints(time);
    this.draw();

    this.animationId = requestAnimationFrame((t) => this.tick(t));
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("mesh-container") as HTMLDivElement | null;
  const canvas = document.getElementById("mesh-canvas") as HTMLCanvasElement | null;
  if (container && canvas) {
    new VioletMesh(container, canvas, "#000000");
  }
});