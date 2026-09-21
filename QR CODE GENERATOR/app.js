const state = {
  type: "url",
  content: "https://www.example.com",
  foreground: "#07111f",
  accent: "#1f6fff",
  campaign: "Spring Launch",
  shortLink: "qr.example.com/spring",
  frameStyle: "standard",
  outerFrame: "Scan Me tab",
  password: ""
};

const contentExamples = {
  url: "https://www.example.com",
  text: "Thanks for scanning. Visit booth A14 for your launch gift.",
  wifi: "WIFI:T:WPA;S:Studio Guest;P:launch2026;;",
  vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:Ava Morgan\nORG:LinkMark Studio\nTEL:+1-555-0134\nEMAIL:ava@example.com\nEND:VCARD",
  pdf: "https://www.example.com/brand-catalog.pdf",
  social: "https://instagram.com/linkmarkqr"
};

const pageCopy = {
  home: ["Home", "Choose what you want to build, manage, or review."],
  generator: ["Generator", "Customize, publish, and export branded QR codes."],
  "my-qrs": ["My QRs", "Manage every saved QR campaign in one place."],
  analytics: ["Analytics", "Review scan performance for your QR campaigns."],
  pricing: ["Pricing", "Choose the plan that fits your QR workflow."],
  api: ["API", "Connect QR campaigns to your stack."],
  help: ["Settings", "Configure QR safety, exports, and workspace defaults."],
  profile: ["Profile", "Review account and workspace details."]
};

const qrCanvas = document.querySelector("#qrCanvas");
const heroQr = document.querySelector("#heroQr");
const qrForm = document.querySelector("#qrForm");
const qrType = document.querySelector("#qrType");
const qrContent = document.querySelector("#qrContent");
const foreground = document.querySelector("#foreground");
const foregroundText = document.querySelector("#foregroundText");
const accent = document.querySelector("#accent");
const accentText = document.querySelector("#accentText");
const campaignName = document.querySelector("#campaignName");
const shortLink = document.querySelector("#shortLink");
const centerLogo = document.querySelector("#centerLogo");
const qualityBar = document.querySelector("#qualityBar");
const qualityScore = document.querySelector("#qualityScore");
const scanStatus = document.querySelector("#scanStatus");
const scanNote = document.querySelector("#scanNote");
const navToggle = document.querySelector(".nav-toggle");
const appBody = document.body;
const frameLabel = document.querySelector(".frame-label");
const qrFrame = document.querySelector("#qrFrame");
const patternSelect = document.querySelector("#pattern");
const frameSelect = document.querySelector("#frame");
const passwordToggle = document.querySelector("#passwordToggle");
const passwordField = document.querySelector("#passwordField");
const qrPassword = document.querySelector("#qrPassword");
const pageTitle = document.querySelector("#pageTitle");
const pageSubtitle = document.querySelector("#pageSubtitle");
const profileButton = document.querySelector("#profileButton");

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function seededCell(seed, row, col) {
  const value = Math.sin(seed + row * 12.9898 + col * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function isFinder(row, col, size) {
  const zones = [[0, 0], [0, size - 7], [size - 7, 0]];
  return zones.some(([zoneRow, zoneCol]) => row >= zoneRow && row < zoneRow + 7 && col >= zoneCol && col < zoneCol + 7);
}

function finderOn(row, col, size) {
  const local = row < 7 && col < 7
    ? [row, col]
    : row < 7 && col >= size - 7
      ? [row, col - (size - 7)]
      : [row - (size - 7), col];
  const [r, c] = local;
  return r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
}

function makeQrModel() {
  if (typeof qrcode !== "function") return null;
  const qr = qrcode(0, "H");
  qr.addData(state.content);
  qr.make();
  return qr;
}

function renderQr(target, preferredSize = 29) {
  if (!target) return;
  const fragment = document.createDocumentFragment();
  const qr = makeQrModel();
  const size = qr ? qr.getModuleCount() : preferredSize;
  const pattern = patternSelect.value.toLowerCase();
  const seed = hashText(`${state.type}:${state.content}:${state.campaign}`);

  target.innerHTML = "";
  target.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  target.dataset.modules = String(size);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const cell = document.createElement("span");
      const fallbackOn = isFinder(row, col, size) ? finderOn(row, col, size) : seededCell(seed, row, col) > 0.55;
      const on = qr ? qr.isDark(row, col) : fallbackOn;

      if (on) {
        cell.style.background = isFinder(row, col, size) ? state.accent : state.foreground;
        cell.style.borderRadius = pattern.includes("dot") ? "999px" : pattern.includes("rounded") ? "2px" : "0";
        cell.style.transform = pattern.includes("dot") ? "scale(0.82)" : pattern.includes("bold") ? "scale(1.03)" : "none";
      } else {
        cell.style.opacity = "0";
      }
      fragment.appendChild(cell);
    }
  }

  target.appendChild(fragment);
}

function contrastScore(hexA, hexB) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const distance = Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
  return Math.min(100, Math.round((distance / 441) * 120));
}

function updateQuality() {
  const contrast = contrastScore(state.foreground, "#ffffff");
  const accentContrast = contrastScore(state.accent, "#ffffff");
  const isUrlLike = /^(https?:\/\/|mailto:|tel:|WIFI:|BEGIN:VCARD)/i.test(state.content);
  const passwordPenalty = passwordToggle.checked && !state.password ? -14 : 0;
  const contentBonus = isUrlLike ? 10 : state.content.length > 12 ? 4 : -8;
  const score = Math.max(52, Math.min(99, Math.round((contrast * 0.72) + (accentContrast * 0.18) + contentBonus + passwordPenalty)));

  qualityBar.style.width = `${score}%`;
  qualityScore.textContent = `${score}%`;
  scanStatus.textContent = passwordToggle.checked ? "Password QR" : score >= 82 ? "Real QR" : "Check contrast";
  scanStatus.style.color = score >= 82 ? "var(--success)" : "var(--warning)";
  scanStatus.style.background = score >= 82 ? "rgba(20, 122, 77, 0.1)" : "rgba(168, 100, 8, 0.12)";
  scanNote.textContent = passwordToggle.checked
    ? "Password protection is enabled for this campaign. Set a password before finalizing the QR."
    : isUrlLike
      ? "This QR encodes the destination field exactly. Scan it with your phone camera to open the link or action."
      : "This QR encodes plain text. To open a website after scanning, start the destination with https://.";
}

function updateFrame() {
  qrFrame.className = "qr-frame";
  qrFrame.classList.add(`frame-${state.frameStyle}`);
  const frameClass = state.outerFrame.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scan-me-tab";
  qrFrame.classList.add(`outer-${frameClass}`);
  frameLabel.textContent = state.outerFrame === "No frame" ? "" : state.outerFrame === "Coupon frame" ? "SCAN & SAVE" : "SCAN ME";
  document.querySelectorAll("[data-frame-style]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.frameStyle === state.frameStyle);
  });
}

function syncState() {
  state.type = qrType.value;
  state.content = qrContent.value.trim() || contentExamples[state.type];
  state.foreground = foreground.value;
  state.accent = accent.value;
  state.campaign = campaignName.value.trim() || "Untitled campaign";
  state.shortLink = shortLink.value.trim() || "qr.example.com/new";
  state.outerFrame = frameSelect.value;
  state.password = qrPassword.value.trim();
  foregroundText.value = state.foreground.toUpperCase();
  accentText.value = state.accent.toUpperCase();
  const initials = state.campaign.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
  centerLogo.style.background = state.accent;
  centerLogo.textContent = initials || "QR";
  passwordField.classList.toggle("visible", passwordToggle.checked);
  updateFrame();
  renderQr(qrCanvas, 29);
  renderQr(heroQr, 21);
  updateQuality();
}

function buildQrSvg() {
  const qr = makeQrModel();
  if (!qr) return "";
  const modules = qr.getModuleCount();
  const quiet = 4;
  const total = modules + quiet * 2;
  const logoSize = 5.2;
  const logoStart = (total - logoSize) / 2;
  const logoText = centerLogo.textContent || "QR";
  const rects = [];
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (qr.isDark(row, col)) {
        const fill = isFinder(row, col, modules) ? state.accent : state.foreground;
        rects.push(`<rect x="${col + quiet}" y="${row + quiet}" width="1" height="1" fill="${fill}"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/>${rects.join("")}<rect x="${logoStart}" y="${logoStart}" width="${logoSize}" height="${logoSize}" rx="0.7" fill="#fff"/><rect x="${logoStart + 0.55}" y="${logoStart + 0.55}" width="${logoSize - 1.1}" height="${logoSize - 1.1}" rx="0.45" fill="${state.accent}"/><text x="${total / 2}" y="${total / 2 + 0.55}" text-anchor="middle" font-family="Arial, sans-serif" font-size="2.1" font-weight="700" fill="#fff">${logoText}</text></svg>`;
}

function downloadFile(name, type, content) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileBaseName() {
  return state.campaign.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "qr-code";
}

function downloadPng() {
  const svg = buildQrSvg();
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1600;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (blob) downloadFile(`${fileBaseName()}-qr.png`, "image/png", blob);
    }, "image/png");
  };
  image.src = url;
}

function openPrintSheet() {
  const svg = buildQrSvg();
  const sheet = window.open("", "_blank");
  if (!sheet) return;
  sheet.document.write(`<!doctype html><title>${state.campaign} QR</title><style>body{font-family:Arial,sans-serif;margin:48px;color:#07111f}.sheet{width:720px;margin:auto;border:1px solid #dce5f2;padding:40px}.qr{width:420px;margin:20px auto}.meta{color:#5f6b7a}</style><main class="sheet"><h1>${state.campaign}</h1><p class="meta">Destination: ${state.content}</p><div class="qr">${svg}</div><p class="meta">High-resolution QR export. Use your browser print dialog to save as PDF.</p></main>`);
  sheet.document.close();
  sheet.focus();
  sheet.print();
}

function showPage(pageId) {
  const targetId = pageCopy[pageId] ? pageId : "home";
  document.querySelectorAll(".app-page").forEach((page) => {
    page.classList.toggle("active", page.id === targetId);
  });
  document.querySelectorAll(".task-bar").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${targetId}`);
  });
  const [title, subtitle] = pageCopy[targetId];
  pageTitle.textContent = title;
  pageSubtitle.textContent = subtitle;
  appBody.classList.remove("nav-open");
  navToggle?.setAttribute("aria-expanded", "false");
}

function routeFromHash() {
  showPage((window.location.hash || "#home").slice(1));
}

qrType.addEventListener("change", () => {
  qrContent.value = contentExamples[qrType.value];
  syncState();
});

[qrContent, foreground, accent, campaignName, shortLink, patternSelect, frameSelect, qrPassword].forEach((field) => {
  field.addEventListener("input", syncState);
  field.addEventListener("change", syncState);
});

document.querySelectorAll("[data-frame-style]").forEach((button) => {
  button.addEventListener("click", () => {
    state.frameStyle = button.dataset.frameStyle;
    syncState();
  });
});

passwordToggle.addEventListener("change", () => {
  if (passwordToggle.checked && !qrPassword.value.trim()) {
    const password = window.prompt("Set a password for this protected QR code:");
    if (password && password.trim()) {
      qrPassword.value = password.trim();
    } else {
      passwordToggle.checked = false;
    }
  }
  syncState();
  if (passwordToggle.checked) qrPassword.focus();
});

qrForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  syncState();
  if (passwordToggle.checked && !state.password) {
    alert("Enter a password before finalizing this protected QR code.");
    qrPassword.focus();
    return;
  }
  await saveCurrentQrToSupabase();
  window.location.hash = "my-qrs";
});

document.querySelector("#bulkButton").addEventListener("click", () => {
  campaignName.value = "Bulk Import Ready";
  qrContent.value = "CSV columns: campaign,destination,type,utm_source,expires_at";
  qrType.value = "text";
  syncState();
});

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const open = appBody.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
}

document.querySelectorAll("[data-page-link]").forEach((link) => {
  link.addEventListener("click", () => {
    const pageId = link.getAttribute("href").slice(1);
    showPage(pageId);
  });
});

profileButton?.addEventListener("click", () => {
  window.location.hash = "profile";
  showPage("profile");
});

document.querySelectorAll(".download-grid button").forEach((button) => {
  const original = button.innerHTML;
  button.addEventListener("click", () => {
    const format = button.dataset.format;
    if (format === "png") downloadPng();
    if (format === "svg") downloadFile(`${fileBaseName()}-qr.svg`, "image/svg+xml", buildQrSvg());
    if (format === "pdf" || format === "print") openPrintSheet();
    button.innerHTML = '<span class="material-symbols-outlined">check</span>Ready';
    window.setTimeout(() => {
      button.innerHTML = original;
    }, 900);
  });
});

window.addEventListener("hashchange", routeFromHash);
if (!window.location.hash) window.location.hash = "home";
routeFromHash();
syncState();

// ============================================================
// Supabase-backed: save QR, My QRs, Analytics, Pricing/UPI, Profile
// ============================================================

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function randomSuffix(length = 5) {
  return Math.random().toString(36).slice(2, 2 + length);
}

async function saveCurrentQrToSupabase() {
  const user = window.appState.user;
  if (!user) {
    alert("Please log in first.");
    return;
  }
  const base = slugify(state.campaign) || "qr";
  const shortSlug = `${base}-${randomSuffix()}`;

  const { error } = await supabaseClient.from("qr_codes").insert({
    user_id: user.id,
    campaign: state.campaign,
    type: state.type,
    content: state.content,
    short_slug: shortSlug,
    foreground: state.foreground,
    accent: state.accent,
    frame_style: state.frameStyle,
    outer_frame: state.outerFrame,
    password: state.password || null,
  });

  if (error) {
    alert(`Could not save QR: ${error.message}`);
    return;
  }
}

function redirectUrlFor(slug) {
  return `${REDIRECT_BASE_URL}?slug=${encodeURIComponent(slug)}`;
}

async function loadMyQrs() {
  const user = window.appState.user;
  const tbody = document.querySelector("#myQrsTableBody");
  if (!user || !tbody) return;

  const { data, error } = await supabaseClient
    .from("qr_codes")
    .select("id, campaign, type, short_slug, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Error loading QR codes: ${error.message}</td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No QR codes yet — create one in the Generator.</td></tr>`;
    return;
  }

  const { data: scanCounts } = await supabaseClient
    .from("scans")
    .select("qr_id")
    .in("qr_id", data.map((row) => row.id));

  const countsByQr = {};
  (scanCounts || []).forEach((row) => {
    countsByQr[row.qr_id] = (countsByQr[row.qr_id] || 0) + 1;
  });

  tbody.innerHTML = data.map((row) => `
    <tr>
      <td>${row.campaign}</td>
      <td>${row.type}</td>
      <td class="qr-link-cell">${redirectUrlFor(row.short_slug)}</td>
      <td>${countsByQr[row.id] || 0}</td>
      <td><span class="status ${row.status === "active" ? "good" : "warn"}">${row.status}</span></td>
      <td><button type="button" class="secondary-action delete-qr" data-id="${row.id}">Delete</button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".delete-qr").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this QR code?")) return;
      await supabaseClient.from("qr_codes").delete().eq("id", button.dataset.id);
      loadMyQrs();
      loadAnalytics();
    });
  });
}

async function loadAnalytics() {
  const user = window.appState.user;
  if (!user) return;

  const { data: qrs } = await supabaseClient
    .from("qr_codes")
    .select("id, campaign, short_slug")
    .eq("user_id", user.id);

  const totalEl = document.querySelector("#statTotalScans");
  const qrCountEl = document.querySelector("#statQrCount");
  const topDeviceEl = document.querySelector("#statTopDevice");
  const topDeviceNoteEl = document.querySelector("#statTopDeviceNote");
  const lastScanEl = document.querySelector("#statLastScan");
  const tbody = document.querySelector("#analyticsTableBody");
  if (!qrCountEl) return;

  qrCountEl.textContent = qrs ? qrs.length : 0;

  if (!qrs || !qrs.length) {
    totalEl.textContent = "0";
    topDeviceEl.textContent = "—";
    lastScanEl.textContent = "—";
    tbody.innerHTML = `<tr><td colspan="4" class="empty-row">No QR codes yet — create one in the Generator.</td></tr>`;
    return;
  }

  const { data: scans } = await supabaseClient
    .from("scans")
    .select("qr_id, scanned_at, device")
    .in("qr_id", qrs.map((q) => q.id))
    .order("scanned_at", { ascending: false });

  totalEl.textContent = scans ? scans.length : 0;

  if (!scans || !scans.length) {
    topDeviceEl.textContent = "—";
    topDeviceNoteEl.textContent = "No scans yet";
    lastScanEl.textContent = "—";
  } else {
    const deviceCounts = {};
    scans.forEach((s) => { deviceCounts[s.device || "Other"] = (deviceCounts[s.device || "Other"] || 0) + 1; });
    const topDevice = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])[0];
    topDeviceEl.textContent = topDevice[0];
    topDeviceNoteEl.textContent = `${topDevice[1]} of ${scans.length} scans`;
    lastScanEl.textContent = new Date(scans[0].scanned_at).toLocaleString();
  }

  const scansByQr = {};
  const lastByQr = {};
  (scans || []).forEach((s) => {
    scansByQr[s.qr_id] = (scansByQr[s.qr_id] || 0) + 1;
    if (!lastByQr[s.qr_id]) lastByQr[s.qr_id] = s.scanned_at;
  });

  tbody.innerHTML = qrs.map((qr) => `
    <tr>
      <td>${qr.campaign}</td>
      <td class="qr-link-cell">${redirectUrlFor(qr.short_slug)}</td>
      <td>${scansByQr[qr.id] || 0}</td>
      <td>${lastByQr[qr.id] ? new Date(lastByQr[qr.id]).toLocaleString() : "—"}</td>
    </tr>
  `).join("");
}

const upiPanel = document.querySelector("#upiPanel");
const upiForm = document.querySelector("#upiForm");

document.querySelectorAll(".select-plan").forEach((button) => {
  button.addEventListener("click", () => {
    const plan = button.dataset.plan;
    document.querySelector("#upiSelectedPlan").value = plan;
    document.querySelector("#upiPlanName").textContent = plan;
    document.querySelector("#upiAmount").textContent = `₹${PLAN_PRICES[plan]}`;
    document.querySelector("#upiIdBox").textContent = UPI_ID;
    upiPanel.hidden = false;
    upiPanel.scrollIntoView({ behavior: "smooth" });
  });
});

upiForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = window.appState.user;
  if (!user) return;
  const plan = document.querySelector("#upiSelectedPlan").value;
  const upiRef = document.querySelector("#upiRefInput").value.trim();
  if (!upiRef) return;

  const { error } = await supabaseClient.from("payments").insert({
    user_id: user.id,
    plan,
    amount: PLAN_PRICES[plan],
    upi_ref: upiRef,
    status: "pending",
  });

  if (error) {
    alert(`Could not submit payment: ${error.message}`);
    return;
  }

  await supabaseClient.from("profiles").update({ plan, plan_status: "pending" }).eq("id", user.id);
  window.appState.profile = await loadProfile(user.id);

  alert("Submitted. Your plan activates once the payment is verified.");
  upiForm.reset();
  upiPanel.hidden = true;
  loadPayments();
  renderProfile();
});

async function loadPayments() {
  const user = window.appState.user;
  const tbody = document.querySelector("#paymentsTableBody");
  if (!user || !tbody) return;

  const { data, error } = await supabaseClient
    .from("payments")
    .select("*")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error || !data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No payment submissions yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((row) => `
    <tr>
      <td>${new Date(row.submitted_at).toLocaleDateString()}</td>
      <td>${row.plan}</td>
      <td>₹${row.amount}</td>
      <td>${row.upi_ref}</td>
      <td><span class="status ${row.status === "verified" ? "good" : row.status === "rejected" ? "rejected" : "pending"}">${row.status}</span></td>
    </tr>
  `).join("");
}

function renderProfile() {
  const user = window.appState.user;
  const profile = window.appState.profile;
  if (!user || !profile) return;

  const initials = (profile.full_name || profile.email || "U").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  document.querySelector("#profileAvatar").textContent = initials;
  document.querySelector("#profileButton").textContent = initials;
  document.querySelector("#profileName").textContent = profile.full_name || profile.email;
  document.querySelector("#profileEmail").textContent = profile.email;

  const planLabel = `${profile.plan.charAt(0).toUpperCase()}${profile.plan.slice(1)}`;
  document.querySelector("#profilePlan").textContent = `${planLabel} (${profile.plan_status})`;
  document.querySelector("#currentPlanLabel").textContent = `${planLabel} — ${profile.plan_status}`;

  const planNote = document.querySelector("#profilePlanNote");
  if (profile.plan_status === "pending") {
    planNote.textContent = "Payment submitted — waiting on manual verification.";
  } else if (profile.plan_status === "active") {
    planNote.textContent = "Plan active. Thanks for upgrading.";
  } else {
    planNote.textContent = "Upgrade from the Pricing page for dynamic QR and analytics.";
  }

  const apiBox = document.querySelector("#apiTokenBox");
  if (apiBox) {
    if (profile.plan === "growth" && profile.plan_status === "active") {
      supabaseClient.auth.getSession().then(({ data: { session } }) => {
        apiBox.textContent = session?.access_token || "Log in again to refresh your token.";
      });
    } else {
      apiBox.textContent = "Log in and upgrade to Growth to reveal your token.";
    }
  }
}

window.addEventListener("auth:ready", () => {
  loadMyQrs();
  loadAnalytics();
  loadPayments();
  renderProfile();
});

window.addEventListener("hashchange", () => {
  if (!window.appState.user) return;
  const page = (window.location.hash || "#home").slice(1);
  if (page === "my-qrs") loadMyQrs();
  if (page === "analytics") loadAnalytics();
  if (page === "pricing") loadPayments();
  if (page === "profile" || page === "api") renderProfile();
});
