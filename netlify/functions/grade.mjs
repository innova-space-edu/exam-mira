export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors(), body: "" };
  }

  try {
    const { exam, submission } = JSON.parse(event.body || "{}");

    // --- A) Evaluación de ítems numéricos ---
    const numericResults = (exam.items || [])
      .filter((i) => i.type === "numeric")
      .map((i) => {
        const slide = (submission.slides || []).find((s) => s.itemId === i.id);
        const tol = i.tolerance ?? 0;
        const ok = Array.isArray(i.answer)
          ? Array.isArray(slide?.answer) &&
            i.answer.length === slide.answer.length &&
            i.answer.every((v, idx) => Math.abs(v - slide.answer[idx]) <= tol)
          : Math.abs((slide?.answer ?? NaN) - i.answer) <= tol;

        return {
          itemId: i.id,
          score: ok ? 1 : 0,
          max: 1,
          feedback: ok ? "Correcto." : "Incorrecto."
        };
      });

    // --- B) Ítems de desarrollo con dibujo ---
    const openDrawingItems = (exam.items || []).filter(
      (i) => i.type === "open_drawing"
    );
    const drawingResults = [];

    for (const item of openDrawingItems) {
      const slide = (submission.slides || []).find((s) => s.itemId === item.id);

      let extracted = "";

      // (Opcional) OCR.space si defines OCR_SPACE_KEY en Netlify
      if (process.env.OCR_SPACE_KEY && slide?.canvasPNG) {
        try {
          const base64 = (slide.canvasPNG.split(",")[1]) || "";
          const r = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            headers: {
              "apikey": process.env.OCR_SPACE_KEY,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
              base64Image: `data:image/png;base64,${base64}`,
              language: "spa",
              isTable: "true",
              OCREngine: "2"
            })
          });
          const data = await r.json();
          extracted = data?.ParsedResults?.[0]?.ParsedText || "";
        } catch (e) {
          // continúa sin OCR
        }
      }

      const system =
        'Eres el evaluador IA de "Innova Space Education 2025". ' +
        "Evalúa con rúbrica, puntúa 0..1 y da feedback breve, específico. " +
        "Di si falta evidencia.";
      const user = `
[ENUNCIADO]
${item.prompt}

[RÚBRICA]
Criterios: ${(item.rubric?.criteria || []).join(" | ") || "Generales"}
Pesos: ${(item.rubric?.weights || []).join(", ") || "uniforme"}

[RESPUESTA - TEXTO OCR]
${extracted || "(sin texto)"}

[RESPUESTA - JSON FABRIC abreviado]
${slide?.canvasJSON ? JSON.stringify(slide.canvasJSON).slice(0, 3000) : "(sin json)"}
`.trim();

      const rr = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://innova-space-edu.github.io/exam-mira/",
          "X-Title": "Innova Space Education 2025"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          temperature: 0.1,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ]
        })
      });

      const llm = await rr.json();
      let parsed = { score: 0, feedback: "Sin respuesta del modelo." };
      try {
        const raw = llm?.choices?.[0]?.message?.content || "{}";
        parsed = JSON.parse(raw);
      } catch {
        const txt = llm?.choices?.[0]?.message?.content || "";
        const m = txt.match(/score[^0-9]*([01](?:\.[0-9]+)?)/i);
        parsed.score = m ? Math.min(1, Math.max(0, parseFloat(m[1]))) : 0;
        parsed.feedback = txt.slice(0, 280);
      }

      drawingResults.push({
        itemId: item.id,
        score: parsed.score,
        max: 1,
        feedback: parsed.feedback
      });
    } // <-- fin del for

    // --- C) Agregado y nota 1–7 (60% = 4.0) ---
    const scores = [...numericResults, ...drawingResults];
    const maxTotal = scores.reduce((a, s) => a + s.max, 0) || 1;
    const total = scores.reduce((a, s) => a + s.score, 0);
    const pct = total / maxTotal;
    const grade = pct < 0.6 ? 1 + pct * 5 : 4 + (pct - 0.6) * 7.5;

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

// --- helpers ---
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
}
function json(code, obj) {
  return { statusCode: code, headers: cors(), body: JSON.stringify(obj) };
}
