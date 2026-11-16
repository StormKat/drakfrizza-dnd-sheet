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
const pageCount = 10;
const pageSelect = document.querySelector("#note-page");
const prevPage = document.querySelector("#note-prev");
const nextPage = document.querySelector("#note-next");
journal.textContent = state.notes || "";
const makePages = source => Array.from({length:pageCount}, (_, i) =>
  typeof source[i] === "string" ? cleanNote(source[i]) : "");
let pages = makePages(Array.isArray(state.notePages) ? state.notePages : [state.notesHtml ?? journal.innerHTML]);
let page = Number.isInteger(state.notePage) && state.notePage >= 0 && state.notePage < pageCount ? state.notePage : 0;
let selection;
for (let i = 0; i < pageCount; i++) pageSelect.add(new Option(i + 1, i));
function showPage() {
  journal.innerHTML = pages[page];
  journal.scrollTop = 0;
  journal.setAttribute("aria-label", "Заметки, страница " + (page + 1));
  selection = null;
  pageSelect.value = page;
  prevPage.disabled = page === 0;
  nextPage.disabled = page === pageCount - 1;
}
function persistPages() {
  state.notePages = pages;
  state.notePage = page;
  state.notesHtml = pages[0];
  save();
}
function turnPage(target) {
  if (target < 0 || target >= pageCount || target === page) return;
  pages[page] = cleanNote(journal.innerHTML);
  page = target;
  persistPages();
  showPage();
}
prevPage.onclick = () => turnPage(page - 1);
nextPage.onclick = () => turnPage(page + 1);
pageSelect.onchange = () => turnPage(Number(pageSelect.value));
showPage();
function draft() {
  pages[page] = cleanNote(journal.innerHTML);
  persistPages();
  statusNote.textContent = "Черновик сохранён в этом браузере";
}
journal.addEventListener("input", draft);
journal.addEventListener("paste", event => {
  event.preventDefault();
  document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
});
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
let noteRevision = state.noteRevision;
async function cloud(method, restore = false) {
  if (location.protocol === "file:") { statusNote.textContent = "Облачное сохранение доступно после публикации на Netlify. Локальный черновик сохранён."; return; }
  const password = document.querySelector("#notes-password").value;
  if (!password) { statusNote.textContent = "Введите пароль редактора"; return; }
  const buttons = document.querySelectorAll("#notes-cloud button");
  buttons.forEach(b => b.disabled = true);
  try {
    if (method === "POST") pages[page] = cleanNote(journal.innerHTML);
    const response = await fetch("/.netlify/functions/solkan-notes", {method, headers:{"Content-Type":"application/json","x-upload-token":password}, ...(method === "POST" ? {body:JSON.stringify(restore ? {restoreValakia:true} : {html:pages[0],pages,revision:noteRevision})} : {})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ошибка Netlify");
    if (method === "GET" || restore) {
      if (!restore && !confirm("Открыть облачный блокнот вместо локального черновика?")) {
        statusNote.textContent = "Локальный черновик не изменён.";
        return;
      }
      if (restore) {
        pages[page] = cleanNote(journal.innerHTML);
        const backup = JSON.stringify({pages,page,revision:noteRevision});
        localStorage.setItem(key + ".before-recovery", backup);
      }
      pages = makePages(Array.isArray(data.pages) ? data.pages : [data.html]);
      page = data.restoredPage ?? 0;
      showPage();
    }
    noteRevision = state.noteRevision = data.updatedAt;
    persistPages();
    statusNote.textContent = restore ? "Запись восстановлена в Netlify." : method === "GET" ? "Загружено из Netlify" : "Сохранено и проверено в Netlify";
    if (restore) journal.scrollIntoView({block:"start"});
  } catch (error) { statusNote.textContent = "Облако: " + error.message + ". Черновик остаётся в браузере."; }
  finally { buttons.forEach(b => b.disabled = false); }
}
document.querySelector("#notes-cloud").onsubmit = e => { e.preventDefault(); cloud("POST"); };
document.querySelector("#load-notes").onclick = () => cloud("GET");
document.querySelector("#restore-valakia").onclick = () => cloud("POST", true);
