import { getStore } from "@netlify/blobs";
export default async request => {
  const json = (data, status=200) => Response.json(data, {status, headers:{"Cache-Control":"no-store"}});
  if (!["GET","POST"].includes(request.method)) return json({error:"Method not allowed"},405);
  const token = process.env.PORTRAIT_UPLOAD_TOKEN;
  if (!token) return json({error:"Пароль редактора не настроен"},503);
  if (request.headers.get("x-upload-token") !== token) return json({error:"Неверный пароль"},401);
  try {
    const store = getStore({name:"solkan-notes",consistency:"strong"});
    if (request.method === "GET") {
      const note = await store.get("journal", {type:"json"});
      return note ? json(note) : json({error:"Облачной записи пока нет"},404);
    }
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 200000) return json({error:"Запись слишком большая"},413);
    let data;
    try { data = JSON.parse(body); } catch { return json({error:"Invalid JSON"},400); }
    if (typeof data.html !== "string") return json({error:"Invalid note"},400);
    await store.setJSON("journal",{html:data.html,updatedAt:new Date().toISOString()});
    return json({ok:true});
  } catch { return json({error:"Хранилище временно недоступно"},503); }
};
