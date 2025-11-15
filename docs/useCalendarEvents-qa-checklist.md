# Manual QA Checklist: useCalendarEvents Refactoring Verification

## Purpose

Verify that the refactored `useCalendarEvents` hook maintains identical behavior to the original implementation after the architectural refactoring.

## Prerequisites

- [ ] Application is running in development mode
- [ ] Browser DevTools open (Network tab, React DevTools if available)
- [ ] Access to calendar view with test data (reservations, conversations, vacations)

______________________________________________________________________

## 1. Visual Rendering & Data Display

### 1.1 Calendar View Renders

- [ ] **Month View**: Navigate to month view (`dayGridMonth`)

  - [ ] Calendar grid displays correctly
  - [ ] Events appear in correct date slots
  - [ ] Event titles display correctly
  - [ ] Event colors/styles match expected appearance

- [ ] **Week View**: Switch to week view (`timeGridWeek`)

  - [ ] Time slots display correctly
  - [ ] Events appear at correct times
  - [ ] Events span correct duration
  - [ ] Multiple events in same slot display correctly

- [ ] **Day View**: Switch to day view (`timeGridDay`)

  - [ ] Single day displays correctly
  - [ ] Events appear at correct times
  - [ ] Time slots are properly formatted

### 1.2 Event Data Accuracy

- [ ] **Reservation Events**: Verify reservation events display

  - [ ] Customer names appear correctly (not WA IDs)
  - [ ] Event titles match reservation data
  - [ ] Dates/times match reservation slots
  - [ ] Event types (checkup/followup) display correctly

- [ ] **Conversation Events**: Verify conversation events (if enabled)

  - [ ] Conversation events appear in calendar
  - [ ] Conversation timestamps match calendar times
  - [ ] Conversation events don't duplicate reservation events

- [ ] **Vacation Periods**: Verify vacation periods

  - [ ] Vacation dates are marked/highlighted
  - [ ] Events cannot be dragged to vacation dates (if applicable)

### 1.3 Customer Names Display

- [ ] **Sanitized Names**: Verify customer name sanitization

  - [ ] Valid customer names display correctly
  - [ ] Placeholder names are filtered out
  - [ ] WA ID-matching names are filtered out

- [ ] **Derived Names**: Verify name derivation from reservations

  - [ ] When customer name API doesn't have a name, reservation `customer_name` is used
  - [ ] When reservation `customer_name` is missing, reservation `title` is used
  - [ ] Fallback logic works correctly

______________________________________________________________________

## 2. Loading States

### 2.1 Initial Load

- [ ] **First Load**: Open calendar view

  - [ ] Loading indicator appears initially
  - [ ] Events appear after data loads
  - [ ] Loading state transitions to false when complete

- [ ] **Period Navigation**: Navigate to different month/week

  - [ ] Loading state activates during period change
  - [ ] Previous period events remain visible (if cached)
  - [ ] New period events load correctly

### 2.2 Sliding Window Prefetch

- [ ] **Prefetch Behavior**: Navigate through periods
  - [ ] Adjacent periods prefetch in background
  - [ ] Navigation to prefetched periods is instant (no loading)
  - [ ] Cache eviction works (old periods removed from cache)

______________________________________________________________________

## 3. Action Methods: refreshData

### 3.1 Manual Refresh

- [ ] **Refresh Button**: Click refresh/refetch button (if available)
  - [ ] `refreshData()` is called
  - [ ] Current period queries are invalidated
  - [ ] Reservations query refetches
  - [ ] Conversations query refetches
  - [ ] Vacations query refetches
  - [ ] Events update with latest data

### 3.2 Programmatic Refresh

- [ ] **Hook Method**: Call `refreshData()` from component
  ```typescript
  const { refreshData } = useCalendarEvents(options);
  // Call refreshData()
  ```
  - [ ] Method executes without errors
  - [ ] Queries invalidate correctly
  - [ ] Data refetches successfully
  - [ ] Events update after refresh

______________________________________________________________________

## 4. Action Methods: invalidateCache

### 4.1 Cache Invalidation

- [ ] **Invalidate All**: Call `invalidateCache()`
  ```typescript
  const { invalidateCache } = useCalendarEvents(options);
  // Call invalidateCache()
  ```
  - [ ] All reservation queries are invalidated
  - [ ] All conversation queries are invalidated
  - [ ] Cache is cleared (verify in React Query DevTools)
  - [ ] Next data fetch retrieves fresh data

______________________________________________________________________

## 5. CRUD Operations: addEvent

### 5.1 Add Event

- [ ] **Add New Event**: Call `addEvent(event)`
  ```typescript
  const { addEvent } = useCalendarEvents(options);
  const newEvent: CalendarEvent = {
    id: "test-event-1",
    title: "Test Event",
    start: new Date("2025-11-20T10:00:00"),
    extendedProps: {},
  };
  addEvent(newEvent);
  ```
  - [ ] Event appears in calendar immediately
  - [ ] Event is added to events array
  - [ ] `lastUpdated` timestamp updates
  - [ ] Event persists until page refresh (local state)

______________________________________________________________________

## 6. CRUD Operations: updateEvent

### 6.1 Update Event

- [ ] **Update Existing Event**: Call `updateEvent(id, updates)`
  ```typescript
  const { updateEvent } = useCalendarEvents(options);
  updateEvent("event-id-123", {
    title: "Updated Title",
    start: new Date("2025-11-20T11:00:00"),
  });
  ```
  - [ ] Event updates in calendar immediately
  - [ ] Only specified event is updated (others unchanged)
  - [ ] `lastUpdated` timestamp updates
  - [ ] Changes persist until page refresh

### 6.2 Partial Updates

- [ ] **Update Title Only**: Update only title
  - [ ] Title changes, other properties unchanged
- [ ] **Update Time Only**: Update only start/end time
  - [ ] Time changes, event moves to new slot
  - [ ] Other properties unchanged

______________________________________________________________________

## 7. CRUD Operations: removeEvent

### 7.1 Remove Event

- [ ] **Remove Event**: Call `removeEvent(id)`
  ```typescript
  const { removeEvent } = useCalendarEvents(options);
  removeEvent("event-id-123");
  ```
  - [ ] Event disappears from calendar immediately
  - [ ] Event is removed from events array
  - [ ] Other events remain unchanged
  - [ ] `lastUpdated` timestamp updates

______________________________________________________________________

## 8. Error Handling

### 8.1 Network Errors

- [ ] **API Failure**: Simulate network error (disable network in DevTools)
  - [ ] Error state is set correctly
  - [ ] Error message displays (if UI shows errors)
  - [ ] `error` property in hook return is not null
  - [ ] Loading state transitions to false

### 8.2 Partial Failures

- [ ] **Reservation Query Fails**: Simulate reservation API failure

  - [ ] Error is captured
  - [ ] Conversation events still display (if loaded)
  - [ ] Error doesn't crash calendar

- [ ] **Conversation Query Fails**: Simulate conversation API failure

  - [ ] Error is captured
  - [ ] Reservation events still display
  - [ ] Error doesn't crash calendar

______________________________________________________________________

## 9. FreeRoam Mode

### 9.1 FreeRoam Enabled

- [ ] **Toggle FreeRoam**: Enable `freeRoam: true`
  - [ ] Cancelled reservations appear in calendar
  - [ ] All events display regardless of status
  - [ ] Filtering logic respects freeRoam flag

### 9.2 FreeRoam Disabled

- [ ] **Toggle FreeRoam**: Disable `freeRoam: false`
  - [ ] Cancelled reservations are filtered out
  - [ ] Only active reservations display
  - [ ] Filtering logic works correctly

______________________________________________________________________

## 10. excludeConversations Option

### 10.1 Conversations Excluded

- [ ] **Exclude Conversations**: Set `excludeConversations: true`
  - [ ] Conversation events don't appear in calendar
  - [ ] Only reservation events display
  - [ ] Event count matches reservation count

### 10.2 Conversations Included

- [ ] **Include Conversations**: Set `excludeConversations: false`
  - [ ] Conversation events appear in calendar
  - [ ] Both reservation and conversation events display
  - [ ] Event count includes both types

______________________________________________________________________

## 11. WebSocket Integration

### 11.1 Real-time Updates

- [ ] **WebSocket Invalidation**: Trigger WebSocket update
  - [ ] Calendar receives WebSocket message
  - [ ] Affected period queries are invalidated
  - [ ] Events update automatically
  - [ ] No manual refresh needed

### 11.2 Cache Updates

- [ ] **Cache Refresh**: Verify cache updates via WebSocket
  - [ ] Updated reservations appear in calendar
  - [ ] New reservations appear automatically
  - [ ] Deleted reservations disappear automatically

______________________________________________________________________

## 12. Period Navigation

### 12.1 Month Navigation

- [ ] **Previous Month**: Navigate to previous month

  - [ ] Period key changes correctly
  - [ ] New period data loads
  - [ ] Previous period remains cached
  - [ ] Events display correctly

- [ ] **Next Month**: Navigate to next month

  - [ ] Period key changes correctly
  - [ ] New period data loads
  - [ ] Prefetch window shifts correctly
  - [ ] Old periods evicted from cache

### 12.2 Week/Day Navigation

- [ ] **Week View Navigation**: Navigate between weeks

  - [ ] Week period keys update correctly
  - [ ] Events load for new week
  - [ ] Cache management works correctly

- [ ] **Day View Navigation**: Navigate between days

  - [ ] Day period keys update correctly
  - [ ] Events load for new day
  - [ ] Cache management works correctly

______________________________________________________________________

## 13. Performance & Memory

### 13.1 Memory Leaks

- [ ] **Component Unmount**: Unmount calendar component
  - [ ] No memory leaks (check DevTools Memory tab)
  - [ ] Event listeners cleaned up
  - [ ] React Query cache cleaned up appropriately

### 13.2 Re-render Performance

- [ ] **Re-render Count**: Monitor re-renders (React DevTools Profiler)
  - [ ] Hook doesn't cause excessive re-renders
  - [ ] Memoization works correctly
  - [ ] State updates are optimized

______________________________________________________________________

## 14. Integration Points

### 14.1 Calendar Component Integration

- [ ] **FullCalendar Integration**: Verify FullCalendar component
  - [ ] Events passed to FullCalendar correctly
  - [ ] Event handlers work (drag, resize, click)
  - [ ] Calendar API integration works

### 14.2 Widget Integration

- [ ] **Calendar Widgets**: Test calendar widgets using hook
  - [ ] DualCalendar widget works correctly
  - [ ] HomeCalendar widget works correctly
  - [ ] Event handlers propagate correctly

______________________________________________________________________

## 15. Edge Cases

### 15.1 Empty States

- [ ] **No Events**: Navigate to period with no events
  - [ ] Calendar displays empty state correctly
  - [ ] No errors thrown
  - [ ] Loading state transitions correctly

### 15.2 Invalid Dates

- [ ] **Invalid Date**: Pass invalid date to hook
  - [ ] Hook handles gracefully
  - [ ] Default date used (if applicable)
  - [ ] No crashes

### 15.3 Rapid Navigation

- [ ] **Fast Period Changes**: Rapidly navigate between periods
  - [ ] No race conditions
  - [ ] Correct period data displays
  - [ ] Cache updates correctly
  - [ ] No duplicate requests

______________________________________________________________________

## 16. TypeScript & Type Safety

### 16.1 Type Exports

- [ ] **Type Imports**: Verify types can be imported
  ```typescript
  import type {
    UseCalendarEventsOptions,
    CalendarEventsState,
    CalendarEventsActions,
    UseCalendarEventsReturn,
  } from "@/features/calendar";
  ```
  - [ ] Types import correctly
  - [ ] Types are properly exported
  - [ ] TypeScript compilation succeeds

### 16.2 Type Safety

- [ ] **Type Errors**: Verify type checking works
  - [ ] Invalid options throw type errors
  - [ ] Return types are correct
  - [ ] Action method signatures are correct

______________________________________________________________________

## 17. Regression Testing

### 17.1 Compare Before/After

- [ ] **Behavior Comparison**: Compare with original implementation
  - [ ] All events render identically
  - [ ] All actions behave identically
  - [ ] Performance is similar or better
  - [ ] No visual regressions

### 17.2 Known Issues Check

- [ ] **Previous Bugs**: Verify previously fixed bugs still work
  - [ ] Customer name fallback still works
  - [ ] Document status border colors still work
  - [ ] Age-based styling still works (if applicable)

______________________________________________________________________

## Sign-off

**Tester**: **\*\*\*\***\_**\*\*\*\***\
**Date**: **\*\*\*\***\_**\*\*\*\***\
**Status**: ☐ Pass ☐ Fail (see notes below)

**Notes**:

- List any issues found during testing
- Note any deviations from expected behavior
- Document any performance concerns

______________________________________________________________________

## Quick Smoke Test (5 minutes)

If time is limited, perform these critical checks:

1. [ ] Calendar renders with events
1. [ ] Navigate between periods (month/week/day)
1. [ ] Call `refreshData()` - events update
1. [ ] Call `addEvent()` - event appears
1. [ ] Call `updateEvent()` - event updates
1. [ ] Call `removeEvent()` - event disappears
1. [ ] Toggle `freeRoam` - filtering works
1. [ ] Check loading states - transitions correctly
1. [ ] Verify customer names display correctly
1. [ ] Check WebSocket updates (if applicable)
