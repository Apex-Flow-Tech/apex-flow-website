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
