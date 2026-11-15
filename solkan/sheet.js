const $ = (selector) => document.querySelector(selector);
const key = "solkan.sheet.v1";
const defaults = { level: 2, maxHp: 19, hp: 19, temp: 0, slots: 2, mark: 2, dice: 2, inspiration: 0, gold: 0, silver: 0, copper: 0,
  notes: "Солкан ищет одобрения предка. Немного кровожаден и циничен. В записях упоминается Убтау.",
  items: [["Длинный лук", 1], ["Духовая трубка", 1], ["Мачете", 2]] };
let state = { ...defaults };
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved) Object.assign(state, saved, upgradeBattle(saved));
} catch {}
function upgradeBattle(saved) {
  const previousMax = saved.maxHp ?? (saved.level === 2 ? 18 : 12);
  return {
    level: defaults.level,
    maxHp: defaults.maxHp,
    hp: saved.hp === 0 ? 0 : Math.min(defaults.maxHp, (saved.hp ?? previousMax) + defaults.maxHp - previousMax),
    dice: saved.level === 2 ? (saved.dice ?? defaults.dice) : Math.min(defaults.dice, (saved.dice ?? 1) + 1)
  };
}
function save() { localStorage.setItem(key, JSON.stringify(state)); }

const abilities = [
  ["Сила", 14, true, ["Атлетика"]],
  ["Ловкость", 16, true, ["Акробатика", "Ловкость рук", "Скрытность"]],
  ["Телосложение", 11, false, []],
  ["Интеллект", 11, false, ["История", "Природа", "*Расследование", "*Религия", "Тайная магия"]],
  ["Мудрость", 16, false, ["*Восприятие", "Выживание", "*Медицина", "Проницательность", "**Уход за животными"]],
  ["Харизма", 9, false, ["Выступление", "Запугивание", "Обман", "Убеждение"]]
];
const weapons = [
  ["Длинный лук", "Замедление", "1к8 + 3", 7],
  ["Духовая трубка с дротиками", "Отвлечение", "1", 7],
  ["Мачете ×2", "Быстрое", "1к6", 5]
];
const signed = (n) => n < 0 ? "−" + Math.abs(n) : "+" + n;
$("#abilities").innerHTML = abilities.map(([name, score, trained, skills]) => {
  const mod = Math.floor((score - 10) / 2);
  const check = (label, known, expert = false) => `<div class="check"><i class="${known ? "trained" : ""}" aria-label="${expert ? "Экспертиза" : known ? "Владение" : "Без владения"}"></i><b>${signed(mod + (expert ? 4 : known ? 2 : 0))}</b><span>${label}</span></div>`;
  return `<section class="ability"><h3>${name}</h3><div class="score"><b>${signed(mod)}</b><span>${score}</span></div>${check("Спасбросок", trained)}${skills.map(skill => check(skill.replace(/^\*+/, ""), skill.startsWith("*"), skill.startsWith("**"))).join("")}</section>`;
}).join("");
$("#weapons").innerHTML = weapons.map(([name, mastery, damage, attack]) =>
  `<div class="row"><div><strong>${name}</strong><small>${mastery}</small></div><span>Атака ${signed(attack)} · ${damage}</span></div>`).join("");
const resources = [["slots", "Ячейки 1-го уровня", 2], ["mark", "Бесплатная «Метка охотника»", 2], ["dice", "Кости хитов (к10)", defaults.dice]];
$("#resources").innerHTML = resources.map(([id, title, max]) =>
  `<div class="resource"><strong>${title}</strong><div class="pips" role="group" aria-label="${title}">${Array.from({length:max}, (_, i) => `<button type="button" data-pip="${id}" data-index="${i}" aria-label="${title}: ${i+1}" title="${title}: ${i+1}"><svg viewBox="0 0 32 32" aria-hidden="true">${id === "mark" ? '<circle cx="16" cy="16" r="9"/><path d="M16 2v9m0 10v9M2 16h9m10 0h9"/>' : '<path d="M16 2 29 10v12L16 30 3 22V10Zm0 0v28M3 10l13 8 13-8"/>'}</svg></button>`).join("")}<span data-count-for="${id}"></span></div></div>`).join("");
$("#coins").innerHTML = [["gold", "Золото"], ["silver", "Серебро"], ["copper", "Медь"]].map(([id, title]) =>
  `<label>${title} <input data-state="${id}" type="number" min="0"></label>`).join("");

function syncCombat() {
  const coins = $("#inspiration-coins");
  const oldCount = Number(coins.dataset.count || 0);
  const count = Math.min(7, Math.max(0, state.inspiration));
  coins.dataset.count = state.inspiration;
  coins.innerHTML = Array.from({length: Math.max(1, count)}, (_, i) =>
    `<span class="inspiration-coin ${count ? "" : "empty-coin"}" style="--coin:${i}"><svg viewBox="0 0 32 32"><path d="m16 4 3.5 8.5L28 16l-8.5 3.5L16 28l-3.5-8.5L4 16l8.5-3.5Z"/><circle cx="16" cy="16" r="3"/></svg></span>`).join("");
  if (state.inspiration !== oldCount && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (state.inspiration > oldCount) {
      coins.lastElementChild.animate([{transform:"translateY(-38px) rotate(-24deg)",opacity:0},{transform:"translateY(3px) rotate(3deg)",opacity:1,offset:.75},{transform:"translateY(0) rotate(0)",opacity:1}],{duration:480,easing:"ease-out"});
    } else {
      const departing = coins.lastElementChild.cloneNode(true);
      departing.classList.remove("empty-coin");
      coins.append(departing);
      departing.animate([{transform:"translateY(0)",opacity:1},{transform:"translate(28px,-30px) rotate(28deg)",opacity:0}],{duration:350,easing:"ease-in"}).finished.then(()=>departing.remove());
    }
  }
  $(".inspiration").classList.toggle("available", state.inspiration > 0);
  $("#spend-inspiration").disabled = state.inspiration < 1;
  for (const [id, , max] of resources) {
    document.querySelector(`[data-count-for="${id}"]`).textContent = state[id] + " / " + max;
    for (const pip of document.querySelectorAll(`[data-pip="${id}"]`)) {
      pip.setAttribute("aria-pressed", Number(pip.dataset.index) < state[id]);
    }
  }
  $("#short button").disabled = state.dice < 1;
}
function syncInputs() {
  for (const input of document.querySelectorAll("[data-state]")) input.value = state[input.dataset.state];
  syncCombat();
}
document.addEventListener("input", ({target}) => {
  if (!target.dataset.state) return;
  if (target.type === "number" && target.value === "") return;
  state[target.dataset.state] = target.type === "number"
    ? Math.min(target.max === "" ? Number.MAX_SAFE_INTEGER : Number(target.max), Math.max(0, Math.trunc(target.valueAsNumber))) : target.value;
  save();
  for (const input of document.querySelectorAll(`[data-state="${target.dataset.state}"]`)) {
    if (input !== target) input.value = state[target.dataset.state];
  }
  syncCombat();
});
$("#resources").onclick = ({target}) => {
  const pip = target.closest("[data-pip]");
  if (!pip) return;
  const id = pip.dataset.pip;
  state[id] += pip.getAttribute("aria-pressed") === "true" ? -1 : 1;
  save();
  syncCombat();
  pip.animate([{transform:"scale(.87)"},{transform:"scale(1.12)"},{transform:"scale(1)"}],
    {duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260});
};
document.addEventListener("change", ({target}) => {
  if (target.dataset.state) target.value = state[target.dataset.state];
});
for (const tab of document.querySelectorAll("[data-tab]")) tab.onclick = () => {
  for (const button of document.querySelectorAll("[data-tab]")) {
    button.setAttribute("aria-pressed", button === tab);
    $("#" + button.dataset.tab).hidden = button !== tab;
  }
};
$("#short").onsubmit = (event) => {
  event.preventDefault();
  if (!state.dice) return;
  const healed = Math.min(defaults.hp - state.hp, Number(event.currentTarget.elements.die.value));
  state.hp += healed;
  state.dice--;
  save(); syncInputs();
  $("#rest-result").textContent = "Восстановлено ХП: " + healed;
};
$("#long").onclick = () => {
  for (const id of ["hp", "temp", "dice", "slots", "mark"]) state[id] = defaults[id];
  save(); syncInputs();
  $("#rest-result").textContent = "Хиты и ресурсы восстановлены.";
};
function renderItems() {
  $("#items").replaceChildren(...state.items.map(([name, quantity], index) => {
    const item = document.createElement("li");
    const label = document.createElement("label");
    const input = document.createElement("input");
    const remove = document.createElement("button");
    label.textContent = name + " ";
    input.type = "number"; input.min = 1; input.value = quantity;
    input.onchange = () => { input.value = Math.max(1, Math.trunc(Number(input.value))); state.items[index][1] = Number(input.value); save(); };
    remove.textContent = "Удалить"; remove.setAttribute("aria-label", "Удалить: " + name);
    remove.onclick = () => { state.items.splice(index, 1); save(); renderItems(); };
    label.append(input); item.append(label, remove); return item;
  }));
}
$("#add-item").onsubmit = (event) => {
  event.preventDefault();
  const name = event.currentTarget.elements.namedItem("item").value.trim();
  if (!name) return;
  state.items.push([name, 1]); save(); renderItems(); event.currentTarget.reset();
};
syncInputs();
renderItems();
for (const [id, change] of [["gain-inspiration", 1], ["spend-inspiration", -1]]) {
  $("#" + id).onclick = () => {
    state.inspiration = Math.max(0, state.inspiration + change);
    save();
    syncInputs();
  };
}

if (!Array.isArray(state.deathSuccess)) state.deathSuccess = [false, false, false];
if (!Array.isArray(state.deathFailure)) state.deathFailure = [false, false, false];
// Lucide 0.468.0 icons, ISC; see LUCIDE-LICENSE.txt.
const leaf = '<g transform="scale(1.333)"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></g>';
const skull = '<g transform="scale(1.333)"><path d="m12.5 17-.5-1-.5 1h1zM15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/></g>';
const flame = '<g transform="scale(1.333)"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></g>';
$("#death-marks").innerHTML = [["deathSuccess", "Успехи", leaf], ["deathFailure", "Провалы", skull]].map(([id, label, shape]) =>
  `<div class="death-group" data-death-group="${id}"><strong>${label}</strong><div>${[0,1,2].map(index =>
    `<button type="button" data-death="${id}" data-index="${index}" aria-label="${label}: отметка ${index+1}" aria-pressed="${state[id][index]}"><svg viewBox="0 0 32 32" aria-hidden="true">${shape}</svg><span class="death-fx" aria-hidden="true">${Array.from({length:5}, (_,i) => `<svg style="--i:${i}" viewBox="0 0 32 32">${id === "deathSuccess" ? leaf : flame}</svg>`).join("")}</span></button>`
  ).join("")}</div></div>`).join("");
$("#death-marks").onclick = ({target}) => {
  const button = target.closest("[data-death]");
  if (!button) return;
  const id = button.dataset.death;
  const index = Number(button.dataset.index);
  state[id][index] = !state[id][index];
  button.setAttribute("aria-pressed", state[id][index]);
  button.classList.remove("celebrate");
  if (state[id][index]) {
    void button.offsetWidth;
    button.classList.add("celebrate");
  }
  save();
};
$("#death-marks").addEventListener("animationend", ({target}) => {
  if (target.classList.contains("death-fx")) target.closest("button").classList.remove("celebrate");
});

const dice = {
  6: ["16,2 29,9 29,24 16,31 3,24 3,9", "M3 9l13 7 13-7M16 16v15"],
  8: ["16,2 29,16 16,30 3,16", "M16 2l-6 18 6 10m0-28 6 18-6 10M3 16l7 4h12l7-4"],
  20: ["16,2 29,9 29,24 16,31 3,24 3,9", "M16 2l-8 20h16L16 2M3 9l5 13-5 2m26-15-5 13 5 2M8 22l8 9 8-9"]
};
const glyphs = [
  "M7 3a14 14 0 0 1 0 26L7 3m-4 13h26m-5-5 5 5-5 5",
  "m5 25 20-20 4 4L9 29zm14-14 4 4",
  "M4 28l7-7m-3-3 6 6m-3-3L25 4h4v4L14 22",
  "M16 2v7m0 14v7M2 16h7m14 0h7M16 6a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"
];
const roll = (label, count, sides, bonus = 0) => {
  const [outline, facets] = dice[sides];
  const formula = `${count}к${sides}${bonus ? " + " + bonus : ""}`;
  return `<button type="button" data-roll="${count},${sides},${bonus}" data-formula="${formula}"><svg viewBox="0 0 32 32" aria-hidden="true"><polygon points="${outline}"/><path d="${facets}"/></svg><span>${label}<strong>${formula}</strong></span></button>`;
};
const card = (name, index, type, detail, actions) =>
  `<article class="battle-card" data-kind="${index}"><div class="card-heading"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="${glyphs[index]}"/></svg><div><small>${type}</small><h3>${name}</h3></div></div><p>${detail}</p><div class="battle-actions">${actions}</div><details><summary>Подробности</summary><p>${[
    "Бросок атаки: к20 + 7 против КБ цели. При попадании брось к8 + 3. При критическом попадании — 2к8 + 3. Дополнительный урон Метки бросается отдельно. Для атаки необходимы лук и стрела.",
    "Бросок атаки: к20 + 7 против КБ цели. На бланке указан фиксированный урон 1: кубик урона не бросается. Дротик расходуется при выстреле. Яд и его эффект, если они есть, учитываются отдельно; владение набором отравителя само по себе не даёт яд.",
    "На бланке записаны два мачете, атака +5 и урон 1к6. Эти значения сохранены без изменения. Тип игрового оружия и добавление модификатора к урону нужно согласовать с ведущим; наличие двух клинков само по себе не означает две обычные атаки.",
    "Выбери видимое существо в пределах 90 футов. Пока сохраняется концентрация, каждое попадание броском атаки по нему наносит дополнительно 1к6 урона силовым полем. Проверки Восприятия и Выживания для поиска этой цели совершаются с преимуществом. Если её ХП упали до 0, бонусным действием можно перенести метку на другую видимую цель в пределах дистанции. Компонент: вербальный. Длительность: до 1 часа. Два бесплатных применения восстанавливаются после продолжительного отдыха."
  ][index]}</p></details></article>`;
$("#battle-weapons").innerHTML = weapons.map(([name, mastery, , attack], index) => {
  const damage = index === 0 ? roll("Урон", 1, 8, 3) + roll("Крит", 2, 8, 3)
    : index === 1 ? '<span class="fixed-damage">Урон <strong>1</strong></span>' : roll("Урон", 1, 6) + roll("Крит", 2, 6);
  return card(name, index, "Оружие · действие", mastery + " · " + ["Колющий урон", "Дротики", "Два клинка"][index], roll("Атака", 1, 20, attack) + damage);
}).join("") + card("Метка охотника", 3, "Заклинание · 1-й уровень", "Бонусное действие · концентрация · дополнительный урон при попадании.",
  roll("Урон", 1, 6) + '<button type="button" data-spend="mark">Без ячейки</button><button type="button" data-spend="slots">Потратить ячейку</button>') + `
  <article class="battle-card" data-kind="3">
    <div class="card-heading"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><div><small>Прорицание · 1-й уровень</small><h3>Обнаружение магии</h3></div></div>
    <p>Действие или ритуал · На себя · В, С · Концентрация до 10 минут</p>
    <div class="battle-actions"><button type="button" data-spend="slots">Применить · 1 ячейка</button><button type="button" data-detect-ritual>Ритуал · без ячейки</button></div>
    <details><summary>Подробности</summary><p>Чувствуешь магические эффекты в радиусе 30 фт. Если почувствовал магию, действием «Магия» можешь увидеть слабую ауру вокруг видимого существа или предмета и определить школу, если эффект создан заклинанием. Ритуал добавляет 10 минут к сотворению и не тратит ячейку.</p></details>
  </article>`;
$("#battle-weapons").onclick = ({target}) => {
  const button = target.closest("button");
  if (!button) return;
  const output = $("#roll-result");
  if (button.hasAttribute("data-detect-ritual")) {
    output.textContent = "Обнаружение магии: 10 минут на ритуал, ячейка не потрачена.";
    return;
  }
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    button.animate([{filter:"brightness(1)"},{filter:"brightness(1.65)"},{filter:"brightness(1)"}], {duration:400});
  }
  if (button.dataset.spend) {
    const id = button.dataset.spend;
    if (state[id] > 0) { state[id]--; save(); syncInputs(); output.textContent = "Осталось: " + state[id]; }
    else output.textContent = "Ресурс исчерпан.";
    return;
  }
  const [count, sides, bonus] = button.dataset.roll.split(",").map(Number);
  if (!$("#digital").checked) { output.textContent = "Бросок за столом: " + button.dataset.formula; return; }
  const values = Array.from({length: count}, () => 1 + Math.floor(Math.random() * sides));
  output.textContent = button.dataset.formula + ": " + values.join(" + ") + (bonus ? " + " + bonus : "") + " = " + values.reduce((sum, value) => sum + value, bonus);
};
