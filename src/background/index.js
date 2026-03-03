const GEMINI_URL = "https://gemini.google.com/";
const GEMINI_ORIGIN = "https://gemini.google.com";
const DEFAULT_OPTIONS = {
  showButton: true,
  autoInject: true
};

async function getOptions() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
      resolve(items);
    });
  });
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function injectUrlIntoGemini(tabId, url) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (value) => {
      const candidateSelectors = [
        "textarea",
        "input[type='text']",
        "[contenteditable='true']"
      ];
      let input = null;
      for (const selector of candidateSelectors) {
        input = document.querySelector(selector);
        if (input) break;
      }
      if (!input) return;

      const setValue = () => {
        if (input.isContentEditable) {
          input.focus();
          input.textContent = value;
        } else {
          input.focus();
          input.value = value;
        }
        const event = new Event("input", { bubbles: true });
        input.dispatchEvent(event);
      };

      const clickSendIfReady = () => {
        const sendButtonSelectors = [
          "button[aria-label*='Send']",
          "button[aria-label*='전송']",
          "button[data-testid='send-button']",
          "button[type='submit']"
        ];
        let button = null;
        for (const selector of sendButtonSelectors) {
          button = document.querySelector(selector);
          if (button) break;
        }
        if (button && !button.disabled) {
          button.click();
          return true;
        }
        return false;
      };

      setValue();

      let attempts = 0;
      const maxAttempts = 12;
      const timer = setInterval(() => {
        attempts += 1;
        if (clickSendIfReady() || attempts >= maxAttempts) {
          clearInterval(timer);
        }
      }, 250);
    },
    args: [url]
  });
}

async function findNewestGeminiTab() {
  const tabs = await chrome.tabs.query({
    url: `${GEMINI_ORIGIN}/*`
  });
  if (tabs.length === 0) return null;
  const sorted = tabs.sort((a, b) => (b.id || 0) - (a.id || 0));
  return sorted[0].id;
}

async function waitForGeminiTabAndInject(url, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const tabId = await findNewestGeminiTab();
    if (tabId) {
      await waitForTabComplete(tabId);
      const { autoInject } = await getOptions();
      if (autoInject && url) {
        await injectUrlIntoGemini(tabId, url);
      }
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function handleOpenGemini(sourceTab) {
  const url = sourceTab?.url;
  await waitForGeminiTabAndInject(url);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "OPEN_GEMINI") return;
  handleOpenGemini(sender.tab || { url: message.url });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-gemini") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const { autoInject } = await getOptions();
  const geminiTab = await chrome.tabs.create({
    url: GEMINI_URL,
    active: true
  });
  if (autoInject && tab.url) {
    await waitForTabComplete(geminiTab.id);
    await injectUrlIntoGemini(geminiTab.id, tab.url);
  }
});
