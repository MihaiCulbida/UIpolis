export {};

interface FlowBgOptions {
  color?: string;
  trailOpacity?: number;
  particleCount?: number;
  speed?: number;
}

class FlowParticle {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  age = 0;
  life: number;

  constructor(private width: number, private height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.life = Math.random() * 200 + 100;
  }

  reset(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = 0;
    this.vy = 0;
    this.age = 0;
    this.life = Math.random() * 200 + 100;
  }

  update(mouse: { x: number; y: number }, speed: number) {
    const angle = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;

    this.vx += Math.cos(angle) * 0.2 * speed;
    this.vy += Math.sin(angle) * 0.2 * speed;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const interactionRadius = 150;

    if (distance < interactionRadius) {
      const force = (interactionRadius - distance) / interactionRadius;
      this.vx -= dx * force * 0.05;
      this.vy -= dy * force * 0.05;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;

    this.age++;
    if (this.age > this.life) {
      this.reset(this.width, this.height);
    }

    if (this.x < 0) this.x = this.width;
    if (this.x > this.width) this.x = 0;
    if (this.y < 0) this.y = this.height;
    if (this.y > this.height) this.y = 0;
  }

  draw(ctx: CanvasRenderingContext2D, color: string) {
    ctx.fillStyle = color;
    const alpha = 1 - Math.abs(this.age / this.life - 0.5) * 2;
    ctx.globalAlpha = alpha;
    ctx.fillRect(this.x, this.y, 1.5, 1.5);
  }
}

class FlowBackground {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private width = 0;
  private height = 0;
  private particles: FlowParticle[] = [];
  private mouse = { x: -1000, y: -1000 };
  private animationFrameId = 0;

  private color: string;
  private trailOpacity: number;
  private particleCount: number;
  private speed: number;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement, options: FlowBgOptions = {}) {
    this.container = container;
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    this.ctx = ctx;

    this.color = options.color ?? "#6366f1";
    this.trailOpacity = options.trailOpacity ?? 0.15;
    this.particleCount = options.particleCount ?? 600;
    this.speed = options.speed ?? 1;

    this.init();
    this.animate();
    this.bindEvents();
  }

  private init() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(new FlowParticle(this.width, this.height));
    }
  }

  private animate = () => {
    this.ctx.fillStyle = `rgba(0, 0, 0, ${this.trailOpacity})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.particles.forEach((p) => {
      p.update(this.mouse, this.speed);
      p.draw(this.ctx, this.color);
    });

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private handleResize = () => {
    this.init();
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  };

  private handleMouseLeave = () => {
    this.mouse.x = -1000;
    this.mouse.y = -1000;
  };

  private bindEvents() {
    window.addEventListener("resize", this.handleResize);
    this.container.addEventListener("mousemove", this.handleMouseMove);
    this.container.addEventListener("mouseleave", this.handleMouseLeave);
  }

  destroy() {
    window.removeEventListener("resize", this.handleResize);
    this.container.removeEventListener("mousemove", this.handleMouseMove);
    this.container.removeEventListener("mouseleave", this.handleMouseLeave);
    cancelAnimationFrame(this.animationFrameId);
  }
}

function initFlowBackgrounds() {
  const containers = document.querySelectorAll<HTMLElement>(".flow-bg");

  containers.forEach((container) => {
    const canvas = container.querySelector<HTMLCanvasElement>(".flow-bg-canvas");
    if (!canvas) return;

    new FlowBackground(container, canvas, {
      color: container.dataset.color,
      trailOpacity: container.dataset.trailOpacity ? parseFloat(container.dataset.trailOpacity) : undefined,
      particleCount: container.dataset.particleCount ? parseInt(container.dataset.particleCount, 10) : undefined,
      speed: container.dataset.speed ? parseFloat(container.dataset.speed) : undefined,
    });
  });
}

document.addEventListener("DOMContentLoaded", initFlowBackgrounds);