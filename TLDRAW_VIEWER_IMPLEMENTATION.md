# TLDraw Viewer Implementation

## Summary

Successfully integrated a TLDraw viewer in the bottom canvas container of the DocumentsSection. The viewer displays drawing data from the selected customer's document using TanStack Query for data fetching.

## Files Created/Modified

### Created Files:

1. **`app/frontend/widgets/documents/document-viewer/DocumentViewerCanvas.tsx`**
   - TLDraw viewer component (read-only canvas)
   - Two variants: basic and reactive
   - Automatically loads snapshots and zooms to fit content
   - Dark mode support via `inferDarkMode`

2. **`app/frontend/features/documents/hooks/useDocumentCanvas.ts`**
   - TanStack Query hook for fetching document canvas data
   - Caches data for 30 seconds
   - Handles empty/invalid waId gracefully

### Modified Files:

3. **`app/frontend/features/documents/hooks/index.ts`**
   - Exported the new `useDocumentCanvas` hook

4. **`app/frontend/widgets/documents/documents-section/DocumentsSectionLayout.tsx`**
   - Integrated TLDraw viewer into bottom container
   - Uses dynamic import for client-side rendering
   - Shows loading state while fetching canvas data
   - Displays placeholder when no data is available
   - Fullscreen button moved to bottom-left below the canvas

## Features

✅ **Read-only viewer** - Users can view drawings but not edit
✅ **Auto zoom-to-fit** - Canvas automatically fits content on load
✅ **Dark mode support** - Automatically detects and applies theme
✅ **Loading states** - Shows loading indicator while fetching data
✅ **Error handling** - Gracefully handles missing or invalid data
✅ **Reactive updates** - Automatically updates when customer selection changes
✅ **SSR-safe** - Dynamically imported to avoid server-side rendering issues

## Layout Structure

```
┌─────────────────────────────────────┐
│ Grid Container (flex: 0 0 auto)     │
│ - Customer data grid                │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Top Container (flex: 1 1 0)         │
│ - Status indicator (top-right)      │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Bottom Container (flex: 4 1 0)      │
│ ┌─────────────────────────────────┐ │
│ │ TLDraw Canvas (fills space)     │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ [Fullscreen Button] (bottom-left)  │
└─────────────────────────────────────┘
```

## Data Flow

1. User selects a customer in the grid
2. `waId` prop updates in DocumentsSectionLayout
3. `useDocumentCanvas(waId)` hook fetches canvas data via TanStack Query
4. DocumentViewerCanvas receives snapshot and renders TLDraw viewer
5. TLDraw loads the snapshot and displays the drawing

## API Integration

The implementation uses the existing documents API:
- **Endpoint**: `/api/documents/{waId}` (via `documentsService.getByWaId()`)
- **Data structure**: `{ name, age, document }` where `document` contains the TLDraw snapshot
- **Caching**: TanStack Query handles caching and refetching

## Testing

### Prerequisites:
```bash
cd app/frontend
pnpm install  # Ensure tldraw@3.15.5 is installed
```

### Run Development Server:
```bash
pnpm run dev
```

### Test Cases:

1. **Load existing drawing**
   - Select a customer with existing canvas data
   - Verify the drawing appears in the bottom canvas
   - Verify auto zoom-to-fit works

2. **Empty state**
   - Select a customer without canvas data
   - Verify "No canvas data available" message appears

3. **Loading state**
   - Switch between customers quickly
   - Verify "Loading canvas..." message appears briefly

4. **Dark mode**
   - Toggle between light/dark themes
   - Verify canvas theme updates automatically

5. **Fullscreen mode**
   - Click fullscreen button
   - Verify canvas expands properly
   - Verify exit fullscreen works

## Troubleshooting

### Issue: Canvas not loading
**Solution**: Check browser console for errors. Ensure TLDraw CSS is loaded.

### Issue: "Loading canvas..." stuck
**Solution**: Check network tab for failed API requests. Verify backend is running.

### Issue: White canvas
**Solution**: Check if document.document field contains valid TLDraw snapshot data.

### Issue: TypeScript errors
**Solution**: Restart TypeScript server in your IDE.

## Future Enhancements

Potential improvements:
- Add edit mode toggle to allow drawing modifications
- Implement real-time collaboration
- Add export to PNG/SVG functionality
- Add zoom controls UI
- Add pan/navigation controls
- Add thumbnail preview in grid

## Dependencies

- `tldraw@3.15.5` - Already installed
- `@tanstack/react-query@^5.54.0` - Already installed
- No new dependencies required

## Notes

- The viewer is read-only by default (`isReadonly: true`)
- The canvas uses the official TLDraw APIs
- Data fetching is optimized with TanStack Query caching
- SSR is avoided using Next.js dynamic imports
- The implementation follows the existing DDD architecture



