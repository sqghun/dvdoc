"use strict";

/* ============ Dados fictícios ============ */
const PROFESSIONAL = { name: "Enf. Carla Mendes", role: "UTI", user: "carla.mendes" };

const PATIENTS = [
  { id: "P-1001", name: "Maria Aparecida Silva", bed: "Leito 12 · Quarto 4", blood: "O+",  key: "PEP-2026-004517" },
  { id: "P-1002", name: "João Pedro Santos",     bed: "Leito 07 · Quarto 2", blood: "A-",  key: "PEP-2026-004238" },
  { id: "P-1003", name: "Ana Beatriz Oliveira",  bed: "Leito 21 · UTI",      blood: "B+",  key: "PEP-2026-005891" },
];

const DOC_TYPES = [
  "Eletrocardiograma",
  "Exame Externo",
  "Termo de Consentimento",
  "Termo de Morte Encefálica",
];

const DELETE_REASONS = [
  "Documento digitalizado errado",
  "Imagem ilegível / borrada",
  "Documento duplicado",
  "Erro de vinculação",
];

const SAMPLE_DOCS = {
  "Documento de Exemplo": (p) => svgDoc("DOC", "Documento de Exemplo", `Exame digitalizado — paciente ${p.name}`),
  "Eletrocardiograma": (p) => svgDoc("ECG", "Eletrocardiograma", `Derivação II — paciente ${p.name}`),
  "Exame Externo": (p) => svgDoc("RX", "Exame Externo", `Raio-X de tórax — paciente ${p.name}`),
  "Termo de Consentimento": (p) => svgDoc("TC", "Termo de Consentimento", `Consentimento para procedimento — ${p.name}`),
  "Termo de Morte Encefálica": (p) => svgDoc("ME", "Morte Encefálica", `Termo de Morte Encefálica — ${p.name}`),
};

function svgDoc(code, title, subtitle) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="780">
    <rect width="600" height="780" fill="#ffffff"/>
    <rect x="40" y="40" width="520" height="700" fill="none" stroke="#0b6bcb" stroke-width="3"/>
    <text x="300" y="120" font-family="Arial" font-size="34" font-weight="bold" fill="#0b6bcb" text-anchor="middle">${title}</text>
    <line x1="120" y1="150" x2="480" y2="150" stroke="#0b6bcb" stroke-width="2"/>
    <text x="300" y="220" font-family="Arial" font-size="22" fill="#333" text-anchor="middle">${subtitle}</text>
    <text x="300" y="280" font-family="Arial" font-size="18" fill="#666" text-anchor="middle">Documento digitalizado — Hospital São Lucas</text>
    <rect x="120" y="380" width="360" height="180" fill="#f4f6f9" stroke="#ccc"/>
    <polyline points="140,470 180,470 195,430 210,510 225,380 240,540 255,470 320,470 335,440 350,500 365,470 420,470 435,450 450,490 465,470" fill="none" stroke="#c0392b" stroke-width="3"/>
    <text x="300" y="620" font-family="monospace" font-size="16" fill="#888" text-anchor="middle">${code}-${Date.now().toString().slice(-8)}</text>
    <text x="300" y="680" font-family="Arial" font-size="16" fill="#999" text-anchor="middle">Assinado digitalmente · ${new Date().toLocaleDateString("pt-BR")}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/* ============ Estado ============ */
const state = {
  screen: "login",
  professional: null,
  patient: null,
  patientIndex: 0,
  pendingImage: null,   // dataURL da imagem a vincular
  docType: null,
  documents: [],        // docs do paciente atual
  log: [],
  deletingId: null,
  deleteReason: null,
};

/* ============ Helpers DOM ============ */
const $ = (id) => document.getElementById(id);

function now() {
  return new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function log(msg) {
  state.log.unshift({ time: now(), msg });
  renderLog();
}

/* ============ Navegação ============ */
function showScreen(name) {
  state.screen = name;
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");

  const logged = state.professional !== null;
  $("bottomNav").classList.toggle("hidden", !logged || name === "login");

  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.go === name)
  );

  if (name === "docs") renderDocs();
  if (name === "pulseira") resetPatientCard();
}

/* ============ Login ============ */
function login(professional) {
  state.professional = professional;
  $("profBadge").textContent = `${professional.name} · ${professional.role}`;
  log(`Login realizado — ${professional.name} (${professional.role})`);
  showScreen("pulseira");
}

$("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = $("userInput").value.trim() || PROFESSIONAL.user;
  login({ ...PROFESSIONAL, name: user.includes(".") ? "Enf. " + user.split(".").map(s => s[0].toUpperCase() + s.slice(1)).join(" ") : PROFESSIONAL.name });
});

$("biometricBtn").addEventListener("click", () => {
  // Simulação de verificação biométrica
  $("biometricBtn").innerHTML = "⏳ Verificando…";
  setTimeout(() => {
    $("biometricBtn").innerHTML = '<span class="bio-icon">🫆</span> Login com Biometria';
    login(PROFESSIONAL);
  }, 900);
});

/* ============ Pulseira ============ */
function seedDocuments(p) {
  const mk = (type, hoursAgo, user) => ({
    id: "seed-" + type,
    type,
    image: SAMPLE_DOCS[type](p),
    user,
    time: new Date(Date.now() - hoursAgo * 3600e3).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    synced: true,
  });
  return [
    mk("Eletrocardiograma", 26, "Dr. Rafael Lima"),
    mk("Termo de Consentimento", 5, PROFESSIONAL.name),
  ];
}

function resetPatientCard() {
  $("patientCard").classList.add("hidden");
  $("scanStatus").textContent = "Aguardando leitura…";
  $("scanStatus").style.color = "#cfe6ff";
}

function simulateScan() {
  $("scanStatus").textContent = "Lendo código de barras…";
  setTimeout(() => {
    state.patientIndex = (state.patientIndex + 1) % PATIENTS.length;
    const p = PATIENTS[state.patientIndex];
    state.patient = p;
    state.documents = seedDocuments(p);
    state.log = [];
    $("pcName").textContent = p.name;
    $("pcBed").textContent = p.bed;
    $("pcKey").textContent = p.key;
    $("pcBlood").textContent = p.blood;
    $("patientCard").classList.remove("hidden");
    $("scanStatus").textContent = `✓ Pulseira identificada — ${p.name}`;
    $("scanStatus").style.color = "#7dffb0";
    log(`Pulseira lida — paciente ${p.name} (${p.key})`);
  }, 1200);
}

$("simulateScanBtn").addEventListener("click", simulateScan);

$("goScanBtn").addEventListener("click", () => {
  $("patientMini").textContent = `${state.patient.name} · ${state.patient.bed} · ${state.patient.key}`;
  $("patientMiniDocs").textContent = `${state.patient.name} · ${state.patient.key}`;
  resetCapture();
  showScreen("scan");
});

/* ============ Escanear ============ */
function renderDocTypeChips() {
  const box = $("docTypeChips");
  box.innerHTML = "";
  DOC_TYPES.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (state.docType === t ? " selected" : "");
    b.textContent = t;
    b.onclick = () => { state.docType = t; renderDocTypeChips(); updateLinkBtn(); };
    box.appendChild(b);
  });
}

function resetCapture() {
  state.pendingImage = null;
  state.docType = null;
  $("previewImg").classList.add("hidden");
  $("capturePlaceholder").classList.remove("hidden");
  $("fileInput").value = "";
  renderDocTypeChips();
  updateLinkBtn();
}

function setPreview(src) {
  state.pendingImage = src;
  $("previewImg").src = src;
  $("previewImg").classList.remove("hidden");
  $("capturePlaceholder").classList.add("hidden");
  updateLinkBtn();
}

function updateLinkBtn() {
  $("linkDocBtn").disabled = !(state.pendingImage && state.docType);
}

$("captureArea").addEventListener("click", () => $("fileInput").click());

$("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => setPreview(ev.target.result);
  reader.readAsDataURL(file);
});

/* Botão: usar documento de exemplo */
const sampleBtn = document.createElement("button");
sampleBtn.type = "button";
sampleBtn.className = "btn btn-biometric";
sampleBtn.style.margin = "12px 0 0";
sampleBtn.textContent = "Usar documento de exemplo";
sampleBtn.onclick = () =>
  setPreview(SAMPLE_DOCS["Documento de Exemplo"](state.patient || PATIENTS[0]));
document.querySelector(".capture-area").after(sampleBtn);

$("linkDocBtn").addEventListener("click", () => {
  if (!state.pendingImage || !state.docType) return;
  state.documents.unshift({
    id: "doc-" + Date.now(),
    type: state.docType,
    image: state.pendingImage,
    user: state.professional.name,
    time: now(),
    synced: true,
  });
  log(`Documento "${state.docType}" vinculado ao prontuário ${state.patient.key}`);
  resetCapture();
  $("patientMini").textContent = `${state.patient.name} · ${state.patient.key}`;
  showScreen("docs");
});

/* ============ Documentos ============ */
function renderDocs() {
  const list = $("docList");
  list.innerHTML = "";
  $("emptyDocs").classList.toggle("hidden", state.documents.length > 0);

  state.documents.forEach((d) => {
    const li = document.createElement("li");
    li.className = "doc-item";
    li.innerHTML = `
      <div class="doc-head">
        <span class="doc-type"></span>
        <span class="badge ${d.deleted ? "deleted" : ""}">${d.deleted ? "Excluído" : "Sincronizado"}</span>
      </div>
      <div class="doc-meta">${d.time} · por ${d.user}${d.deletedReason ? " · Motivo: " + d.deletedReason : ""}</div>
      <div class="doc-actions">
        <button class="link-btn view">Visualizar</button>
        ${d.deleted ? "" : '<button class="link-btn danger del">Excluir</button>'}
      </div>`;
    li.querySelector(".doc-type").textContent = d.type;
    li.querySelector(".view").onclick = () => openView(d);
    const del = li.querySelector(".del");
    if (del) del.onclick = () => openDelete(d.id);
    list.appendChild(li);
  });
  renderLog();
}

function renderLog() {
  const list = $("logList");
  list.innerHTML = "";
  if (!state.log.length) {
    list.innerHTML = '<li class="log-item">Nenhuma ação registrada.</li>';
    return;
  }
  state.log.forEach((l) => {
    const li = document.createElement("li");
    li.className = "log-item";
    li.innerHTML = `<b>${l.time}</b> — ${l.msg}`;
    list.appendChild(li);
  });
}

/* ============ Modais ============ */
function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }

function openView(d) {
  $("viewTitle").textContent = `${d.type} — ${state.patient ? state.patient.name : ""}`;
  $("viewImg").src = d.image;
  openModal("viewModal");
}
$("viewClose").onclick = () => closeModal("viewModal");
$("viewCloseBtn").onclick = () => closeModal("viewModal");

function openDelete(id) {
  state.deletingId = id;
  state.deleteReason = null;
  $("reasonInput").classList.add("hidden");
  $("reasonInput").value = "";
  $("confirmDeleteBtn").disabled = true;
  renderReasonChips();
  openModal("deleteModal");
}

function renderReasonChips() {
  const box = $("reasonChips");
  box.innerHTML = "";
  DELETE_REASONS.forEach((r) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (state.deleteReason === r ? " selected" : "");
    b.textContent = r;
    b.onclick = () => {
      state.deleteReason = r;
      $("reasonInput").classList.add("hidden");
      $("confirmDeleteBtn").disabled = false;
      renderReasonChips();
    };
    box.appendChild(b);
  });
  const other = document.createElement("button");
  other.type = "button";
  other.className = "chip" + (state.deleteReason === "__other__" ? " selected" : "");
  other.textContent = "Outro motivo…";
  other.onclick = () => {
    state.deleteReason = "__other__";
    $("reasonInput").classList.remove("hidden");
    $("confirmDeleteBtn").disabled = true;
    renderReasonChips();
    $("reasonInput").focus();
  };
  box.appendChild(other);
}

$("reasonInput").addEventListener("input", (e) => {
  $("confirmDeleteBtn").disabled = e.target.value.trim().length === 0;
});

$("delClose").onclick = () => closeModal("deleteModal");

$("confirmDeleteBtn").addEventListener("click", () => {
  const d = state.documents.find((x) => x.id === state.deletingId);
  if (!d) return;
  const reason = state.deleteReason === "__other__"
    ? $("reasonInput").value.trim()
    : state.deleteReason;
  d.deleted = true;
  d.deletedReason = reason;
  log(`Documento "${d.type}" excluído — motivo: ${reason}`);
  closeModal("deleteModal");
  renderDocs();
});

/* ============ Navegação inferior e voltar ============ */
document.querySelectorAll(".nav-btn").forEach((b) => {
  b.addEventListener("click", () => {
    const dest = b.dataset.go;
    if (dest === "scan" && !state.patient) { showScreen("pulseira"); return; }
    if (dest === "docs" && !state.patient) { showScreen("pulseira"); return; }
    if (dest === "scan") resetCapture();
    showScreen(dest);
  });
});

document.querySelectorAll(".btn-back").forEach((b) => {
  b.addEventListener("click", () => showScreen(b.dataset.go));
});

/* ============ Init ============ */
renderDocTypeChips();
renderLog();
