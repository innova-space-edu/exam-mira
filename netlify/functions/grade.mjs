export async function handler(event) {
let extracted = "";


// (Opcional) OCR.space si defines OCR_SPACE_KEY en Netlify
if (process.env.OCR_SPACE_KEY && slide?.canvasPNG) {
try {
const base64 = (slide.canvasPNG.split(",")[1]) || "";
const r = await fetch("https://api.ocr.space/parse/image", {
method: "POST",
headers: { "apikey": process.env.OCR_SPACE_KEY, "Content-Type": "application/x-www-form-urlencoded" },
body: new URLSearchParams({ base64Image: `data:image/png;base64,${base64}`, language: "spa", isTable: "true", OCREngine: "2" })
});
const data = await r.json();
extracted = data?.ParsedResults?.[0]?.ParsedText || "";
} catch (e) { /* continúa sin OCR */ }
}


const system = `Eres el evaluador IA de "Innova Space Education 2025". Evalúa con rúbrica, puntúa 0..1 y da feedback breve, específico. Di si falta evidencia.`;
const user = `
[ENUNCIADO]\n${item.prompt}\n\n[RÚBRICA]\nCriterios: ${(item.rubric?.criteria||[]).join(" | ") || "Generales"}\nPesos: ${(item.rubric?.weights||[]).join(", ") || "uniforme"}\n\n[RESPUESTA - TEXTO OCR]\n${extracted || "(sin texto)"}\n\n[RESPUESTA - JSON FABRIC abreviado]\n${slide?.canvasJSON ? JSON.stringify(slide.canvasJSON).slice(0, 3000) : "(sin json)"}
`;


const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
method: "POST",
headers: {
"Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
"Content-Type": "application/json",
"HTTP-Referer": "https://innova-space-edu.github.io/exam-mira/",
"X-Title": "Innova Space Education 2025"
},
body: JSON.stringify({ model: "openai/gpt-4o-mini", temperature: 0.1, messages: [ { role: "system", content: system }, { role: "user", content: user } ] })
});
const data = await r.json();
let parsed = { score: 0, feedback: "Sin respuesta del modelo." };
try {
const raw = data?.choices?.[0]?.message?.content || "{}";
parsed = JSON.parse(raw);
} catch {
const txt = data?.choices?.[0]?.message?.content || "";
const m = txt.match(/score[^0-9]*([01](?:\.[0-9]+)?)/i);
parsed.score = m ? Math.min(1, Math.max(0, parseFloat(m[1]))) : 0;
parsed.feedback = txt.slice(0, 280);
}
drawingResults.push({ itemId: item.id, score: parsed.score, max: 1, feedback: parsed.feedback });
}


const scores = [...numericResults, ...drawingResults];
const maxTotal = scores.reduce((a, s) => a + s.max, 0) || 1;
const total = scores.reduce((a, s) => a + s.score, 0);
const pct = total / maxTotal;
const grade = pct < 0.6 ? (1 + pct * 5) : (4 + (pct - 0.6) * 7.5);


return json(200, {
examId: exam.id,
student: submission.student,
scores,
total,
maxTotal,
grade: Math.round(grade * 10) / 10
});
} catch (e) {
return json(500, { error: String(e) });
}
}


function cors() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }; }
function json(code, obj) { return { statusCode: code, headers: cors(), body: JSON.stringify(obj) }; }
