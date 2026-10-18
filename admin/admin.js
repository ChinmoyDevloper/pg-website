import { db, auth, isConfigured } from "../firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, doc, addDoc, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ============ HELPERS ============ */
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = `alert alert-${type} shadow-sm py-2 mb-2`;
  el.textContent = msg;
  $("toastBox").append(el);
  setTimeout(() => el.remove(), 3500);
}
function fail(err) {
  console.error(err);
  toast(
    err.code === "permission-denied"
      ? "Permission denied. Make sure you are logged in as the admin and the Firestore rules are published."
      : "Something went wrong. Open the browser console for details.",
    "danger"
  );
}

/* ============ LOGIN / LOGOUT ============ */
if (!isConfigured) {
  $("loginMsg").textContent = "Firebase is not configured yet. Paste your config into firebase-config.js.";
  $("loginMsg").classList.remove("d-none");
  $("loginForm").classList.add("d-none");
} else {
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginError").textContent = "";
    try {
      await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPass").value);
    } catch (err) {
      $("loginError").textContent = "Login failed. Check your email and password.";
    }
  });
  $("logoutBtn").addEventListener("click", () => signOut(auth));

  let unsubs = [];
  onAuthStateChanged(auth, (user) => {
    $("loginView").classList.toggle("d-none", Boolean(user));
    $("appView").classList.toggle("d-none", !user);
    unsubs.forEach((u) => u());
    unsubs = [];
    if (user) {
      unsubs.push(watchEnquiries(), watchServices(), watchTestimonials());
      loadSettings();
    }
  });
}

/* ============ ENQUIRIES ============ */
function watchEnquiries() {
  return onSnapshot(query(collection(db, "enquiries"), orderBy("createdAt", "desc")), (snap) => {
    let html = "";
    let newCount = 0;
    snap.docs.forEach((d) => {
      const e = d.data();
      if (e.status === "new") newCount++;
      const when = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleString() : "Just now";
      const digits = String(e.phone || "").replace(/\D/g, "");
      const waNum = digits.length === 10 ? "91" + digits : digits; // assumes India for 10-digit numbers
      html += `
        <tr data-id="${d.id}">
          <td class="small text-nowrap">${esc(when)}</td>
          <td><strong>${esc(e.name)}</strong><br><span class="small text-muted">${esc(e.email)}</span></td>
          <td>${esc(e.phone)}</td>
          <td>${esc(e.service)}${e.date ? `<br><span class="small text-muted">${esc(e.date)}</span>` : ""}</td>
          <td class="small" style="min-width:200px">${esc(e.message)}</td>
          <td>
            <select class="form-select form-select-sm status-sel">
              ${["new", "contacted", "closed"].map((s) => `<option ${s === e.status ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </td>
          <td class="text-nowrap">
            <a class="btn btn-sm btn-success" target="_blank" rel="noopener" href="https://wa.me/${waNum}" aria-label="WhatsApp"><i class="bi bi-whatsapp"></i></a>
            <a class="btn btn-sm btn-outline-primary" href="tel:${esc(e.phone)}" aria-label="Call"><i class="bi bi-telephone"></i></a>
            <button class="btn btn-sm btn-outline-danger del-btn" aria-label="Delete"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`;
    });
    $("enqBody").innerHTML = html || `<tr><td colspan="7" class="text-center text-muted py-4">No enquiries yet.</td></tr>`;
    $("statTotal").textContent = snap.size;
    $("statNew").textContent = newCount;
  }, fail);
}

$("enqBody").addEventListener("change", (e) => {
  if (!e.target.classList.contains("status-sel")) return;
  const id = e.target.closest("tr").dataset.id;
  updateDoc(doc(db, "enquiries", id), { status: e.target.value }).then(() => toast("Status updated")).catch(fail);
});
$("enqBody").addEventListener("click", (e) => {
  const btn = e.target.closest(".del-btn");
  if (!btn || !confirm("Delete this enquiry permanently?")) return;
  deleteDoc(doc(db, "enquiries", btn.closest("tr").dataset.id)).then(() => toast("Enquiry deleted")).catch(fail);
});

/* ============ SERVICES ============ */
const srvItems = new Map();

function watchServices() {
  return onSnapshot(query(collection(db, "services"), orderBy("order")), (snap) => {
    srvItems.clear();
    let html = "";
    snap.docs.forEach((d) => {
      const s = d.data();
      srvItems.set(d.id, s);
      html += `
        <li class="list-group-item d-flex align-items-center gap-3" data-id="${d.id}">
          <img class="thumb" src="${esc(s.image || "https://placehold.co/112x84")}" alt="" />
          <div class="flex-grow-1">
            <strong>${esc(s.title)}</strong> ${s.visible === false ? '<span class="badge bg-secondary">hidden</span>' : ""}
            <div class="small text-muted">${esc(s.price || "No price")} · ${esc(s.availability || "No availability")}</div>
          </div>
          <button class="btn btn-sm btn-outline-primary edit-btn">Edit</button>
          <button class="btn btn-sm btn-outline-danger del-btn" aria-label="Delete"><i class="bi bi-trash"></i></button>
        </li>`;
    });
    $("srvList").innerHTML = html ||
      `<li class="list-group-item text-muted">No services yet. Until you add one, the website shows its built-in placeholder cards.</li>`;
  }, fail);
}

function resetSrvForm() {
  $("srvForm").reset();
  $("srvId").value = "";
  $("srvVisible").checked = true;
  $("srvOrder").value = srvItems.size + 1;
  $("srvFormTitle").textContent = "Add Service";
}
$("srvReset").addEventListener("click", resetSrvForm);

$("srvForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    title: $("srvTitle").value.trim(),
    description: $("srvDesc").value.trim(),
    features: $("srvFeatures").value.split("\n").map((l) => l.trim()).filter(Boolean),
    price: $("srvPrice").value.trim(),
    availability: $("srvAvail").value.trim(),
    image: $("srvImage").value.trim(),
    order: Number($("srvOrder").value) || 1,
    visible: $("srvVisible").checked,
  };
  try {
    const id = $("srvId").value;
    if (id) await updateDoc(doc(db, "services", id), data);
    else await addDoc(collection(db, "services"), { ...data, createdAt: serverTimestamp() });
    toast("Service saved");
    resetSrvForm();
  } catch (err) { fail(err); }
});

$("srvList").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-id]");
  if (!li) return;
  const id = li.dataset.id;
  if (e.target.closest(".edit-btn")) {
    const s = srvItems.get(id);
    $("srvId").value = id;
    $("srvTitle").value = s.title || "";
    $("srvDesc").value = s.description || "";
    $("srvFeatures").value = (s.features || []).join("\n");
    $("srvPrice").value = s.price || "";
    $("srvAvail").value = s.availability || "";
    $("srvImage").value = s.image || "";
    $("srvOrder").value = s.order ?? 1;
    $("srvVisible").checked = s.visible !== false;
    $("srvFormTitle").textContent = "Edit Service";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (e.target.closest(".del-btn") && confirm("Delete this service?")) {
    deleteDoc(doc(db, "services", id)).then(() => toast("Service deleted")).catch(fail);
  }
});

/* ============ TESTIMONIALS ============ */
const tstItems = new Map();

function watchTestimonials() {
  return onSnapshot(query(collection(db, "testimonials"), orderBy("createdAt", "desc")), (snap) => {
    tstItems.clear();
    let html = "";
    snap.docs.forEach((d) => {
      const t = d.data();
      tstItems.set(d.id, t);
      html += `
        <li class="list-group-item d-flex align-items-start gap-3" data-id="${d.id}">
          <div class="flex-grow-1">
            <strong>${esc(t.name)}</strong> ${t.visible === false ? '<span class="badge bg-secondary">hidden</span>' : ""}
            <div class="small text-muted">${esc(t.text)}</div>
          </div>
          <button class="btn btn-sm btn-outline-primary edit-btn">Edit</button>
          <button class="btn btn-sm btn-outline-danger del-btn" aria-label="Delete"><i class="bi bi-trash"></i></button>
        </li>`;
    });
    $("tstList").innerHTML = html ||
      `<li class="list-group-item text-muted">No testimonials yet. The website shows its placeholder text until you add real ones.</li>`;
  }, fail);
}

function resetTstForm() {
  $("tstForm").reset();
  $("tstId").value = "";
  $("tstVisible").checked = true;
  $("tstFormTitle").textContent = "Add Testimonial";
}
$("tstReset").addEventListener("click", resetTstForm);

$("tstForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = { name: $("tstName").value.trim(), text: $("tstText").value.trim(), visible: $("tstVisible").checked };
  try {
    const id = $("tstId").value;
    if (id) await updateDoc(doc(db, "testimonials", id), data);
    else await addDoc(collection(db, "testimonials"), { ...data, createdAt: serverTimestamp() });
    toast("Testimonial saved");
    resetTstForm();
  } catch (err) { fail(err); }
});

$("tstList").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-id]");
  if (!li) return;
  const id = li.dataset.id;
  if (e.target.closest(".edit-btn")) {
    const t = tstItems.get(id);
    $("tstId").value = id;
    $("tstName").value = t.name || "";
    $("tstText").value = t.text || "";
    $("tstVisible").checked = t.visible !== false;
    $("tstFormTitle").textContent = "Edit Testimonial";
  } else if (e.target.closest(".del-btn") && confirm("Delete this testimonial?")) {
    deleteDoc(doc(db, "testimonials", id)).then(() => toast("Testimonial deleted")).catch(fail);
  }
});

/* ============ SETTINGS ============ */
async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "main"));
    if (!snap.exists()) return;
    const s = snap.data();
    $("setWhatsapp").value = s.whatsapp || "";
    $("setPhone").value = s.phone || "";
    $("setAddress").value = s.address || "";
    $("setMaps").value = s.mapsLink || "";
  } catch (err) { fail(err); }
}

$("setForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await setDoc(doc(db, "settings", "main"), {
      whatsapp: $("setWhatsapp").value.replace(/\D/g, ""),
      phone: $("setPhone").value.trim(),
      address: $("setAddress").value.trim(),
      mapsLink: $("setMaps").value.trim(),
    });
    toast("Settings saved");
  } catch (err) { fail(err); }
});