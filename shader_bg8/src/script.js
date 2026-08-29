"use strict";
const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;
const FRAG = `
#define TWO_PI 6.2831853072
#define PI 3.14159265359

precision highp float;
uniform vec2 resolution;
uniform float time;

float random (in float x) {
    return fract(sin(x)*1e4);
}
float random (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

void main(void) {
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

  vec2 fMosaicScal = vec2(4.0, 2.0);
  vec2 vScreenSize = vec2(256.0, 256.0);
  uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
  uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);

  float t = time * 0.06 + random(uv.x) * 0.4;
  float lineWidth = 0.0008;

  vec3 color = vec3(0.0);
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 5; i++) {
      color[j] += lineWidth * float(i * i) / abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 1.0 - length(uv));
    }
  }

  gl_FragColor = vec4(color[2], color[1], color[0], 1.0);
}
`;
function initShaderLines(host, canvas) {
    const opts = {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
    };
    const gl = (canvas.getContext("webgl2", opts) || canvas.getContext("webgl", opts));
    function giveUp(why) {
        host.dataset.webgl = why;
        canvas.style.display = "none";
    }
    if (!gl) {
        giveUp("unsupported");
        return;
    }
    function compile(type, src) {
        const sh = gl.createShader(type);
        if (!sh)
            return null;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error("shader-lines: shader failed —", gl.getShaderInfoLog(sh) || "no log (context lost?)");
            gl.deleteShader(sh);
            return null;
        }
        return sh;
    }
    function link(vertSrc, fragSrc) {
        const vs = compile(gl.VERTEX_SHADER, vertSrc);
        const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
        if (!vs || !fs)
            return null;
        const program = gl.createProgram();
        if (!program)
            return null;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.bindAttribLocation(program, 0, "aPos");
        gl.linkProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            return null;
        }
        const u = {};
        const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) {
            const info = gl.getActiveUniform(program, i);
            if (info)
                u[info.name] = gl.getUniformLocation(program, info.name);
        }
        return { program, u };
    }
    let prog = null;
    let vbo = null;
    let width = 0;
    let height = 0;
    let time = 0;
    let running = true;
    let visible = true;
    let raf = 0;
    function build() {
        prog = link(VERT, FRAG);
        if (!prog)
            return false;
        vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        return true;
    }
    function resize() {
        const rect = host.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (w === width && h === height)
            return;
        width = w;
        height = h;
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
        gl.viewport(0, 0, w, h);
    }
    function render() {
        if (!prog)
            return;
        gl.useProgram(prog.program);
        gl.uniform2f(prog.u.resolution, width, height);
        gl.uniform1f(prog.u.time, time);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function tick() {
        if (!running)
            return;
        raf = requestAnimationFrame(tick);
        if (!visible)
            return;
        time += 0.05;
        render();
    }
    if (!build()) {
        giveUp("build-failed");
        return;
    }
    resize();
    render();
    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(() => resize());
    ro.observe(host);
    const io = new IntersectionObserver((entries) => { visible = entries[0] ? entries[0].isIntersecting : true; }, { threshold: 0 });
    io.observe(host);
    document.addEventListener("visibilitychange", () => {
        visible = !document.hidden;
    });
    canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        running = false;
        cancelAnimationFrame(raf);
        canvas.style.display = "none";
    });
    canvas.addEventListener("webglcontextrestored", () => {
        width = height = 0;
        if (!build()) {
            giveUp("lost");
            return;
        }
        canvas.style.display = "";
        host.dataset.webgl = "";
        resize();
        running = true;
        raf = requestAnimationFrame(tick);
    });
}
document.addEventListener("DOMContentLoaded", () => {
    const host = document.getElementById("shader-host");
    const canvas = document.getElementById("shader-canvas");
    if (host && canvas)
        initShaderLines(host, canvas);
});
