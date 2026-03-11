const nameInput = document.getElementById("name");
const limitInput = document.getElementById("limit");
const closeAfterInput = document.getElementById("closeAfter");

const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function getOrCreateFolder(parentId, folderTitle) {
  const children = await chrome.bookmarks.getChildren(parentId);
  const existing = children.find((n) => !n.url && n.title.trim() === folderTitle.trim());
  if (existing) return existing;

  return await chrome.bookmarks.create({
    parentId,
    title: folderTitle.trim()
  });
}

function isSkippableUrl(url) {
  return (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://")
  );
}

async function saveTabsToBookmarks() {
  const folderTitle = nameInput.value.trim();
  if (!folderTitle) {
    setStatus("Please enter a folder name.");
    return;
  }

  const rawLimit = limitInput.value.trim();
  const limit = rawLimit ? Number(rawLimit) : null;

  if (limit !== null && (!Number.isFinite(limit) || limit <= 0)) {
    setStatus("Max tabs must be a positive number (or blank).");
    return;
  }

  const closeAfter = closeAfterInput.checked;

  setStatus("Reading tabs...");

  // Tabs in current window
  let tabs = await chrome.tabs.query({ currentWindow: true });

  // Sort left -> right (tab strip order)
  tabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  // Remove internal/non-bookmarkable pages
  tabs = tabs.filter((t) => t.url && !isSkippableUrl(t.url));

  // Leftmost N
  if (limit !== null) {
    tabs = tabs.slice(0, limit);
  }

  if (tabs.length === 0) {
    setStatus("No bookmarkable tabs found.");
    return;
  }

  // Where to put the folder: "1" = Bookmarks Bar, "2" = Other Bookmarks
  const parentId = "1";
  const folder = await getOrCreateFolder(parentId, folderTitle);

  setStatus(`Saving ${tabs.length} tab(s)...`);

  const toCloseIds = [];
  for (const t of tabs) {
    await chrome.bookmarks.create({
      parentId: folder.id,
      title: t.title || t.url,
      url: t.url
    });

    if (closeAfter && typeof t.id === "number") {
      toCloseIds.push(t.id);
    }
  }

  if (closeAfter && toCloseIds.length > 0) {
    await chrome.tabs.remove(toCloseIds);
  }

  setStatus(
    `Saved ${tabs.length} tab(s) into "${folder.title}"` +
      (closeAfter ? " and closed them." : ".")
  );
}

saveBtn.addEventListener("click", () => {
  saveTabsToBookmarks().catch((err) => {
    console.error(err);
    setStatus("Error: " + (err?.message || String(err)));
  });
});

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});