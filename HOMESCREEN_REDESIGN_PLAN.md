# HomeScreen Redesign Plan: Sticky Section Headers

## Overview
Redesign the main birthday list view with sticky section headers that show "Today", "This Week", "This Month", and "Next Month".

## 1. Data Transformation Strategy

### Section Definitions
- **Today**: Birthdays occurring on the current calendar date
- **This Week**: Birthdays in the next 7 days (excluding today)
- **This Month**: Remaining birthdays in the current month (excluding this week)
- **Next Month**: All birthdays in the following calendar month

### Key Logic
```typescript
// For each birthday, calculate next occurrence
const getNextOccurrence = (birthday) => {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Create date for this year's occurrence
  let nextDate = new Date(currentYear, birthday.birthMonth - 1, birthday.birthDay);

  // If already passed this year, use next year
  if (nextDate < now) {
    nextDate = new Date(currentYear + 1, birthday.birthMonth - 1, birthday.birthDay);
  }

  return nextDate;
};

// Determine section for each birthday
const getSection = (nextOccurrence) => {
  const now = new Date();
  const today = startOfDay(now);
  const endOfToday = endOfDay(now);
  const endOfWeek = addDays(today, 7);
  const endOfMonth = endOfMonth(now);
  const endOfNextMonth = endOfMonth(addMonths(now, 1));

  if (nextOccurrence >= today && nextOccurrence <= endOfToday) {
    return 'Today';
  } else if (nextOccurrence > endOfToday && nextOccurrence <= endOfWeek) {
    return 'This Week';
  } else if (nextOccurrence > endOfWeek && nextOccurrence <= endOfMonth) {
    return 'This Month';
  } else if (nextOccurrence > endOfMonth && nextOccurrence <= endOfNextMonth) {
    return 'Next Month';
  }
  return null; // Beyond next month - don't show
};
```

## 2. SectionList Implementation

### Replace FlatList with SectionList
```typescript
import { SectionList } from 'react-native';

// Transform flat array into sectioned data
const sections = [
  { title: 'Today', data: todayBirthdays },
  { title: 'This Week', data: thisWeekBirthdays },
  { title: 'This Month', data: thisMonthBirthdays },
  { title: 'Next Month', data: nextMonthBirthdays },
].filter(section => section.data.length > 0); // Remove empty sections

<SectionList
  sections={sections}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <BirthdayCard birthday={item} />}
  renderSectionHeader={({ section: { title } }) => (
    <SectionHeader title={title} />
  )}
  stickySectionHeadersEnabled={true}
  refreshControl={...}
/>
```

## 3. Sticky Header Component

```typescript
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  sectionHeader: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});
```

## 4. Birthday Card Modifications

- Show "Today!" badge for today's birthdays
- Show day of week + date for upcoming birthdays (e.g., "Monday, Jan 15")
- Calculate and display "X days away" or "Tomorrow"

## 5. Edge Cases to Handle

1. **Empty Sections**: Filter out sections with no birthdays
2. **Past Birthdays This Year**: Calculate next year's occurrence
3. **Birthdays Without Years**: Still calculate next occurrence date for sorting
4. **Year Rollover**: Handle December → January transitions correctly
5. **Leap Year Birthdays**: Handle Feb 29 birthdays in non-leap years (show Feb 28 or Mar 1)

## 6. Implementation Files to Modify

### Primary File
- `/packages/mobile/src/screens/HomeScreen.tsx`

### Changes Needed
1. Import `SectionList` instead of `FlatList`
2. Add date calculation utilities using `date-fns`
3. Create `groupBirthdaysBySection()` function
4. Create `SectionHeader` component
5. Update `BirthdayCard` to show next occurrence info
6. Update styles for sectioned layout

### No New Dependencies Required
- `date-fns` already installed for date calculations
- `SectionList` built into React Native
- All navigation and state management already in place

## 7. Performance Considerations

- Memoize section calculations to avoid recalculating on every render
- Use `useMemo` for grouped birthday data
- Keep section header component lightweight
- Maintain existing refresh/delete functionality

## 8. Visual Design

### Section Header Style
- Light gray background (#f8f8f8)
- Slightly larger font (18px)
- Semi-bold weight
- Subtle bottom border for separation

### Birthday Card Updates
- Add "days until" subtitle below name
- Add visual indicator for today (badge or accent color)
- Maintain current edit/delete functionality
