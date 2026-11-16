import { getStore } from "@netlify/blobs";
const recovered = `<h3>По дороге в Валакию</h3>
<p>Замогильный зеленоватый свет появляется на кладбище 🪦. Появляется процессия душ разных магов, воинов разных рас и происхождений. Они выглядят как искатели приключений, как мы.</p>
<p>Мы идём в церковь, на ней есть следы когтей какого-то монстра. В церкви пахнет плесенью. Внутри кто-то молится, а из половиц кто-то кричит: «Отееец».</p>
<p>Мы спустились в подземелье. Там внутри Торну сидит на потолке.</p>
<p>Мы его убили.</p>
<p>Потом в церковь пришёл Страд, возродил Торну и забрал его с собой.</p>
<p>После длинного отдыха мы двинулись в Валакию.</p>
<p>По дороге мы встречаем шатры и фургоны. Восемь лошадей, пение, несколько фигур у костра. Лагерь вестаний.</p>
<p>Лошади мне сказали, что где-то в городе есть тигр 🐅.</p>
<p><strong>Мы стали 3 уровня.</strong></p>`;
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
    const previous = await store.get("journal", {type:"json"});
    async function write(pages, html) {
      if (previous) await store.setJSON("backup-" + crypto.randomUUID(), previous);
      const note = {html,pages,updatedAt:crypto.randomUUID()};
      await store.setJSON("journal", note);
      const saved = await store.get("journal", {type:"json"});
      if (saved?.updatedAt !== note.updatedAt) return json({error:"Не удалось подтвердить запись. Загрузи актуальную версию."},409);
      return json(saved);
    }
    if (data?.restoreValakia === true) {
      const pages = Array.from({length:10}, (_, i) => previous?.pages?.[i] ?? (i === 0 ? previous?.html ?? "" : ""));
      const existing = pages.findIndex(page => page.includes("Лошади мне сказали, что где-то в городе есть тигр"));
      if (existing !== -1) return json({...previous, restoredPage:existing});
      let index = pages.findIndex(page => !page.replace(/<[^>]*>|&nbsp;/g, "").trim());
      if (index < 0) index = pages.length - 1;
      pages[index] += recovered;
      const response = await write(pages,pages[0]);
      return response.ok ? json({...await response.json(), restoredPage:index}) : response;
    }
    if (typeof data?.html !== "string") return json({error:"Invalid note"},400);
    if (data.pages !== undefined && (!Array.isArray(data.pages) || data.pages.length !== 10 ||
      !data.pages.every(page => typeof page === "string"))) return json({error:"Invalid journal pages"},400);
    if (!data.pages || (previous && data.revision !== previous.updatedAt)) {
      return json({error:"Сначала загрузи актуальный облачный блокнот. Локальный черновик не изменён."},409);
    }
    return write(data.pages,data.pages[0]);
  } catch { return json({error:"Хранилище временно недоступно"},503); }
};
