const nameInput = document.getElementById("name");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function getOrCreateFolder(parentId, folderTitle) {
  // Search only under the Bookmarks Bar by default (id "1" on most Chrome profiles).
  // If you prefer "Other bookmarks", use "2".
  const children = await chrome.bookmarks.getChildren(parentId);
  const existing = children.find(
    (n) => !n.url && n.title.trim() === folderTitle.trim()
  );
  if (existing) return existing;

  return await chrome.bookmarks.create({
    parentId,
    title: folderTitle.trim()
  });
}

async function saveTabsToBookmarks() {
  const folderTitle = nameInput.value.trim();
  if (!folderTitle) {
    setStatus("Please enter a folder name.");
    return;
  }

  setStatus("Reading tabs...");

  // Current window tabs
  const tabs = await chrome.tabs.query({ currentWindow: true });

  // Optional: ignore chrome:// and edge:// pages (can’t be bookmarked reliably)
  const normalTabs = tabs.filter(
    (t) => t.url && !t.url.startsWith("chrome://") && !t.url.startsWith("edge://")
  );

  // Choose where to put the folder:
  // "1" = Bookmarks Bar, "2" = Other Bookmarks (most Chrome profiles)
  const parentId = "1";

  const folder = await getOrCreateFolder(parentId, folderTitle);

  // Create bookmarks inside folder
  let created = 0;
  for (const t of normalTabs) {
    await chrome.bookmarks.create({
      parentId: folder.id,
      title: t.title || t.url,
      url: t.url
    });
    created++;
  }

  setStatus(`Saved ${created} tabs into folder: "${folder.title}".`);
}

saveBtn.addEventListener("click", () => {
  saveTabsToBookmarks().catch((err) => {
    console.error(err);
    setStatus("Error: " + (err?.message || String(err)));
  });
});

// Enter key triggers save
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});