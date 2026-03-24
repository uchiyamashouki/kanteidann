// HTML上の各部品を取得する
const priceInput = document.getElementById("priceInput");
const spinBtn = document.getElementById("spinBtn");
const revealBtn = document.getElementById("revealBtn");
const display = document.getElementById("display");
const message = document.getElementById("message");
const flash = document.getElementById("flash");
const lights = document.getElementById("lights");

// 表示中の桁やカンマなどをまとめて保持する配列
let slots = [];

// 回転用の setInterval のID
let spinTimer = null;

// 今回転中かどうか
let isSpinning = false;

// 今、開示演出中かどうか
let isRevealing = false;

/* ---------------------------------
   舞台の周りの電球を作る
--------------------------------- */
function buildLights() {
  const bulbs = [];
  const count = 28; // 電球の数

  for (let i = 0; i < count; i++) {
    const bulb = document.createElement("div");
    bulb.className = "bulb";

    // 電球ごとにアニメーション開始タイミングを少しずらす
    bulb.style.animationDelay = `${(i % 7) * 0.08}s`;

    let x, y;

    // 上辺に並べる
    if (i < 8) {
      x = 8 + (i / 7) * 84;
      y = 4;

    // 右辺に並べる
    } else if (i < 14) {
      x = 94;
      y = 8 + (i - 8) * 14;

    // 下辺に並べる
    } else if (i < 22) {
      x = 92 - (i - 14) * 11;
      y = 92;

    // 左辺に並べる
    } else {
      x = 4;
      y = 88 - (i - 22) * 14;
    }

    bulb.style.left = `${x}%`;
    bulb.style.top = `${y}%`;
    bulbs.push(bulb);
  }

  // まとめて lights の中へ入れる
  lights.replaceChildren(...bulbs);
}

/* ---------------------------------
   入力値を 0 ～ 9,999,999 に収める
--------------------------------- */
function clampValue() {
  const value = Math.max(0, Math.min(9999999, Math.floor(Number(priceInput.value) || 0)));

  // 補正後の値を input に戻して表示も揃える
  priceInput.value = value;
  return value;
}

/* ---------------------------------
   1桁分の表示枠を作る
   中には 0〜9 を何周分も縦に並べる
--------------------------------- */
function createDigitStrip(initialDigit = 0) {
  const digit = document.createElement("div");
  digit.className = "digit";

  // 数字が縦に並ぶ帯
  const strip = document.createElement("div");
  strip.className = "strip";

  // 0〜9 を24回繰り返して縦に並べる
  // これを上下に動かして回転風に見せる
  for (let loop = 0; loop < 24; loop++) {
    for (let n = 0; n <= 9; n++) {
      const item = document.createElement("div");
      item.className = "num";
      item.textContent = n;
      strip.appendChild(item);
    }
  }

  // 数字の中央位置を見やすくするためのガイドレイヤー
  const windowLayer = document.createElement("div");
  windowLayer.className = "digit-window";

  const centerGuide = document.createElement("div");
  centerGuide.className = "digit-center-guide";
  windowLayer.appendChild(centerGuide);

  digit.appendChild(strip);
  digit.appendChild(windowLayer);

  // 各桁の状態も一緒に返す
  return {
    type: "digit",     // このslotは数字の桁
    el: digit,         // 実際のHTML要素
    strip,             // 上下に動かす帯
    index: initialDigit, // 今表示中の数字
    locked: false,     // trueなら回転停止
    target: initialDigit, // 最終的に止めたい数字
  };
}

/* ---------------------------------
   カンマを作る
--------------------------------- */
function createComma() {
  const comma = document.createElement("div");
  comma.className = "comma show";
  comma.textContent = ",";
  return { type: "comma", el: comma };
}

/* ---------------------------------
   単位「人」を作る
--------------------------------- */
function createUnit() {
  const unit = document.createElement("div");
  unit.className = "unit show";
  unit.textContent = "人";
  return { type: "unit", el: unit };
}

/* ---------------------------------
   指定した桁に、指定した数字が見えるように
   strip の位置を動かす
--------------------------------- */
function setDigitVisual(slot, digitValue, animate = false, duration = 160) {
  // 1つの数字ブロックの高さを取得
  const digitHeight = slot.el.clientHeight;

  // 今の数字状態を更新
  slot.index = digitValue;

  // アニメーションあり / なし を切り替える
  slot.strip.style.transition = animate
    ? `transform ${duration}ms cubic-bezier(.17,.89,.32,1.18)`
    : "none";

  // 何周もしている中の真ん中あたりを使う
  // 端の方を使うと見た目が不自然になるため
  const baseLoop = 12;

  // 目的の数字の位置まで上にずらす量を計算
  const pos = (baseLoop * 10 + digitValue) * digitHeight;

  // strip を上方向に移動させる
  slot.strip.style.transform = `translateY(-${pos}px)`;
}

/* ---------------------------------
   入力された値から表示全体を作り直す
--------------------------------- */
function buildDisplayFromValue(value) {
  const formatted = Number(value).toLocaleString("ja-JP"); // 例: 12345 -> "12,345"

  display.innerHTML = "";
  slots = [];

  // 数字全体を囲う背景枠
  const digitStage = document.createElement("div");
  digitStage.className = "digit-stage";

  // 文字ごとに部品を作る
  for (const ch of formatted) {
    if (/\d/.test(ch)) {
      // 数字なら桁を作る
      const slot = createDigitStrip(Number(ch));
      slots.push(slot);
      digitStage.appendChild(slot.el);

    } else if (ch === ",") {
      // カンマならカンマを作る
      const slot = createComma();
      slots.push(slot);
      digitStage.appendChild(slot.el);
    }
  }

  // 最後に単位「人」を追加
  const unit = createUnit();
  slots.push(unit);
  digitStage.appendChild(unit.el);

  // 全体を display に追加
  display.appendChild(digitStage);

  // DOM配置後でないと高さが取れないので、
  // 次の描画タイミングで各桁の位置を合わせる
  requestAnimationFrame(() => {
    slots.forEach((slot) => {
      if (slot.type === "digit") {
        setDigitVisual(slot, slot.index, false);
      }
    });
  });
}

/* ---------------------------------
   入力欄の内容と表示桁数が合っているか確認し、
   必要なら表示を作り直す
--------------------------------- */
function ensureDisplayMatchesInput() {
  const value = clampValue();
  const formattedLength = Number(value).toLocaleString("ja-JP").length;

  // unit 以外の要素数で現在の表示長を確認
  const currentLength = slots.filter((s) => s.type !== "unit").length;

  // 初回や桁数変化時は作り直す
  if (!slots.length || formattedLength !== currentLength) {
    buildDisplayFromValue(value);
  }

  return value;
}

/* ---------------------------------
   回転中の1コマ分だけ数字を進める
--------------------------------- */
function tickSpin() {
  slots.forEach((slot) => {
    // 数字以外、またはロック済みは処理しない
    if (slot.type !== "digit" || slot.locked) return;

    // 0〜9をループさせる
    const next = (slot.index + 1) % 10;
    setDigitVisual(slot, next, false);
  });
}

/* ---------------------------------
   回転開始
--------------------------------- */
function startSpin() {
  // 開示中は回転開始しない
  if (isRevealing) return;

  const value = ensureDisplayMatchesInput();
  const formatted = Number(value).toLocaleString("ja-JP");
  let digitPtr = 0;

  // 各桁の target（最終的に止めたい数字）をセット
  for (const ch of formatted) {
    if (/\d/.test(ch)) {
      // slots の中から次の digit を探す
      while (slots[digitPtr] && slots[digitPtr].type !== "digit") {
        digitPtr++;
      }

      if (slots[digitPtr]) {
        slots[digitPtr].locked = false;          // 回転可能にする
        slots[digitPtr].target = Number(ch);     // 目標数字を保存
        digitPtr++;
      }
    }
  }

  // すでにタイマーがあれば一旦消す
  if (spinTimer) clearInterval(spinTimer);

  // 65msごとに1コマ進める
  spinTimer = setInterval(tickSpin, 65);
  isSpinning = true;
  message.textContent = "数字を回転中…「開示する」で確定します";
}

/* ---------------------------------
   一の位から順に数字を止める
--------------------------------- */
async function revealDigits() {
  // すでに開示中なら何もしない
  if (isRevealing) return;

  const value = ensureDisplayMatchesInput();
  const formatted = Number(value).toLocaleString("ja-JP");

  // 数字の桁だけを取り出す
  const digitSlots = slots.filter((slot) => slot.type === "digit");

  // カンマを除いた数字列
  const digits = formatted.replace(/,/g, "").split("");

  // 各桁の最終停止数字を設定
  digitSlots.forEach((slot, i) => {
    slot.target = Number(digits[i]);
  });

  // 回転していない状態で開示ボタンを押したら
  // 少しだけ回してから止める
  if (!isSpinning) {
    startSpin();
    await wait(250);
  }

  isRevealing = true;
  spinBtn.disabled = true;
  revealBtn.disabled = true;
  message.textContent = "人数を開示中…";

  // 右端（一の位）から順に止める
  for (let i = digitSlots.length - 1, revealOrder = 0; i >= 0; i--, revealOrder++) {
    const slot = digitSlots[i];

    // この桁をロックして以降回さない
    slot.locked = true;

    // 左の桁ほどゆっくり止まるように時間を増やす
    const settleDuration = 260 + revealOrder * 140;

    // 最終数字に向けて止める
    setDigitVisual(slot, slot.target, true, settleDuration);

    // 次の桁を止める前に少し待つ
    await wait(260 + revealOrder * 180);
  }

  // 回転終了
  if (spinTimer) {
    clearInterval(spinTimer);
    spinTimer = null;
  }

  isSpinning = false;
  isRevealing = false;
  spinBtn.disabled = false;
  revealBtn.disabled = false;

  // フラッシュ演出を再生し直す
  flash.classList.remove("play");
  void flash.offsetWidth; // 再描画を挟んでアニメ再生を確実にする
  flash.classList.add("play");

  // 最終表示メッセージ
  message.textContent = `参加人数 ${formatted} 人`;
}

/* ---------------------------------
   指定時間待つための補助関数
--------------------------------- */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------------------------------
   ボタン操作
--------------------------------- */

// 「回転する」ボタン
spinBtn.addEventListener("click", startSpin);

// 「開示する」ボタン
revealBtn.addEventListener("click", revealDigits);

/* ---------------------------------
   入力値が変わったとき
   回転中・開示中でなければ即時反映
--------------------------------- */
priceInput.addEventListener("input", () => {
  if (!isSpinning && !isRevealing) {
    buildDisplayFromValue(clampValue());
  }
});

/* ---------------------------------
   キーボード操作
   Enter       -> 開示
   Shift+Enter -> 回転
--------------------------------- */
priceInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    startSpin();
  } else if (e.key === "Enter") {
    e.preventDefault();
    revealDigits();
  }
});

/* ---------------------------------
   初期表示
--------------------------------- */

// 電球を作る
buildLights();

// 初期値を表示する
buildDisplayFromValue(clampValue());
