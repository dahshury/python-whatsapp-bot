/**
 * Normalize FullCalendar list view time cell into structured spans.
 */

const TEXT_NODE_TYPE = 3;
const TIME_RANGE_SEPARATOR_REGEX = /\s*[–—-]\s*/;
const TIME_RANGE_TEST_REGEX = /[–—-]/;

// Type for DOM element with custom properties
type TimeCellElement = HTMLElement & {
  _renormalizeTimeout?: ReturnType<typeof setTimeout> | null;
};

export function normalizeListViewTimeCell(rowEl: HTMLElement | null) {
  if (!rowEl) {
    return;
  }
  const timeCell = rowEl.querySelector(
    ".fc-list-event-time"
  ) as TimeCellElement | null;
  if (!timeCell) {
    return;
  }

  // Clean up any stray text nodes that FullCalendar might have added
  const cleanupTextNodes = () => {
    const nodesToRemove: Node[] = [];
    for (const node of Array.from(timeCell.childNodes)) {
      if (node.nodeType === TEXT_NODE_TYPE) {
        const text = (node.textContent || "").trim();
        if (text) {
          nodesToRemove.push(node);
        }
      }
    }
    // Remove nodes after iterating to avoid mutation during iteration
    for (const node of nodesToRemove) {
      timeCell.removeChild(node);
    }
  };

  // Check if cell needs re-normalization (FullCalendar may have overwritten it)
  const isStructured = timeCell.getAttribute("data-structured") === "true";
  const hasStructuredSpans =
    timeCell.querySelector(".fc-event-time-start") !== null;

  // Get raw time: ALWAYS prefer data-raw-time attribute if it exists
  const rawFromAttr = (timeCell.getAttribute("data-raw-time") || "").trim();

  // Check current content BEFORE cleaning - we need to capture FullCalendar's text
  const currentTextContent = timeCell.textContent || "";
  const hasTextContent = currentTextContent.trim().length > 0;

  // If we have structured spans and they're valid, just clean up text nodes and return
  if (isStructured && hasStructuredSpans) {
    cleanupTextNodes();
    return;
  }

  // Determine raw time: prefer attribute, fall back to current text content
  const raw = rawFromAttr || (hasTextContent ? currentTextContent.trim() : "");

  // If we still don't have raw time, don't normalize (FullCalendar hasn't populated it yet)
  if (!raw?.trim()) {
    return;
  }

  // Now we can clean up text nodes since we've captured the content
  cleanupTextNodes();

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

  // Clear all existing content
  while (timeCell.firstChild) {
    timeCell.removeChild(timeCell.firstChild);
  }

  // Create structured spans
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
  if (hasEndTime) {
    timeCell.setAttribute("data-range-text", rangeText);
  }

  // Cleanup any stray text nodes that might have appeared
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

      // Check if FullCalendar has replaced our structured content
      const hasStructuredSpansNow =
        timeCell.querySelector(".fc-event-time-start") !== null;
      const textNodes = Array.from(timeCell.childNodes).filter(
        (node) =>
          node.nodeType === TEXT_NODE_TYPE && (node.textContent || "").trim()
      );
      const hasTextNodes = textNodes.length > 0;

      // If we lost our structured spans AND have text nodes, re-normalize
      // (Don't re-normalize if we just have text nodes but spans are still there)
      if (!hasStructuredSpansNow && hasTextNodes) {
        // Clear any pending re-normalization
        const storedTimeout = (
          timeCell as unknown as Record<
            string,
            ReturnType<typeof setTimeout> | null
          >
        )._renormalizeTimeout;
        if (storedTimeout) {
          clearTimeout(storedTimeout);
        }

        isCleaning = true;
        // Use setTimeout to allow FullCalendar's update to complete
        const renormalizeTimeout = setTimeout(() => {
          // Re-find the row element in case DOM changed
          const currentRow = timeCell.closest(
            ".fc-list-event"
          ) as HTMLElement | null;
          if (currentRow) {
            // Only normalize if we still don't have structured spans
            const stillNeedsNormalization = !timeCell.querySelector(
              ".fc-event-time-start"
            );
            if (stillNeedsNormalization) {
              normalizeListViewTimeCell(currentRow);
            }
          }
          isCleaning = false;
          timeCell._renormalizeTimeout = null;
        }, 0);
        // Store timeout reference for cleanup
        timeCell._renormalizeTimeout = renormalizeTimeout;
        return;
      }

      // If we have structured spans but also text nodes, just clean up the text nodes
      if (hasStructuredSpansNow && hasTextNodes) {
        isCleaning = true;
        cleanupTextNodes();
        // Use requestAnimationFrame to reset the flag after mutations settle
        requestAnimationFrame(() => {
          isCleaning = false;
        });
        return;
      }
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
