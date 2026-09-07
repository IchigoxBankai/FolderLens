// Extension Background Service Worker (Manifest V3)

// Configure side panel behavior to open when extension action icon is clicked
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
  
  // Create Context Menu Item for image right-click
  try {
    chrome.contextMenus.create({
      id: 'search-folderlens-context',
      title: 'Search with FolderLens AI',
      contexts: ['image']
    });
  } catch (e) {
    console.log('Context menu creation note:', e);
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id && chrome.sidePanel && chrome.sidePanel.open) {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
      if (tab.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
      }
    });
  }
});

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'search-folderlens-context' && info.srcUrl && tab?.id) {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    }
    chrome.storage.local.set({ activeImage: info.srcUrl }, () => {
      chrome.runtime.sendMessage({
        type: 'SIDE_PANEL_IMAGE_READY',
        payload: { imageSource: info.srcUrl }
      }).catch(() => {});
    });
  }
});

// Relay messages between SidePanel and Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRIGGER_IMAGE_SELECTION') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'START_SELECTION_MODE' }, (res) => {
          if (chrome.runtime.lastError) {
            // Script might not be injected on page load, inject dynamically
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id! },
              files: ['src/content/content.js']
            }).then(() => {
              chrome.tabs.sendMessage(activeTab.id!, { type: 'START_SELECTION_MODE' }, (res2) => {
                sendResponse(res2 || { status: 'sent' });
              });
            }).catch((err) => {
              console.error('Script injection failed:', err);
              sendResponse({ status: 'injection_failed' });
            });
          } else {
            sendResponse(res || { status: 'sent' });
          }
        });
      } else {
        sendResponse({ status: 'no_active_tab' });
      }
    });
    return true;
  }

  if (message.type === 'CANCEL_IMAGE_SELECTION') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'CANCEL_SELECTION_MODE' });
      }
    });
    return true;
  }

  if (message.type === 'IMAGE_SELECTED') {
    chrome.storage.local.set({ activeImage: message.payload.imageSource }, () => {
      chrome.runtime.sendMessage({
        type: 'SIDE_PANEL_IMAGE_READY',
        payload: { imageSource: message.payload.imageSource }
      }).catch(() => {});
    });
    return true;
  }
});
