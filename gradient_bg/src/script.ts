const vertexShaderSrc = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSrc = `
precision highp float;
varying vec2 vUv;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_grain;
uniform vec3  u_colors[4];
uniform vec3  u_bg;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  float ratio = u_resolution.x / u_resolution.y;
  vec2 p = uv - 0.5;
  p.x *= ratio;

  float t = u_time * 0.1;

  float n1 = snoise(p * 0.4 + vec2(t * 0.2, -t * 0.3));
  float n2 = snoise(p * 0.55 + vec2(-t * 0.15, t * 0.25) + n1 * 0.25);
  float n3 = snoise(p * 0.75 + vec2(t * 0.1, -t * 0.2) + n2 * 0.2);

  vec3 col = u_bg;

  float dist = length(p) * 1.5;
  float vignette = 1.0 - smoothstep(0.3, 1.2, dist);

  col = mix(col, u_colors[0], smoothstep(-0.2, 0.5, n1) * 0.85);
  col = mix(col, u_colors[1], smoothstep(-0.1, 0.6, n2) * 0.7);
  col = mix(col, u_colors[2], smoothstep(-0.3, 0.4, n3) * 0.6);
  col = mix(col, u_colors[3], smoothstep(0.0, 0.7, n1 * n2) * 0.5);

  float glow = smoothstep(0.8, 0.0, dist) * 0.3;
  col += u_colors[1] * glow;

  col = mix(col * 0.2, col, vignette);

  float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + u_time);
  col += (grain - 0.5) * u_grain * 0.1;

  gl_FragColor = vec4(col, 1.0);
}
`;

interface AuroraOptions {
  bg?: string;
  colors?: string[];
  speed?: number;
  grain?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

class AuroraField {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private animationId = 0;
  private resizeObserver: ResizeObserver;

  private bg: string;
  private colors: string[];
  private speed: number;
  private grain: number;

  private locs: {
    res: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    grain: WebGLUniformLocation | null;
    colors: WebGLUniformLocation | null;
    bg: WebGLUniformLocation | null;
  };

  constructor(container: HTMLElement, canvas: HTMLCanvasElement, options: AuroraOptions = {}) {
    this.container = container;
    this.canvas = canvas;

    this.bg = options.bg ?? "#000000";
    this.colors = options.colors ?? ["#86efac", "#4ade80", "#059669", "#000000"];
    this.speed = options.speed ?? 2.0;
    this.grain = options.grain ?? 0.3;

    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;

    const program = this.buildProgram();
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    this.locs = {
      res: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      grain: gl.getUniformLocation(program, "u_grain"),
      colors: gl.getUniformLocation(program, "u_colors"),
      bg: gl.getUniformLocation(program, "u_bg"),
    };

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.animationId = requestAnimationFrame((t) => this.render(t));
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
  }

  private buildProgram(): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram()!;
    gl.attachShader(program, this.compileShader(gl.VERTEX_SHADER, vertexShaderSrc));
    gl.attachShader(program, this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSrc));
    gl.linkProgram(program);
    return program;
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = this.container.clientWidth * dpr;
    this.canvas.height = this.container.clientHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private render = (t: number): void => {
    const gl = this.gl;
    gl.uniform2f(this.locs.res, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.locs.time, t * 0.001 * this.speed);
    gl.uniform1f(this.locs.grain, this.grain);
    gl.uniform3f(this.locs.bg, ...hexToRgb(this.bg));

    const flat = new Float32Array(this.colors.slice(0, 4).flatMap(hexToRgb));
    gl.uniform3fv(this.locs.colors, flat);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.animationId = requestAnimationFrame(this.render);
  };

  destroy(): void {
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.animationId);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("aurora-container");
  const canvas = document.getElementById("aurora-canvas") as HTMLCanvasElement | null;
  if (container && canvas) {
    new AuroraField(container, canvas, {
      bg: "#000000",
      colors: ["#86efac", "#4ade80", "#059669", "#000000"],
      speed: 2.0,
      grain: 0.3,
    });
  }
});