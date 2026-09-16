const SPRING_K = 18;
const DAMPING = 0.82;
const MAX_CONN_DIST = 75;
const MAX_CONN_DIST_SQ = MAX_CONN_DIST * MAX_CONN_DIST;
export function createConstellation(canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx)
        return () => { };
    let width = 0;
    let height = 0;
    let frameId = 0;
    let nodes = [];
    let lastTime = performance.now();
    const mouse = {
        x: -1000,
        y: -1000,
        prevX: -1000,
        prevY: -1000,
        vx: 0,
        vy: 0,
        radius: 220,
    };
    const readPalette = () => {
        const cs = getComputedStyle(document.documentElement);
        return {
            bg: cs.getPropertyValue('--bg').trim(),
            node: cs.getPropertyValue('--node').trim(),
            accent: cs.getPropertyValue('--accent').trim(),
            linkAlpha: parseFloat(cs.getPropertyValue('--link-alpha')) || 0.18,
        };
    };
    let colors = readPalette();
    const initNodes = () => {
        nodes = [];
        const spacing = width < 640 ? 44 : 55;
        const cols = Math.ceil(width / spacing) + 1;
        const rows = Math.ceil(height / spacing) + 1;
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = i * spacing;
                const y = j * spacing;
                nodes.push({
                    x,
                    y,
                    vx: 0,
                    vy: 0,
                    baseX: x,
                    baseY: y,
                    radius: Math.random() * 1.2 + 1.2,
                    pulse: Math.random() * Math.PI * 2,
                });
            }
        }
    };
    const handleResize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        colors = readPalette();
        initNodes();
    };
    const handlePointerMove = (e) => {
        const point = 'touches' in e ? e.touches[0] : e;
        if (!point)
            return;
        mouse.x = point.clientX;
        mouse.y = point.clientY;
    };
    const handlePointerOut = () => {
        mouse.x = -1000;
        mouse.y = -1000;
    };
    const handleSchemeChange = () => {
        colors = readPalette();
    };
    const handleVisibility = () => {
        if (document.hidden) {
            cancelAnimationFrame(frameId);
        }
        else {
            lastTime = performance.now();
            frameId = requestAnimationFrame(render);
        }
    };
    function render(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        mouse.vx = (mouse.x - mouse.prevX) / (dt * 1000 || 1);
        mouse.vy = (mouse.y - mouse.prevY) / (dt * 1000 || 1);
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
        const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            n.pulse += dt * 3;
            const dx = mouse.x - n.x;
            const dy = mouse.y - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouse.radius && dist > 0) {
                const power = 1 - dist / mouse.radius;
                const force = power * (1500 + speed * 150);
                const angle = Math.atan2(dy, dx);
                n.vx -= Math.cos(angle) * force * dt;
                n.vy -= Math.sin(angle) * force * dt;
            }
            n.vx += (n.baseX - n.x) * SPRING_K * dt;
            n.vy += (n.baseY - n.y) * SPRING_K * dt;
            n.vx *= DAMPING;
            n.vy *= DAMPING;
            n.x += n.vx * dt * 60;
            n.y += n.vy * dt * 60;
        }
        ctx.lineWidth = 0.7;
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            for (let j = i + 1; j < nodes.length; j++) {
                const n2 = nodes[j];
                const ndx = n.x - n2.x;
                const ndy = n.y - n2.y;
                const distSq = ndx * ndx + ndy * ndy;
                if (distSq < MAX_CONN_DIST_SQ) {
                    const nDist = Math.sqrt(distSq);
                    const alpha = (1 - nDist / MAX_CONN_DIST) * colors.linkAlpha;
                    ctx.strokeStyle = `rgba(${colors.node}, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(n.x, n.y);
                    ctx.lineTo(n2.x, n2.y);
                    ctx.stroke();
                }
            }
        }
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const dx = mouse.x - n.x;
            const dy = mouse.y - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const isNear = dist < mouse.radius;
            const baseAlpha = isNear ? 0.95 : 0.25 + Math.sin(n.pulse) * 0.1;
            ctx.fillStyle = isNear
                ? `rgba(${colors.accent}, ${baseAlpha})`
                : `rgba(${colors.node}, ${baseAlpha})`;
            const currentRadius = isNear
                ? n.radius * 2.2
                : n.radius + Math.sin(n.pulse) * 0.3;
            ctx.beginPath();
            ctx.arc(n.x, n.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
            ctx.fill();
            if (dist < 90) {
                const ring = ((n.pulse * 20) % 30) + 4;
                const ringAlpha = (1 - ring / 34) * 0.4;
                ctx.strokeStyle = `rgba(${colors.accent}, ${ringAlpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(n.x, n.y, ring, 0, Math.PI * 2);
                ctx.stroke();
                ctx.lineWidth = 0.7;
            }
        }
        frameId = requestAnimationFrame(render);
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSchemeChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerOut);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerOut);
    document.addEventListener('visibilitychange', handleVisibility);
    handleResize();
    frameId = requestAnimationFrame(render);
    return () => {
        cancelAnimationFrame(frameId);
        mediaQuery.removeEventListener('change', handleSchemeChange);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseleave', handlePointerOut);
        window.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('touchend', handlePointerOut);
        document.removeEventListener('visibilitychange', handleVisibility);
    };
}
const stage = document.getElementById('stage');
if (stage instanceof HTMLCanvasElement) {
    createConstellation(stage);
}
