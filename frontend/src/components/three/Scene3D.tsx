import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Variant = 'hero' | 'app' | 'auth';

const PALETTE = [0x7c5cff, 0x38bdf8, 0xe879f9, 0x34d399, 0x818cf8, 0xf59e0b];

/**
 * Full-screen WebGL backdrop. "hero" is the landing showpiece, "auth" a calmer
 * variant, "app" a light-weight ambient field behind the dashboard.
 */
export default function Scene3D({ variant = 'app' }: { variant?: Variant }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return; // no WebGL: CSS gradients underneath still look good
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isHero = variant === 'hero';
    const isApp = variant === 'app';
    // Phones and low-power machines get fewer particles, a lower resolution and 30 fps.
    const low = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4;
    const density = low ? 0.45 : 1;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1 : isApp ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04050c, isApp ? 0.05 : 0.038);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(0, 0.6, isHero ? 9 : 11);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T) => {
      disposables.push(o);
      return o;
    };

    /* Lights */
    scene.add(new THREE.AmbientLight(0x6b72ff, 0.35));
    const key = new THREE.PointLight(0x8b5cf6, 60, 40);
    key.position.set(4, 5, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0x22d3ee, 40, 40);
    rim.position.set(-6, -2, 3);
    scene.add(rim);

    /* Starfield with per-vertex color */
    const starCount = Math.round((isApp ? 900 : isHero ? 2600 : 1600) * density);
    const starGeo = track(new THREE.BufferGeometry());
    const pos = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    const c = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      const r = 8 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      pos[i * 3 + 2] = r * Math.cos(phi) - 10;
      c.setHex(PALETTE[i % PALETTE.length]).lerp(new THREE.Color(0xffffff), 0.45 + Math.random() * 0.4);
      col.set([c.r, c.g, c.b], i * 3);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const starMat = track(
      new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
    );
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    /* Synthwave grid floor that scrolls toward the viewer */
    const grid = new THREE.GridHelper(120, 80, 0x7c5cff, 0x2a2f66);
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = isApp ? 0.16 : 0.32;
    gridMat.depthWrite = false;
    grid.position.y = isHero ? -3.2 : -4;
    scene.add(grid);
    track(grid.geometry);
    track(gridMat);

    /* Group that holds the hero objects */
    const rig = new THREE.Group();
    scene.add(rig);

    // Glowing faceted core
    const coreGeo = track(new THREE.IcosahedronGeometry(isHero ? 1.55 : 1.2, 1));
    const coreMat = track(
      new THREE.MeshStandardMaterial({ color: 0x1b1550, emissive: 0x3b1fa8, emissiveIntensity: 0.55, metalness: 0.75, roughness: 0.22, flatShading: true })
    );
    const core = new THREE.Mesh(coreGeo, coreMat);
    const wireGeo = track(new THREE.IcosahedronGeometry(isHero ? 1.95 : 1.5, 2));
    const wireMat = track(new THREE.MeshBasicMaterial({ color: 0x8b9bff, wireframe: true, transparent: true, opacity: 0.22 }));
    const wire = new THREE.Mesh(wireGeo, wireMat);
    const haloGeo = track(new THREE.SphereGeometry(isHero ? 2.6 : 2, 32, 32));
    const haloMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        uniforms: { uColor: { value: new THREE.Color(0x6d5cff) } },
        vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 uColor; varying vec3 vN; void main(){ float i = pow(0.75 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(uColor, 1.0) * i; }',
      })
    );
    const halo = new THREE.Mesh(haloGeo, haloMat);

    // Orbiting ring of "timetable cells" (instanced, so it's one draw call)
    const cellCount = Math.round((isHero ? 84 : 48) * (low ? 0.6 : 1));
    const cellGeo = track(new THREE.BoxGeometry(0.42, 0.26, 0.05));
    const cellMat = track(new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.35, emissiveIntensity: 0.6, emissive: 0x111133 }));
    const cells = new THREE.InstancedMesh(cellGeo, cellMat, cellCount);
    const dummy = new THREE.Object3D();
    const cellMeta: { angle: number; radius: number; y: number; speed: number; spin: number }[] = [];
    for (let i = 0; i < cellCount; i++) {
      const ring = i % 3;
      cellMeta.push({
        angle: (i / cellCount) * Math.PI * 2 * 3 + ring,
        radius: (isHero ? 3.2 : 2.6) + ring * 0.75 + Math.random() * 0.25,
        y: (Math.random() - 0.5) * 0.9,
        speed: 0.12 + ring * 0.05,
        spin: Math.random() * Math.PI,
      });
      cells.setColorAt(i, new THREE.Color(PALETTE[i % PALETTE.length]));
    }
    if (cells.instanceColor) cells.instanceColor.needsUpdate = true;

    // Thin orbit rings
    const rings: THREE.Mesh[] = [];
    [3.1, 3.9, 4.7].forEach((r, i) => {
      const g = track(new THREE.TorusGeometry(isHero ? r : r * 0.8, 0.008, 8, 160));
      const m = track(new THREE.MeshBasicMaterial({ color: PALETTE[i], transparent: true, opacity: 0.35 }));
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = Math.PI / 2 + (i - 1) * 0.18;
      rings.push(mesh);
      rig.add(mesh);
    });

    rig.add(core, wire, halo, cells);

    // Floating satellites
    const sats: THREE.Mesh[] = [];
    const satGeos = [new THREE.OctahedronGeometry(0.35), new THREE.TorusKnotGeometry(0.28, 0.09, 80, 10), new THREE.TetrahedronGeometry(0.4), new THREE.DodecahedronGeometry(0.3)];
    satGeos.forEach(track);
    const satCount = isApp ? 5 : 7;
    for (let i = 0; i < satCount; i++) {
      const m = track(
        new THREE.MeshStandardMaterial({ color: PALETTE[i % PALETTE.length], emissive: PALETTE[i % PALETTE.length], emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.25, flatShading: true })
      );
      const s = new THREE.Mesh(satGeos[i % satGeos.length], m);
      const a = (i / satCount) * Math.PI * 2;
      s.position.set(Math.cos(a) * (6 + (i % 3)), Math.sin(a * 2) * 2.2, Math.sin(a) * 3 - 3);
      s.userData = { base: s.position.clone(), phase: Math.random() * 10 };
      sats.push(s);
      scene.add(s);
    }

    // Placement per variant
    if (variant === 'app') {
      rig.position.set(6.5, 1.2, -6);
      rig.scale.setScalar(0.9);
    } else if (variant === 'auth') {
      rig.position.set(3.2, 0.2, -1);
    } else {
      rig.position.set(2.6, 0.3, 0);
    }

    /* Interaction */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const followPointer = variant === 'app';
    const onMove = (e: PointerEvent) => {
      if (!followPointer) return;
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    let scrollY = window.scrollY;
    const onScroll = () => (scrollY = window.scrollY);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    const resize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the composition on small screens
      if (variant === 'hero') {
        rig.position.set(w < 900 ? 1.4 : 2.6, w < 900 ? 5.2 : 0.3, w < 900 ? -7 : 0);
        rig.scale.setScalar(w < 900 ? 0.6 : 1);
      }
      if (variant === 'auth') rig.position.x = w < 900 ? 0 : 3.2;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    /* Loop */
    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;
    const onVis = () => {
      visible = document.visibilityState === 'visible';
      if (visible && !reduced) {
        clock.getDelta();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    function frame(t: number) {
      if (!followPointer) {
        // slow automatic drift instead of mouse tracking
        pointer.tx = Math.sin(t * 0.15) * 0.5;
        pointer.ty = Math.cos(t * 0.11) * 0.25;
      }
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      const scroll = Math.min(scrollY / 900, 1.5);
      camera.position.x = pointer.x * 0.9;
      camera.position.y = 0.6 - pointer.y * 0.6 - (isHero ? scroll * 1.2 : 0);
      camera.lookAt(isHero ? 1 : 0, 0, 0);

      core.rotation.set(t * 0.18 + scroll, t * 0.25, 0);
      wire.rotation.set(-t * 0.1, -t * 0.16, t * 0.05);
      halo.scale.setScalar(1 + Math.sin(t * 1.4) * 0.03);
      coreMat.emissiveIntensity = 0.5 + Math.sin(t * 1.4) * 0.15;
      rings.forEach((r, i) => (r.rotation.z = t * (0.05 + i * 0.03) * (i % 2 ? -1 : 1)));

      for (let i = 0; i < cellCount; i++) {
        const m = cellMeta[i];
        const a = m.angle + t * m.speed;
        dummy.position.set(Math.cos(a) * m.radius, m.y + Math.sin(t * 0.8 + i) * 0.12, Math.sin(a) * m.radius);
        dummy.rotation.set(m.spin + t * 0.3, -a + Math.PI / 2, 0);
        dummy.updateMatrix();
        cells.setMatrixAt(i, dummy.matrix);
      }
      cells.instanceMatrix.needsUpdate = true;
      rig.rotation.x = 0.35 + pointer.y * 0.08;
      rig.rotation.z = -0.12 + pointer.x * 0.05;

      sats.forEach((s, i) => {
        const b = s.userData.base as THREE.Vector3;
        s.position.y = b.y + Math.sin(t * 0.6 + s.userData.phase) * 0.5;
        s.rotation.x = t * (0.2 + i * 0.03);
        s.rotation.y = t * (0.3 + i * 0.02);
      });

      stars.rotation.y = t * 0.012;
      grid.position.z = (t * 1.2) % 1.5;
      renderer.render(scene, camera);
    }

    let last = 0;
    function tick() {
      if (!visible) return;
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      if (low && t - last < 1 / 30) return;
      last = t;
      frame(t);
    }
    if (reduced) frame(4);
    else raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      cells.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [variant]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* CSS aurora layers under the canvas; also the fallback when WebGL is unavailable */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_0%,rgba(124,92,255,0.28),transparent_60%),radial-gradient(ellipse_60%_50%_at_0%_100%,rgba(34,184,240,0.18),transparent_60%),radial-gradient(ellipse_50%_40%_at_100%_80%,rgba(232,121,249,0.12),transparent_60%)]" />
      <div ref={host} className="absolute inset-0" />
      <div className="noise absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#04050c] to-transparent" />
    </div>
  );
}
