document.addEventListener('DOMContentLoaded', () => {
  const BACKEND = "https://exammira.netlify.app/.netlify/functions";

  const form = document.getElementById('examForm');
  const chatForm = document.getElementById('chatForm');
  const chatOutput = document.getElementById('chatOutput');

  // Crear examen
  form.addEventListener('submit', e => {
    e.preventDefault();
    const examData = {
      id: Date.now().toString(),
      title: document.getElementById('title').value,
      items: [
        {
          id: "1",
          prompt: document.getElementById('prompt').value,
          type: "open_drawing",
          rubric: {
            criteria: ["Claridad", "Exactitud", "Creatividad"],
            weights: [0.4, 0.4, 0.2]
          }
        }
      ]
    };
    localStorage.setItem('examData', JSON.stringify(examData));
    alert("Examen guardado correctamente.");
  });

  // Chat docente con IA
  chatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const message = document.getElementById('message').value;
    chatOutput.innerHTML += `<div class='user-msg'>👩‍🏫 ${message}</div>`;
    document.getElementById('message').value = '';

    const res = await fetch(`${BACKEND}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        system: "Eres un asistente educativo para docentes."
      })
    });
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content || "Sin respuesta.";
    chatOutput.innerHTML += `<div class='bot-msg'>🤖 ${reply}</div>`;
  });
});
