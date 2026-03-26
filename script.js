/* ---------------------------------
   要素取得
--------------------------------- */
const input = document.getElementById("numInput");
const spinBtn = document.getElementById("spinBtn");
const revealBtn = document.getElementById("revealBtn");
const board = document.getElementById("board");
const message = document.getElementById("message");
const flash = document.getElementById("flash");

/* ---------------------------------
   状態管理
--------------------------------- */
let slots = [];
let spinTimer = null;
let isSpinning = false;
let isRevealing = false;

// 次に開示する桁（右から）
let revealIndex = -1;

/* ---------------------------------
   スロット生成
--------------------------------- */
function buildSlots(value) {
  board.innerHTML = "";
  slots = [];

  const formatted = Number(value).toLocaleString("ja-JP");

  for (const ch of formatted) {
    const div = document.createElement("div");

    if (ch === ",") {
      div.className = "comma";
      div.textContent = ",";
      board.appendChild(div);

      slots.push({
        type: "comma",
        el: div
      });
    } else {
      div.className = "digit";
      div.textContent = "0";
      board.appendChild(div);

      slots.push({
        type: "digit",
        el: div,
        value: 0,
        target: 0,
        locked: false
      });
    }
  }
}

/* ---------------------------------
   入力と表示を同期
--------------------------------- */
function ensureDisplayMatchesInput() {
  const value = input.value.replace(/[^0-9]/g, "") || "0";

  const currentLength = slots.filter(s => s.type === "digit").length;
  const newLength = value.length;

  if (currentLength !== newLength) {
    buildSlots(value);
  }

  return value;
}

/* ---------------------------------
   数字の見た目更新
--------------------------------- */
function setDigitVisual(slot, value, animate = false, duration = 200) {
  slot.value = value;
  slot.el.textContent = value;

  if (animate) {
    slot.el.style.transition = `transform ${duration}ms ease-out`;
    slot.el.style.transform = "scale(1.3)";
    setTimeout(() => {
      slot.el.style.transform = "scale(1)";
    }, duration);
  }
}

/* ---------------------------------
   回転処理
--------------------------------- */
function tickSpin() {
  for (const slot of slots) {
    if (slot.type === "digit" && !slot.locked) {
      const next = Math.floor(Math.random() * 10);
      setDigitVisual(slot, next);
    }
  }
}

/* ---------------------------------
   回転開始
--------------------------------- */
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

  // 開示状態リセット
  revealIndex = -1;

  if (spinTimer) clearInterval(spinTimer);
  spinTimer = setInterval(tickSpin, 65);

  isSpinning = true;
  message.textContent = "数字を回転中…「開示する」で一桁ずつ確定します";
}

/* ---------------------------------
   1回押すごとに1桁だけ開示
--------------------------------- */
async function revealDigits() {
  if (isRevealing) return;

  const value = ensureDisplayMatchesInput();
  const formatted = Number(value).toLocaleString("ja-JP");

  const digitSlots = slots.filter((slot) => slot.type === "digit");
  const digits = formatted.replace(/,/g, "").split("");

  digitSlots.forEach((slot, i) => {
    slot.target = Number(digits[i]);
  });

  // 回ってなければ回す
  if (!isSpinning) {
    startSpin();
    await wait(250);
  }

  isRevealing = true;
  spinBtn.disabled = true;
  revealBtn.disabled = true;

  // 初回は一の位から
  if (revealIndex === -1) {
    revealIndex = digitSlots.length - 1;
  }

  // 全部終わってたら何もしない
  if (revealIndex < 0) {
    isRevealing = false;
    spinBtn.disabled = false;
    revealBtn.disabled = false;
    return;
  }

  const slot = digitSlots[revealIndex];
  const revealOrder = digitSlots.length - 1 - revealIndex;

  // この桁を止める
  slot.locked = true;

  const settleDuration = 260 + revealOrder * 140;
  setDigitVisual(slot, slot.target, true, settleDuration);

  await wait(260 + revealOrder * 180);

  // 次の桁へ
  revealIndex--;

  // 全部開示完了
  if (revealIndex < 0) {
    if (spinTimer) {
      clearInterval(spinTimer);
      spinTimer = null;
    }

    isSpinning = false;

    flash.classList.remove("play");
    void flash.offsetWidth;
    flash.classList.add("play");

    message.textContent = `参加人数 ${formatted} 人`;
  } else {
    message.textContent = "人数を開示中…「開示する」で次の桁を確定します";
  }

  isRevealing = false;
  spinBtn.disabled = false;
  revealBtn.disabled = false;
}

/* ---------------------------------
   待機用
--------------------------------- */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ---------------------------------
   イベント
--------------------------------- */
spinBtn.addEventListener("click", startSpin);
revealBtn.addEventListener("click", revealDigits);

/* ---------------------------------
   初期表示
--------------------------------- */
buildSlots(input.value || "0");
