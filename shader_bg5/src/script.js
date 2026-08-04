"use strict";
const FormShapes = {
    Checks: 0,
    Stripes: 1,
    Edge: 2,
};
const presets = {
    Aurora: {
        color1: "#0a001a", color2: "#1a0b2e", color3: "#f20089",
        rotation: -45, proportion: 60, scale: 0.6, speed: 15,
        distortion: 40, swirl: 80, swirlIterations: 10, softness: 100,
        offset: 200, shape: "Edge", shapeSize: 50,
    },
    Oceanic: {
        color1: "#000814", color2: "#001d3d", color3: "#00b4d8",
        rotation: 0, proportion: 70, scale: 0.4, speed: 10,
        distortion: 15, swirl: 50, swirlIterations: 12, softness: 80,
        offset: 150, shape: "Checks", shapeSize: 30,
    },
    Amber: {
        color1: "#140c00", color2: "#4a2500", color3: "#f57c00",
        rotation: 120, proportion: 80, scale: 0.8, speed: 20,
        distortion: 25, swirl: 60, swirlIterations: 8, softness: 90,
        offset: 500, shape: "Stripes", shapeSize: 40,
    },
    Toxic: {
        color1: "#050d05", color2: "#0a240a", color3: "#39ff14",
        rotation: -90, proportion: 55, scale: 0.5, speed: 25,
        distortion: 60, swirl: 100, swirlIterations: 15, softness: 70,
        offset: -100, shape: "Edge", shapeSize: 20,
    },
    Ghost: {
        color1: "#0a0a0a", color2: "#1c1c1c", color3: "#a3a3a3",
        rotation: 45, proportion: 50, scale: 0.3, speed: 8,
        distortion: 10, swirl: 30, swirlIterations: 5, softness: 100,
        offset: 0, shape: "Checks", shapeSize: 60,
    },
};
function parseColor(input) {
    let r = 0, g = 0, b = 0, a = 1;
    if (input.startsWith("rgba(")) {
        const parts = input.slice(5, -1).split(",");
        r = parseInt(parts[0] ?? "0") / 255;
        g = parseInt(parts[1] ?? "0") / 255;
        b = parseInt(parts[2] ?? "0") / 255;
        a = parseFloat(parts[3] ?? "1");
    }
    else if (input.startsWith("rgb(")) {
        const parts = input.slice(4, -1).split(",");
        r = parseInt(parts[0] ?? "0") / 255;
        g = parseInt(parts[1] ?? "0") / 255;
        b = parseInt(parts[2] ?? "0") / 255;
    }
    else if (input.startsWith("hsla(") || input.startsWith("hsl(")) {
        const isHsla = input.startsWith("hsla(");
        const parts = input.slice(isHsla ? 5 : 4, -1).split(",");
        const h = parseFloat(parts[0] ?? "0") / 360;
        const s = parseFloat(parts[1] ?? "0") / 100;
        const l = parseFloat(parts[2] ?? "0") / 100;
        a = isHsla ? parseFloat(parts[3] ?? "1") : 1;
        [r, g, b] = hslToRgb(h, s, l);
    }
    else if (input.startsWith("#")) {
        const c = input.slice(1);
        if (c.length === 3) {
            r = parseInt(c.charAt(0) + c.charAt(0), 16) / 255;
            g = parseInt(c.charAt(1) + c.charAt(1), 16) / 255;
            b = parseInt(c.charAt(2) + c.charAt(2), 16) / 255;
        }
        else if (c.length >= 6) {
            r = parseInt(c.slice(0, 2), 16) / 255;
            g = parseInt(c.slice(2, 4), 16) / 255;
            b = parseInt(c.slice(4, 6), 16) / 255;
            if (c.length === 8)
                a = parseInt(c.slice(6, 8), 16) / 255;
        }
    }
    return [r, g, b, a];
}
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    }
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r, g, b];
}
const vertexShaderSrc = `#version 300 es
in vec4 a_position;
void main() {
  gl_Position = a_position;
}`;
const fragmentShaderSrc = `#version 300 es
precision highp float;

uniform float u_time;
uniform float u_pixelRatio;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_rotation;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;
uniform float u_proportion;
uniform float u_softness;
uniform float u_shape;
uniform float u_shapeScale;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_swirlIterations;

out vec4 fragColor;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

vec4 blend_colors(vec4 c1, vec4 c2, vec4 c3, float mixer, float edgesWidth, float edge_blur) {
    vec3 color1 = c1.rgb * c1.a;
    vec3 color2 = c2.rgb * c2.a;
    vec3 color3 = c3.rgb * c3.a;

    float r1 = smoothstep(.0 + .35 * edgesWidth, .7 - .35 * edgesWidth + .5 * edge_blur, mixer);
    float r2 = smoothstep(.3 + .35 * edgesWidth, 1. - .35 * edgesWidth + edge_blur, mixer);

    vec3 blended_color_2 = mix(color1, color2, r1);
    float blended_opacity_2 = mix(c1.a, c2.a, r1);

    vec3 c = mix(blended_color_2, color3, r2);
    float o = mix(blended_opacity_2, c3.a, r2);
    return vec4(c, o);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    float t = .5 * u_time;

    float noise_scale = .0005 + .006 * u_scale;

    uv -= .5;
    uv *= (noise_scale * u_resolution);
    uv = rotate(uv, u_rotation * .5 * PI);
    uv /= u_pixelRatio;
    uv += .5;

    float n1 = noise(uv * 1. + t);
    float n2 = noise(uv * 2. - t);
    float angle = n1 * TWO_PI;
    uv.x += 4. * u_distortion * n2 * cos(angle);
    uv.y += 4. * u_distortion * n2 * sin(angle);

    float iterations_number = ceil(clamp(u_swirlIterations, 1., 30.));
    for (float i = 1.; i <= iterations_number; i++) {
        uv.x += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1.5 * uv.y);
        uv.y += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1. * uv.x);
    }

    float proportion = clamp(u_proportion, 0., 1.);

    float shape = 0.;
    float mixer = 0.;
    if (u_shape < .5) {
      vec2 checks_shape_uv = uv * (.5 + 3.5 * u_shapeScale);
      shape = .5 + .5 * sin(checks_shape_uv.x) * cos(checks_shape_uv.y);
      mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
    } else if (u_shape < 1.5) {
      vec2 stripes_shape_uv = uv * (.25 + 3. * u_shapeScale);
      float f = fract(stripes_shape_uv.y);
      shape = smoothstep(.0, .55, f) * smoothstep(1., .45, f);
      mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
    } else {
      float sh = 1. - uv.y;
      sh -= .5;
      sh /= (noise_scale * u_resolution.y);
      sh += .5;
      float shape_scaling = .2 * (1. - u_shapeScale);
      shape = smoothstep(.45 - shape_scaling, .55 + shape_scaling, sh + .3 * (proportion - .5));
      mixer = shape;
    }

    vec4 color_mix = blend_colors(u_color1, u_color2, u_color3, mixer, 1. - clamp(u_softness, 0., 1.), .01 + .01 * u_scale);

    fragColor = vec4(color_mix.rgb, color_mix.a);
}
`;
class FlowField {
    canvas;
    container;
    gl;
    program;
    startTime = 0;
    animationId = 0;
    resizeObserver;
    params;
    uniforms;
    constructor(container, canvas, options = {}) {
        this.container = container;
        this.canvas = canvas;
        const preset = presets[options.preset ?? "Aurora"] ?? presets.Aurora;
        this.params = { ...preset, speed: options.speed ?? preset.speed };
        const gl = canvas.getContext("webgl2", {
            premultipliedAlpha: true,
            alpha: true,
            antialias: true,
        });
        if (!gl)
            throw new Error("WebGL2 not supported");
        this.gl = gl;
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSrc);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);
        this.program = program;
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const positionLoc = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        this.uniforms = {
            u_time: gl.getUniformLocation(program, "u_time"),
            u_resolution: gl.getUniformLocation(program, "u_resolution"),
            u_pixelRatio: gl.getUniformLocation(program, "u_pixelRatio"),
            u_scale: gl.getUniformLocation(program, "u_scale"),
            u_rotation: gl.getUniformLocation(program, "u_rotation"),
            u_color1: gl.getUniformLocation(program, "u_color1"),
            u_color2: gl.getUniformLocation(program, "u_color2"),
            u_color3: gl.getUniformLocation(program, "u_color3"),
            u_proportion: gl.getUniformLocation(program, "u_proportion"),
            u_softness: gl.getUniformLocation(program, "u_softness"),
            u_shape: gl.getUniformLocation(program, "u_shape"),
            u_shapeScale: gl.getUniformLocation(program, "u_shapeScale"),
            u_distortion: gl.getUniformLocation(program, "u_distortion"),
            u_swirl: gl.getUniformLocation(program, "u_swirl"),
            u_swirlIterations: gl.getUniformLocation(program, "u_swirlIterations"),
        };
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();
        this.startTime = performance.now();
        this.animationId = requestAnimationFrame((t) => this.render(t));
    }
    compileShader(type, src) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        return shader;
    }
    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const pixelRatio = window.devicePixelRatio || 1;
        this.canvas.width = width * pixelRatio;
        this.canvas.height = height * pixelRatio;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    render = (time) => {
        const gl = this.gl;
        const p = this.params;
        const elapsed = (time - this.startTime) / 1000;
        const speed = (p.speed / 100) * 5;
        gl.uniform1f(this.uniforms.u_time, elapsed * speed + p.offset * 0.01);
        gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.u_pixelRatio, window.devicePixelRatio || 1);
        gl.uniform1f(this.uniforms.u_scale, p.scale);
        gl.uniform1f(this.uniforms.u_rotation, (p.rotation * Math.PI) / 180);
        const c1 = parseColor(p.color1);
        const c2 = parseColor(p.color2);
        const c3 = parseColor(p.color3);
        gl.uniform4f(this.uniforms.u_color1, c1[0], c1[1], c1[2], c1[3]);
        gl.uniform4f(this.uniforms.u_color2, c2[0], c2[1], c2[2], c2[3]);
        gl.uniform4f(this.uniforms.u_color3, c3[0], c3[1], c3[2], c3[3]);
        gl.uniform1f(this.uniforms.u_proportion, p.proportion / 100);
        gl.uniform1f(this.uniforms.u_softness, p.softness / 100);
        gl.uniform1f(this.uniforms.u_shape, FormShapes[p.shape]);
        gl.uniform1f(this.uniforms.u_shapeScale, p.shapeSize / 100);
        gl.uniform1f(this.uniforms.u_distortion, p.distortion / 50);
        gl.uniform1f(this.uniforms.u_swirl, p.swirl / 100);
        gl.uniform1f(this.uniforms.u_swirlIterations, p.swirl === 0 ? 0 : p.swirlIterations);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this.animationId = requestAnimationFrame(this.render);
    };
    destroy() {
        cancelAnimationFrame(this.animationId);
        this.resizeObserver.disconnect();
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("gradient-container");
    const canvas = document.getElementById("gradient-canvas");
    const grain = document.getElementById("gradient-grain");
    if (container && canvas) {
        try {
            new FlowField(container, canvas, { preset: "Aurora" });
            if (grain)
                grain.style.opacity = "0.15";
        }
        catch (e) {
            container.style.background =
                "linear-gradient(135deg, #0a001a, #1a0b2e 50%, #f20089)";
            if (canvas)
                canvas.style.display = "none";
        }
    }
});
