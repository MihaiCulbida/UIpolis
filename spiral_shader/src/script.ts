export {};

declare const THREE: any;

interface SceneState {
  camera: any;
  scene: any;
  renderer: any;
  uniforms: {
    time: { type: string; value: number };
    resolution: { type: string; value: any };
  };
  animationId: number;
}

const container = document.getElementById("shader-container") as HTMLDivElement;

if (container) {
  const vertexShader = `
    void main() {
      gl_Position = vec4( position, 1.0 );
    }
  `;

  const fragmentShader = `
    #define TWO_PI 6.2831853072
    #define PI 3.14159265359

    precision highp float;
    uniform vec2 resolution;
    uniform float time;

    vec3 getColor(float intensity) {
        vec3 color1 = vec3(1.0, 0.05, 0.25);
        vec3 color2 = vec3(1.0, 0.4, 0.0);
        vec3 color3 = vec3(1.0, 1.0, 0.0);
        vec3 color4 = vec3(0.1, 1.0, 0.1);
        vec3 color5 = vec3(0.2, 0.5, 1.0);
        vec3 color6 = vec3(0.7, 0.0, 1.0);
        vec3 color7 = vec3(1.0, 0.0, 0.7);

        vec3 finalColor = color1;
        finalColor = mix(finalColor, color2, smoothstep(0.0, 0.17, intensity));
        finalColor = mix(finalColor, color3, smoothstep(0.17, 0.34, intensity));
        finalColor = mix(finalColor, color4, smoothstep(0.34, 0.51, intensity));
        finalColor = mix(finalColor, color5, smoothstep(0.51, 0.68, intensity));
        finalColor = mix(finalColor, color6, smoothstep(0.68, 0.85, intensity));
        finalColor = mix(finalColor, color7, smoothstep(0.85, 1.0, intensity));

        return finalColor;
    }

    void main(void) {
      vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
      float t = time*0.05;
      float lineWidth = 0.003;

      float radius = length(uv);
      float angle = atan(uv.y, uv.x);

      float total_intensity = 0.0;

      for(int i=0; i < 5; i++){
        float spiral_pattern = radius * 2.0 + angle * 0.5;
        total_intensity += lineWidth*float(i*i) / abs(fract(t + float(i)*0.02)*5.0 - spiral_pattern + mod(uv.x+uv.y, 0.2));
      }

      vec3 finalColor = getColor(fract(total_intensity * 0.25 + t * 0.1));

      gl_FragColor = vec4(finalColor * total_intensity, 1.0);
    }
  `;

  const camera = new THREE.Camera();
  camera.position.z = 1;

  const scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry(2, 2);

  const uniforms = {
    time: { type: "f", value: 1.0 },
    resolution: { type: "v2", value: new THREE.Vector2() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const sceneState: SceneState = {
    camera,
    scene,
    renderer,
    uniforms,
    animationId: 0,
  };

  const onWindowResize = (): void => {
    const { clientWidth, clientHeight } = container;
    renderer.setSize(clientWidth, clientHeight);
    uniforms.resolution.value.x = renderer.domElement.width;
    uniforms.resolution.value.y = renderer.domElement.height;
  };
  onWindowResize();
  window.addEventListener("resize", onWindowResize, false);

  const animate = (): void => {
    sceneState.animationId = requestAnimationFrame(animate);
    uniforms.time.value += 0.05;
    renderer.render(scene, camera);
  };

  animate();

  window.addEventListener("beforeunload", () => {
    window.removeEventListener("resize", onWindowResize);
    cancelAnimationFrame(sceneState.animationId);
    if (container && renderer.domElement) {
      container.removeChild(renderer.domElement);
    }
    renderer.dispose();
    geometry.dispose();
    material.dispose();
  });
}