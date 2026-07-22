declare const THREE: any;

(function () {
  const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  script.onload = initHero;
  document.head.appendChild(script);

  function initHero(): void {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      canvas!.clientWidth / canvas!.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 2.5);

    const geo = new THREE.PlaneGeometry(8, 6, 120, 80);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vElevation;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float w1 = sin(pos.x * 1.8 + uTime * 0.5) * cos(pos.y * 1.2 + uTime * 0.3) * 0.18;
          float w2 = sin(pos.x * 2.5 - uTime * 0.4 + pos.y * 1.5) * 0.12;
          float w3 = cos(pos.x * 1.1 + pos.y * 2.0 + uTime * 0.6) * 0.09;
          pos.z += w1 + w2 + w3;
          vElevation = pos.z;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vElevation;
        void main() {
          vec3 dark   = vec3(0.05, 0.02, 0.12);
          vec3 purple = vec3(0.32, 0.12, 0.75);
          vec3 violet = vec3(0.48, 0.18, 0.88);
          vec3 bright = vec3(0.62, 0.30, 0.98);
          float t = clamp((vElevation + 0.35) / 0.70, 0.0, 1.0);
          float pulse = sin(uTime * 0.3 + vUv.x * 3.14) * 0.5 + 0.5;
          vec3 col = mix(dark, purple, smoothstep(0.12, 0.52, t));
          col = mix(col, violet, smoothstep(0.42, 0.75, t) * (0.7 + 0.3 * pulse));
          col = mix(col, bright, smoothstep(0.7, 1.0, t) * 0.8);
          float fade = smoothstep(0.0, 0.42, vUv.y) * smoothstep(0.0, 0.42, 1.0 - vUv.y)
           * smoothstep(0.0, 0.32, vUv.x) * smoothstep(0.0, 0.32, 1.0 - vUv.x);
          col *= 0.2 + 0.8 * fade;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    function resize(): void {
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    (function animate(): void {
      requestAnimationFrame(animate);
      t += 0.012;
      mat.uniforms.uTime.value = t;
      renderer.render(scene, camera);
    })();
  }
})();