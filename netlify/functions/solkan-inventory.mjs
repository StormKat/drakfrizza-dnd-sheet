import { getStore } from "@netlify/blobs";

export default async request => {
  const json = (data, status = 200) => Response.json(data, {status, headers:{"Cache-Control":"no-store"}});
  if (!["GET","POST"].includes(request.method)) return json({error:"Method not allowed"},405);
  const token = process.env.PORTRAIT_UPLOAD_TOKEN;
  if (!token) return json({error:"Пароль синхронизации не настроен"},503);
  if (request.headers.get("x-upload-token") !== token) return json({error:"Неверный пароль"},401);
  try {
    const store = getStore({name:"solkan-inventory",consistency:"strong"});
    if (request.method === "GET") {
      const inventory = await store.get("current",{type:"json"});
      return inventory ? json({inventory}) : json({error:"В облаке пока нет инвентаря"},404);
    }
    const raw = await request.text();
    if (raw.length > 100000) return json({error:"Инвентарь слишком большой"},413);
    let data;
    try { data = JSON.parse(raw); } catch { return json({error:"Некорректные данные"},400); }
    const inventory = {};
    for (const key of ["gold","silver","copper"]) {
      if (!Number.isSafeInteger(data?.[key]) || data[key] < 0) return json({error:"Некорректное количество монет"},400);
      inventory[key] = data[key];
    }
    if (!Array.isArray(data.items) || !data.items.every(item => Array.isArray(item) && item.length === 2 &&
      typeof item[0] === "string" && item[0].trim() && item[0].length <= 100 &&
      Number.isSafeInteger(item[1]) && item[1] > 0)) return json({error:"Некорректный список предметов"},400);
    inventory.items = data.items;
    await store.setJSON("current", inventory);
    return json({ok:true});
  } catch { return json({error:"Хранилище временно недоступно"},503); }
};
