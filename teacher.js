document.addEventListener('DOMContentLoaded', () => {
  // Backend (Netlify Functions)
  const BACKEND = "https://exammira.netlify.app/.netlify/functions";

  // Elementos UI
  const examForm = document.getElementById('examForm');
  const chatOutput = document.getElementById('chat') || document.getElementById('chatOutput');
  const msgInput = document.getElementById('message');
  const sendBtn = document.getElementById('send');

  // ---- Crear / guardar examen (simple, localStorage) ----
  if (examForm) {
    examForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const titleEl = document.getElementById('title');
      const promptEl = document.getElementById('prompt');

      const examData = {
        id: `exam_${Date.now()}`,
        title: (titleEl?.value || "Prueba de ejemplo").trim(),
        items: [
          {
            id: "q1",
            type: "open_drawing",
            prompt: (promptEl?.value || "Describe brevemente cómo resolverías una ecuación de segundo grado.").trim(),
            rubric: {
              criteria: ["Menciona fórmula general o factorización", "Define discriminante", "Explica pasos y condiciones"],
              weights: [0.4, 0.3, 0.3]
            }
          }
          // Puedes añadir más items (numeric, multiple_choice, etc.)
        ]
      };

      localStorage.setItem('examData', JSON.stringify(examData));
      alert("✅ Examen guardado. El estudiante lo verá en la pantalla principal.");
    });
  }

  // ---- Chat docente (IA) ----
  function appendLine(text, klass = "") {
    if (!chatOutput) return;
    const div = document.createElement('div');
    div.className = `line ${klass}`;
    div.textContent = text;
    chatOutput.appendChild(div);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  }

  if (sendBtn && msgInput) {
    sendBtn.addEventListener('click', async () => {
      const q = msgInput.value.trim();
      if (!q) return;
      msgInput.value = "";
      appendLine(`👩‍🏫 ${q}`, "me");

      try {
        const system = `
Eres un asistente para docentes de Innova Space Education 2025.
Responde con precisión, conciso y con pasos concretos; conoce buenas prácticas de evaluación y rúbricas.
`.trim();

        const r = await fetch(`${BACKEND}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system,
            messages: [{ role: "user", content: q }]
          })
        });

        const data = await r.json();
        const reply = data?.choices?.[0]?.message?.content?.trim() || "Sin respuesta.";
        appendLine(`🤖 ${reply}`, "bot");
      } catch (err) {
        appendLine(`⚠️ Error: ${err.message}`, "bot");
      }
    });
  }

  // ---- Si estás usando teacher.html con botones de login/logout vía Identity widget,
  // puedes acoplar aquí el gating (opcional). Este archivo no fuerza Identity,
  // así que la página abre sin login por ahora. ----
});
