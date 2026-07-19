const fragmentSource = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float
  a=rnd(i),
  b=rnd(i+vec2(1,0)),
  c=rnd(i+vec2(0,1)),
  d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) {
    t+=a*noise(p);
    p*=2.*m;
    a*=.5;
  }
  return t;
}
float clouds(vec2 p) {
	float d=1., t=.0;
	for (float i=.0; i<3.; i++) {
		float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
		t=mix(t,d,a);
		d=a;
		p*=2./(i+1.);
	}
	return t;
}
void main(void) {
	vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
	vec3 col=vec3(0);
	float bg=clouds(vec2(st.x+T*.5,-st.y));
	uv*=1.-.3*(sin(T*.2)*.5+.5);
	for (float i=1.; i<12.; i++) {
		uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
		vec2 p=uv;
		float d=length(p);
		col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
		float b=noise(i+p+bg*1.731);
		col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
		col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);
	}
	O=vec4(col,1);
}`;

const vertexSource = `#version 300 es
precision highp float;
in vec4 position;
void main(){ gl_Position = position; }`;

interface ShaderUniforms {
	resolution: WebGLUniformLocation | null;
	time: WebGLUniformLocation | null;
}

class ShaderBackground {
	private canvas: HTMLCanvasElement;
	private gl: WebGL2RenderingContext;
	private program: WebGLProgram | null = null;
	private buffer: WebGLBuffer | null = null;
	private dpr: number;
	private uniforms: ShaderUniforms = { resolution: null, time: null };

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;

		const gl = canvas.getContext('webgl2');
		if (!gl) {
			throw new Error('WebGL2 is not supported in this browser.');
		}
		this.gl = gl;

		this.dpr = Math.max(1, 0.5 * (window.devicePixelRatio || 1));

		this.setup();
		this.resize();

		window.addEventListener('resize', () => this.resize());
	}

	private compile(shader: WebGLShader, source: string): void {
		const gl = this.gl;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error('Shader compile error:', gl.getShaderInfoLog(shader));
		}
	}

	private setup(): void {
		const gl = this.gl;

		const vs = gl.createShader(gl.VERTEX_SHADER)!;
		const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
		this.compile(vs, vertexSource);
		this.compile(fs, fragmentSource);

		this.program = gl.createProgram()!;
		gl.attachShader(this.program, vs);
		gl.attachShader(this.program, fs);
		gl.linkProgram(this.program);

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			console.error('Program link error:', gl.getProgramInfoLog(this.program));
		}

		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]),
			gl.STATIC_DRAW
		);

		const position = gl.getAttribLocation(this.program, 'position');
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

		this.uniforms.resolution = gl.getUniformLocation(this.program, 'resolution');
		this.uniforms.time = gl.getUniformLocation(this.program, 'time');
	}

	resize(): void {
		const gl = this.gl;
		this.canvas.width = window.innerWidth * this.dpr;
		this.canvas.height = window.innerHeight * this.dpr;
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	}

	render(nowMs: number): void {
		const gl = this.gl;
		if (!this.program) return;

		gl.useProgram(this.program);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
		gl.uniform1f(this.uniforms.time, nowMs * 1e-3);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}
}

const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
const bg = new ShaderBackground(canvas);

function loop(now: number): void {
	bg.render(now);
	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);