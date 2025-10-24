// student.js – pantalla de prueba del estudiante
// Requiere Fabric.js 5.x cargado en index.html

(function () {
  // UI
  const titleEl = document.getElementById("examTitle");
  const questionText = document.getElementById("questionText");
  const canvasEl = document.getElementById("drawingCanvas");
  const slideIndicator = document.getElementById("slideIndicator");
  const prevBtn = document.getElementById("prevSlide");
  const nextBtn = document.getElementById("nextSlide");

  // Herramientas
  const penBtn = document.getElementById("penTool");
  const rectBtn = document.getElementById("rectTool");
  const circleBtn = document.getElementById("circleTool");
  const lineBtn = document.getElementById("lineTool");
  const textBtn = document.getElementById("textTool");
  const eraserBtn = document.getElementById("eraserTool");
  const colorPicker = document.getElementById("colorPicker");
  const clearBtn = document.getElementById("clearCanvas");

  // Estado
  let exam = loadExam();
  if (!exam) {
    // fallback por si no hay examen
    exam = {
      id: "exam_demo",
      title: "Prueba",
      items: [
        {
          id: "q1",
          type: "open_drawing",
          prompt:
            "Describe brevemente cómo resolverías una ecuación de segundo grado.",
          rubric: {
            criteria: [
              "Menciona fórmula general o factorización",
              "Define discriminante",
              "Explica pasos y condiciones",
            ],
            weights: [0.4, 0.3, 0.3],
          },
        },
      ],
    };
  }

  let idx = 0; // slide actual
  let slidesState = {}; // estado por itemId: {fabricJSON, answer, mcIndex}

  // Fabric canvas
  const f = new fabric.Canvas("drawingCanvas", {
    isDrawingMode: false,
    selection: true,
    backgroundColor: "#0c1320",
  });

  // Ajustar tamaño al contenedor
  function fitCanvas() {
    const parent = canvasEl.parentElement;
    const w = parent.clientWidth - 20;
    const h = Math.max(360, Math.floor((w * 9) / 16));
    f.setWidth(w);
    f.setHeight(h);
    f.renderAll();
  }
  window.addEventListener("resize", fitCanvas);
  fitCanvas();

  // ==== herramientas ====
  function setDrawMode(on) {
    f.isDrawingMode = on;
    f.freeDrawingBrush.width = 3;
    f.freeDrawingBrush.color = colorPicker.value || "#fff";
  }

  penBtn?.addEventListener("click", () => setDrawMode(true));

  rectBtn?.addEventListener("click", () => {
    setDrawMode(false);
    const r = new fabric.Rect({
      left: 50,
      top: 50,
      width: 120,
      height: 80,
      fill: "transparent",
      stroke: colorPicker.value || "#fff",
      strokeWidth: 2,
    });
    f.add(r);
  });

  circleBtn?.addEventListener("click", () => {
    setDrawMode(false);
    const c = new fabric.Circle({
      left: 80,
      top: 80,
      radius: 50,
      fill: "transparent",
      stroke: colorPicker.value || "#fff",
      strokeWidth: 2,
    });
    f.add(c);
  });

  lineBtn?.addEventListener("click", () => {
    setDrawMode(false);
    const l = new fabric.Line([40, 40, 200, 110], {
      stroke: colorPicker.value || "#fff",
      strokeWidth: 2,
    });
    f.add(l);
  });

  textBtn?.addEventListener("click", () => {
    setDrawMode(false);
    const t = new fabric.IText("Texto", {
      left: 100,
      top: 100,
      fill: colorPicker.value || "#fff",
      fontSize: 20,
    });
    f.add(t);
    f.setActiveObject(t);
    t.enterEditing();
  });

  eraserBtn?.addEventListener("click", () => {
    setDrawMode(false);
    const obj = f.getActiveObject();
    if (obj) f.remove(obj);
  });

  colorPicker?.addEventListener("input", () => {
    if (f.isDrawingMode) f.freeDrawingBrush.color = colorPicker.value;
    const obj = f.getActiveObject();
    if (obj && "stroke" in obj) {
      obj.set("stroke", colorPicker.value);
      f.renderAll();
    }
    if (obj && "fill" in obj && obj.fill !== "transparent") {
      obj.set("fill", colorPicker.value);
      f.renderAll();
    }
  });

  clearBtn?.addEventListener("click", () => {
    f.clear();
    f.setBackgroundColor("#0c1320", f.renderAll.bind(f));
  });

  // ==== render de diapositiva ====
  function renderSlide() {
    const item = exam.items[idx];
    titleEl.textContent = exam.title || "Prueba";
    questionText.textContent = item.prompt || "";
    slideIndicator.textContent = `${idx + 1} / ${exam.items.length}`;

    // restablecer canvas
    f.clear();
    f.setBackgroundColor("#0c1320", f.renderAll.bind(f));
    setDrawMode(false);

    // UI dinámica para numérico/MCQ
    removeDynamicInputs();

    if (item.type === "open_drawing") {
      const saved = slidesState[item.id]?.fabricJSON;
      if (saved) {
        f.loadFromJSON(saved, () => f.renderAll());
      }
    } else if (item.type === "numeric") {
      spawnNumeric(item);
    } else if (item.type === "multiple_choice") {
      spawnMC(item);
    }

    prevBtn.disabled = idx === 0;
    nextBtn.textContent = idx === exam.items.length - 1 ? "Enviar" : "Continuar";
  }

  function removeDynamicInputs() {
    document.querySelectorAll(".dyn-input").forEach((el) => el.remove());
  }

  function spawnNumeric(item) {
    const host = document.createElement("div");
    host.className = "dyn-input";
    host.style.margin = "12px 0";
    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = "Tu respuesta";
    input.style.width = "220px";
    input.style.padding = "10px";
    input.style.borderRadius = "10px";
    input.style.border = "1px solid #1f2a3a";
    input.style.background = "#0f1722";
    input.style.color = "#e5f2ff";
    input.value = slidesState[item.id]?.answer ?? "";
    input.addEventListener("input", () => {
      slidesState[item.id] = slidesState[item.id] || {};
      slidesState[item.id].answer = parseFloat(input.value);
    });
    host.appendChild(input);
    questionText.after(host);
  }

  function spawnMC(item) {
    const host = document.createElement("div");
    host.className = "dyn-input";
    host.style.margin = "12px 0";
    item.options = item.options || [];
    item.options.forEach((opt, i) => {
      const lab = document.createElement("label");
      lab.style.display = "block";
      lab.style.margin = "6px 0";
      lab.style.cursor = "pointer";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "mc_" + item.id;
      radio.value = String(i);
      radio.checked = slidesState[item.id]?.mcIndex === i;
      radio.addEventListener("change", () => {
        slidesState[item.id] = slidesState[item.id] || {};
        slidesState[item.id].mcIndex = i;
      });
      lab.appendChild(radio);
      const span = document.createElement("span");
      span.textContent = " " + opt;
      lab.appendChild(span);
      host.appendChild(lab);
    });
    questionText.after(host);
  }

  // Guardar estado de canvas para ítems de dibujo
  function persistCanvasIfOpen() {
    const item = exam.items[idx];
    if (item.type !== "open_drawing") return;
    slidesState[item.id] = slidesState[item.id] || {};
    slidesState[item.id].fabricJSON = f.toJSON(["selectable"]);
    try {
      slidesState[item.id].canvasPNG = f.toDataURL({
        format: "png",
        multiplier: 1,
      });
    } catch {
      // ignore (tainted canvas)
    }
  }

  prevBtn?.addEventListener("click", () => {
    persistCanvasIfOpen();
    if (idx > 0) idx -= 1;
    renderSlide();
  });

  nextBtn?.addEventListener("click", async () => {
    persistCanvasIfOpen();
    if (idx < exam.items.length - 1) {
      idx += 1;
      renderSlide();
      return;
    }
    // Enviar
    await submitExam();
  });

  async function submitExam() {
    const submission = {
      student: getStudentMeta(),
      slides: exam.items.map((it) => {
        const st = slidesState[it.id] || {};
        const entry = { itemId: it.id };
        if (it.type === "open_drawing") {
          entry.canvasJSON = st.fabricJSON || null;
          entry.canvasPNG = st.canvasPNG || null;
        } else if (it.type === "numeric") {
          entry.answer = st.answer ?? null;
        } else if (it.type === "multiple_choice") {
          entry.answerIndex = st.mcIndex ?? null;
        }
        return entry;
      }),
    };

    try {
      const r = await fetch("/.netlify/functions/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam, submission }),
      });
      const data = await r.json();
      // guarda local y ofrece link compartible
      localStorage.setItem("lastResults", JSON.stringify(data));
      const link = buildShareURL(data);
      alert(
        `✅ Enviado y evaluado.\nNota: ${data.grade}\nCopia este enlace para el docente:\n${link}`
      );
      // también abrir resultados
      window.location.href = `/results.html#${encodePayload(data)}`;
    } catch (e) {
      alert("Error al enviar: " + e.message);
    }
  }

  function getStudentMeta() {
    // Puedes reemplazar por formulario si lo deseas
    const today = new Date().toISOString().slice(0, 10);
    return {
      name: "Estudiante",
      course: "Curso",
      date: today,
    };
  }

  // compartir
  function encodePayload(obj) {
    const txt = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(txt)));
  }
  function buildShareURL(resultObj) {
    return `${location.origin}/results.html#${encodePayload(resultObj)}`;
  }

  function loadExam() {
    try {
      return JSON.parse(localStorage.getItem("examData") || "null");
    } catch {
      return null;
    }
  }

  // iniciar
  renderSlide();
})();
