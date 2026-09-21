const STORAGE_KEY = "dinner-slot-groups-v2";

const GROUP_META = {
  cuisine: {
    label: "料理",
    placeholder: "新增自訂料理，例如：港式",
    fallbackEmoji: "🏷️",
  },
  meal: {
    label: "餐點",
    placeholder: "新增自訂餐點，例如：鹽酥雞",
    fallbackEmoji: "⭐",
  },
  method: {
    label: "吃法",
    placeholder: "新增自訂吃法，例如：野餐",
    fallbackEmoji: "🛍️",
  },
};

const DEFAULT_GROUPS = {
  cuisine: [
    ["台式", "🍚"],
    ["日式", "🍣"],
    ["韓式", "🥘"],
    ["西式", "🍝"],
    ["東南亞", "🌶️"],
    ["鍋類", "🍲"],
    ["小吃", "🥟"],
    ["輕食", "🏷️"],
  ],
  meal: [
    ["木盆沙拉", "⭐"],
    ["牛肉麵", "🍜"],
    ["壽司", "🍣"],
    ["火鍋", "🍲"],
    ["咖哩飯", "🍛"],
    ["滷肉飯", "🍚"],
    ["義大利麵", "🍝"],
    ["水餃", "🥟"],
    ["便當", "🍱"],
    ["披薩", "🍕"],
  ],
  method: [
    ["內用", "🛍️"],
    ["外帶", "🥡"],
    ["外送", "🛵"],
    ["自己煮", "🍳"],
  ],
};

const EMOJI_RULES = [
  [/沙拉|輕食/, "🥗"],
  [/牛肉麵|拉麵|烏龍|麵/, "🍜"],
  [/壽司|生魚|日式/, "🍣"],
  [/火鍋|鍋|麻辣/, "🍲"],
  [/水餃|餃|小籠包|包子/, "🥟"],
  [/咖哩/, "🍛"],
  [/滷肉飯|便當|飯|丼/, "🍱"],
  [/義大利|西式/, "🍝"],
  [/韓式|韓國|泡菜/, "🥘"],
  [/鹽酥雞|炸雞|雞排/, "🍗"],
  [/披薩|比薩/, "🍕"],
  [/漢堡/, "🍔"],
  [/燒肉|烤肉/, "🥩"],
  [/海鮮|蝦|魚/, "🦐"],
  [/台式|小吃/, "🍚"],
  [/東南亞|泰式|越式/, "🌶️"],
  [/內用/, "🛍️"],
  [/外帶/, "🥡"],
  [/外送/, "🛵"],
  [/自煮|自己煮|料理/, "🍳"],
];

const els = {
  machine: document.querySelector("#slot-machine"),
  spinButton: document.querySelector("#spin-button"),
  mealOnlyButton: document.querySelector("#meal-only-button"),
  lever: document.querySelector("#lever"),
  resultMain: document.querySelector("#result-main"),
  resultDetail: document.querySelector("#result-detail"),
  resultSummary: document.querySelector(".result-summary"),
  tabs: [...document.querySelectorAll(".category-tab")],
  tabPanel: document.querySelector("#options-content"),
  counts: [...document.querySelectorAll("[data-count]")],
  optionChips: document.querySelector("#option-chips"),
  addForm: document.querySelector("#add-option-form"),
  newOption: document.querySelector("#new-option"),
  formMessage: document.querySelector("#form-message"),
  resetButton: document.querySelector("#reset-button"),
  toast: document.querySelector("#toast"),
  reels: Object.fromEntries(
    [...document.querySelectorAll("[data-reel]")].map((reel) => [reel.dataset.reel, reel]),
  ),
};

let groups = loadGroups();
let activeGroup = "cuisine";
let isSpinning = false;
let toastTimer;
let currentResult = {
  cuisine: findInitialItem("cuisine", "輕食"),
  meal: findInitialItem("meal", "木盆沙拉"),
  method: findInitialItem("method", "內用"),
};

function createDefaultGroups() {
  return Object.fromEntries(
    Object.entries(DEFAULT_GROUPS).map(([groupKey, values]) => [
      groupKey,
      values.map(([label, emoji], index) => ({
        id: `${groupKey}-${index}`,
        label,
        emoji,
        selected: true,
        custom: false,
      })),
    ]),
  );
}

function loadGroups() {
  const defaults = createDefaultGroups();

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return defaults;

    for (const groupKey of Object.keys(GROUP_META)) {
      if (!Array.isArray(saved[groupKey]) || !saved[groupKey].length) return defaults;
      saved[groupKey] = saved[groupKey]
        .filter((item) => item && typeof item.label === "string")
        .map((item, index) => ({
          id: String(item.id || `${groupKey}-saved-${index}`),
          label: item.label.slice(0, 18),
          emoji: String(item.emoji || getEmoji(item.label, groupKey)),
          selected: item.selected !== false,
          custom: item.custom === true,
        }));

      if (!saved[groupKey].some((item) => item.selected)) saved[groupKey][0].selected = true;
    }

    return saved;
  } catch {
    return defaults;
  }
}

function saveGroups() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    showToast("目前無法儲存，但本次仍可繼續使用");
  }
}

function findInitialItem(groupKey, preferredLabel) {
  const selected = getSelectedItems(groupKey);
  return selected.find((item) => item.label === preferredLabel) || selected[0];
}

function getSelectedItems(groupKey) {
  return groups[groupKey].filter((item) => item.selected);
}

function getEmoji(label, groupKey) {
  const matched = EMOJI_RULES.find(([rule]) => rule.test(label));
  return matched?.[1] || GROUP_META[groupKey].fallbackEmoji;
}

function randomItem(groupKey, excludeId = "") {
  const selected = getSelectedItems(groupKey);
  const pool = selected.length > 1 ? selected.filter((item) => item.id !== excludeId) : selected;
  return pool[Math.floor(Math.random() * pool.length)];
}

function setReel(groupKey, item) {
  const reel = els.reels[groupKey];
  reel.querySelector(".reel-icon").textContent = item.emoji;
  reel.querySelector(".reel-value").textContent = item.label;
}

function updateResult() {
  els.resultMain.textContent = `★ ${currentResult.meal.label}`;
  els.resultDetail.textContent = `${currentResult.cuisine.label} · ${currentResult.method.label}`;
  els.resultSummary.classList.remove("is-celebrating");
  void els.resultSummary.offsetWidth;
  els.resultSummary.classList.add("is-celebrating");
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function animateReel(groupKey, winner, duration) {
  const reel = els.reels[groupKey];
  reel.classList.remove("has-landed");
  reel.classList.add("is-spinning");

  const ticker = window.setInterval(() => setReel(groupKey, randomItem(groupKey)), 72);
  await wait(duration);
  window.clearInterval(ticker);
  setReel(groupKey, winner);
  reel.classList.remove("is-spinning");
  reel.classList.add("has-landed");
}

function setControlsDisabled(disabled) {
  els.spinButton.disabled = disabled;
  els.mealOnlyButton.disabled = disabled;
  els.lever.disabled = disabled;
}

async function spin(groupKeys = ["cuisine", "meal", "method"]) {
  if (isSpinning) return;
  isSpinning = true;
  setControlsDisabled(true);
  els.machine.classList.add("is-spinning");
  els.lever.classList.remove("is-pulled");
  void els.lever.offsetWidth;
  els.lever.classList.add("is-pulled");

  const winners = Object.fromEntries(
    groupKeys.map((groupKey) => [groupKey, randomItem(groupKey, currentResult[groupKey]?.id)]),
  );

  await Promise.all(
    groupKeys.map((groupKey, index) =>
      animateReel(groupKey, winners[groupKey], 760 + index * 260),
    ),
  );

  groupKeys.forEach((groupKey) => {
    currentResult[groupKey] = winners[groupKey];
  });
  updateResult();
  els.machine.classList.remove("is-spinning");
  setControlsDisabled(false);
  isSpinning = false;
}

function renderTabs() {
  els.tabs.forEach((tab) => {
    const isActive = tab.dataset.group === activeGroup;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  els.counts.forEach((count) => {
    count.textContent = getSelectedItems(count.dataset.count).length;
  });

  els.tabPanel.setAttribute("aria-labelledby", `tab-${activeGroup}`);
  els.newOption.placeholder = GROUP_META[activeGroup].placeholder;
}

function renderOptions() {
  const chips = groups[activeGroup].map((item) => {
    const wrap = document.createElement("span");
    wrap.className = `option-chip-wrap${item.selected ? " is-selected" : ""}`;

    const toggle = document.createElement("button");
    toggle.className = "option-chip";
    toggle.type = "button";
    toggle.dataset.action = "toggle";
    toggle.dataset.id = item.id;
    toggle.setAttribute("aria-pressed", String(item.selected));
    toggle.textContent = `${item.emoji} ${item.label}`;

    wrap.append(toggle);

    if (item.custom) {
      const remove = document.createElement("button");
      remove.className = "remove-chip";
      remove.type = "button";
      remove.dataset.action = "remove";
      remove.dataset.id = item.id;
      remove.setAttribute("aria-label", `刪除自訂選項 ${item.label}`);
      remove.textContent = "×";
      wrap.append(remove);
    }

    return wrap;
  });

  els.optionChips.replaceChildren(...chips);
  renderTabs();
}

function toggleOption(id) {
  const item = groups[activeGroup].find((candidate) => candidate.id === id);
  if (!item) return;

  if (item.selected && getSelectedItems(activeGroup).length === 1) {
    showToast(`${GROUP_META[activeGroup].label}至少要保留 1 個選項`);
    return;
  }

  item.selected = !item.selected;
  saveGroups();
  renderOptions();
}

function removeOption(id) {
  const index = groups[activeGroup].findIndex((item) => item.id === id && item.custom);
  if (index < 0) return;

  const item = groups[activeGroup][index];
  if (item.selected && getSelectedItems(activeGroup).length === 1) {
    showToast(`${GROUP_META[activeGroup].label}至少要保留 1 個選項`);
    return;
  }

  groups[activeGroup].splice(index, 1);
  saveGroups();
  renderOptions();
  showToast(`已刪除「${item.label}」`);
}

function addOption(event) {
  event.preventDefault();
  const value = els.newOption.value.trim().replace(/\s+/g, " ");
  els.formMessage.textContent = "";

  if (!value) {
    els.formMessage.textContent = "先輸入一個選項吧。";
    els.newOption.focus();
    return;
  }

  const existing = groups[activeGroup].find(
    (item) => item.label.toLocaleLowerCase("zh-Hant") === value.toLocaleLowerCase("zh-Hant"),
  );
  if (existing) {
    existing.selected = true;
    saveGroups();
    renderOptions();
    els.formMessage.textContent = `「${value}」已經在清單裡，已幫你選取。`;
    els.newOption.select();
    return;
  }

  if (groups[activeGroup].length >= 30) {
    els.formMessage.textContent = "每一類最多可放 30 個選項。";
    return;
  }

  groups[activeGroup].push({
    id: `${activeGroup}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: value,
    emoji: getEmoji(value, activeGroup),
    selected: true,
    custom: true,
  });
  saveGroups();
  els.newOption.value = "";
  renderOptions();
  showToast(`已新增「${value}」`);
  els.newOption.focus();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2400);
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeGroup = tab.dataset.group;
    els.formMessage.textContent = "";
    els.newOption.value = "";
    renderOptions();
  });
});

els.optionChips.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-action]");
  if (!target) return;
  if (target.dataset.action === "toggle") toggleOption(target.dataset.id);
  if (target.dataset.action === "remove") removeOption(target.dataset.id);
});

els.addForm.addEventListener("submit", addOption);
els.spinButton.addEventListener("click", () => spin());
els.lever.addEventListener("click", () => spin());
els.mealOnlyButton.addEventListener("click", () => spin(["meal"]));
els.resetButton.addEventListener("click", () => {
  groups = createDefaultGroups();
  saveGroups();
  renderOptions();
  showToast("已恢復所有預設選項");
});

Object.entries(currentResult).forEach(([groupKey, item]) => setReel(groupKey, item));
updateResult();
renderOptions();
