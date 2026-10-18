/* ============ 1. SETTINGS (PLACEHOLDER: edit these) ============ */
const BUSINESS_NAME = "[Business Name]";
let WHATSAPP_NUMBER = "91XXXXXXXXXX"; // country code + number, no + or spaces (admin panel can override)
const MAPS_LINK = "#"; // PLACEHOLDER: paste your Google Maps link (admin panel can override)

/* ============ 2. WHATSAPP HELPER ============ */
function waLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// General WhatsApp buttons (floating button, location, footer)
document.querySelectorAll(".wa-general").forEach((el) => {
  el.href = waLink(`Hello, I would like to enquire about ${BUSINESS_NAME}.`);
  el.target = "_blank";
  el.rel = "noopener";
});

// Service-specific buttons
document.querySelectorAll(".wa-service").forEach((el) => {
  el.href = waLink(`Hello, I would like to enquire about "${el.dataset.service}" at ${BUSINESS_NAME}.`);
  el.target = "_blank";
  el.rel = "noopener";
});

// Directions button
const directionsBtn = document.getElementById("directions-btn");
if (directionsBtn) directionsBtn.href = MAPS_LINK;

/* ============ 3. NAVBAR: solid background after scrolling ============ */
const navbar = document.getElementById("mainNav");
function updateNavbar() {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
}
window.addEventListener("scroll", updateNavbar, { passive: true });
updateNavbar();

// Close the mobile menu after tapping a link (Bootstrap collapse)
const navMenu = document.getElementById("navMenu");
document.querySelectorAll("#navMenu .nav-link, #navMenu .btn").forEach((link) => {
  link.addEventListener("click", () => {
    if (navMenu.classList.contains("show")) {
      bootstrap.Collapse.getOrCreateInstance(navMenu).hide();
    }
  });
});
// Active link highlighting is handled by Bootstrap Scrollspy (data-bs-spy on <body>)

/* ============ 4. SCROLL REVEAL ============ */
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ============ 5. GALLERY LIGHTBOX (Bootstrap modal) ============ */
const lightboxModal = document.getElementById("lightboxModal");
const lightboxImg = document.getElementById("lightbox-img");

lightboxModal.addEventListener("show.bs.modal", (event) => {
  const img = event.relatedTarget.querySelector("img");
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
});
lightboxModal.addEventListener("hidden.bs.modal", () => {
  lightboxImg.src = "";
});

/* ============ 6. ENQUIRY FORM ============ */
const form = document.getElementById("enquiry-form");
const successMsg = document.getElementById("form-success");

// Show or clear a Bootstrap error on one field
function setError(id, message) {
  const input = document.getElementById(id);
  input.classList.toggle("is-invalid", Boolean(message));
  input.nextElementSibling.textContent = message; // the .invalid-feedback div
  input.setAttribute("aria-invalid", message ? "true" : "false");
  return !message;
}

function validateForm() {
  const name = form.name.value.trim();
  const phoneDigits = form.phone.value.replace(/\D/g, "");
  const email = form.email.value.trim();
  const service = form.service.value;
  const message = form.message.value.trim();
  let ok = true;

  ok = setError("name", name.length < 2 ? "Please enter your name." : "") && ok;
  ok = setError("phone", phoneDigits.length < 10 || phoneDigits.length > 13 ? "Please enter a valid phone number." : "") && ok;
  ok = setError("email", email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Please enter a valid email address." : "") && ok;
  ok = setError("service", !service ? "Please select a service." : "") && ok;
  ok = setError("message", message.length < 5 ? "Please write a short message." : "") && ok;
  return ok;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  successMsg.classList.add("d-none");
  if (!validateForm()) return;

  // Tell dynamic.js to save this enquiry to the admin panel (does nothing if Firebase is not set up)
  document.dispatchEvent(new CustomEvent("enquiry-valid", { detail: {
    name: form.name.value.trim(), phone: form.phone.value.trim(),
    email: form.email.value.trim(), service: form.service.value,
    date: form.date.value.trim(), message: form.message.value.trim(),
  }}));

  // Build the WhatsApp message
  const lines = [
    `Hello, I would like to enquire about ${BUSINESS_NAME}.`,
    ``,
    `Name: ${form.name.value.trim()}`,
    `Phone: ${form.phone.value.trim()}`,
  ];
  if (form.email.value.trim()) lines.push(`Email: ${form.email.value.trim()}`);
  lines.push(`Service: ${form.service.value}`);
  if (form.date.value.trim()) lines.push(`Preferred date/time: ${form.date.value.trim()}`);
  lines.push(`Message: ${form.message.value.trim()}`);

  window.open(waLink(lines.join("\n")), "_blank", "noopener");
  successMsg.classList.remove("d-none");
  form.reset();
});

// Clear an error as soon as the user fixes the field
form.querySelectorAll("input, select, textarea").forEach((field) => {
  field.addEventListener("input", () => {
    if (field.classList.contains("is-invalid")) setError(field.id, "");
  });
});

/* ============ 7. FOOTER YEAR ============ */
document.getElementById("year").textContent = new Date().getFullYear();