export{}

interface NebulaOptions {
  backgroundColor?: string;
  strandColor?: string;
  strandCount?: number;
}

class Strand {
  x: number = 0;
  y: number = 0;
  speed: number = 0;
  amplitude: number = 0;
  frequency: number = 0;
  phase: number = 0;
  private viewWidth: number;
  private viewHeight: number;

  constructor(viewWidth: number, viewHeight: number) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.reset();
  }

  reset(): void {
    this.x = Math.random() * this.viewWidth;
    this.y = Math.random() * this.viewHeight;
    this.speed = Math.random() * 0.5 + 0.1;
    this.amplitude = Math.random() * 20 + 10;
    this.frequency = Math.random() * 0.02 + 0.01;
    this.phase = Math.random() * Math.PI * 2;
  }

  resize(viewWidth: number, viewHeight: number): void {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
  }

  update(): void {
    this.x += this.speed;
    if (this.x > this.viewWidth) {
      this.x = 0;
      this.y = Math.random() * this.viewHeight;
    }
  }

  draw(ctx: CanvasRenderingContext2D, strandColor: string): void {
    const startX = Math.max(this.x - 200, 0);
    ctx.beginPath();
    ctx.moveTo(
      startX,
      this.y + Math.sin(startX * this.frequency + this.phase) * this.amplitude
    );
    for (let i = startX; i < this.x; i++) {
      ctx.lineTo(
        i,
        this.y + Math.sin(i * this.frequency + this.phase) * this.amplitude
      );
    }
    ctx.strokeStyle = strandColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

class NebulaField {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private strands: Strand[] = [];
  private animationId: number = 0;
  private width: number = 0;
  private height: number = 0;

  private backgroundColor: string;
  private strandColor: string;
  private strandCount: number;

  constructor(canvas: HTMLCanvasElement, options: NebulaOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;

    this.backgroundColor = options.backgroundColor ?? "#000000";
    this.strandColor = options.strandColor ?? "rgba(120, 150, 255, 0.5)";
    this.strandCount = options.strandCount ?? 80;

    this.setup();
    window.addEventListener("resize", () => this.setup());
    this.animate();
  }

  private setup(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (this.strands.length === 0) {
      this.strands = Array.from(
        { length: this.strandCount },
        () => new Strand(this.width, this.height)
      );
    } else {
      this.strands.forEach((strand) => strand.resize(this.width, this.height));
    }

    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private animate = (): void => {
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.globalCompositeOperation = "lighter";
    this.strands.forEach((strand) => {
      strand.update();
      strand.draw(this.ctx, this.strandColor);
    });

    this.animationId = requestAnimationFrame(this.animate);
  };

  destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("strand-canvas") as HTMLCanvasElement | null;
  if (canvas) {
    new NebulaField(canvas, {
      backgroundColor: "#000000",
      strandColor: "rgba(120, 150, 255, 0.5)",
      strandCount: 80,
    });
  }
});