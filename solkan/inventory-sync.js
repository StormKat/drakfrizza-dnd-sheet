const inventoryCloud = $("#inventory-cloud");
const inventoryKeys = ["items", "gold", "silver", "copper"];
async function syncInventory(method) {
  const status = $("#inventory-sync-status");
  if (location.protocol === "file:") {
    status.textContent = "Синхронизация доступна на сайте Netlify.";
    return;
  }
  if (!inventoryCloud.reportValidity()) return;
  const buttons = inventoryCloud.querySelectorAll("button");
  buttons.forEach(button => button.disabled = true);
  status.textContent = "Синхронизация…";
  try {
    const response = await fetch("/.netlify/functions/solkan-inventory", {
      method,
      headers: {"Content-Type":"application/json","x-upload-token":$("#inventory-password").value},
      ...(method === "POST" ? {body:JSON.stringify(Object.fromEntries(inventoryKeys.map(key => [key, state[key]])))} : {})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ошибка синхронизации");
    if (method === "GET") {
      if (!confirm("Заменить локальный инвентарь и монеты облачной версией?")) {
        status.textContent = "Локальный инвентарь не изменён.";
        return;
      }
      for (const key of inventoryKeys) state[key] = data.inventory[key];
      save();
      syncInputs();
      renderItems();
    }
    status.textContent = method === "GET" ? "Инвентарь загружен." : "Инвентарь сохранён в облаке.";
  } catch (error) { status.textContent = error.message; }
  finally { buttons.forEach(button => button.disabled = false); }
}
inventoryCloud.onsubmit = event => { event.preventDefault(); syncInventory("POST"); };
$("#load-inventory").onclick = () => syncInventory("GET");
