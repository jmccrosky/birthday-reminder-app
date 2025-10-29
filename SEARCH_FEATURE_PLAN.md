# Search Feature Plan

## UX Design

### Visual Design
```
┌─────────────────────────────┐
│  Birthdays        Add Logout│  ← Header (always visible)
├─────────────────────────────┤
│                             │
│  THIS WEEK                  │  ← Sections visible when not searching
│  ┌───────────────────────┐ │
│  │ John Smith   2 days   │ │
│  │ March 15, 1990        │ │
│  └───────────────────────┘ │
│                             │
│  THIS MONTH                 │
│  ┌───────────────────────┐ │
│  │ Jane Doe     10 days  │ │
│  └───────────────────────┘ │
│                             │
│         ↓ scroll ↓          │
│                             │
├─────────────────────────────┤
│ 🔍 Search birthdays...      │  ← Floating search bar at bottom
└─────────────────────────────┘

When Search is Active:
┌─────────────────────────────┐
│  Birthdays        Add Logout│
├─────────────────────────────┤
│  🔍 [John_]        Cancel   │  ← Search bar moves to top
├─────────────────────────────┤
│  ┌───────────────────────┐ │  ← Flat filtered list (no sections)
│  │ John Smith   2 days   │ │
│  │ March 15, 1990        │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ Johnny Lee   45 days  │ │
│  │ June 1, 1985          │ │
│  └───────────────────────┘ │
│                             │
│  No more results            │
└─────────────────────────────┘
```

## User Flow

### 1. Initial State (Search Inactive)
- Floating search button/bar at bottom of screen
- Translucent background with slight shadow
- Placeholder text: "🔍 Search birthdays..."
- Doesn't interfere with scrolling content
- Positioned with safe padding from bottom edge

### 2. Activation (User Taps Search)
**Animation sequence (300ms):**
1. Search bar slides up from bottom
2. Expands to full width input field
3. Moves to top of list (below header)
4. Keyboard slides up
5. "Cancel" button appears on right
6. Focus is set to input field

### 3. Active Search State
**As user types:**
- Real-time filtering (debounced 150ms)
- Case-insensitive name matching
- No section headers - show flat list of results
- Results sorted by days until birthday (earliest first)
- Show count: "3 birthdays found" at top

**Features:**
- Clear button (×) appears when text entered
- Tap × to clear search but stay in search mode
- Tap "Cancel" to exit search entirely

### 4. Empty Results
```
┌─────────────────────────────┐
│  🔍 [Xyz_]           Cancel │
├─────────────────────────────┤
│                             │
│          😕                 │
│   No birthdays found        │
│                             │
│   Try a different name      │
│                             │
└─────────────────────────────┘
```

### 5. Deactivation (Cancel)
**Animation sequence (200ms):**
1. Keyboard dismisses
2. Search bar slides back to bottom
3. Clear search text
4. Restore sectioned view
5. Return scroll position to previous location

## Technical Implementation

### State Management
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [isSearchActive, setIsSearchActive] = useState(false);
const [scrollPosition, setScrollPosition] = useState(0);
```

### Search Logic
```typescript
function filterBirthdays(birthdays: Birthday[], query: string): BirthdayWithNextDate[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase().trim();

  return birthdays
    .map(enrichBirthdayWithNextDate)
    .filter(b => b.name.toLowerCase().includes(lowerQuery))
    .sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());
}
```

### Component Structure
```
HomeScreen
├─ SearchBar (floating, conditional position)
├─ SectionList (when !isSearchActive && !searchQuery)
└─ FlatList (when isSearchActive && searchQuery)
```

## Alternative UX Patterns Considered

### Option A: Header Search (Traditional)
- Search icon in header → taps to expand search bar
- **Pros:** Standard pattern, no floating element
- **Cons:** Requires header redesign, less discoverable

### Option B: Pull-to-Search
- Pull down list to reveal search
- **Pros:** No UI clutter
- **Cons:** Not discoverable, conflicts with pull-to-refresh

### Option C: Floating Action Button
- FAB with search icon at bottom right
- **Pros:** Modern, doesn't block content
- **Cons:** Extra tap, less clear it's a search

### ✅ Selected: Floating Search Bar (Recommended)
- **Pros:**
  - Highly discoverable
  - Direct interaction (tap to type)
  - Doesn't require header changes
  - Modern iOS pattern (like Messages, Notes)
  - Always visible reminder
- **Cons:**
  - Takes up some screen space
  - Needs careful positioning

## Accessibility
- VoiceOver label: "Search birthdays"
- Keyboard type: default (for names)
- Return key: "search" or "done"
- Clear button accessible
- Cancel button accessible

## Performance Considerations
- Debounce search input (150ms) to reduce re-renders
- Use useMemo for filtered results
- Only filter when search query changes
- Maintain original data array (don't mutate)

## Future Enhancements (Not in v1)
- Search by month ("January")
- Search by date range
- Recent searches
- Search history
- Fuzzy matching
- Highlighting matched text

## Files to Modify
1. `/packages/mobile/src/screens/HomeScreen.tsx`
   - Add search state
   - Add SearchBar component
   - Conditional rendering logic
   - Search filtering function

2. New file: `/packages/mobile/src/components/SearchBar.tsx`
   - Reusable search component
   - Floating vs expanded states
   - Animation logic

## Implementation Steps
1. Create SearchBar component with two states (collapsed/expanded)
2. Add search state to HomeScreen
3. Implement filter function
4. Add conditional rendering (sections vs flat list)
5. Add animations for state transitions
6. Handle keyboard events
7. Add empty results state
8. Test edge cases

## Design Tokens
```typescript
const SEARCH_BAR_HEIGHT = 48;
const SEARCH_BAR_BOTTOM_PADDING = 16;
const ANIMATION_DURATION = 250;
const DEBOUNCE_MS = 150;
const SEARCH_BACKGROUND = 'rgba(255, 255, 255, 0.95)';
const SEARCH_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
};
```
