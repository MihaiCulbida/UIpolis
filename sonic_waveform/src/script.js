"use strict";
const canvas = document.getElementById('wave');
const ctx = canvas.getContext('2d');
let animationFrameId;
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let time = 0;
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const lineCount = 60;
    const segmentCount = 80;
    const height = canvas.height / 2;
    for (let i = 0; i < lineCount; i++) {
        ctx.beginPath();
        const progress = i / lineCount;
        const colorIntensity = Math.sin(progress * Math.PI);
        ctx.strokeStyle = `rgba(0, 255, 192, ${colorIntensity * 0.5})`;
        ctx.lineWidth = 1.5;
        for (let j = 0; j < segmentCount + 1; j++) {
            const x = (j / segmentCount) * canvas.width;
            const distToMouse = Math.hypot(x - mouse.x, height - mouse.y);
            const mouseEffect = Math.max(0, 1 - distToMouse / 400);
            const noise = Math.sin(j * 0.1 + time + i * 0.2) * 20;
            const spike = Math.cos(j * 0.2 + time + i * 0.1) * Math.sin(j * 0.05 + time) * 50;
            const y = height + noise + spike * (1 + mouseEffect * 2);
            if (j === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    time += 0.02;
    animationFrameId = requestAnimationFrame(draw);
}
function handleMouseMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
}
function handleTouchMove(event) {
    if (event.touches.length > 0) {
        mouse.x = event.touches[0].clientX;
        mouse.y = event.touches[0].clientY;
    }
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', handleMouseMove);
window.addEventListener('touchmove', handleTouchMove);
resizeCanvas();
draw();
