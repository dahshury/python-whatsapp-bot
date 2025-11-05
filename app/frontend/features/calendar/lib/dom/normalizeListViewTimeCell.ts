/**
 * Normalize FullCalendar list view time cell into structured spans.
 */

const TEXT_NODE_TYPE = 3;
const TIME_RANGE_SEPARATOR_REGEX = /\s*[–—-]\s*/;
const TIME_RANGE_TEST_REGEX = /[–—-]/;

export function normalizeListViewTimeCell(rowEl: HTMLElement | null) {
  if (!rowEl) {
    return;
  }
  const timeCell = rowEl.querySelector(
    ".fc-list-event-time"
  ) as HTMLElement | null;
  if (!timeCell) {
    return;
  }

  // Clean up any stray text nodes that FullCalendar might have added
  const cleanupTextNodes = () => {
    for (const node of Array.from(timeCell.childNodes)) {
      if (node.nodeType === TEXT_NODE_TYPE) {
        const text = (node.textContent || "").trim();
        if (text) {
          timeCell.removeChild(node);
        }
      }
    }
  };

  // Skip if already structured to prevent duplicate processing
  if (timeCell.getAttribute("data-structured") === "true") {
    cleanupTextNodes();
    return;
  }

  // Get raw time: ALWAYS prefer data-raw-time attribute if it exists
  // Only read textContent if data-raw-time is not set (to avoid reading from existing spans)
  const rawFromAttr = (timeCell.getAttribute("data-raw-time") || "").trim();
  let raw = rawFromAttr;

  // Only read textContent if we don't have a stored raw time
  // This prevents reading from already-structured content
  if (!raw) {
    // Clear any existing content first to get clean textContent
    const existingContent = timeCell.textContent || "";
    raw = existingContent.trim();
  }

  let startText = raw;
  let endText = "";
  let sep = "";
  if (TIME_RANGE_TEST_REGEX.test(raw)) {
    const parts = raw.split(TIME_RANGE_SEPARATOR_REGEX);
    startText = (parts[0] || "").trim();
    endText = (parts[1] || "").trim();
    sep = endText ? " - " : "";
  }

  const hasEndTime = Boolean(endText);
  const rangeText = hasEndTime ? `${startText}${sep}${endText}` : startText;

  while (timeCell.firstChild) {
    timeCell.removeChild(timeCell.firstChild);
  }
  const startSpan = document.createElement("span");
  startSpan.className = "fc-event-time-start";
  startSpan.textContent = startText;
  timeCell.appendChild(startSpan);
  if (hasEndTime) {
    const rangeSpan = document.createElement("span");
    rangeSpan.className = "fc-event-time-range";
    rangeSpan.textContent = rangeText;
    timeCell.appendChild(rangeSpan);
  }

  timeCell.style.whiteSpace = "nowrap";
  timeCell.setAttribute("data-raw-time", raw);
  timeCell.setAttribute("data-structured", "true");
  timeCell.setAttribute("data-has-end-time", hasEndTime ? "true" : "false");

  // Cleanup stray raw text nodes that can appear through updates
  cleanupTextNodes();

  // Set up MutationObserver to watch for FullCalendar updates and clean up text nodes
  if (!timeCell.hasAttribute("data-observer-attached")) {
    timeCell.setAttribute("data-observer-attached", "true");
    let isCleaning = false;
    const observer = new MutationObserver(() => {
      // Prevent infinite loops and only clean up if still structured
      if (isCleaning || timeCell.getAttribute("data-structured") !== "true") {
        return;
      }
      isCleaning = true;
      cleanupTextNodes();
      // Use requestAnimationFrame to reset the flag after mutations settle
      requestAnimationFrame(() => {
        isCleaning = false;
      });
    });
    observer.observe(timeCell, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    // Store observer reference so it doesn't get garbage collected
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (timeCell as unknown as Record<string, unknown>)._timeNormalizerObserver =
      observer;
  }
}
