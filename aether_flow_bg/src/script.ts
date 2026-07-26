interface MousePosition {
  x: number | null;
  y: number | null;
  radius: number;
}

class Particle {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  size: number;
  color: string;

  constructor(x: number, y: number, directionX: number, directionY: number, size: number, color: string) {
    this.x = x;
    this.y = y;
    this.directionX = directionX;
    this.directionY = directionY;
    this.size = size;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, mouse: MousePosition): void {
    if (this.x > canvas.width || this.x < 0) {
      this.directionX = -this.directionX;
    }
    if (this.y > canvas.height || this.y < 0) {
      this.directionY = -this.directionY;
    }

    if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < mouse.radius + this.size) {
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const force = (mouse.radius - distance) / mouse.radius;
        this.x -= forceDirectionX * force * 5;
        this.y -= forceDirectionY * force * 5;
      }
    }

    this.x += this.directionX;
    this.y += this.directionY;
    this.draw(ctx);
  }
}

const canvas = document.getElementById('aether-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

let animationFrameId: number;
let particles: Particle[] = [];
const mouse: MousePosition = { x: null, y: null, radius: 200 };

function init(): void {
  particles = [];
  const numberOfParticles = (canvas.height * canvas.width) / 9000;
  for (let i = 0; i < numberOfParticles; i++) {
    const size = Math.random() * 2 + 1;
    const x = Math.random() * (window.innerWidth - size * 4) + size * 2;
    const y = Math.random() * (window.innerHeight - size * 4) + size * 2;
    const directionX = Math.random() * 0.4 - 0.2;
    const directionY = Math.random() * 0.4 - 0.2;
    const color = 'rgba(191, 128, 255, 0.8)';
    particles.push(new Particle(x, y, directionX, directionY, size, color));
  }
}

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  init();
}

function connect(): void {
  for (let a = 0; a < particles.length; a++) {
    for (let b = a; b < particles.length; b++) {
      const distance =
        (particles[a].x - particles[b].x) * (particles[a].x - particles[b].x) +
        (particles[a].y - particles[b].y) * (particles[a].y - particles[b].y);

      if (distance < (canvas.width / 7) * (canvas.height / 7)) {
        const opacityValue = 1 - distance / 20000;

        const dxMouseA = particles[a].x - (mouse.x ?? 0);
        const dyMouseA = particles[a].y - (mouse.y ?? 0);
        const distanceMouseA = Math.sqrt(dxMouseA * dxMouseA + dyMouseA * dyMouseA);

        if (mouse.x !== null && distanceMouseA < mouse.radius) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue})`;
        } else {
          ctx.strokeStyle = `rgba(200, 150, 255, ${opacityValue})`;
        }

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }
}

function animate(): void {
  animationFrameId = requestAnimationFrame(animate);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < particles.length; i++) {
    particles[i].update(ctx, canvas, mouse);
  }
  connect();
}

function handleMouseMove(event: MouseEvent): void {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}

function handleMouseOut(): void {
  mouse.x = null;
  mouse.y = null;
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseout', handleMouseOut);

resizeCanvas();
animate();