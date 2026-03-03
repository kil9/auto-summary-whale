const DEFAULT_OPTIONS = {
  showButton: true,
  autoInject: true
};

const showButton = document.getElementById("showButton");
const autoInject = document.getElementById("autoInject");

function loadOptions() {
  chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
    showButton.checked = Boolean(items.showButton);
    autoInject.checked = Boolean(items.autoInject);
  });
}

function saveOptions() {
  chrome.storage.sync.set({
    showButton: showButton.checked,
    autoInject: autoInject.checked
  });
}

showButton.addEventListener("change", saveOptions);
autoInject.addEventListener("change", saveOptions);

loadOptions();
