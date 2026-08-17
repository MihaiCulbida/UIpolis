"use strict";
(function () {
    let GLOBAL_COLOR = "default";
    const CELL_SIZE = 55;
    const INFLUENCE_RADIUS = 260;
    const MAX_WARP = 24;
    const DOT_SPACING = 28;
    const LERP_SPEED = 0.08;
    const LINE_BASE = { r: 255, g: 255, b: 255, a: 0.13 };
    const NODE_BASE_RADIUS = 1.8;
    const NODE_ACTIVE_RADIUS = 3.2;
    const THEMES = {
        default: {
            bg: "#161618",
            lineActive: { r: 74, g: 158, b: 255, a: 0.9 },
            nodeActive: { r: 74, g: 158, b: 255, a: 1.0 },
            glow: "74,158,255",
            ripple: "100,180,255",
        },
        monochrome: {
            bg: "#000000",
            lineActive: { r: 255, g: 255, b: 255, a: 0.9 },
            nodeActive: { r: 255, g: 255, b: 255, a: 1.0 },
            glow: "255,255,255",
            ripple: "255,255,255",
        },
    };
    function lerpN(a, b, t) {
        return a + (b - a) * t;
    }
    function lerpColor(base, active, t) {
        const r = Math.round(lerpN(base.r, active.r, t));
        const g = Math.round(lerpN(base.g, active.g, t));
        const b = Math.round(lerpN(base.b, active.b, t));
        const a = lerpN(base.a, active.a, t);
        return `rgba(${r},${g},${b},${a.toFixed(3)})`;
    }
    const root = document.getElementById("kinetic-grid");
    const canvas = document.getElementById("kinetic-canvas");
    const ctx = canvas.getContext("2d");
    if (GLOBAL_COLOR === "monochrome") {
        root.classList.add("monochrome");
    }
    const mouse = { x: -9999, y: -9999 };
    const targetMouse = { x: -9999, y: -9999 };
    let ripples = [];
    let rafId = 0;
    let size = { w: 0, h: 0 };
    function getWarpedPoint(gx, gy, col, row, cols, rows) {
        const edgeMargin = 1.5;
        const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
        const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
        const pinFactor = colPin * colPin * rowPin * rowPin;
        const dx = gx - mouse.x;
        const dy = gy - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;
        let rx = 0, ry = 0;
        for (const r of ripples) {
            const rdx = gx - r.x;
            const rdy = gy - r.y;
            const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
            const waveWidth = 55;
            const diff = rdist - r.radius;
            if (Math.abs(diff) < waveWidth) {
                const strength = (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor;
                const angle = Math.atan2(rdy, rdx);
                const sign = diff < 0 ? -1 : 1;
                rx += Math.cos(angle) * strength * sign * -1;
                ry += Math.sin(angle) * strength * sign * -1;
            }
        }
        if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0) {
            const t = dist / INFLUENCE_RADIUS;
            const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
            const warpAmt = eased * MAX_WARP * pinFactor;
            const angle = Math.atan2(dy, dx);
            return {
                pt: {
                    x: gx - Math.cos(angle) * warpAmt + rx,
                    y: gy - Math.sin(angle) * warpAmt + ry,
                },
                proximity,
            };
        }
        return { pt: { x: gx + rx, y: gy + ry }, proximity };
    }
    function draw(now) {
        const W = size.w;
        const H = size.h;
        const theme = THEMES[GLOBAL_COLOR] || THEMES.default;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
            for (let y = DOT_SPACING / 2; y < H; y += DOT_SPACING) {
                ctx.beginPath();
                ctx.arc(x, y, 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            const age = (now - r.born) / 1000;
            r.radius = Math.max(0, age * 400);
            r.opacity = Math.max(0, 1 - age * 1.2);
            if (r.opacity <= 0)
                ripples.splice(i, 1);
        }
        const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
        const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
        const cellW = W / (cols - 1);
        const cellH = H / (rows - 1);
        const pts = [];
        const prox = [];
        for (let row = 0; row < rows; row++) {
            pts[row] = [];
            prox[row] = [];
            for (let col = 0; col < cols; col++) {
                const { pt, proximity } = getWarpedPoint(col * cellW, row * cellH, col, row, cols, rows);
                pts[row][col] = pt;
                prox[row][col] = proximity;
            }
        }
        function drawSeg(p1, p2, pr1, pr2) {
            const avg = (pr1 + pr2) / 2;
            const t = avg * avg * (3 - 2 * avg);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = lerpColor(LINE_BASE, theme.lineActive, t);
            ctx.lineWidth = lerpN(0.8, 1.5, t);
            ctx.stroke();
        }
        ctx.lineCap = "butt";
        for (let row = 0; row < rows; row++)
            for (let col = 0; col < cols - 1; col++)
                drawSeg(pts[row][col], pts[row][col + 1], prox[row][col], prox[row][col + 1]);
        for (let col = 0; col < cols; col++)
            for (let row = 0; row < rows - 1; row++)
                drawSeg(pts[row][col], pts[row + 1][col], prox[row][col], prox[row + 1][col]);
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const p = pts[row][col];
                const pr = prox[row][col];
                const t = pr * pr * (3 - 2 * pr);
                const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);
                if (t > 0.3) {
                    const glowR = r + lerpN(0, 6, (t - 0.3) / 0.7);
                    const grd = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, glowR);
                    grd.addColorStop(0, `rgba(${theme.glow},${(t * 0.3).toFixed(3)})`);
                    grd.addColorStop(1, `rgba(${theme.glow},0)`);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
                    ctx.fillStyle = grd;
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = lerpColor({ r: 255, g: 255, b: 255, a: 0.2 }, theme.nodeActive, t);
                ctx.fill();
            }
        }
        for (const r of ripples) {
            const safeRadius = Math.max(0, r.radius);
            ctx.beginPath();
            ctx.arc(r.x, r.y, safeRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${theme.ripple},${(r.opacity * 0.28).toFixed(3)})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
    function animate(now) {
        mouse.x = lerpN(mouse.x, targetMouse.x, LERP_SPEED);
        mouse.y = lerpN(mouse.y, targetMouse.y, LERP_SPEED);
        draw(now);
        rafId = requestAnimationFrame(animate);
    }
    function setSize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
        size = { w, h };
    }
    function onMouseMove(e) {
        targetMouse.x = e.clientX;
        targetMouse.y = e.clientY;
    }
    function onClick(e) {
        ripples.push({
            x: e.clientX,
            y: e.clientY,
            radius: 0,
            opacity: 1,
            born: performance.now(),
        });
    }
    function init() {
        setSize();
        window.addEventListener("resize", setSize);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("click", onClick);
        rafId = requestAnimationFrame(animate);
    }
    window.addEventListener("DOMContentLoaded", init);
    window.addEventListener("beforeunload", () => {
        if (rafId)
            cancelAnimationFrame(rafId);
    });
})();
