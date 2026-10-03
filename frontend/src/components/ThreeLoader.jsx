import { useEffect, useRef, useState } from "react";

import * as THREE from "three";

import cleanyText from "../assets/cleany-text.png";

import "./Threeloader.css";


function ThreeLoader({ onComplete }) {

  const mountRef = useRef(null);

  const [wipeProgress, setWipeProgress] = useState(0);

  const [logoVisible, setLogoVisible] = useState(false);

  const [finished, setFinished] = useState(false);


  useEffect(() => {

    const mount = mountRef.current;

    if (!mount) return;


    /* =========================
       THREE SCENE
    ========================= */

    const scene = new THREE.Scene();


    /* =========================
       CAMERA
    ========================= */

    const camera =
      new THREE.PerspectiveCamera(

        60,

        window.innerWidth /
        window.innerHeight,

        0.1,

        100

      );


    camera.position.z = 7;


    /* =========================
       RENDERER
    ========================= */

    const renderer =
      new THREE.WebGLRenderer({

        antialias: true,

        alpha: true

      });


    renderer.setPixelRatio(

      Math.min(
        window.devicePixelRatio,
        2
      )

    );


    renderer.setSize(

      window.innerWidth,

      window.innerHeight

    );


    mount.appendChild(
      renderer.domElement
    );


    /* =========================
       PARTICLES / DUST
    ========================= */

    const particleCount = 700;

    const positions =
      new Float32Array(
        particleCount * 3
      );


    const speeds = [];


    for (
      let i = 0;
      i < particleCount;
      i++
    ) {

      const index = i * 3;


      positions[index] =

        (Math.random() - 0.5) *
        13;


      positions[index + 1] =

        (Math.random() - 0.5) *
        8;


      positions[index + 2] =

        (Math.random() - 0.5) *
        2;


      speeds.push({

        x:
          (Math.random() - 0.5) *
          0.003,

        y:
          Math.random() *
          0.008 +

          0.002

      });

    }


    const particleGeometry =
      new THREE.BufferGeometry();


    particleGeometry.setAttribute(

      "position",

      new THREE.BufferAttribute(

        positions,

        3

      )

    );


    const particleMaterial =
      new THREE.PointsMaterial({

        color: 0xbdf6ff,

        size: 0.025,

        transparent: true,

        opacity: 0.75,

        sizeAttenuation: true

      });


    const particles =
      new THREE.Points(

        particleGeometry,

        particleMaterial

      );


    scene.add(
      particles
    );


    /* =========================
       BUBBLES
    ========================= */

    const bubbleGroup =
      new THREE.Group();


    const bubbleMaterial =
      new THREE.MeshBasicMaterial({

        color: 0x7eeeff,

        transparent: true,

        opacity: 0.28

      });


    const bubbleData = [];


    for (
      let i = 0;
      i < 30;
      i++
    ) {

      const size =
        Math.random() *
        0.09 +

        0.025;


      const geometry =
        new THREE.SphereGeometry(

          size,

          12,

          12

        );


      const bubble =
        new THREE.Mesh(

          geometry,

          bubbleMaterial

        );


      bubble.position.set(

        (Math.random() - 0.5) * 11,

        (Math.random() - 0.5) * 8,

        (Math.random() - 0.5)

      );


      bubbleData.push({

        mesh: bubble,

        speed:

          Math.random() *
          0.012 +

          0.004,

        offset:

          Math.random() *
          Math.PI *
          2

      });


      bubbleGroup.add(
        bubble
      );

    }


    scene.add(
      bubbleGroup
    );


    /* =========================
       CLOCK
    ========================= */

    const clock =
      new THREE.Clock();


    let animationId;

    let hasCompleted =
      false;


    /* =========================
       ANIMATION
    ========================= */

    function animate() {

      animationId =
        requestAnimationFrame(
          animate
        );


      const elapsed =
        clock.getElapsedTime();


      /* -------------------------
         PARTICLE MOVEMENT
      ------------------------- */

      const positionArray =
        particleGeometry
          .attributes
          .position
          .array;


      for (
        let i = 0;
        i < particleCount;
        i++
      ) {

        const index =
          i * 3;


        /*
          First phase:
          particles look like dust
        */

        if (
          elapsed < 1.6
        ) {

          positionArray[index] +=
            speeds[i].x;

          positionArray[index + 1] -=
            speeds[i].y *
            0.4;

        }


        /*
          Wipe phase:
          particles move away
        */

        else if (
          elapsed < 2.4
        ) {

          positionArray[index] +=
            0.08;

        }


        /*
          After cleaning:
          particles disappear
        */

        else {

          particleMaterial.opacity *=
            0.96;

        }

      }


      particleGeometry
        .attributes
        .position
        .needsUpdate =
        true;


      /* -------------------------
         BUBBLES
      ------------------------- */

      bubbleData.forEach(
        (item) => {

          const bubble =
            item.mesh;


          bubble.position.y +=
            item.speed;


          bubble.position.x +=

            Math.sin(

              elapsed * 1.5 +

              item.offset

            ) *
            0.003;


          if (
            bubble.position.y > 4.5
          ) {

            bubble.position.y =
              -4.5;

          }


          /*
            Bubbles become more
            visible after cleaning
          */

          if (
            elapsed > 1.7
          ) {

            bubble.material.opacity =
              Math.min(

                0.32,

                bubble.material.opacity +
                0.004

              );

          }

        }
      );


      /* =========================
         WIPE PROGRESS
      ========================= */

      let progress = 0;


      if (
        elapsed > 0.7 &&
        elapsed < 2.2
      ) {

        progress =

          (elapsed - 0.7) /
          1.5;

      }

      else if (
        elapsed >= 2.2
      ) {

        progress = 1;

      }


      setWipeProgress(
        progress
      );


      /* =========================
         LOGO REVEAL
      ========================= */

      if (
        elapsed > 1.8
      ) {

        setLogoVisible(
          true
        );

      }


      /* =========================
         RENDER
      ========================= */

      renderer.render(

        scene,

        camera

      );


      /* =========================
         COMPLETE
      ========================= */

      if (
        elapsed >= 3.2 &&
        !hasCompleted
      ) {

        hasCompleted =
          true;


        setFinished(
          true
        );


        setTimeout(
          () => {

            if (
              onComplete
            ) {

              onComplete();

            }

          },

          350

        );

      }

    }


    animate();


    /* =========================
       RESIZE
    ========================= */

    function handleResize() {

      camera.aspect =

        window.innerWidth /
        window.innerHeight;


      camera.updateProjectionMatrix();


      renderer.setSize(

        window.innerWidth,

        window.innerHeight

      );

    }


    window.addEventListener(

      "resize",

      handleResize

    );


    /* =========================
       CLEANUP
    ========================= */

    return () => {

      cancelAnimationFrame(
        animationId
      );


      window.removeEventListener(

        "resize",

        handleResize

      );


      particleGeometry.dispose();

      particleMaterial.dispose();

      bubbleMaterial.dispose();


      renderer.dispose();


      if (
        renderer.domElement.parentNode
      ) {

        renderer.domElement.parentNode.removeChild(

          renderer.domElement

        );

      }

    };


  }, [onComplete]);


  return (

    <div

      className={

        `three-loader ${
          finished
            ? "loader-finish"
            : ""
        }`

      }

    >


      {/* THREE PARTICLES */}

      <div

        ref={mountRef}

        className="three-canvas"

      />


      {/* FOGGY / DIRTY GLASS */}

      <div

        className="dirty-glass"

        style={{

          transform:

            `translateX(${
              wipeProgress *
              115
            }%)`

        }}

      />


      {/* CLEANING WIPE */}

      <div

        className="cleaning-wipe"

        style={{

          left:

            `${
              wipeProgress *
              120 - 20
            }%`

        }}

      />


      {/* CLEAN REFLECTION */}

      <div className="clean-reflection" />


      {/* LOGO */}

      <div

        className={

          `loader-content ${
            logoVisible
              ? "show-logo"
              : ""
          }`

        }

      >


        <div className="logo-light" />


        <img

          src={cleanyText}

          alt="CLEANY"

          className="cleany-loader-logo"

        />


        <p>

          A FRESHER WAY TO CLEAN

        </p>


        <div className="logo-shine" />


      </div>


    </div>

  );

}


export default ThreeLoader;