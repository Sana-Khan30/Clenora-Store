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

  // Keep latest onComplete reference without restarting effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finish = useRef(() => {});

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
      antialias: false, // Turned off for max FPS & low battery usage
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    /* =========================
       LIGHTWEIGHT PARTICLES (160)
    ========================= */
    const particleCount = 160;
    const positions = new Float32Array(particleCount * 3);
    const speeds = [];

    for (let i = 0; i < particleCount; i++) {
      const index = i * 3;
      positions[index] = (Math.random() - 0.5) * 14;
      positions[index + 1] = (Math.random() - 0.5) * 9;
      positions[index + 2] = (Math.random() - 0.5) * 2;

      speeds.push({
        x: (Math.random() - 0.5) * 0.004,
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
      size: 0.07,
      transparent: true,
      opacity: 0.5,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    /* =========================
       BUBBLES (12)
    ========================= */
    const bubbleGroup = new THREE.Group();
    const bubbleMaterial = new THREE.MeshBasicMaterial({
      color: 0x7eeeff,
      transparent: true,
      opacity: 0.25,
    });

    const bubbleData = [];
    const bubbleGeo = new THREE.SphereGeometry(1, 8, 8);

    for (let i = 0; i < 12; i++) {
      const size = Math.random() * 0.08 + 0.03;
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMaterial);
      bubble.scale.set(size, size, size);
      bubble.position.set(
        (Math.random() - 0.5) * 11,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5)
      );

      bubbleData.push({
        mesh: bubble,
        speed: Math.random() * 0.015 + 0.005,
        offset: Math.random() * Math.PI * 2,
      });

      bubbleGroup.add(bubble);
    }
    scene.add(bubbleGroup);

    /* =========================
       FAST & SMOOTH ANIMATION
    ========================= */
    const startTime = performance.now();
    let animationId = null;
    let hasCompleted = false;

    finish.current = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      setFinished(true);

      setTimeout(() => {
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }, 250);
    };

    // Hard fallback timeout: 2.2s max duration
    const safetyTimer = setTimeout(() => {
      finish.current();
    }, 2200);

    function animate() {
      animationId = requestAnimationFrame(animate);

      const elapsed = (performance.now() - startTime) / 1000;

      /* Fast Wipe Curve (0.2s to 1.2s) */
      let progress = 0;
      if (elapsed > 0.2 && elapsed < 1.2) {
        progress = (elapsed - 0.2) / 1.0;
      } else if (elapsed >= 1.2) {
        progress = 1;
      }

      // Direct GPU transform - zero layout reflows
      if (dirtyGlassRef.current) {
        dirtyGlassRef.current.style.transform = `translate3d(${progress * 115}%, 0, 0)`;
      }
      if (cleaningWipeRef.current) {
        cleaningWipeRef.current.style.transform = `translate3d(${progress * 130 - 20}vw, 0, 0) rotate(-12deg)`;
      }

      /* Logo Reveal (from 0.6s) */
      if (elapsed > 0.6 && logoRef.current) {
        logoRef.current.classList.add("show-logo");
      }

      /* Lightweight particle movement */
      const pos = particleGeometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        if (elapsed < 1.0) {
          pos[idx] += speeds[i].x;
          pos[idx + 1] -= speeds[i].y * 0.3;
        } else {
          pos[idx] += 0.06;
          particleMaterial.opacity *= 0.97;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      /* Bubble movement */
      for (let i = 0; i < bubbleData.length; i++) {
        const b = bubbleData[i];
        b.mesh.position.y += b.speed;
        if (b.mesh.position.y > 4.5) b.mesh.position.y = -4.5;
      }

      renderer.render(scene, camera);

      /* Finish cleanly at 1.7s - No hanging at 80%! */
      if (elapsed >= 1.7 && !hasCompleted) {
        finish.current();
      }
    }

    animate();

    /* =========================
       CLEANUP
    ========================= */
    return () => {
      clearTimeout(safetyTimer);
      if (animationId) cancelAnimationFrame(animationId);

      particleGeometry.dispose();
      particleMaterial.dispose();
      bubbleGeo.dispose();
      bubbleMaterial.dispose();
      renderer.dispose();

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className={`three-loader ${finished ? "loader-finish" : ""}`}
      onClick={() => finish.current()}
      title="Click to skip"
    >
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