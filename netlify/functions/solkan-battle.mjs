import { getStore } from "@netlify/blobs";

const limits = {hp:19,temp:Number.MAX_SAFE_INTEGER,slots:2,mark:2,dice:2,inspiration:Number.MAX_SAFE_INTEGER};
const marks = ["deathSuccess","deathFailure"];
export default async request => {
  const json = (data, status = 200) => Response.json(data, {status, headers:{"Cache-Control":"no-store"}});
  if (!["GET","POST"].includes(request.method)) return json({error:"Method not allowed"},405);
  const token = process.env.PORTRAIT_UPLOAD_TOKEN;
  if (!token) return json({error:"Пароль синхронизации не настроен"},503);
  if (request.headers.get("x-upload-token") !== token) return json({error:"Неверный пароль"},401);
  try {
    const store = getStore({name:"solkan-battle",consistency:"strong"});
    if (request.method === "GET") {
      const battle = await store.get("current",{type:"json"});
      return battle ? json({battle}) : json({error:"В облаке пока нет сохранения боя"},404);
    }
    const raw = await request.text();
    if (raw.length > 2048) return json({error:"Данные слишком большие"},413);
    let data;
    try { data = JSON.parse(raw); } catch { return json({error:"Некорректные данные"},400); }
    if (data?.level !== 2 || data.maxHp !== limits.hp) return json({error:"Обнови страницу перед сохранением"},400);
    const battle = {level:2,maxHp:limits.hp};
    for (const [id,max] of Object.entries(limits)) {
      const value = data?.[id];
      if (!Number.isSafeInteger(value) || value < 0 || value > max) return json({error:"Некорректное значение ресурса"},400);
      battle[id] = value;
    }
    for (const id of marks) {
      const values = data?.[id];
      if (!Array.isArray(values) || values.length !== 3 || !values.every(value => typeof value === "boolean")) return json({error:"Некорректные спасброски"},400);
      battle[id] = values;
    }
    await store.setJSON("current",battle);
    return json({ok:true});
  } catch { return json({error:"Хранилище временно недоступно"},503); }
};
