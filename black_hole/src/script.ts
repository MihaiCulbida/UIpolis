interface BlackHoleConfig {
  distance: number;
  elevation: number;
  azimuth: number;
  orbitSpeed: number;
  roll: number;
  fov: number;
  diskInner: number;
  diskOuter: number;
  diskThickness: number;
  diskDensity: number;
  brightness: number;
  spinSpeed: number;
  grain: number;
  doppler: number;
  hotColor: string;
  midColor: string;
  coolColor: string;
  starBrightness: number;
  glow: number;
  exposure: number;
  vignette: number;
  steps: number;
  resolution: number;
  maxDpr: number;
  focus: [number, number];
  scrim: "none" | "left" | "right" | "top" | "bottom";
  scrimStrength: number;
  paused: boolean;
}

type GLContext = WebGL2RenderingContext | WebGLRenderingContext;

interface Prog {
  program: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
}

interface Target {
  fb: WebGLFramebuffer;
  tex: WebGLTexture;
  w: number;
  h: number;
}

