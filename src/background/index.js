const GEMINI_URL = "https://gemini.google.com/";
const LOG_PREFIX = "[auto-summary-whale/bg]";
const DEFAULT_OPTIONS = {
  showButton: true,
  autoInject: true
};

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

function warn(...args) {
  console.warn(LOG_PREFIX, ...args);
}

function toTabSummary(tab) {
  if (!tab) return null;
  return {
    id: tab.id,
    windowId: tab.windowId,
    active: tab.active,
    status: tab.status,
    url: tab.url
  };
}

async function getOptions() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
      resolve(items);
    });
  });
}

async function waitForTabComplete(tabId) {
  if (!tabId) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.status === "complete") return;
  } catch {
    return;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === "complete") {
        finish();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(finish, 10000);
  });
}

async function injectUrlIntoGemini(tabId, url) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (value) => {
        const candidateSelectors = [
          "textarea",
          "input[type='text']",
          "[contenteditable='true']"
        ];
        const sendButtonSelectors = [
          "button[aria-label*='Send']",
          "button[aria-label*='전송']",
          "button[data-testid='send-button']",
          "button[type='submit']"
        ];
        let input = null;
        let matchedInputSelector = null;
        for (const selector of candidateSelectors) {
          input = document.querySelector(selector);
          if (input) {
            matchedInputSelector = selector;
            break;
          }
        }
        if (!input) {
          return {
            ok: false,
            stage: "find_input",
            reason: "input_not_found",
            locationHref: location.href,
            readyState: document.readyState
          };
        }

        const setNativeValue = (element, nextValue) => {
          const proto = element.tagName === "TEXTAREA"
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
          const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
          if (descriptor?.set) {
            descriptor.set.call(element, nextValue);
          } else {
            element.value = nextValue;
          }
        };

        input.focus();
        if (input.isContentEditable) {
          input.textContent = value;
        } else {
          setNativeValue(input, value);
        }
        if (typeof InputEvent === "function") {
          input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
        } else {
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        input.dispatchEvent(new Event("change", { bubbles: true }));

        for (let attempt = 1; attempt <= 12; attempt += 1) {
          let button = null;
          let matchedButtonSelector = null;
          for (const selector of sendButtonSelectors) {
            button = document.querySelector(selector);
            if (button) {
              matchedButtonSelector = selector;
              break;
            }
          }
          if (button && !button.disabled) {
            button.click();
            return {
              ok: true,
              stage: "send_clicked",
              attempt,
              matchedInputSelector,
              matchedButtonSelector,
              locationHref: location.href,
              readyState: document.readyState
            };
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        const pressEnter = () => {
          input.focus();
          const keydown = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          input.dispatchEvent(keydown);
          const keyup = new KeyboardEvent("keyup", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          input.dispatchEvent(keyup);
        };

        pressEnter();

        return {
          ok: true,
          stage: "enter_fallback",
          reason: "send_button_not_clickable_used_enter",
          matchedInputSelector,
          locationHref: location.href,
          readyState: document.readyState
        };
      },
      args: [url]
    });
    const result = results?.[0]?.result || null;
    log("injectUrlIntoGemini result", { tabId, result });
    return result;
  } catch (error) {
    warn("injectUrlIntoGemini executeScript failed", {
      tabId,
      error: String(error)
    });
    return {
      ok: false,
      stage: "execute_script",
      reason: "execute_script_failed",
      error: String(error)
    };
  }
}

async function openGeminiInNewTabAndInject(url) {
  const geminiTab = await chrome.tabs.create({
    url: GEMINI_URL,
    active: true
  });
  if (!geminiTab?.id) {
    warn("failed to create Gemini tab");
    return;
  }
  log("Gemini tab created", { tab: toTabSummary(geminiTab) });
  await waitForTabComplete(geminiTab.id);
  const { autoInject } = await getOptions();
  log("autoInject option", { autoInject, hasUrl: Boolean(url) });
  if (autoInject && url) {
    await injectUrlIntoGemini(geminiTab.id, url);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "OPEN_GEMINI") return;
  const sourceUrl = sender?.tab?.url || message?.url || "";
  log("OPEN_GEMINI message received", {
    sourceUrl,
    senderTab: toTabSummary(sender?.tab)
  });
  sendResponse({ accepted: true });
  openGeminiInNewTabAndInject(sourceUrl).catch((error) => {
    warn("OPEN_GEMINI flow failed", String(error));
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-gemini") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  await openGeminiInNewTabAndInject(tab.url);
});
