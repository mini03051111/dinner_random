const STORAGE_KEYS = {
  options: "dinner-slot-options-v1",
  history: "dinner-slot-history-v1",
};

const DEFAULT_OPTIONS = [
  "牛肉麵",
  "壽司",
  "火鍋",
  "水餃",
  "咖哩飯",
  "滷肉飯",
  "義大利麵",
  "韓式料理",
  "鹽酥雞",
  "便當",
  "披薩",
  "蔬食",
];

const EMOJI_RULES = [
  [/牛肉麵|麵|拉麵|烏龍/, "🍜"],
  [/壽司|生魚|日式/, "🍣"],
  [/火鍋|鍋|麻辣/, "🍲"],
  [/水餃|餃|小籠包|包子/, "🥟"],
  [/咖哩/, "🍛"],
  [/滷肉飯|便當|飯|丼/, "🍱"],
  [/義大利|義麵/, "🍝"],
  [/韓式|韓國|泡菜/, "🥘"],
  [/鹽酥雞|炸雞|雞排/, "🍗"],
  [/披薩|比薩/, "🍕"],
  [/蔬食|素食|沙拉/, "🥗"],
  [/漢堡/, "🍔"],
  [/燒肉|烤肉/, "🥩"],
  [/海鮮|蝦|魚/, "🦐"],
  [/粥/, "🥣"],
  [/早餐|蛋餅/, "🍳"],
];

const FALLBACK_EMOJIS = ["🍽️", "🥢", "🍚", "🥡", "🍴", "😋"];

const els = {
  slotMachine: document.querySelector("#slot-machine"),
  spinButton: document.querySelector("#spin-button"),
  lever: document.querySelector("#lever"),
  reels: [...document.querySelectorAll(".reel-window")],
  resultPanel: document.querySelector("#result-panel"),
  resultPrefix: document.querySelector("#result-prefix"),
  resultName: document.querySelector("#result-name"),
  resultActions: document.querySelector("#result-actions"),
  acceptButton: document.querySelector("#accept-button"),
  againButton: document.querySelector("#again-button"),
  optionsDialog: document.querySelector("#options-dialog"),
  optionsForm: document.querySelector("#options-form"),
  newOption: document.querySelector("#new-option"),
  addOptionButton: document.querySelector("#add-option-button"),
  optionList: document.querySelector("#option-list"),
  formMessage: document.querySelector("#form-message"),
  restoreButton: document.querySelector("#restore-button"),
  historyDialog: document.querySelector("#history-dialog"),
  historyList: document.querySelector("#history-list"),
  clearHistoryButton: document.querySelector("#clear-history-button"),
  toast: document.querySelector("#toast"),
};

let options = loadArray(STORAGE_KEYS.options, DEFAULT_OPTIONS);
let history = loadArray(STORAGE_KEYS.history, []);
let draftOptions = [...options];
let currentResult = null;
let isSpinning = false;
let toastTimer;

function loadArray(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) && parsed.length ? parsed : [...fallback];
  } catch {
    return [...fallback];
  }
}

function saveArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast("瀏覽器無法儲存資料，但這次仍可繼續使用");
  }
}

function getEmoji(label) {
  const matched = EMOJI_RULES.find(([rule]) => rule.test(label));
  if (matched) return matched[1];

  const hash = [...label].reduce((total, char) => total + char.charCodeAt(0), 0);
  return FALLBACK_EMOJIS[hash % FALLBACK_EMOJIS.length];
}

function randomOption(exclude = "") {
  const pool = options.length > 1 ? options.filter((item) => item !== exclude) : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

function setReelContent(reel, label) {
  reel.querySelector(".food-icon").textContent = getEmoji(label);
  reel.querySelector(".food-name").textContent = label;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function spin() {
  if (isSpinning || options.length < 2) return;

  isSpinning = true;
  currentResult = null;
  const winner = randomOption(els.resultName.textContent);
  els.spinButton.disabled = true;
  els.lever.disabled = true;
  els.spinButton.classList.add("is-pressed");
  els.lever.classList.remove("is-pulled");
  void els.lever.offsetWidth;
  els.lever.classList.add("is-pulled");
  els.slotMachine.classList.add("is-spinning");
  els.resultActions.hidden = true;
  els.resultPanel.classList.remove("is-celebrating");
  els.resultPrefix.textContent = "正在問命運…";
  els.resultName.textContent = "再等一下";

  els.reels.forEach((reel) => {
    reel.classList.remove("has-landed");
    reel.classList.add("is-spinning");
  });

  const tickers = els.reels.map((reel, index) =>
    window.setInterval(() => setReelContent(reel, randomOption()), 74 + index * 9),
  );

  for (let index = 0; index < els.reels.length; index += 1) {
    await wait(720 + index * 330);
    window.clearInterval(tickers[index]);
    const reel = els.reels[index];
    setReelContent(reel, winner);
    reel.classList.remove("is-spinning");
    reel.classList.add("has-landed");
  }

  await wait(340);
  currentResult = winner;
  els.resultPrefix.textContent = "今晚就吃：";
  els.resultName.textContent = winner;
  els.resultPanel.classList.add("is-celebrating");
  els.resultActions.hidden = false;
  els.slotMachine.classList.remove("is-spinning");
  els.spinButton.classList.remove("is-pressed");
  els.spinButton.disabled = false;
  els.lever.disabled = false;
  isSpinning = false;
  els.acceptButton.focus({ preventScroll: true });
}

function acceptResult() {
  if (!currentResult) return;

  history.unshift({
    name: currentResult,
    timestamp: new Date().toISOString(),
  });
  history = history.slice(0, 8);
  saveArray(STORAGE_KEYS.history, history);
  renderHistory();
  showToast(`好，今晚就吃「${currentResult}」！`);
  els.acceptButton.textContent = "已決定，開吃！";
  els.acceptButton.disabled = true;
}

function addDraftOption() {
  const value = els.newOption.value.trim().replace(/\s+/g, " ");
  els.formMessage.textContent = "";

  if (!value) {
    els.formMessage.textContent = "先輸入一個晚餐選項吧。";
    els.newOption.focus();
    return;
  }

  if (draftOptions.some((item) => item.toLowerCase() === value.toLowerCase())) {
    els.formMessage.textContent = "這個選項已經在清單裡了。";
    els.newOption.select();
    return;
  }

  if (draftOptions.length >= 24) {
    els.formMessage.textContent = "最多可放 24 個選項。";
    return;
  }

  draftOptions.push(value);
  els.newOption.value = "";
  renderOptions();
  els.newOption.focus();
}

function removeDraftOption(index) {
  if (draftOptions.length <= 2) {
    els.formMessage.textContent = "至少要保留 2 個選項。";
    return;
  }

  draftOptions.splice(index, 1);
  els.formMessage.textContent = "";
  renderOptions();
}

function renderOptions() {
  els.optionList.replaceChildren(
    ...draftOptions.map((option, index) => {
      const item = document.createElement("li");
      item.className = "option-item";

      const emoji = document.createElement("span");
      emoji.className = "option-emoji";
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = getEmoji(option);

      const label = document.createElement("span");
      label.className = "option-label";
      label.textContent = option;

      const remove = document.createElement("button");
      remove.className = "remove-option";
      remove.type = "button";
      remove.dataset.index = String(index);
      remove.setAttribute("aria-label", `移除 ${option}`);
      remove.textContent = "×";

      item.append(emoji, label, remove);
      return item;
    }),
  );
}

function saveOptions(event) {
  event.preventDefault();
  if (draftOptions.length < 2) {
    els.formMessage.textContent = "至少要保留 2 個選項。";
    return;
  }

  options = [...draftOptions];
  saveArray(STORAGE_KEYS.options, options);
  const startingItems = [options[0], options[1] || options[0], options[2] || options[0]];
  els.reels.forEach((reel, index) => setReelContent(reel, startingItems[index]));
  els.optionsDialog.close();
  showToast(`已儲存 ${options.length} 個晚餐選項`);
}

function renderHistory() {
  if (!history.length) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.innerHTML = "還沒有紀錄。<br>抽到喜歡的結果後，按下「就吃這個」吧！";
    els.historyList.replaceChildren(empty);
    els.clearHistoryButton.hidden = true;
    return;
  }

  els.clearHistoryButton.hidden = false;
  els.historyList.replaceChildren(
    ...history.map((entry, index) => {
      const item = document.createElement("li");
      item.className = "history-item";

      const rank = document.createElement("span");
      rank.className = "history-rank";
      rank.textContent = String(index + 1).padStart(2, "0");

      const emoji = document.createElement("span");
      emoji.className = "history-emoji";
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = getEmoji(entry.name);

      const label = document.createElement("span");
      label.className = "history-label";
      label.textContent = entry.name;

      const time = document.createElement("time");
      time.className = "history-time";
      time.dateTime = entry.timestamp;
      const date = new Date(entry.timestamp);
      time.textContent = Number.isNaN(date.getTime())
        ? ""
        : new Intl.DateTimeFormat("zh-TW", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(date);

      item.append(rank, emoji, label, time);
      return item;
    }),
  );
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
}

function openDialog(dialog) {
  if (dialog === els.optionsDialog) {
    draftOptions = [...options];
    els.formMessage.textContent = "";
    els.newOption.value = "";
    renderOptions();
  } else if (dialog === els.historyDialog) {
    renderHistory();
  }

  dialog.showModal();
}

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => openDialog(document.querySelector(`#${button.dataset.open}`)));
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

els.spinButton.addEventListener("click", spin);
els.lever.addEventListener("click", spin);
els.againButton.addEventListener("click", () => {
  els.acceptButton.disabled = false;
  els.acceptButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6"></path></svg>就吃這個';
  spin();
});
els.acceptButton.addEventListener("click", acceptResult);
els.addOptionButton.addEventListener("click", addDraftOption);
els.newOption.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addDraftOption();
  }
});
els.optionList.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-option");
  if (button) removeDraftOption(Number(button.dataset.index));
});
els.restoreButton.addEventListener("click", () => {
  draftOptions = [...DEFAULT_OPTIONS];
  els.formMessage.textContent = "已恢復預設，按儲存才會套用。";
  renderOptions();
});
els.optionsForm.addEventListener("submit", saveOptions);
els.clearHistoryButton.addEventListener("click", () => {
  history = [];
  try {
    localStorage.removeItem(STORAGE_KEYS.history);
  } catch {
    // Clearing the in-memory history still keeps the current session usable.
  }
  renderHistory();
  showToast("最近結果已清除");
});

const initialItems = [options[0], options[1] || options[0], options[2] || options[0]];
els.reels.forEach((reel, index) => setReelContent(reel, initialItems[index]));
renderHistory();
