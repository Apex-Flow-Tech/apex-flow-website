(function () {
  "use strict";

  var mount = document.getElementById("af-hero-3d");
  var poster = document.getElementById("af-hero-poster");
  if (!mount || typeof THREE === "undefined") return;

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var supportsWebGL = false;
  try {
    var testCanvas = document.createElement("canvas");
    var testCtx = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
    supportsWebGL = !!testCtx;
  } catch (e) {
    supportsWebGL = false;
  }
  if (!supportsWebGL) return;

  function init() {
    var canvas = document.createElement("canvas");
    var width = mount.clientWidth;
    var height = mount.clientHeight;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131a24);
    scene.fog = new THREE.FogExp2(0x131a24, 0.05);

    var camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0.5, 2.1, 9.5);
    camera.lookAt(0, 0.6, 0);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(canvas);
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    var ambient = new THREE.AmbientLight(0x2a3a58, 1.3);
    scene.add(ambient);
    var keyLight = new THREE.PointLight(0x58a6ff, 2.2, 24);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    var rimLight = new THREE.PointLight(0xbfe0ff, 0.9, 20);
    rimLight.position.set(-2.5, 3, -3);
    scene.add(rimLight);

    var rig = new THREE.Group();
    rig.rotation.y = 0.35;
    scene.add(rig);

    function ridge(radius, h, y, rot, color, opacity) {
      var geo = new THREE.ConeGeometry(radius, h, 6, 1);
      var mat = new THREE.MeshStandardMaterial({
        color: color, flatShading: true, transparent: true,
        opacity: 0, roughness: 0.85, metalness: 0.1
      });
      var m = new THREE.Mesh(geo, mat);
      m.position.y = y;
      m.rotation.y = rot;
      rig.add(m);
      return { mesh: m, targetOpacity: opacity };
    }
    var ridges = [
      ridge(4.6, 3.2, -1.4, 0.3, 0x1a2436, 0.85),
      ridge(3.3, 4.2, -1.0, 0.9, 0x223049, 0.92),
      ridge(2.2, 5.2, -0.5, 0.15, 0x2c3d5c, 1.0)
    ];

    var summit = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xe8f3ff, transparent: true, opacity: 0 })
    );
    summit.position.set(0, 2.1, 0);
    rig.add(summit);

    var glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0 })
    );
    glow.position.copy(summit.position);
    rig.add(glow);

    var glow2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0 })
    );
    glow2.position.copy(summit.position);
    rig.add(glow2);

    var curvePoints = [
      new THREE.Vector3(-3.4, -2.0, 3.6),
      new THREE.Vector3(-2.0, -1.1, 2.4),
      new THREE.Vector3(-1.1, -0.1, 1.3),
      new THREE.Vector3(-0.4, 0.9, 0.5),
      new THREE.Vector3(0, 2.1, 0)
    ];
    var curve = new THREE.CatmullRomCurve3(curvePoints);
    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 80, 0.035, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0 })
    );
    rig.add(tube);

    var nodes = curvePoints.map(function (p) {
      var n = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0 })
      );
      var scatter = new THREE.Vector3(
        p.x + (Math.random() - 0.5) * 3.5,
        p.y + (Math.random() - 0.5) * 1.2 - 0.6,
        p.z + (Math.random() - 0.5) * 2.5
      );
      n.position.copy(scatter);
      rig.add(n);
      return { mesh: n, from: scatter, to: p.clone() };
    });

    var pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0 })
    );
    rig.add(pulse);

    poster.style.opacity = "0";
    poster.style.transition = "opacity 0.4s ease";
    poster.style.pointerEvents = "none";

    function runIntro() {
      if (prefersReducedMotion || typeof gsap === "undefined") {
        ridges.forEach(function (r) { r.mesh.material.opacity = r.targetOpacity; });
        summit.material.opacity = 1;
        glow.material.opacity = 0.35;
        glow2.material.opacity = 0.12;
        tube.material.opacity = 1;
        nodes.forEach(function (n) { n.mesh.position.copy(n.to); n.mesh.material.opacity = 1; });
        return;
      }

      var tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      ridges.forEach(function (r, i) {
        tl.to(r.mesh.material, { opacity: r.targetOpacity, duration: 1.1 }, i * 0.15);
      });

      nodes.forEach(function (n, i) {
        tl.to(n.mesh.material, { opacity: 0.6, duration: 0.4 }, 0.5 + i * 0.12);
        tl.to(n.mesh.position, {
          x: n.to.x, y: n.to.y, z: n.to.z, duration: 1.3, ease: "power2.inOut"
        }, 0.7 + i * 0.12);
      });

      tl.to(tube.material, { opacity: 1, duration: 0.5 }, 1.9);
      tl.to(pulse.material, { opacity: 1, duration: 0.2 }, 1.95);

      var travel = { t: 0 };
      tl.to(travel, {
        t: 1, duration: 1.3, ease: "power1.inOut",
        onUpdate: function () {
          var pt = curve.getPointAt(travel.t);
          pulse.position.copy(pt);
        }
      }, 1.95);

      tl.to(pulse.material, { opacity: 0, duration: 0.3 }, 3.15);
      tl.to(summit.material, { opacity: 1, duration: 0.5 }, 3.1);
      tl.to(glow.material, { opacity: 0.35, duration: 0.6 }, 3.1);
      tl.to(glow2.material, { opacity: 0.12, duration: 0.6 }, 3.1);
      tl.to(nodes.map(function (n) { return n.mesh.material; }), { opacity: 1, duration: 0.4 }, 3.1);
    }

    var idleTime = 0;
    function animate() {
      requestAnimationFrame(animate);
      idleTime += 0.0016;
      if (!prefersReducedMotion) {
        rig.rotation.y += 0.0004;
        glow.scale.setScalar(1 + Math.sin(idleTime * 1.4) * 0.06);
        glow2.scale.setScalar(1 + Math.sin(idleTime * 1.4 + 0.4) * 0.08);
      }
      renderer.render(scene, camera);
    }

    function onResize() {
      var w = mount.clientWidth;
      var h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    if (typeof gsap !== "undefined" && gsap.registerPlugin && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.to(rig.rotation, {
        y: 0.35 + 0.9,
        ease: "none",
        scrollTrigger: {
          trigger: mount.closest("section") || mount,
          start: "top top",
          end: "bottom top",
          scrub: 0.6
        }
      });
      gsap.to(camera.position, {
        z: 8.3, y: 2.6,
        ease: "none",
        scrollTrigger: {
          trigger: mount.closest("section") || mount,
          start: "top top",
          end: "bottom top",
          scrub: 0.6
        },
        onUpdate: function () { camera.lookAt(0, 0.6, 0); }
      });
    }

    animate();
    runIntro();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(init, 0);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
