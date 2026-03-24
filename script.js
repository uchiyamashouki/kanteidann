const priceInput = document.getElementById("priceInput");
const spinBtn = document.getElementById("spinBtn");
const revealBtn = document.getElementById("revealBtn");
const display = document.getElementById("display");
const message = document.getElementById("message");
const flash = document.getElementById("flash");
const lights = document.getElementById("lights");

let slots = [];
let spinTimer = null;
let isSpinning = false;
let isRevealing = false;

function buildLights() {
  const bulbs = [];
  const count = 28;

  for (let i = 0; i < count; i++) {
    const bulb = document.createElement("div");
    bulb.className = "bulb";
    bulb.style.animationDelay = `${(i % 7) * 0.08}s`;

    let x, y;
    if (i < 8) {
      x = 8 + (i / 7) * 84;
      y = 4;
    } else if (i < 14) {
      x = 94;
      y = 8 + (i - 8) * 14;
    } else if (i < 22) {
      x = 92 - (i - 14) * 11;
      y = 92;
    } else {
      x = 4;
      y = 88 - (i - 22) * 14;
    }

    bulb.style.left = `${x}%`;
    bulb.style.top = `${y}%`;
    bulbs.push(bulb);
  }

  lights.replaceChildren(...bulbs);
}

function clampValue() {
  const value = Math.max(0, Math.min(9999999, Math.floor(Number(priceInput.value) || 0)));
  priceInput.value = value;
  return value;
}

function createDigitStrip(initialDigit = 0) {
  const digit = document.createElement("div");
  digit.className = "digit";

  const strip = document.createElement("div");
  strip.className = "strip";

  for (let loop = 0; loop < 24; loop++) {
    for (let n = 0; n <= 9; n++) {
      const item = document.createElement("div");
      item.className = "num";
      item.textContent = n;
      strip.appendChild(item);
    }
  }

  const windowLayer = document.createElement("div");
  windowLayer.className = "digit-window";

  const centerGuide = document.createElement("div");
  centerGuide.className = "digit-center-guide";
  windowLayer.appendChild(centerGuide);

  digit.appendChild(strip);
  digit.appendChild(windowLayer);

  return {
    type: "digit",
    el: digit,
    strip,
    index: initialDigit,
    locked: false,
    target: initialDigit,
  };
}

function createComma() {
  const comma = document.createElement("div");
  comma.className = "comma show";
  comma.textContent = ",";
  return { type: "comma", el: comma };
}

function createUnit() {
  const unit = document.createElement("div");
  unit.className = "unit show";
  unit.textContent = "人";
  return { type: "unit", el: unit };
}

function setDigitVisual(slot, digitValue, animate = false, duration = 160) {
  const digitHeight = slot.el.clientHeight;
  slot.index = digitValue;
  slot.strip.style.transition = animate
    ? `transform ${duration}ms cubic-bezier(.17,.89,.32,1.18)`
    : "none";

  const baseLoop = 12;
  const pos = (baseLoop * 10 + digitValue) * digitHeight;
  slot.strip.style.transform = `translateY(-${pos}px)`;
}

function buildDisplayFromValue(value) {
  const formatted = Number(value).toLocaleString("ja-JP");
  display.innerHTML = "";
  slots = [];

  const digitStage = document.createElement("div");
  digitStage.className = "digit-stage";

  for (const ch of formatted) {
    if (/\d/.test(ch)) {
      const slot = createDigitStrip(Number(ch));
      slots.push(slot);
      digitStage.appendChild(slot.el);
    } else if (ch === ",") {
      const slot = createComma();
      slots.push(slot);
      digitStage.appendChild(slot.el);
    }
  }

  const unit = createUnit();
  slots.push(unit);
  digitStage.appendChild(unit.el);
  display.appendChild(digitStage);

  requestAnimationFrame(() => {
    slots.forEach((slot) => {
      if (slot.type === "digit") {
        setDigitVisual(slot, slot.index, false);
      }
    });
  });
}

function ensureDisplayMatchesInput() {
  const value = clampValue();
  const formattedLength = Number(value).toLocaleString("ja-JP").length;
  const currentLength = slots.filter((s) => s.type !== "unit").length;

  if (!slots.length || formattedLength !== currentLength) {
    buildDisplayFromValue(value);
  }

  return value;
}

function tickSpin() {
  slots.forEach((slot) => {
    if (slot.type !== "digit" || slot.locked) return;
    const next = (slot.index + 1) % 10;
    setDigitVisual(slot, next, false);
  });
}

function startSpin() {
  if (isRevealing) return;

  const value = ensureDisplayMatchesInput();
  const formatted = Number(value).toLocaleString("ja-JP");
  let digitPtr = 0;

  for (const ch of formatted) {
    if (/\d/.test(ch)) {
      while (slots[digitPtr] && slots[digitPtr].type !== "digit") {
        digitPtr++;
      }
      if (slots[digitPtr]) {
        slots[digitPtr].locked = false;
        slots[digitPtr].target = Number(ch);
        digitPtr++;
      }
    }
  }

  if (spinTimer) clearInterval(spinTimer);
  spinTimer = setInterval(tickSpin, 65);
  isSpinning = true;
  message.textContent = "数字を回転中…「開示する」で確定します";
}

async function revealDigits() {
  if (isRevealing) return;

  const value = ensureDisplayMatchesInput();
  const formatted = Number(value).toLocaleString("ja-JP");
  const digitSlots = slots.filter((slot) => slot.type === "digit");
  const digits = formatted.replace(/,/g, "").split("");

  digitSlots.forEach((slot, i) => {
    slot.target = Number(digits[i]);
  });

  if (!isSpinning) {
    startSpin();
    await wait(250);
  }

  isRevealing = true;
  spinBtn.disabled = true;
  revealBtn.disabled = true;
  message.textContent = "人数を開示中…";

  for (let i = digitSlots.length - 1, revealOrder = 0; i >= 0; i--, revealOrder++) {
    const slot = digitSlots[i];
    slot.locked = true;

    const settleDuration = 260 + revealOrder * 140;
    setDigitVisual(slot, slot.target, true, settleDuration);

    await wait(260 + revealOrder * 180);
  }

  if (spinTimer) {
    clearInterval(spinTimer);
    spinTimer = null;
  }

  isSpinning = false;
  isRevealing = false;
  spinBtn.disabled = false;
  revealBtn.disabled = false;

  flash.classList.remove("play");
  void flash.offsetWidth;
  flash.classList.add("play");

  message.textContent = `参加人数 ${formatted} 人`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

spinBtn.addEventListener("click", startSpin);
revealBtn.addEventListener("click", revealDigits);

priceInput.addEventListener("input", () => {
  if (!isSpinning && !isRevealing) {
    buildDisplayFromValue(clampValue());
  }
});

priceInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    startSpin();
  } else if (e.key === "Enter") {
    e.preventDefault();
    revealDigits();
  }
});

buildLights();
buildDisplayFromValue(clampValue());
