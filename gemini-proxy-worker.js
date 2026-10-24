// Cloudflare Worker: keeps your Gemini API key off the phone.
// Deploy: dash.cloudflare.com -> Workers -> Create -> paste this -> Settings -> Variables:
//   GEMINI_API_KEY (secret) = your key
//   ALLOWED_ORIGIN = the URL where you host the app (e.g. https://you.github.io)
// Then paste the worker URL into FitCore -> Hub -> Settings -> "Gemini proxy URL".
const ALLOWED_MODELS = /^gemini-[\w.\-]+$/;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allow = env.ALLOWED_ORIGIN || '*';
    const cors = { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    if (allow !== '*' && origin !== allow) return new Response('Forbidden origin', { status: 403, headers: cors });

    let payload;
    try { payload = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }
    const { model, body } = payload || {};
    if (!ALLOWED_MODELS.test(model || '') || !body || JSON.stringify(body).length > 200000) return new Response('Bad request', { status: 400, headers: cors });

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(body)
    });
    return new Response(r.body, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};
