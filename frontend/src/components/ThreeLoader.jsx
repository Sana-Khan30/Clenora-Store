import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import cleanyText from "../assets/cleany-text.png";
import "./Threeloader.css";

function ThreeLoader({ onComplete }) {
  const mountRef = useRef(null);
  const dirtyGlassRef = useRef(null);
  const cleaningWipeRef = useRef(null);
  const logoRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  const [finished, setFinished] = useState(false);

  // Keep onComplete reference current without triggering effect re-runs
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* =========================
       THREE SCENE & CAMERA
    ========================= */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 7;

    /* =========================
       RENDERER
    ========================= */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    /* =========================
       PARTICLES / DUST
    ========================= */
    const particleCount = 450;
    const positions = new Float32Array(particleCount * 3);
    const speeds = [];

    for (let i = 0; i < particleCount; i++) {
      const index = i * 3;
      positions[index] = (Math.random() - 0.5) * 13;
      positions[index + 1] = (Math.random() - 0.5) * 8;
      positions[index + 2] = (Math.random() - 0.5) * 2;

      speeds.push({
        x: (Math.random() - 0.5) * 0.003,
        y: Math.random() * 0.008 + 0.002,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.06,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    /* =========================
       BUBBLES
    ========================= */
    const bubbleGroup = new THREE.Group();
    const bubbleMaterial = new THREE.MeshBasicMaterial({
      color: 0x7eeeff,
      transparent: true,
      opacity: 0.28,
    });

    const bubbleData = [];
    const bubbleGeo = new THREE.SphereGeometry(1, 10, 10);

    for (let i = 0; i < 24; i++) {
      const size = Math.random() * 0.09 + 0.025;
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMaterial);
      bubble.scale.set(size, size, size);
      bubble.position.set(
        (Math.random() - 0.5) * 11,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5)
      );

      bubbleData.push({
        mesh: bubble,
        speed: Math.random() * 0.012 + 0.004,
        offset: Math.random() * Math.PI * 2,
      });

      bubbleGroup.add(bubble);
    }
    scene.add(bubbleGroup);

    /* =========================
       ANIMATION LOOP
    ========================= */
    const startTime = performance.now();
    let animationId = null;
    let hasCompleted = false;

    function finish() {
      if (hasCompleted) return;
      hasCompleted = true;
      setFinished(true);

      setTimeout(() => {
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }, 300);
    }

    // Safety fallback: guaranteed to dismiss loader after 3.2s even on slow/throttled devices
    const safetyTimer = setTimeout(() => {
      finish();
    }, 3200);

    function animate() {
      animationId = requestAnimationFrame(animate);

      const elapsed = (performance.now() - startTime) / 1000;

      /* Particle Movement */
      const positionArray = particleGeometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const index = i * 3;
        if (elapsed < 1.6) {
          positionArray[index] += speeds[i].x;
          positionArray[index + 1] -= speeds[i].y * 0.4;
        } else if (elapsed < 2.4) {
          positionArray[index] += 0.08;
        } else {
          particleMaterial.opacity *= 0.96;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      /* Bubble Movement */
      for (let i = 0; i < bubbleData.length; i++) {
        const item = bubbleData[i];
        item.mesh.position.y += item.speed;
        item.mesh.position.x +=
          Math.sin(elapsed * 1.5 + item.offset) * 0.003;

        if (item.mesh.position.y > 4.5) {
          item.mesh.position.y = -4.5;
        }
      }

      /* Wipe Progress - Direct DOM manipulation (No React re-renders) */
      let progress = 0;
      if (elapsed > 0.7 && elapsed < 2.2) {
        progress = (elapsed - 0.7) / 1.5;
      } else if (elapsed >= 2.2) {
        progress = 1;
      }

      if (dirtyGlassRef.current) {
        dirtyGlassRef.current.style.transform = `translateX(${progress * 115}%)`;
      }
      if (cleaningWipeRef.current) {
        cleaningWipeRef.current.style.left = `${progress * 120 - 20}%`;
      }

      /* Logo Reveal */
      if (elapsed > 1.6 && logoRef.current) {
        logoRef.current.classList.add("show-logo");
      }

      /* Render */
      renderer.render(scene, camera);

      /* Complete Animation */
      if (elapsed >= 2.8 && !hasCompleted) {
        finish();
      }
    }

    animate();

    /* =========================
       RESIZE LISTENER
    ========================= */
    function handleResize() {
      if (!renderer.domElement) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", handleResize);

    /* =========================
       CLEANUP
    ========================= */
    return () => {
      clearTimeout(safetyTimer);
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);

      particleGeometry.dispose();
      particleMaterial.dispose();
      bubbleGeo.dispose();
      bubbleMaterial.dispose();
      renderer.dispose();

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []); // Run once on mount!

  return (
    <div className={`three-loader ${finished ? "loader-finish" : ""}`}>
      {/* THREE CANVAS */}
      <div ref={mountRef} className="three-canvas" />

      {/* FOGGY / DIRTY GLASS */}
      <div ref={dirtyGlassRef} className="dirty-glass" />

      {/* CLEANING WIPE */}
      <div ref={cleaningWipeRef} className="cleaning-wipe" />

      {/* CLEAN REFLECTION */}
      <div className="clean-reflection" />

      {/* LOGO */}
      <div ref={logoRef} className="loader-content">
        <div className="logo-light" />
        <img src={cleanyText} alt="CLEANY" className="cleany-loader-logo" />
        <p>A FRESHER WAY TO CLEAN</p>
        <div className="logo-shine" />
      </div>
    </div>
  );
}

export default ThreeLoader;