const journal = document.querySelector("#journal");
const statusNote = document.querySelector("#notes-status");
function cleanNote(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set(["P","DIV","BR","B","STRONG","I","EM","H2","H3","FONT","SPAN"]);
  function clean(node) {
    if (node.nodeType === 3) return document.createTextNode(node.textContent);
    if (node.nodeType !== 1 || ["SCRIPT","STYLE","IFRAME","OBJECT"].includes(node.tagName)) return document.createTextNode("");
    const el = document.createElement(allowed.has(node.tagName) ? node.tagName : "span");
    if (["left","center","right"].includes(node.style.textAlign)) el.style.textAlign = node.style.textAlign;
    if (node.tagName === "FONT" && /^[3-6]$/.test(node.getAttribute("size"))) el.setAttribute("size", node.getAttribute("size"));
    for (const child of node.childNodes) el.append(clean(child));
    return el;
  }
  const fragment = document.createElement("div");
  for (const node of doc.body.childNodes) fragment.append(clean(node));
  return fragment.innerHTML;
}
if (state.notesHtml) journal.innerHTML = cleanNote(state.notesHtml);
else journal.textContent = state.notes || "";
function draft() {
  state.notesHtml = cleanNote(journal.innerHTML);
  save();
  statusNote.textContent = "Черновик сохранён в этом браузере";
}
journal.addEventListener("input", draft);
journal.addEventListener("paste", event => {
  event.preventDefault();
  document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
});
let selection;
journal.addEventListener("keyup", remember);
journal.addEventListener("mouseup", remember);
function remember() {
  const s = window.getSelection();
  if (s.rangeCount && journal.contains(s.anchorNode)) selection = s.getRangeAt(0).cloneRange();
}
function command(name, value) {
  journal.focus();
  if (selection) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(selection); }
  document.execCommand(name, false, value);
  remember(); draft();
}
document.querySelectorAll("[data-command]").forEach(button => {
  button.onmousedown = event => event.preventDefault();
  button.onclick = () => command(button.dataset.command);
});
document.querySelector("#note-heading").onchange = e => command("formatBlock", e.target.value);
document.querySelector("#note-size").onchange = e => command("fontSize", e.target.value);
async function cloud(method) {
  if (location.protocol === "file:") { statusNote.textContent = "Облачное сохранение доступно после публикации на Netlify. Локальный черновик сохранён."; return; }
  const password = document.querySelector("#notes-password").value;
  if (!password) { statusNote.textContent = "Введите пароль редактора"; return; }
  if (method === "GET" && !confirm("Заменить текущий текст облачной версией?")) return;
  const buttons = document.querySelectorAll("#notes-cloud button");
  buttons.forEach(b => b.disabled = true);
  try {
    const response = await fetch("/.netlify/functions/solkan-notes", {method, headers:{"Content-Type":"application/json","x-upload-token":password}, ...(method === "POST" ? {body:JSON.stringify({html:cleanNote(journal.innerHTML)})} : {})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ошибка Netlify");
    if (method === "GET") { journal.innerHTML = cleanNote(data.html); selection = null; draft(); }
    statusNote.textContent = method === "GET" ? "Загружено из Netlify" : "Сохранено в Netlify";
  } catch (error) { statusNote.textContent = "Облако: " + error.message + ". Черновик остаётся в браузере."; }
  finally { buttons.forEach(b => b.disabled = false); }
}
document.querySelector("#notes-cloud").onsubmit = e => { e.preventDefault(); cloud("POST"); };
document.querySelector("#load-notes").onclick = () => cloud("GET");
