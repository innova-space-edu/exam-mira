// netlify/functions/chat.mjs
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return ok({});
  if (event.httpMethod !== "POST") return err(405, "Method not allowed");

  try {
    const { system, messages } = JSON.parse(event.body || "{}");

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://exammira.netlify.app/",
        "X-Title": "Innova Space Education 2025"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: system || "Eres un asistente docente." },
          ...(Array.isArray(messages) ? messages : [])
        ]
      })
    });

    const data = await r.json();
    return ok(data);
  } catch (e) {
    return err(500, String(e));
  }
}

function cors() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }; }
function ok(obj){ return { statusCode: 200, headers: cors(), body: JSON.stringify(obj) }; }
function err(code, msg){ return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) }; }
