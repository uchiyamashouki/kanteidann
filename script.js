/* ---------------------------------
   要素取得
--------------------------------- */
const input = document.getElementById("priceInput");
const spinBtn = document.getElementById("spinBtn");
const revealBtn = document.getElementById("revealBtn");
const board = document.getElementById("display");
const message = document.getElementById("message");
const flash = document.getElementById("flash");
const lights = document.getElementById("lights");

/* ---------------------------------
   状態管理
--------------------------------- */
let slots = [];
let spinTimer = null;
let isSpinning = false;
let isRevealing = false;
let revealIndex = -1;

/* ---------------------------------
   定数
--------------------------------- */
const DIGIT_REPEAT = 3; // 0〜9を3周分並べる
const DIGIT_COUNT = 10;

/* ---------------------------------
   電球生成
--------------------------------- */
function buildLights() {
  if (!lights) return;
  lights.innerHTML = "";

  const boardEl = lights.parentElement;
  const w = boardEl.clientWidth || 600;
  const h = boardEl.clientHeight || 320;

  const gap = 36;
  const bulbs = [];

  for (let x = 18; x <= w - 18; x += gap) {
    bulbs.push({ x, y: 14 });
    bulbs.push({ x, y: h - 14 });
  }
  for (let y = 50; y <= h - 50; y += gap) {
    bulbs.push({ x: 14, y });
    bulbs.push({ x: w - 14, y });
  }

  bulbs.forEach((pos, i) => {
    const b = document.createElement("div");
    b.className = "bulb";
    b.style.left = `${pos.x - 8}px`;
    b.style.top = `${pos.y - 8}px`;
    b.style.animationDelay = `${(i % 10) * 0.08}s`;
    lights.appendChild(b);
  });
}

/* ---------------------------------
   1桁分のDOMを作る
--------------------------------- */
function createDigitSlot() {
  const digit = document.createElement("div");
  digit.className = "digit";

  const strip = document.createElement("div");
  strip.className = "strip";

  for (let r = 0; r < DIGIT_REPEAT; r++) {
    for (let n = 0; n < DIGIT_COUNT; n++) {
      const num = document.createElement("div");
      num.className = "num";
      num.textContent = String(n);
      strip.appendChild(num);
    }
  }

  const windowLayer = document.createElement("div");
  windowLayer.className = "digit-window";

  const guide = document.createElement("div");
  guide.className = "digit-center-guide";
  windowLayer.appendChild(guide);

  digit.appendChild(strip);
  digit.appendChild(windowLayer);

  return {
    type: "digit",
    el: digit,
    strip,
    value: 0,
    target: 0,
    locked: false,
    spinOffset: Math.floor(Math.random() * 10)
  };
}

/* ---------------------------------
   本物のスロット生成
--------------------------------- */
function buildSlots(value) {
  board.innerHTML = "";
  slots = [];

  const stage = document.createElement("div");
  stage.className = "digit-stage";
  board.appendChild(stage);

  const formatted = Number(value).toLocaleString("ja-JP");

  for (const ch of formatted) {
    if (ch === ",") {
      const comma = document.createElement("div");
      comma.className = "comma";
      comma.textContent = ",";
      stage.appendChild(comma);

      slots.push({
        type: "comma",
        el: comma
      });
    } else {
      const slot = createDigitSlot();
      stage.appendChild(slot.el);
      slots.push(slot);
    }
  }

  const unit = document.createElement("div");
  unit.className = "unit show";
  unit.textContent = "人";
  stage.appendChild(unit);

  buildLights();

  slots.forEach((slot) => {
    if (slot.type === "digit") {
      setDigitVisual(slot, 0, false, 0);
    } else if (slot.type === "comma") {
      slot.el.classList.add("show");
    }
  });
}

/* ---------------------------------
   隠し表示（?）生成
--------------------------------- */
function buildSlotsHidden(value) {
  board.innerHTML = "";
  slots = [];

  const stage = document.createElement("div");
  stage.className = "digit-stage";
  board.appendChild(stage);

  const formatted = Number(value).toLocaleString("ja-JP");

  for (const ch of formatted) {
    if (ch === ",") {
      const comma = document.createElement("div");
      comma.className = "comma show";
      comma.textContent = ",";
      stage.appendChild(comma);
      continue;
    }

    const digit = document.createElement("div");
    digit.className = "digit";

    const mark = document.createElement("div");
    mark.className = "num";
    mark.textContent = "?";

    digit.appendChild(mark);
    stage.appendChild(digit);
  }

  const unit = document.createElement("div");
  unit.className = "unit show";
  unit.textContent = "人";
  stage.appendChild(unit);

  buildLights();
}

/* ---------------------------------
   入力値を取得
--------------------------------- */
function getInputValue() {
  return String(input.value).replace(/[^0-9]/g, "") || "0";
}

/* ---------------------------------
   桁の高さ取得
--------------------------------- */
function getDigitHeight(slot) {
  const num = slot.strip.querySelector(".num");
  return num ? num.offsetHeight : 80;
}

/* ---------------------------------
   数字の見た目更新
--------------------------------- */
function setDigitVisual(slot, value, animate = false, duration = 200) {
  slot.value = value;

  const digitHeight = getDigitHeight(slot);
  const centerLoopIndex = DIGIT_COUNT + value;
  const y = -(centerLoopIndex * digitHeight);

  slot.strip.style.transition = animate
    ? `transform ${duration}ms cubic-bezier(.2,.8,.2,1)`
    : "none";

  slot.strip.style.transform = `translateY(${y}px)`;
}

/* ---------------------------------
   回転処理
--------------------------------- */
function tickSpin() {
  for (const slot of slots) {
    if (slot.type === "digit" && !slot.locked) {
      slot.spinOffset = (slot.spinOffset + 1) % 10;
      setDigitVisual(slot, slot.spinOffset, false);
    }
  }
}

/* ---------------------------------
   回転開始
--------------------------------- */
function startSpin() {
  if (isRevealing) return;

  const value = getInputValue();
  const formatted = Number(value).toLocaleString("ja-JP");

  // ?表示から本物の数字スロットへ切り替える
  buildSlots(value);

  let digitPtr = 0;

  for (const ch of formatted) {
    if (/\d/.test(ch)) {
      while (slots[digitPtr] && slots[digitPtr].type !== "digit") {
        digitPtr++;
      }

      if (slots[digitPtr]) {
        slots[digitPtr].locked = false;
        slots[digitPtr].target = Number(ch);
        slots[digitPtr].spinOffset = Math.floor(Math.random() * 10);
        setDigitVisual(slots[digitPtr], slots[digitPtr].spinOffset, false, 0);
        digitPtr++;
      }
    }
  }

  revealIndex = -1;

  if (spinTimer) clearInterval(spinTimer);
  spinTimer = setInterval(tickSpin, 65);

  isSpinning = true;
  if (message) {
    message.textContent = "数字を回転中…「開示する」で一桁ずつ確定します";
  }
}

/* ---------------------------------
   1回押すごとに1桁だけ開示
--------------------------------- */
async function revealDigits() {
  if (isRevealing) return;

  const value = getInputValue();
  const formatted = Number(value).toLocaleString("ja-JP");

  // まだ回転していなければ、先に回転開始
  if (!isSpinning) {
    startSpin();
    await wait(250);
  }

  const digitSlots = slots.filter((slot) => slot.type === "digit");
  const digits = formatted.replace(/,/g, "").split("");

  digitSlots.forEach((slot, i) => {
    slot.target = Number(digits[i]);
  });

  isRevealing = true;
  spinBtn.disabled = true;
  revealBtn.disabled = true;

  if (revealIndex === -1) {
    revealIndex = digitSlots.length - 1;
  }

  if (revealIndex < 0) {
    isRevealing = false;
    spinBtn.disabled = false;
    revealBtn.disabled = false;
    return;
  }

  const slot = digitSlots[revealIndex];
  const revealOrder = digitSlots.length - 1 - revealIndex;

  slot.locked = true;

  const settleDuration = 260 + revealOrder * 140;
  setDigitVisual(slot, slot.target, true, settleDuration);

  await wait(260 + revealOrder * 180);

  revealIndex--;

  if (revealIndex < 0) {
    if (spinTimer) {
      clearInterval(spinTimer);
      spinTimer = null;
    }

    isSpinning = false;

    flash.classList.remove("play");
    void flash.offsetWidth;
    flash.classList.add("play");

    if (message) {
      message.textContent = `参加人数 ${formatted} 人`;
    }
  } else {
    if (message) {
      message.textContent = "人数を開示中…「開示する」で次の桁を確定します";
    }
  }

  isRevealing = false;
  spinBtn.disabled = false;
  revealBtn.disabled = false;
}

/* ---------------------------------
   待機用
--------------------------------- */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------------------------------
   イベント
--------------------------------- */
spinBtn.addEventListener("click", startSpin);
revealBtn.addEventListener("click", revealDigits);

input.addEventListener("input", () => {
  const value = getInputValue();

  // 回転中なら停止
  if (spinTimer) {
    clearInterval(spinTimer);
    spinTimer = null;
  }

  isSpinning = false;
  isRevealing = false;
  revealIndex = -1;

  spinBtn.disabled = false;
  revealBtn.disabled = false;

  buildSlotsHidden(value);

  if (message) {
    message.textContent = "";
  }
});

window.addEventListener("resize", () => {
  buildLights();

  // 回転中・開示後の本物スロットだけ位置補正
  slots.forEach((slot) => {
    if (slot.type === "digit" && slot.strip) {
      setDigitVisual(slot, slot.value, false, 0);
    }
  });
});

/* ---------------------------------
   初期表示
--------------------------------- */
buildSlotsHidden(input.value || "0");
if (message) {
  message.textContent = "";
}
