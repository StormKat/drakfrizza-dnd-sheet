const battleCloud = $("#battle-cloud");
const battleKeys = ["hp","temp","slots","mark","dice","inspiration","deathSuccess","deathFailure"];
const battleSnapshot = () => Object.fromEntries(battleKeys.map(id => [id, state[id]]));
async function syncBattle(method) {
  const status = $("#battle-sync-status");
  if (location.protocol === "file:") {
    status.textContent = "Синхронизация доступна на сайте Netlify.";
    return;
  }
  if (!battleCloud.reportValidity()) return;
  const buttons = battleCloud.querySelectorAll("button");
  buttons.forEach(button => button.disabled = true);
  status.textContent = "Синхронизация…";
  try {
    const response = await fetch("/.netlify/functions/solkan-battle", {
      method,
      headers: {"Content-Type":"application/json","x-upload-token":$("#battle-password").value},
      ...(method === "POST" ? {body:JSON.stringify(battleSnapshot())} : {})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ошибка синхронизации");
    if (method === "GET") {
      if (!confirm("Заменить локальные хиты и боевые ресурсы облачной версией?")) {
        status.textContent = "Локальное состояние не изменено.";
        return;
      }
      for (const id of battleKeys) state[id] = data.battle[id];
      save();
      syncInputs();
      for (const button of document.querySelectorAll("[data-death]")) {
        button.setAttribute("aria-pressed", state[button.dataset.death][Number(button.dataset.index)]);
      }
    }
    status.textContent = method === "GET" ? "Бой загружен из облака." : "Бой сохранён в облаке.";
  } catch (error) { status.textContent = error.message; }
  finally { buttons.forEach(button => button.disabled = false); }
}
battleCloud.onsubmit = event => { event.preventDefault(); syncBattle("POST"); };
$("#load-battle").onclick = () => syncBattle("GET");
