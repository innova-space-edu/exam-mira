/*
 * Student exam page logic for Innova Space Education 2025 platform.
 *
 * This script initializes a rich drawing canvas using Fabric.js, loads the
 * exam data created by the teacher from localStorage, displays questions
 * slide by slide, and allows navigation. Drawings are saved per slide so
 * students can return to previous exercises. The toolbar offers tools for
 * free drawing, rectangles, circles, lines, text insertion, color
 * selection, and clearing the canvas. Borrar removes the currently
 * selected object. The script resizes the canvas responsively.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Retrieve exam data; if none exists use a default exam.
  let examData;
  try {
    examData = JSON.parse(localStorage.getItem('examData'));
  } catch (err) {
    examData = null;
  }
  if (!examData) {
    // Provide a fallback exam with one simple question if no data is found.
    examData = {
      title: 'Prueba de ejemplo',
      student: 'Estudiante',
      course: 'Curso',
      date: new Date().toISOString().split('T')[0],
      objective: 'Demostración',
      questions: [{ text: 'Describe brevemente cómo resolverías una ecuación de segundo grado.' }]
    };
  }

  // Populate header information.
  document.getElementById('examTitle').textContent = examData.title;
  document.getElementById('studentName').textContent = examData.student;
  document.getElementById('courseName').textContent = examData.course;
  document.getElementById('examDate').textContent = examData.date;

  const questionElem = document.getElementById('questionText');
  const slideIndicator = document.getElementById('slideIndicator');
  const prevSlideBtn = document.getElementById('prevSlide');
  const nextSlideBtn = document.getElementById('nextSlide');

  // Convert questions into slides with drawing storage.
  const slides = examData.questions.map((q) => ({ question: q.text || '', drawing: null }));
  let currentIndex = 0;

  // Initialize Fabric.js canvas.
  const canvas = new fabric.Canvas('drawingCanvas', {
    preserveObjectStacking: true
  });

  // Resize canvas based on container size and window height.
  function resizeCanvas() {
    const containerWidth = document.querySelector('.canvas-container').clientWidth;
    const desiredHeight = Math.max(300, window.innerHeight * 0.5);
    canvas.setWidth(containerWidth);
    canvas.setHeight(desiredHeight);
    canvas.renderAll();
  }
  // Initial sizing and on resize.
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Toolbar elements.
  const penTool = document.getElementById('penTool');
  const rectTool = document.getElementById('rectTool');
  const circleTool = document.getElementById('circleTool');
  const lineTool = document.getElementById('lineTool');
  const textTool = document.getElementById('textTool');
  const eraserTool = document.getElementById('eraserTool');
  const colorPicker = document.getElementById('colorPicker');
  const clearCanvasBtn = document.getElementById('clearCanvas');

  let drawingMode = 'pen';
  let isDrawingShape = false;
  let shapeBeingDrawn = null;
  let startX = 0;
  let startY = 0;

  /**
   * Reset drawing mode and remove shape drawing events.
   */
  function resetDrawingMode() {
    canvas.isDrawingMode = false;
    canvas.selection = true;
    drawingMode = null;
    isDrawingShape = false;
    shapeBeingDrawn = null;
    // Remove custom handlers to avoid stacking.
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
  }

  /**
   * Activate free drawing mode.
   */
  function activatePen() {
    resetDrawingMode();
    drawingMode = 'pen';
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.color = colorPicker.value;
    canvas.freeDrawingBrush.width = 2;
  }

  /**
   * Activate shape drawing mode.
   * @param {string} type - The type of shape: 'rect', 'circle', 'line'.
   */
  function activateShape(type) {
    resetDrawingMode();
    drawingMode = type;
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.on('mouse:down', (opt) => {
      const pointer = canvas.getPointer(opt.e);
      startX = pointer.x;
      startY = pointer.y;
      isDrawingShape = true;
      let shape;
      switch (type) {
        case 'rect':
          shape = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: colorPicker.value,
            strokeWidth: 2
          });
          break;
        case 'circle':
          shape = new fabric.Circle({
            left: startX,
            top: startY,
            radius: 0,
            fill: 'transparent',
            stroke: colorPicker.value,
            strokeWidth: 2
          });
          break;
        case 'line':
          shape = new fabric.Line([startX, startY, startX, startY], {
            stroke: colorPicker.value,
            strokeWidth: 2
          });
          break;
        default:
          shape = null;
      }
      if (shape) {
        shapeBeingDrawn = shape;
        canvas.add(shape);
      }
    });
    canvas.on('mouse:move', (opt) => {
      if (!isDrawingShape || !shapeBeingDrawn) return;
      const pointer = canvas.getPointer(opt.e);
      switch (type) {
        case 'rect': {
          const width = pointer.x - startX;
          const height = pointer.y - startY;
          shapeBeingDrawn.set({ width: width, height: height });
          shapeBeingDrawn.setCoords();
          break;
        }
        case 'circle': {
          const radius = Math.sqrt(
            Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)
          ) / 2;
          shapeBeingDrawn.set({ radius: radius });
          break;
        }
        case 'line': {
          shapeBeingDrawn.set({ x2: pointer.x, y2: pointer.y });
          break;
        }
      }
      canvas.renderAll();
    });
    canvas.on('mouse:up', () => {
      isDrawingShape = false;
      shapeBeingDrawn = null;
      canvas.selection = true;
    });
  }

  /**
   * Activate text insertion mode.
   */
  function activateText() {
    resetDrawingMode();
    drawingMode = 'text';
    canvas.on('mouse:down', function addTextHandler(opt) {
      const pointer = canvas.getPointer(opt.e);
      const text = new fabric.IText('Texto', {
        left: pointer.x,
        top: pointer.y,
        fill: colorPicker.value,
        fontSize: 20
      });
      canvas.add(text);
      canvas.off('mouse:down', addTextHandler);
    });
  }

  // Event listeners for toolbar buttons.
  penTool.addEventListener('click', activatePen);
  rectTool.addEventListener('click', () => activateShape('rect'));
  circleTool.addEventListener('click', () => activateShape('circle'));
  lineTool.addEventListener('click', () => activateShape('line'));
  textTool.addEventListener('click', activateText);
  eraserTool.addEventListener('click', () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.remove(activeObject);
    }
  });
  clearCanvasBtn.addEventListener('click', () => {
    canvas.clear();
  });
  colorPicker.addEventListener('change', () => {
    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush.color = colorPicker.value;
    }
  });

  // Navigation logic: save current drawing to slide and load new slide.
  function saveCurrentDrawing() {
    slides[currentIndex].drawing = JSON.stringify(canvas.toJSON());
  }

  function loadSlide(index) {
    const slide = slides[index];
    questionElem.textContent = slide.question || '';
    slideIndicator.textContent = `${index + 1} / ${slides.length}`;
    // Clear and load drawing if exists.
    canvas.clear();
    if (slide.drawing) {
      try {
        canvas.loadFromJSON(slide.drawing, () => {
          canvas.renderAll();
        });
      } catch (err) {
        console.error('Error loading slide drawing', err);
      }
    }
    // Update navigation button states.
    prevSlideBtn.disabled = index === 0;
    nextSlideBtn.disabled = index === slides.length - 1;
  }

  prevSlideBtn.addEventListener('click', () => {
    saveCurrentDrawing();
    if (currentIndex > 0) {
      currentIndex -= 1;
      loadSlide(currentIndex);
    }
  });
  nextSlideBtn.addEventListener('click', () => {
    saveCurrentDrawing();
    if (currentIndex < slides.length - 1) {
      currentIndex += 1;
      loadSlide(currentIndex);
    }
  });

  // Initialize by activating the pen tool and loading the first slide.
  activatePen();
  loadSlide(currentIndex);
});