document.addEventListener('DOMContentLoaded', () => {
  // URL base de las funciones Netlify
  const BACKEND = "https://exammira.netlify.app/.netlify/functions";

  const canvas = new fabric.Canvas('canvas', { isDrawingMode: true });
  let slides = [];
  let currentIndex = 0;

  // Cargar examen desde localStorage
  let examData;
  try {
    examData = JSON.parse(localStorage.getItem('examData'));
  } catch {
    examData = {
      id: "default-exam",
      title: "Examen de ejemplo",
      items: [
        {
          id: "1",
          prompt: "Dibuja un circuito eléctrico simple con batería y bombilla.",
          type: "open_drawing",
          rubric: { criteria: ["Conexión correcta", "Claridad del esquema"], weights: [0.5, 0.5] }
        }
      ]
    };
  }
  slides = examData.items;

  const questionElement = document.getElementById('question');
  const nextSlideBtn = document.getElementById('nextSlide');
  const submitBtn = document.getElementById('submitBtn');
  const indicator = document.getElementById('slideIndicator');

  function saveCurrentDrawing() {
    slides[currentIndex].drawing = JSON.stringify(canvas.toJSON());
  }

  function loadSlide(index) {
    const slide = slides[index];
    questionElement.innerText = slide.prompt;
    indicator.textContent = `${index + 1}/${slides.length}`;
    canvas.clear();

    if (slide.drawing) {
      canvas.loadFromJSON(slide.drawing, () => canvas.renderAll());
    }
  }

  nextSlideBtn.addEventListener('click', () => {
    saveCurrentDrawing();
    if (currentIndex < slides.length - 1) {
      currentIndex++;
      loadSlide(currentIndex);
    }
  });

  submitBtn.addEventListener('click', async () => {
    saveCurrentDrawing();
    const submission = {
      student: prompt("Escribe tu nombre:"),
      slides: slides.map(sl => ({
        itemId: sl.id,
        canvasPNG: canvas.toDataURL({ format: 'png', quality: 0.8 }),
        canvasJSON: sl.drawing
      }))
    };

    try {
      const res = await fetch(`${BACKEND}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam: examData, submission })
      });
      const result = await res.json();
      alert(`Tu nota es ${result.grade} / 7\nDetalles: ${result.scores.map(s => s.feedback).join('\n')}`);
      localStorage.setItem('lastResult', JSON.stringify(result));
    } catch (err) {
      alert("Error al enviar: " + err);
    }
  });

  loadSlide(currentIndex);
});
