/* Loads services, testimonials and settings from Firestore into the public site.
   Also saves enquiries. If Firebase is not set up, the built-in placeholders stay. */
import { db, isConfigured } from "./firebase-config.js";
import {
  collection, getDocs, getDoc, doc, addDoc, query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

if (isConfigured) init();

// Escape text so admin-entered content can never inject HTML
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function wa(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

async function init() {
  saveEnquiries();
  await Promise.allSettled([loadSettings(), loadServices(), loadTestimonials()]);
}

/* ---------- Settings ---------- */
async function loadSettings() {
  const snap = await getDoc(doc(db, "settings", "main"));
  if (!snap.exists()) return;
  const s = snap.data();

  if (s.whatsapp) {
    WHATSAPP_NUMBER = s.whatsapp.replace(/\D/g, ""); // variable lives in script.js
    document.querySelectorAll(".wa-general").forEach((el) => {
      el.href = wa(`Hello, I would like to enquire about ${BUSINESS_NAME}.`);
    });
  }
  if (s.address) document.querySelectorAll('[data-site="address"]').forEach((el) => (el.textContent = s.address));
  if (s.phone) {
    document.querySelectorAll('[data-site="phone"]').forEach((el) => {
      el.textContent = s.phone;
      if (el.tagName === "A") el.href = "tel:" + s.phone.replace(/[^\d+]/g, "");
    });
  }
  if (s.mapsLink) {
    const d = document.getElementById("directions-btn");
    if (d) d.href = s.mapsLink;
  }
}

/* ---------- Services ---------- */
async function loadServices() {
  const snap = await getDocs(query(collection(db, "services"), orderBy("order")));
  const items = snap.docs.map((d) => d.data()).filter((s) => s.visible !== false);
  if (!items.length) return; // keep placeholder cards

  const grid = document.getElementById("services-grid");
  grid.innerHTML = items.map((s) => `
    <div class="col-md-6 col-lg-4">
      <article class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden hover-lift">
        <img src="${esc(s.image || "https://placehold.co/600x400?text=Service")}" class="card-img-top card-photo"
             alt="${esc(s.title)} at ${esc(BUSINESS_NAME)}" loading="lazy" />
        <div class="card-body p-4 d-flex flex-column">
          <h3 class="h5">${esc(s.title)}</h3>
          <p class="text-muted small">${esc(s.description)}</p>
          <ul class="feature-list mb-3">${(s.features || []).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
          <div class="d-flex justify-content-between flex-wrap small border-top pt-3 mb-3 mt-auto">
            <span class="fw-semibold">${esc(s.price || "Ask for price")}</span>
            <span class="text-muted">${esc(s.availability || "Ask for availability")}</span>
          </div>
          <a href="#" class="btn btn-brand rounded-pill w-100 wa-service-dyn" data-service="${esc(s.title)}"
             target="_blank" rel="noopener">Ask About This Service</a>
        </div>
      </article>
    </div>`).join("");

  grid.querySelectorAll(".wa-service-dyn").forEach((el) => {
    el.href = wa(`Hello, I would like to enquire about "${el.dataset.service}" at ${BUSINESS_NAME}.`);
  });

  // Keep the form dropdown in sync with the services list
  const select = document.getElementById("service");
  select.innerHTML =
    `<option value="">Select a service</option>` +
    items.map((s) => `<option>${esc(s.title)}</option>`).join("") +
    `<option>Other</option>`;
}

/* ---------- Testimonials ---------- */
async function loadTestimonials() {
  const snap = await getDocs(query(collection(db, "testimonials"), orderBy("createdAt", "desc")));
  const items = snap.docs.map((d) => d.data()).filter((t) => t.visible !== false);
  if (!items.length) return; // keep placeholder cards

  document.getElementById("testimonials-grid").innerHTML = items.map((t) => `
    <div class="col-md-6 col-lg-4">
      <blockquote class="quote-card h-100">
        <p class="fst-italic text-muted">“${esc(t.text)}”</p>
        <footer class="fw-semibold small">— ${esc(t.name)}</footer>
      </blockquote>
    </div>`).join("");
}

/* ---------- Save enquiries (fired by script.js after validation) ---------- */
function saveEnquiries() {
  document.addEventListener("enquiry-valid", (e) => {
    const d = e.detail;
    addDoc(collection(db, "enquiries"), {
      name: d.name, phone: d.phone, email: d.email, service: d.service,
      date: d.date, message: d.message, status: "new", createdAt: serverTimestamp(),
    }).catch((err) => console.error("Could not save enquiry:", err));
    // WhatsApp still opens either way, so the customer is never blocked
  });
}