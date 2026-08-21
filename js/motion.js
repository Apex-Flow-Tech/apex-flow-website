document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Buttery inertia scroll (Lenis), skipped entirely for reduced-motion ----
  let lenis = null;
  if (!prefersReduced && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3), // cubic-out: smooth, no overshoot
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.1
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const mm = gsap.matchMedia();

  mm.add(
    {
      reduce: '(prefers-reduced-motion: reduce)',
      normal: '(prefers-reduced-motion: no-preference)',
      canHover: '(hover: hover)'
    },
    (context) => {
      const { reduce, canHover } = context.conditions;

      // ---- Grid stagger reveal ----
      // Opacity-only: .card/.pricing-card also get an independent GSAP
      // transform controller below (3D tilt). Two separate GSAP tweens
      // both writing to `transform` on the same element (this reveal's
      // `y`, and the tilt's rotationX/rotationY/z) fight over GSAP's
      // internal transform cache, and can leave the card permanently
      // stuck mid-transform (e.g. translateY never resolving to 0).
      // Animating opacity here instead of y/transform sidesteps that
      // conflict entirely.
      gsap.utils.toArray('.grid').forEach((grid) => {
        const children = Array.from(grid.children);
        if (!children.length) return;
        if (reduce) { gsap.set(children, { opacity: 1 }); return; }
        gsap.from(children, {
          opacity: 0, duration: 0.7, stagger: 0.09, ease: 'power2.out',
          scrollTrigger: { trigger: grid, start: 'top 87%', toggleActions: 'play none none reverse' }
        });
      });

      // ---- Standalone section reveal (not already covered by a grid) ----
      const standalone = gsap.utils
        .toArray('.pricing-card, .process-step, .cta-band, .section-head, .quote-card, .placeholder-note')
        .filter((el) => !el.closest('.grid'));
      standalone.forEach((el) => {
        if (reduce) { gsap.set(el, { opacity: 1, y: 0 }); return; }
        // .pricing-card also gets the 3D tilt controller (see above) --
        // same conflict, same fix: opacity only, no y/transform at all
        // (not even y:0 -- that still registers a transform tween).
        const isTiltTarget = el.classList.contains('pricing-card');
        gsap.from(el, isTiltTarget
          ? { opacity: 0, duration: 1, ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' } }
          : { opacity: 0, y: 34, duration: 1, ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' } }
        );
      });

      // ---- Scroll-scrubbed word highlight ----
      gsap.utils.toArray('.scroll-highlight').forEach((el) => {
        if (el.dataset.shSplit) return;
        const text = el.textContent;
        el.innerHTML = text
          .split(/(\s+)/)
          .map((w) => (w.trim() ? `<span class="sh-word">${w}</span>` : w))
          .join('');
        el.dataset.shSplit = 'true';
        const words = el.querySelectorAll('.sh-word');
        if (reduce) { gsap.set(words, { opacity: 1 }); return; }
        gsap.set(words, { opacity: 0.26 });
        gsap.to(words, {
          opacity: 1, stagger: 0.05, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 42%', scrub: 1.1 }
        });
      });

      if (!reduce) {
        // ---- Hero visual parallax ----
        gsap.utils.toArray('.hero-visual').forEach((el) => {
          gsap.to(el, {
            yPercent: -8, ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.2 }
          });
        });

        // ---- Pipeline path draws in on scroll ----
        gsap.utils.toArray('.pipeline-path').forEach((path) => {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
          gsap.to(path, {
            strokeDashoffset: 0, ease: 'none',
            scrollTrigger: {
              trigger: path.closest('.hero-visual') || path,
              start: 'top 82%', end: 'bottom 55%', scrub: 1
            }
          });
        });

        // ---- Pipeline node dots pop in with the path ----
        gsap.utils.toArray('.pipeline-node').forEach((node) => {
          gsap.fromTo(node, { scale: 0, opacity: 0 }, {
            scale: 1, opacity: 1, ease: 'power2.out',
            scrollTrigger: {
              trigger: node.closest('.hero-visual') || node,
              start: 'top 82%', end: 'bottom 55%', scrub: 1
            }
          });
        });
      }

      // ---- 3D tilt on cards (pointer devices only) ----
      if (!reduce && canHover) {
        gsap.utils.toArray('.card, .pricing-card').forEach((card) => {
          gsap.set(card, { transformPerspective: 700, transformStyle: 'preserve-3d' });
          const rotX = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3.out' });
          const rotY = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3.out' });
          const lift = gsap.quickTo(card, 'z', { duration: 0.7, ease: 'power3.out' });

          const onMove = (e) => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            rotY(px * 6);
            rotX(py * -6);
            lift(10);
          };
          const onLeave = () => { rotX(0); rotY(0); lift(0); };

          card.addEventListener('mousemove', onMove);
          card.addEventListener('mouseleave', onLeave);
        });
      }

      return () => {
        // gsap.matchMedia reverts tweens/triggers created in this context automatically
      };
    }
  );

  window.addEventListener('load', () => ScrollTrigger.refresh());
});
