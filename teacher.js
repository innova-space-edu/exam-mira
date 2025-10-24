document.addEventListener('DOMContentLoaded', async () => {
  // Backend (Netlify Functions)
  const BACKEND = "https://exammira.netlify.app/.netlify/functions";

  // =========================
  //  Autenticación (GoTrue)
  // =========================
  await loadScript("https://cdn.jsdelivr.net/npm/gotrue-js@1/dist/gotrue.min.js");

  const auth = new window.GoTrue({
    APIUrl: `${window.location.origin}/.netlify/identity`,
    audience: "",
    setCookie: true
  });

  // Gating: exige sesión y dominio permitido
  try {
    const user = auth.currentUser();
    if (!user) return redirectLogin();
    const email = (user.email || "").toLowerCase();
    if (!email.endsWith("@colprovidencia.cl")) {
      alert("Tu cuenta no tiene permisos de docente (dominio no permitido).");
      try { await auth.logout(); } catch(_) {}
      return redirectLogin();
    }
    // Verifica que el token sea válido (evita sesiones huérfanas del navegador)
    try { await user.jwt(); } catch { return redirectLogin(); }
  } catch {
    return redirectLogin();
  }

  function redirectLogin() {
    window.location.href = "/login.html";
  }

  // =========================
  //  Elementos UI
  // =========================
  const examFormTitle = document.getElementById('title');
  const examFormPrompt = document.getElementById('prompt');
  const itemsList = document.getElementById('itemsList');
  const btnAddOpen = document.getElementById('btnAddOpen');
  const btnAddNumeric = document.getElementById('btnAddNumeric');
  const btnAddMC = document.getElementById('btnAddMC');
  const btnSave = document.getElementById('btnSave');
  const btnClear = document.getElementById('btnClear');
  const btnDownload = document.getElementById('btnDownload');
  const fileUpload = document.getElementById('fileUpload');

  const chatOutput = document.getElementById('chat');
  const msgInput = document.getElementById('message');
  const sendBtn = document.getElementById('send');
  const logoutBtn = document.getElementById('logoutBtn');

  // =========================
  //  Logout fiable
  // =========================
  logoutBtn?.addEventListener('click', async () => {
    try { await auth.logout(); } catch (e) { /* ignore */ }
    // Limpia rastros locales por si acaso
    sessionStorage.removeItem('loggedIn');
    window.location.replace("/login.html");
  });

  // =========================
  //  Estado del examen
  // =========================
  let examData = loadExam() || defaultExam();

  // Render inicial
  hydrateForm(examData);

  // Añadir ítems
  btnAddOpen?.addEventListener('click', () => {
    examData.items.push({
      id: `open_${Date.now()}`,
      type: "open_drawing",
      prompt: "Desarrolla y justifica con un esquema.",
      rubric: { criteria: ["Claridad del procedimiento", "Representación correcta", "Conclusión"], weights: [0.4,0.3,0.3] }
    });
    renderItems();
  });

  btnAddNumeric?.addEventListener('click', () => {
    examData.items.push({
      id: `num_${Date.now()}`,
      type: "numeric",
      prompt: "Calcula el valor de …",
      answer: 0,
      tolerance: 0
    });
    renderItems();
  });

  btnAddMC?.addEventListener('click', () => {
    examData.items.push({
      id: `mc_${Date.now()}`,
      type: "multiple_choice",
      prompt: "Selecciona la alternativa correcta.",
      options: ["A","B","C","D"],
      answerIndex: 0
    });
    renderItems();
  });

  // Guardar
  btnSave?.addEventListener('click', () => {
    persistExam();
    alert("✅ Examen guardado en este navegador.");
  });

  // Limpiar
  btnClear?.addEventListener('click', () => {
    if (!confirm("¿Seguro que quieres limpiar y empezar desde cero?")) return;
    examData = defaultExam();
    hydrateForm(examData);
    persistExam();
  });

  // Descargar JSON
  btnDownload?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(examData, null, 2)], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(examData.title||'examen').replace(/\s+/g,'_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Cargar JSON
  fileUpload?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (!obj || !Array.isArray(obj.items)) throw new Error("Formato inválido");
      examData = obj;
      hydrateForm(examData);
      persistExam();
    } catch (err) {
      alert("Archivo inválido: " + err.message);
    } finally {
      fileUpload.value = "";
    }
  });

  // Vincula inputs básicos
  examFormTitle?.addEventListener('input', () => examData.title = examFormTitle.value);
  examFormPrompt?.addEventListener('input', () => {
    // Solo para conveniencia: si existe q1 open_drawing, actualiza su prompt
    const q1 = examData.items.find(i=>i.type==='open_drawing');
    if (q1) q1.prompt = examFormPrompt.value;
  });

  // =========================
  //  Chat docente (IA)
  // =========================
  function appendLine(text, klass = "") {
    if (!chatOutput) return;
    const div = document.createElement('div');
    div.className = `line ${klass}`;
    div.textContent = text;
    chatOutput.appendChild(div);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  }

  let typingEl = null;
  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'line typing';
    typingEl.textContent = 'Escribiendo…';
    chatOutput.appendChild(typingEl);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  }
  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  sendBtn?.addEventListener('click', doAsk);
  msgInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); doAsk(); } });

  async function doAsk(){
    const q = msgInput.value.trim();
    if (!q) return;
    msgInput.value = "";
    appendLine(`👩‍🏫 ${q}`, "me");
    showTyping();

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
      hideTyping();
      appendLine(`🤖 ${reply}`, "bot");
    } catch (err) {
      hideTyping();
      appendLine(`⚠️ Error: ${err.message}`, "bot");
    }
  }

  // =========================
  //  Helpers examen
  // =========================
  function renderItems(){
    itemsList.innerHTML = "";
    examData.items.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'item';

      if (it.type === 'open_drawing') {
        div.innerHTML = `
          <div class="row">
            <div>
              <div class="pill">Desarrollo (dibujo)</div>
              <label>Enunciado</label>
              <textarea rows="2" data-k="prompt">${it.prompt||""}</textarea>
              <small>Rúbrica (criterios separados por | y pesos por ,)</small>
              <input data-k="criteria" placeholder="Claridad | Representación | Conclusión" value="${(it.rubric?.criteria||[]).join(' | ')}" />
              <input data-k="weights" placeholder="0.4,0.3,0.3" value="${(it.rubric?.weights||[]).join(',')}" />
            </div>
            <div>
              <button class="btn secondary" data-act="up"    title="Subir">▲</button>
              <button class="btn secondary" data-act="down"  title="Bajar" style="margin-top:6px;">▼</button>
              <button class="btn warn"      data-act="del"   title="Eliminar" style="margin-top:6px;">Eliminar</button>
            </div>
          </div>`;
      } else if (it.type === 'numeric') {
        div.innerHTML = `
          <div class="row">
            <div>
              <div class="pill">Ítem numérico</div>
              <label>Enunciado</label>
              <textarea rows="2" data-k="prompt">${it.prompt||""}</textarea>
              <div class="field">
                <input data-k="answer" type="number" step="any" placeholder="Respuesta" value="${it.answer ?? ""}">
                <input data-k="tolerance" type="number" step="any" placeholder="Tolerancia" value="${it.tolerance ?? 0}">
              </div>
            </div>
            <div>
              <button class="btn secondary" data-act="up">▲</button>
              <button class="btn secondary" data-act="down" style="margin-top:6px;">▼</button>
              <button class="btn warn" data-act="del" style="margin-top:6px;">Eliminar</button>
            </div>
          </div>`;
      } else if (it.type === 'multiple_choice') {
        div.innerHTML = `
          <div class="row">
            <div>
              <div class="pill">Múltiple opción</div>
              <label>Enunciado</label>
              <textarea rows="2" data-k="prompt">${it.prompt||""}</textarea>
              <small>Opciones separadas por |</small>
              <input data-k="options" placeholder="A | B | C | D" value="${(it.options||[]).join(' | ')}" />
              <small>Índice de la respuesta correcta (0 a n-1)</small>
              <input data-k="answerIndex" type="number" min="0" step="1" value="${it.answerIndex ?? 0}" />
            </div>
            <div>
              <button class="btn secondary" data-act="up">▲</button>
              <button class="btn secondary" data-act="down" style="margin-top:6px;">▼</button>
              <button class="btn warn" data-act="del" style="margin-top:6px;">Eliminar</button>
            </div>
          </div>`;
      }

      // Listeners de inputs
      div.querySelectorAll('[data-k]').forEach(inp => {
        inp.addEventListener('input', () => {
          const k = inp.getAttribute('data-k');
          if (k === 'criteria') {
            it.rubric = it.rubric || {};
            it.rubric.criteria = inp.value.split('|').map(s=>s.trim()).filter(Boolean);
          } else if (k === 'weights') {
            it.rubric = it.rubric || {};
            it.rubric.weights = inp.value.split(',').map(s=>parseFloat(s.trim())).filter(n=>!Number.isNaN(n));
          } else if (k === 'options') {
            it.options = inp.value.split('|').map(s=>s.trim()).filter(Boolean);
          } else if (k === 'answerIndex') {
            it.answerIndex = parseInt(inp.value,10) || 0;
          } else if (k === 'answer') {
            it.answer = parseFloat(inp.value);
          } else if (k === 'tolerance') {
            it.tolerance = parseFloat(inp.value)||0;
          } else {
            it[k] = inp.value;
          }
        });
      });

      // Acciones
      div.querySelectorAll('[data-act]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const act = btn.getAttribute('data-act');
          if (act==='del') {
            examData.items.splice(idx,1);
          } else if (act==='up' && idx>0) {
            const t = examData.items[idx]; examData.items[idx]=examData.items[idx-1]; examData.items[idx-1]=t;
          } else if (act==='down' && idx<examData.items.length-1) {
            const t = examData.items[idx]; examData.items[idx]=examData.items[idx+1]; examData.items[idx+1]=t;
          }
          renderItems();
        });
      });

      itemsList.appendChild(div);
    });
  }

  function hydrateForm(data){
    examFormTitle.value = data.title || "";
    examFormPrompt.value = (data.items.find(i=>i.type==='open_drawing')?.prompt) || "";
    renderItems();
  }

  function persistExam(){
    localStorage.setItem('examData', JSON.stringify(examData));
  }

  function loadExam(){
    try { return JSON.parse(localStorage.getItem('examData')||"null"); } catch { return null; }
  }

  function defaultExam(){
    return {
      id: `exam_${Date.now()}`,
      title: "Prueba de ejemplo",
      items: [
        {
          id: "q1",
          type: "open_drawing",
          prompt: "Describe brevemente cómo resolverías una ecuación de segundo grado.",
          rubric: {
            criteria: ["Menciona fórmula general o factorización", "Define discriminante", "Explica pasos y condiciones"],
            weights: [0.4, 0.3, 0.3]
          }
        }
      ]
    };
  }

  // =========================
  //  Util
  // =========================
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("No se pudo cargar " + src));
      document.head.appendChild(s);
    });
  }
});
