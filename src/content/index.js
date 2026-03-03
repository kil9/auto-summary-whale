const GEMINI_URL = "https://gemini.google.com/";
const DEFAULT_OPTIONS = {
  showButton: true
};

const BUTTON_ID = "auto-summary-whale-button";
let observer = null;

function getTitleElement() {
  return (
    document.querySelector("ytd-watch-metadata h1") ||
    document.querySelector("#title h1")
  );
}

function insertAfter(target, node) {
  const parent = target.parentNode;
  if (!parent) return;
  if (target.nextSibling) {
    parent.insertBefore(node, target.nextSibling);
  } else {
    parent.appendChild(node);
  }
}

function createButton() {
  if (document.getElementById(BUTTON_ID)) return true;

  const titleElement = getTitleElement();
  if (!titleElement) return false;

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.textContent = "Gemini";
  button.style.marginLeft = "8px";
  button.style.padding = "4px 10px";
  button.style.borderRadius = "999px";
  button.style.border = "1px solid #e1e3e6";
  button.style.background = "#ffffff";
  button.style.color = "#111111";
  button.style.fontSize = "12px";
  button.style.cursor = "pointer";
  button.style.verticalAlign = "middle";

  button.addEventListener("click", () => {
    window.open(GEMINI_URL, "_blank", "whale-space");
    chrome.runtime.sendMessage({
      type: "OPEN_GEMINI",
      url: window.location.href
    });
  });

  insertAfter(titleElement, button);
  return true;
}

function removeButton() {
  const button = document.getElementById(BUTTON_ID);
  if (button) button.remove();
}

function startObserver() {
  if (observer || !document.body) return;
  observer = new MutationObserver(() => {
    if (document.getElementById(BUTTON_ID)) return;
    createButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (!observer) return;
  observer.disconnect();
  observer = null;
}

function updateButtonVisibility(showButton) {
  if (showButton) {
    const created = createButton();
    if (!created) startObserver();
  } else {
    removeButton();
    stopObserver();
  }
}

function init() {
  chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
    updateButtonVisibility(items.showButton);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.showButton) return;
    updateButtonVisibility(changes.showButton.newValue);
  });

  document.addEventListener("yt-navigate-finish", () => {
    if (document.getElementById(BUTTON_ID)) return;
    chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
      if (items.showButton) updateButtonVisibility(true);
    });
  });
}

init();
