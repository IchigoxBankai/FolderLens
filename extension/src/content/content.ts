// Content script for Product Finder image selection & extraction

let isSelectionMode = false;
let hoveredImg: HTMLImageElement | HTMLElement | null = null;
let bannerElem: HTMLDivElement | null = null;
let highlightElem: HTMLDivElement | null = null;
let dragElem: HTMLDivElement | null = null;

let isDragging = false;
let startX = 0;
let startY = 0;

// Initialize messaging listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_SELECTION_MODE') {
    startSelectionMode();
    sendResponse({ status: 'active' });
  } else if (message.type === 'CANCEL_SELECTION_MODE') {
    stopSelectionMode();
    sendResponse({ status: 'idle' });
  }
  return true;
});

function startSelectionMode() {
  if (isSelectionMode) return;
  isSelectionMode = true;

  createBanner();
  createHighlightBox();
  createDragBox();

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('mousedown', handleMouseDown, true);
  document.addEventListener('mouseup', handleMouseUp, true);
  document.addEventListener('keydown', handleKeyDown, true);
}

function stopSelectionMode() {
  if (!isSelectionMode) return;
  isSelectionMode = false;

  removeElem(bannerElem);
  removeElem(highlightElem);
  removeElem(dragElem);
  bannerElem = null;
  highlightElem = null;
  dragElem = null;
  hoveredImg = null;

  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('mousedown', handleMouseDown, true);
  document.removeEventListener('mouseup', handleMouseUp, true);
  document.removeEventListener('keydown', handleKeyDown, true);
}

function removeElem(elem: HTMLElement | null) {
  if (elem && elem.parentNode) {
    elem.parentNode.removeChild(elem);
  }
}

function createBanner() {
  removeElem(bannerElem);
  bannerElem = document.createElement('div');
  bannerElem.id = 'pf-selection-banner';
  bannerElem.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: #141512;
    color: #F5F1E7;
    padding: 8px 18px;
    border-radius: 9999px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: auto;
    border: 1px solid #34372D;
  `;
  bannerElem.innerHTML = `
    <span style="display: flex; align-items: center; gap: 8px;">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: #969F60; display: inline-block; box-shadow: 0 0 8px #969F60;"></span>
      <span><b>FOLDERLENS ACTIVE:</b> Left-click image or drag box to search</span>
    </span>
    <span style="font-size: 11px; opacity: 0.6; margin-left: 6px;">ESC to exit</span>
    <button id="pf-cancel-btn" style="
      background: #22251E;
      border: 1px solid #34372D;
      color: #F5F1E7;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    ">Done</button>
  `;
  document.body.appendChild(bannerElem);

  document.getElementById('pf-cancel-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    stopSelectionMode();
    chrome.runtime.sendMessage({ type: 'SELECTION_CANCELLED' });
  });
}

function createHighlightBox() {
  removeElem(highlightElem);
  highlightElem = document.createElement('div');
  highlightElem.id = 'pf-highlight-box';
  highlightElem.style.cssText = `
    position: absolute;
    z-index: 2147483645;
    pointer-events: none;
    border: 2px solid #969F60;
    background: rgba(150, 159, 96, 0.12);
    border-radius: 8px;
    box-shadow: 0 0 0 4px rgba(150, 159, 96, 0.15);
    transition: all 0.1s ease-out;
    display: none;
  `;
  document.body.appendChild(highlightElem);
}

function createDragBox() {
  removeElem(dragElem);
  dragElem = document.createElement('div');
  dragElem.id = 'pf-drag-box';
  dragElem.style.cssText = `
    position: absolute;
    z-index: 2147483646;
    pointer-events: none;
    border: 2px dashed #969F60;
    background: rgba(150, 159, 96, 0.15);
    border-radius: 6px;
    display: none;
  `;
  document.body.appendChild(dragElem);
}

function handleMouseMove(e: MouseEvent) {
  if (!isSelectionMode || isDragging) return;

  const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
  if (!target || target.closest('#pf-selection-banner')) return;

  const img = findImageElement(target);
  if (img) {
    hoveredImg = img;
    const rect = img.getBoundingClientRect();
    if (highlightElem) {
      highlightElem.style.display = 'block';
      highlightElem.style.top = `${rect.top + window.scrollY}px`;
      highlightElem.style.left = `${rect.left + window.scrollX}px`;
      highlightElem.style.width = `${rect.width}px`;
      highlightElem.style.height = `${rect.height}px`;
    }
  } else {
    hoveredImg = null;
    if (highlightElem) highlightElem.style.display = 'none';
  }
}

function findImageElement(elem: HTMLElement | null): HTMLElement | null {
  if (!elem) return null;

  // Check <img> directly or parent wrapper
  if (elem.tagName === 'IMG') return elem;
  const childImg = elem.querySelector('img');
  if (childImg) return childImg;

  // Check CSS background-image
  const bg = window.getComputedStyle(elem).backgroundImage;
  if (bg && bg !== 'none' && bg.includes('url(')) {
    return elem;
  }

  // Parent <img>
  const parentImg = elem.closest('img');
  if (parentImg) return parentImg;

  return null;
}

function handleMouseDown(e: MouseEvent) {
  if (!isSelectionMode) return;
  const target = e.target as HTMLElement;
  if (target && target.closest('#pf-selection-banner')) return;

  isDragging = true;
  startX = e.pageX;
  startY = e.pageY;

  if (dragElem) {
    dragElem.style.display = 'block';
    dragElem.style.left = `${startX}px`;
    dragElem.style.top = `${startY}px`;
    dragElem.style.width = '0px';
    dragElem.style.height = '0px';
  }
}

function handleMouseUp(e: MouseEvent) {
  if (!isSelectionMode || !isDragging) return;
  isDragging = false;

  const endX = e.pageX;
  const endY = e.pageY;
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  if (dragElem) dragElem.style.display = 'none';

  // If user performed a click without significant drag (under 10px movement)
  if (width < 10 && height < 10) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  // Try to find image enclosed within drag rectangle
  const rectLeft = Math.min(startX, endX);
  const rectTop = Math.min(startY, endY);

  const images = Array.from(document.querySelectorAll('img'));
  let matchedSrc: string | null = null;

  for (const img of images) {
    const box = img.getBoundingClientRect();
    const imgLeft = box.left + window.scrollX;
    const imgTop = box.top + window.scrollY;

    // Check overlap
    if (
      imgLeft >= rectLeft - 20 &&
      imgTop >= rectTop - 20 &&
      imgLeft + box.width <= rectLeft + width + 20 &&
      imgTop + box.height <= rectTop + height + 20
    ) {
      matchedSrc = extractSrcFromElement(img);
      break;
    }
  }

  if (matchedSrc) {
    sendSelectedImage(matchedSrc);
  } else {
    // Crop canvas fallback for region
    captureRegionCanvas(rectLeft, rectTop, width, height);
  }
}

function handleClick(e: MouseEvent) {
  if (!isSelectionMode) return;
  const target = e.target as HTMLElement;
  if (target && target.closest('#pf-selection-banner')) return;

  e.preventDefault();
  e.stopPropagation();

  const img = hoveredImg || findImageElement(target);
  if (img) {
    const src = extractSrcFromElement(img);
    if (src) {
      sendSelectedImage(src);
    }
  }
}

function extractSrcFromElement(elem: HTMLElement): string | null {
  if (elem instanceof HTMLImageElement) {
    return elem.currentSrc || elem.src || elem.getAttribute('srcset') || null;
  }
  const bg = window.getComputedStyle(elem).backgroundImage;
  if (bg && bg !== 'none') {
    const match = bg.match(/url\(["']?(.*?)["']?\)/);
    if (match && match[1]) return match[1];
  }
  const childImg = elem.querySelector('img');
  if (childImg) {
    return childImg.currentSrc || childImg.src || null;
  }
  return null;
}

function captureRegionCanvas(left: number, top: number, width: number, height: number) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(width, 50);
    canvas.height = Math.max(height, 50);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      sendSelectedImage(dataUrl);
    }
  } catch (err) {
    console.error('Canvas region capture error:', err);
  }
}

function sendSelectedImage(imageSource: string) {
  stopSelectionMode();
  chrome.runtime.sendMessage({
    type: 'IMAGE_SELECTED',
    payload: {
      imageSource
    }
  });
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    stopSelectionMode();
    chrome.runtime.sendMessage({ type: 'SELECTION_CANCELLED' });
  }
}
