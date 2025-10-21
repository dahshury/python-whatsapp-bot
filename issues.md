# System Issue Report

## 1. Phone Selector

### General

| Issue                        | Description                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Missing Customer Names   | Customer names are not loaded into the list.                                                                                    |
| Incorrect Sorting        | Customers are not sorted by latest messages in the “Recent” tab.                                                                |
| Incomplete “All” Section | The “All” section does not display the expected {n=50} customers (configurable in settings) and lacks a Load More button. |

### Country Selector

| Issue                     | Description                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Incomplete Statistics | Only statistics for currently loaded customers are displayed. Should load and display statistics for all customers. |

### Date Filter

| Issue                     | Description                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Filter Not Functional | The date filter menu closes the entire selector when used inside a dialog (e.g., calendar date click dialog). Functionality is broken. |

---

## 2. Calendar

### Data Loading

| Issue                  | Description                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Unreliable Loading | Data does not consistently load asynchronously; some events are missing when navigating.          |
| Free Mode Issues   | In “Free Mode,” conversation and normal events fail to load reliably; events sometimes disappear. |

### Data Sorting

| Rule               | Expected Behavior                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Event Ordering | Sort events as: Checkups → Follow-ups. Maintain continuous sequence—no gaps between first event and start of slot, and no gaps between events. |

| Issue                       | Description                                                                    |
| --------------------------- | ------------------------------------------------------------------------------ |
| Gaps and Overlaps       | Events sometimes leave gaps or overlap after creation, deletion, or drag/drop. |
| Unsorted Initialization | Calendar occasionally initializes with unsorted or missing events.             |

### General

| Issue                           | Description                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Layout Overlaps             | Day numbers overlap with events in year/month views. 👍                                                            |
| “More…” Button Misalignment | The “More…” button (for overflow events) extends beyond cell boundaries. 👍                                        |
| Event Click Inconsistency   | Clicking different parts of an event does not consistently trigger the click event. 👍                              |

---

## 3. Documents Page

### Data Loading ✅

| Issue                        | Description                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| Customer Data Looping    | Customer data fails to load properly into the form and bottom canvas, causing looping and high CPU usage. |
| Default Document Missing | Default document does not load.                                                                           |
| Empty State Issue        | “Add Document” button is unresponsive when the canvas is empty.                                           |

### Excalidraw Notes Area

| Issue                       | Description                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| SVG Persistence Failure | Excalidraw drawings are not saving SVGs properly.                            |
| Incorrect Storage       | SVG data should be persisted separately from user documents in the database. |

### General

| Issue           | Description                                                                        |
| --------------- | ---------------------------------------------------------------------------------- |
| Performance | Page is inefficient and needs general optimization, especially for tablet devices. |

---

## 4. 404 Page

| Issue                  | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| Navigation Failure | “Go to Home” button does not navigate to the homepage. |
| Performance Issue  | Page exhibits high CPU usage and frequent hangs.       |

---

## 5. Data Grid ✅

### State Management

| Issue                                | Description                                                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reservation ID mismatch on updates | After the first successful reservation edit, subsequent edits trigger the “unmatching reservation ID” error. State should refresh like the `main` branch. |

### Expected Behavior

