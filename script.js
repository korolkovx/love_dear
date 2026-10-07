/* ==========================================================================
   LOVE DEAR - Premium Romantic Interactive Script
   Crafted with Web Audio synthesis, scratch mechanics & delightful animations
   ========================================================================== */

(function () {
  'use strict';

  // ==========================================
  // 1. CONFIGURATION & PERSONALIZATION
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);

  const CONFIG = {
    // Имя адресата (по умолчанию или из параметра ?name=Имя в ссылке)
    recipientName: urlParams.get('name') || "Любимая 💖",
    
    // Telegram username для отправки ответа (без @)
    // Например: 'korolkovx' или из параметра ?tg=username
    telegramUsername: urlParams.get('tg') || "korolkovx",
    
    // Порог стирания для авто-открытия (в процентах)
    scratchRevealPercent: 40,
    
    // Включить звуковые эффекты по умолчанию
    soundEnabled: true
  };

  // State
  let soundOn = CONFIG.soundEnabled;
  let currentStep = 1;
  let dodgeCount = 0;
  let yesScale = 1;
  let isScratched = false;

  const userSelections = {
    ideas: [],
    customIdea: "",
    food: [],
    dateTime: ""
  };

  const DODGE_TEXTS = [
    "Нет 🙈",
    "Ты уверена? 🥺",
    "Подумай ещё разок! 💕",
    "Кнопка сломалась 🙃",
    "Ой, я убегаю! 💨",
    "Ну пожалуйста... 👉👈",
    "А если за пиццу? 🍕",
    "Не нажимай сюда! 🙅‍♀️",
    "Сопротивление бесполезно! 🥰",
    "Сдаюсь... Жми «Да»! 💖"
  ];

  // ==========================================
  // 2. SYNTHESIZED WEB AUDIO API (Zero MP3s needed)
  // ==========================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playPop(freq = 600) {
    if (!soundOn) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  }

  function playSparkle() {
    if (!soundOn) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const freqs = [1046, 1318, 1567, 2093];
      const now = audioCtx.currentTime;
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.05);
        gain.gain.setValueAtTime(0.08, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.15);
      });
    } catch (e) {}
  }

  function playFanfare() {
    if (!soundOn) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = audioCtx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } catch (e) {}
  }

  // ==========================================
  // 3. SOUND TOGGLE BUTTON
  // ==========================================
  const soundBtn = document.getElementById('sound-btn');
  const soundIcon = document.getElementById('sound-icon');

  if (soundBtn && soundIcon) {
    soundBtn.addEventListener('click', () => {
      initAudio();
      soundOn = !soundOn;
      soundIcon.textContent = soundOn ? "🔊" : "🔇";
      if (soundOn) playPop(750);
    });
  }

  // Set Recipient Name in DOM if configured
  const recipientHeading = document.getElementById('recipient-heading');
  const ticketRecipient = document.getElementById('ticket-recipient');
  if (recipientHeading && urlParams.has('name')) {
    recipientHeading.innerHTML = `<strong>${CONFIG.recipientName}</strong>, ты пойдёшь`;
  }
  if (ticketRecipient) {
    ticketRecipient.textContent = CONFIG.recipientName;
  }

  // ==========================================
  // 4. SCRATCH-OFF CANVAS IMPLEMENTATION
  // ==========================================
  const scratchOverlay = document.getElementById('scratch-overlay');
  const canvas = document.getElementById('scratch-canvas');
  const scratchPercentEl = document.getElementById('scratch-percent');
  const scratchProgressFill = document.getElementById('scratch-progress-fill');
  const quickRevealBtn = document.getElementById('quick-reveal-btn');

  let ctx = null;
  let isDrawing = false;
  let lastPoint = null;
  let throttleTimer = null;

  function initScratchCanvas() {
    if (!canvas || !scratchOverlay) return;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    drawScratchCover();
    bindScratchEvents();
  }

  function resizeCanvas() {
    if (!canvas || !scratchOverlay) return;
    const rect = scratchOverlay.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    if (!isScratched) {
      drawScratchCover();
    }
  }

  function drawScratchCover() {
    if (!ctx || !canvas) return;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Rich Rose-Gold Metallic Gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#FF477E');
    grad.addColorStop(0.5, '#FF5E8E');
    grad.addColorStop(1, '#FF2E6D');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle Glitter Pattern Overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 90; i++) {
      const rx = (i * 137.5) % w;
      const ry = (i * 269.3) % h;
      const r = (i % 3) + 1.5;
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function scratchAt(pos) {
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();

    const radius = Math.max(38, Math.min(window.innerWidth * 0.08, 64));

    if (lastPoint) {
      ctx.lineWidth = radius * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    lastPoint = pos;

    // Trigger subtle sparkle sound occasionally
    if (Math.random() < 0.15) {
      playSparkle();
    }
  }

  function bindScratchEvents() {
    if (!canvas) return;

    const startHandler = (e) => {
      initAudio();
      isDrawing = true;
      lastPoint = getCanvasPos(e);
      scratchAt(lastPoint);
      e.preventDefault();
    };

    const moveHandler = (e) => {
      if (!isDrawing) return;
      const pos = getCanvasPos(e);
      scratchAt(pos);

      // Periodically compute scratch percentage
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          checkScratchPercentage();
          throttleTimer = null;
        }, 120);
      }
      e.preventDefault();
    };

    const endHandler = () => {
      isDrawing = false;
      lastPoint = null;
      checkScratchPercentage();
    };

    canvas.addEventListener('mousedown', startHandler);
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', endHandler);

    canvas.addEventListener('touchstart', startHandler, { passive: false });
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('touchend', endHandler);

    if (quickRevealBtn) {
      quickRevealBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        revealScratch();
      });
    }
  }

  function checkScratchPercentage() {
    if (isScratched || !ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    // Downscale for lightning fast sampling
    const sampleWidth = 40;
    const sampleHeight = 40;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let transparentPixels = 0;
    const totalSampled = sampleWidth * sampleHeight;

    const stepX = Math.floor(w / sampleWidth);
    const stepY = Math.floor(h / sampleHeight);

    for (let y = 0; y < sampleHeight; y++) {
      for (let x = 0; x < sampleWidth; x++) {
        const pixelIdx = ((y * stepY) * w + (x * stepX)) * 4;
        if (data[pixelIdx + 3] < 128) {
          transparentPixels++;
        }
      }
    }

    const pct = Math.min(100, Math.round((transparentPixels / totalSampled) * 100));

    if (scratchPercentEl) {
      scratchPercentEl.textContent = `Стерто: ${pct}% 💕`;
    }
    if (scratchProgressFill) {
      scratchProgressFill.style.width = `${pct}%`;
    }

    if (pct >= CONFIG.scratchRevealPercent) {
      revealScratch();
    }
  }

  function revealScratch() {
    if (isScratched) return;
    isScratched = true;

    playFanfare();
    fireConfetti(30);

    if (scratchOverlay) {
      scratchOverlay.classList.add('revealed');
      setTimeout(() => {
        scratchOverlay.style.display = 'none';
      }, 850);
    }
  }

  // ==========================================
  // 5. DODGING "НЕТ" BUTTON LOGIC
  // ==========================================
  const btnYes = document.getElementById('btn-yes');
  const btnNo = document.getElementById('btn-no');
  const btnNoText = document.getElementById('btn-no-text');
  const noBtnWrapper = document.getElementById('no-btn-wrapper');
  const dodgesHint = document.getElementById('dodges-hint');

  function dodgeButton() {
    dodgeCount++;
    playPop(400 + dodgeCount * 50);

    // Update text
    const textIdx = Math.min(dodgeCount, DODGE_TEXTS.length - 1);
    if (btnNoText) {
      btnNoText.textContent = DODGE_TEXTS[textIdx];
    }

    // Dodging movement calculation
    const maxOffset = Math.min(window.innerWidth * 0.35, 120);
    const randomX = (Math.random() - 0.5) * maxOffset * 2;
    const randomY = (Math.random() - 0.5) * 80;

    if (btnNo) {
      btnNo.style.transform = `translate(${randomX}px, ${randomY}px) scale(0.92)`;
    }

    // Grow "ДА" button progressively!
    yesScale += 0.08;
    if (btnYes) {
      btnYes.style.transform = `scale(${yesScale})`;
    }

    // Hint text
    if (dodgesHint) {
      dodgesHint.textContent = `Попытка нажать «Нет»: ${dodgeCount} (но кнопка убегает!) 🙈`;
    }

    // If tapped many times, gently disable No button
    if (dodgeCount >= 8 && btnNo) {
      btnNo.style.opacity = '0.5';
    }
  }

  if (btnNo) {
    // Desktop hover evade
    btnNo.addEventListener('mouseenter', dodgeButton);
    // Touch evade for mobile
    btnNo.addEventListener('touchstart', (e) => {
      e.preventDefault();
      dodgeButton();
    }, { passive: false });
    btnNo.addEventListener('click', (e) => {
      e.preventDefault();
      dodgeButton();
    });
  }

  // ==========================================
  // 6. STEP TRANSITIONS & PROGRESS BAR
  // ==========================================
  const stepsProgress = document.getElementById('steps-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressHeart = document.getElementById('progress-heart');
  const stepCounterText = document.getElementById('step-counter-text');

  function goToStep(stepNum) {
    currentStep = stepNum;
    playPop(850);

    // Hide all steps
    document.querySelectorAll('.step-card').forEach(el => {
      el.classList.remove('active');
      el.classList.add('hidden');
    });

    // Show target step
    const target = document.getElementById(`step-${stepNum}`);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }

    // Update progress bar
    if (stepNum >= 3 && stepNum <= 6) {
      if (stepsProgress) stepsProgress.classList.remove('hidden');
      const stepIdx = stepNum - 2; // 1 to 4
      const pct = ((stepIdx - 1) / 3) * 100;
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressHeart) progressHeart.style.left = `${pct}%`;
      if (stepCounterText) {
        stepCounterText.textContent = `Шаг ${stepIdx} из 4`;
      }
    } else {
      if (stepsProgress) stepsProgress.classList.add('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Step 1: Click "Да!"
  if (btnYes) {
    btnYes.addEventListener('click', () => {
      playFanfare();
      fireConfetti(100);
      goToStep(2);
    });
  }

  // Step 2: "Выбрать сценарий свидания"
  const btnToIdeas = document.getElementById('btn-to-ideas');
  if (btnToIdeas) {
    btnToIdeas.addEventListener('click', () => {
      goToStep(3);
    });
  }

  // ==========================================
  // 7. STEP 3: DATE IDEAS SELECTION
  // ==========================================
  const ideasGrid = document.getElementById('ideas-grid');
  const ideasCountEl = document.getElementById('ideas-count');
  const btnToFood = document.getElementById('btn-to-food');
  const customIdeaInput = document.getElementById('custom-idea-input');
  const customIdeaCard = document.getElementById('custom-idea-card');

  if (ideasGrid) {
    ideasGrid.querySelectorAll('.option-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent toggle if clicking inside the custom input directly
        if (e.target === customIdeaInput) return;

        playPop(650);
        card.classList.toggle('selected');
        updateIdeasSelection();
      });
    });
  }

  if (customIdeaInput && customIdeaCard) {
    customIdeaInput.addEventListener('input', () => {
      if (customIdeaInput.value.trim().length > 0) {
        customIdeaCard.classList.add('selected');
      } else {
        customIdeaCard.classList.remove('selected');
      }
      updateIdeasSelection();
    });
  }

  function updateIdeasSelection() {
    const selectedCards = ideasGrid.querySelectorAll('.option-card.selected');
    userSelections.ideas = [];

    selectedCards.forEach(card => {
      const id = card.getAttribute('data-id');
      if (id === 'custom') {
        const customVal = customIdeaInput ? customIdeaInput.value.trim() : "";
        if (customVal) {
          userSelections.ideas.push(`Свой вариант: ${customVal}`);
        } else {
          userSelections.ideas.push("Свой секретный вариант 💌");
        }
      } else {
        const title = card.querySelector('.option-title').textContent;
        userSelections.ideas.push(title);
      }
    });

    const count = userSelections.ideas.length;
    if (ideasCountEl) {
      ideasCountEl.textContent = `Выбрано: ${count} вариант${getNounEnding(count)}`;
    }
    if (btnToFood) {
      btnToFood.disabled = count === 0;
    }
  }

  if (btnToFood) {
    btnToFood.addEventListener('click', () => {
      goToStep(4);
    });
  }

  // ==========================================
  // 8. STEP 4: FOOD SELECTION
  // ==========================================
  const foodGrid = document.getElementById('food-grid');
  const foodCountEl = document.getElementById('food-count');
  const btnToTime = document.getElementById('btn-to-time');

  if (foodGrid) {
    foodGrid.querySelectorAll('.food-card').forEach(card => {
      card.addEventListener('click', () => {
        playPop(700);
        card.classList.toggle('selected');
        updateFoodSelection();
      });
    });
  }

  function updateFoodSelection() {
    const selected = foodGrid.querySelectorAll('.food-card.selected');
    userSelections.food = [];

    selected.forEach(card => {
      const title = card.getAttribute('data-title');
      userSelections.food.push(title);
    });

    const count = userSelections.food.length;
    if (foodCountEl) {
      foodCountEl.textContent = `Выбрано: ${count} блюд${getNounEndingFood(count)}`;
    }
    if (btnToTime) {
      btnToTime.disabled = count === 0;
    }
  }

  if (btnToTime) {
    btnToTime.addEventListener('click', () => {
      goToStep(5);
    });
  }

  // ==========================================
  // 9. STEP 5: DATE & TIME SELECTION
  // ==========================================
  const timeChips = document.getElementById('time-chips');
  const dateInput = document.getElementById('date-input');
  const timeInput = document.getElementById('time-input');
  const selectedTimeSummary = document.getElementById('selected-time-summary');
  const btnToTicket = document.getElementById('btn-to-ticket');

  // Pre-fill date input with tomorrow's date
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = new Date().toISOString().split('T')[0];
    dateInput.value = tomorrow.toISOString().split('T')[0];
  }

  if (timeChips) {
    timeChips.querySelectorAll('.chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        playPop(750);
        timeChips.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        userSelections.dateTime = chip.getAttribute('data-val');
        updateTimeSelection();
      });
    });
  }

  if (dateInput && timeInput) {
    const onDateChange = () => {
      if (dateInput.value) {
        timeChips.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('selected'));
        const [year, month, day] = dateInput.value.split('-');
        const timeVal = timeInput.value || "19:00";
        userSelections.dateTime = `${day}.${month}.${year} в ${timeVal}`;
        updateTimeSelection();
      }
    };
    dateInput.addEventListener('change', onDateChange);
    timeInput.addEventListener('change', onDateChange);
  }

  function updateTimeSelection() {
    if (selectedTimeSummary) {
      selectedTimeSummary.textContent = userSelections.dateTime ? `Выбрано: ${userSelections.dateTime}` : "Выбери вариант выше";
    }
    if (btnToTicket) {
      btnToTicket.disabled = !userSelections.dateTime;
    }
  }

  if (btnToTicket) {
    btnToTicket.addEventListener('click', () => {
      renderLoveTicket();
      goToStep(6);
      fireConfetti(120);
    });
  }

  // ==========================================
  // 10. STEP 6: RENDER TICKET & TELEGRAM SHARE
  // ==========================================
  const ticketIdeas = document.getElementById('ticket-ideas');
  const ticketFood = document.getElementById('ticket-food');
  const ticketTime = document.getElementById('ticket-time');
  const btnTelegram = document.getElementById('btn-telegram');
  const btnCopyAnswer = document.getElementById('btn-copy-answer');
  const btnRestart = document.getElementById('btn-restart');
  const toast = document.getElementById('toast');

  function renderLoveTicket() {
    if (ticketIdeas) {
      ticketIdeas.textContent = userSelections.ideas.join(', ') || "Уютная прогулка & романтика";
    }
    if (ticketFood) {
      ticketFood.textContent = userSelections.food.join(', ') || "Вкусная пицца и десерты";
    }
    if (ticketTime) {
      ticketTime.textContent = userSelections.dateTime || "В ближайшие выходные";
    }

    // Format ready-made answer message
    const message = generateSummaryMessage();

    // Telegram link: opens directly or via share
    if (btnTelegram) {
      const encodedMsg = encodeURIComponent(message);
      if (CONFIG.telegramUsername && CONFIG.telegramUsername !== 'username') {
        // Direct link to chat with message parameter
        btnTelegram.href = `https://t.me/${CONFIG.telegramUsername}?text=${encodedMsg}`;
      } else {
        // Fallback to general Telegram share url
        btnTelegram.href = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodedMsg}`;
      }
    }
  }

  function generateSummaryMessage() {
    const ideasText = userSelections.ideas.join(', ');
    const foodText = userSelections.food.join(', ');
    const timeText = userSelections.dateTime;

    return `Привет! 🥰 Я согласна пойти на свидание! 💖\n\n` +
           `🗺️ План: ${ideasText}\n` +
           `🍕 Угощения: ${foodText}\n` +
           `📅 Когда: ${timeText}\n\n` +
           `Очень жду нашей встречи! 💕✨`;
  }

  // Copy to clipboard
  if (btnCopyAnswer) {
    btnCopyAnswer.addEventListener('click', () => {
      const message = generateSummaryMessage();
      navigator.clipboard.writeText(message).then(() => {
        playPop(900);
        showToast("Ответ скопирован в буфер обмена! 💌");
      }).catch(() => {
        showToast("Не удалось скопировать, отправь в Telegram!");
      });
    });
  }

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Restart Button
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      playPop(500);
      dodgeCount = 0;
      yesScale = 1;
      if (btnYes) btnYes.style.transform = 'scale(1)';
      if (btnNo) {
        btnNo.style.transform = 'none';
        btnNo.style.opacity = '1';
      }
      if (btnNoText) btnNoText.textContent = DODGE_TEXTS[0];
      if (dodgesHint) dodgesHint.textContent = "";

      // Reset selections
      userSelections.ideas = [];
      userSelections.food = [];
      userSelections.dateTime = "";
      document.querySelectorAll('.option-card, .food-card, .chip-btn').forEach(c => c.classList.remove('selected'));
      if (btnToFood) btnToFood.disabled = true;
      if (btnToTime) btnToTime.disabled = true;
      if (btnToTicket) btnToTicket.disabled = true;

      goToStep(1);
    });
  }

  // ==========================================
  // 11. CONFETTI CELEBRATION HELPER
  // ==========================================
  function fireConfetti(particleCount = 50) {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: particleCount,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#FF477E', '#FF7597', '#FFD1DC', '#FFFFFF', '#FFB3C6']
      });
    }
  }

  // Russian plural helpers
  function getNounEnding(n) {
    if (n % 10 === 1 && n % 100 !== 11) return '';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'а';
    return 'ов';
  }

  function getNounEndingFood(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'о';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'а';
    return '';
  }

  // ==========================================
  // INITIALIZATION ON DOM READY
  // ==========================================
  window.addEventListener('DOMContentLoaded', () => {
    initScratchCanvas();
  });

})();
