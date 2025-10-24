/*
 * Teacher dashboard logic for Innova Space Education 2025 platform.
 *
 * This script handles exam creation (title, student, course, date, objective
 * and a set of exercises) and integrates a simple chat interface that
 * communicates with the OpenRouter API. The OpenRouter API key must be
 * supplied by the deployer; never commit your real API key into a public
 * repository. See the OpenRouter documentation for details on how to obtain
 * and use an API key【168484824605623†L124-L174】.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect unauthenticated users back to the login page.
  if (!sessionStorage.getItem('loggedIn')) {
    window.location.href = 'login.html';
    return;
  }

  /* Exam creation section */
  const examForm = document.getElementById('examForm');
  const addQuestionBtn = document.getElementById('addQuestion');
  const questionsContainer = document.getElementById('questionsContainer');

  let questionCount = 0;

  // Helper to add a new textarea for an exercise.
  function addQuestion() {
    questionCount += 1;
    const textarea = document.createElement('textarea');
    textarea.placeholder = `Ejercicio ${questionCount}`;
    textarea.dataset.index = questionCount - 1;
    questionsContainer.appendChild(textarea);
  }

  // Start with one question by default.
  addQuestion();

  addQuestionBtn.addEventListener('click', () => {
    addQuestion();
  });

  examForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const examData = {
      title: document.getElementById('title').value.trim(),
      student: document.getElementById('student').value.trim(),
      course: document.getElementById('course').value.trim(),
      date: document.getElementById('date').value.trim(),
      objective: document.getElementById('objective').value.trim(),
      questions: []
    };
    const textareas = questionsContainer.querySelectorAll('textarea');
    textareas.forEach((ta) => {
      examData.questions.push({ text: ta.value.trim() });
    });
    // Persist exam data in localStorage for retrieval on the student page.
    localStorage.setItem('examData', JSON.stringify(examData));
    alert('Examen guardado correctamente. Puede compartir el enlace del examen con sus estudiantes.');
  });

  /* Chat section */
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');

  // Initialize chat history with a system prompt instructing the assistant.
  let chatHistory = [
    {
      role: 'system',
      content:
        'Eres un asistente útil para profesores de Innova Space Education 2025. Responde de manera clara, cordial y precisa e incluye información relevante sobre nuestra empresa cuando sea apropiado.'
    }
  ];

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const userMsg = input.value.trim();
    if (!userMsg) return;
    appendChatMessage('user', userMsg);
    chatHistory.push({ role: 'user', content: userMsg });
    input.value = '';

    // Retrieve your API key from a safe place. For demonstration purposes, this
    // value is hardcoded. Replace 'YOUR_OPENROUTER_API_KEY' with your own key.
    // According to OpenRouter documentation, you should set the Authorization
    // header to 'Bearer <YOUR_KEY>'【168484824605623†L124-L174】 and never expose
    // the key publicly【168484824605623†L164-L175】.
    const API_KEY = 'YOUR_OPENROUTER_API_KEY';
    if (!API_KEY || API_KEY === 'YOUR_OPENROUTER_API_KEY') {
      appendChatMessage('assistant', 'No se ha configurado la API key. Actualice teacher.js para añadir su clave.');
      return;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + API_KEY,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Innova Space Education 2025'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o',
          messages: chatHistory
        })
      });
      if (!response.ok) {
        throw new Error('La API devolvió un error');
      }
      const data = await response.json();
      const assistantMsg = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
        ? data.choices[0].message.content.trim()
        : 'No se recibió respuesta.';
      chatHistory.push({ role: 'assistant', content: assistantMsg });
      appendChatMessage('assistant', assistantMsg);
    } catch (err) {
      appendChatMessage('assistant', 'Error al contactar el servicio: ' + err.message);
    }
  });

  /**
   * Append a chat message to the chat panel.
   * @param {string} role - 'user' or 'assistant'
   * @param {string} text - The message content
   */
  function appendChatMessage(role, text) {
    const p = document.createElement('p');
    p.classList.add('chat-message', role);
    p.textContent = text;
    chatMessages.appendChild(p);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});