export default async () => {
  const processToken = process.env.PORTRAIT_UPLOAD_TOKEN;
  const netlifyToken = globalThis.Netlify?.env?.get?.("PORTRAIT_UPLOAD_TOKEN");
  const token = processToken || netlifyToken;
  const relatedKeys = Object.keys(process.env)
    .filter((key) => /PORTRAIT|UPLOAD|TOKEN/i.test(key))
    .sort();

  return Response.json({
    hasProcessToken: Boolean(processToken),
    hasNetlifyToken: Boolean(netlifyToken),
    hasToken: Boolean(token),
    tokenLength: token ? token.length : 0,
    relatedKeys,
  }, {
    headers: {
      "cache-control": "no-store",
    },
  });
};
