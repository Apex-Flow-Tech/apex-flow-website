/* Augusta Okara author site. No backend: forms open the visitor's email app
   with the details filled in. Swap CONTACT_EMAIL for her real address, or
   point the forms at a form service (HubSpot, Formspree, etc.) later. */
const CONTACT_EMAIL = "hello@augustaokara.com"; // PLACEHOLDER: replace with her real address

// Mobile menu
const toggle = document.querySelector(".burger");
const links = document.querySelector(".nav-links");
if (toggle && links) {
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
}

// Footer year
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

function openMail(subject, lines) {
  const body = lines.filter(Boolean).join("\n");
  window.location.href =
    "mailto:" + CONTACT_EMAIL +
    "?subject=" + encodeURIComponent(subject) +
    "&body=" + encodeURIComponent(body);
}

// Speaking enquiry form
const speakingForm = document.getElementById("speaking-form");
if (speakingForm) {
  speakingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!speakingForm.reportValidity()) return;
    const d = new FormData(speakingForm);
    openMail("Speaking enquiry: " + (d.get("Event name") || "New event"), [
      "Name: " + d.get("First name") + " " + d.get("Last name"),
      "Email: " + d.get("Email"),
      "Organisation: " + d.get("Organisation"),
      "Event name: " + d.get("Event name"),
      "Event type: " + d.get("Event type"),
      "Date: " + d.get("Event date"),
      "Location: " + d.get("Location"),
      "Expected audience: " + d.get("Audience size"),
      "Budget or honorarium: " + d.get("Budget"),
      "",
      "Details:",
      d.get("Details"),
    ]);
    const status = document.getElementById("speaking-status");
    if (status) status.textContent = "Your email app should now open with your enquiry ready to send.";
  });
}

// Newsletter sign-up
document.querySelectorAll(".newsletter-form").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const email = new FormData(form).get("Email");
    openMail("Add me to the reader list", ["Please add " + email + " to Augusta's reader newsletter."]);
  });
});

/* ================= Motion =================
   Works with the .motion class set in <head>. If the visitor prefers reduced
   motion, .motion is never added and everything shows straight away. */
window.__aoReady = true;
const root = document.documentElement;
const motion = root.classList.contains("motion");

// Number the mobile menu links so they slide in one after another
document.querySelectorAll(".nav-links li").forEach((li, i) => li.style.setProperty("--i", i));

// Split each giant wordmark into letters so they can rise one by one
document.querySelectorAll(".wordmark").forEach((wm) => {
  const dot = wm.querySelector(".dot");
  const text = wm.firstChild && wm.firstChild.nodeType === 3 ? wm.firstChild.textContent : "";
  if (!text) return;
  wm.setAttribute("aria-label", text);
  wm.firstChild.remove();
  [...text].forEach((c, i) => {
    const s = document.createElement("span");
    s.className = "ch";
    s.setAttribute("aria-hidden", "true");
    s.style.setProperty("--i", i);
    s.textContent = c;
    wm.insertBefore(s, dot);
  });
  wm.style.setProperty("--n", text.length);
});

// Manifesto lines fade in one by one
document.querySelectorAll(".half-sun p").forEach((p, i) => {
  p.classList.add("line");
  p.style.setProperty("--i", i);
});

// Start the hero / page-top entrance once fonts are ready (avoids a jump)
const heroes = document.querySelectorAll(".hero, .page-top");
const startHero = () => requestAnimationFrame(() => heroes.forEach((h) => h.classList.add("is-in")));
if (document.fonts && document.fonts.ready) {
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(startHero);
} else startHero();

// Scroll reveals with a stagger between siblings
const revealSel = [
  "main > section .kicker", "main > section h2", ".theme", ".book-panel", ".book-row > *",
  ".duo > .panel", ".split > *", ".topic", ".pills li", ".faq details", ".facts li",
  ".form > *", ".newsletter > :not(.sun-base)", ".manifesto"
].join(",");
const targets = [...document.querySelectorAll(revealSel)].filter((el) => !el.closest(".hero, .page-top"));
targets.forEach((el) => {
  el.setAttribute("data-reveal", "");
  const sibs = [...el.parentElement.children].filter((c) => c.matches(revealSel));
  el.style.setProperty("--d", Math.min(sibs.indexOf(el), 8));
});

if (motion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
  targets.forEach((el) => io.observe(el));

  const sunObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("lit"); sunObs.unobserve(e.target); } });
  }, { threshold: 0.45 });
  document.querySelectorAll(".half-sun").forEach((el) => sunObs.observe(el));

  // The newsletter sun starts below the panel edge, so watch the panel instead
  const nlObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const sun = e.target.querySelector(".sun-base");
      if (sun) sun.classList.add("in");
      nlObs.unobserve(e.target);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll(".newsletter").forEach((el) => nlObs.observe(el));
} else {
  document.querySelectorAll(".sun-base").forEach((el) => el.classList.add("in"));
  targets.forEach((el) => el.classList.add("in"));
  document.querySelectorAll(".half-sun").forEach((el) => el.classList.add("lit"));
}

// Scroll-linked movement: giant book words drift sideways, manifesto sun rises
const giants = [...document.querySelectorAll(".giant")];
const suns = [...document.querySelectorAll(".half-sun")];
const progress = (el) => {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
};
let ticking = false;
function onScroll() {
  ticking = false;
  giants.forEach((g, i) => {
    const p = progress(g.parentElement);
    const dir = i % 2 ? -1 : 1;
    g.style.setProperty("--shift", (dir * (0.5 - p) * 18).toFixed(2) + "%");
  });
  suns.forEach((s) => {
    const r = s.parentElement.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight * 0.9)));
    s.style.setProperty("--rise", ((1 - p) * 30).toFixed(2) + "%");
    s.style.setProperty("--grow", (0.82 + p * 0.18).toFixed(3));
  });
}
if (motion) {
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}
