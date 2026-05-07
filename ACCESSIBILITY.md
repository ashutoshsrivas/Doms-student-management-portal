# Accessibility & Color Contrast Guidelines

## Overview
This document outlines the accessibility standards and color contrast guidelines for the DOMS application to ensure it meets WCAG 2.1 AA standards.

## Color Contrast Standards

### WCAG 2.1 AA Requirements
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18pt+ or 14pt+ bold): Minimum 3:1 contrast ratio
- **UI Components & Graphical Elements**: Minimum 3:1 contrast ratio

## Current Color Palette Improvements

### Dark Backgrounds (e.g., Dark Sidebar)
❌ **Avoid:**
- `text-gray-300` (too light, ~3.5:1)
- `text-gray-400` (too light, ~2.1:1)
- `text-gray-500` (too light, ~1.6:1)

✅ **Use Instead:**
- `text-white` for primary text (~20:1)
- `text-gray-100` for secondary text (~18:1)
- `text-gray-200` for tertiary text (~13:1)

### Status Badges
❌ **Avoid:**
- `bg-green-100 text-green-800` (~2.2:1) - Fails WCAG AA
- `bg-gray-100 text-gray-800` (~2.0:1) - Fails WCAG AA

✅ **Use Instead:**
- `bg-green-100 text-green-900 border border-green-300` (~6.5:1) - Passes WCAG AAA
- `bg-gray-200 text-gray-900 border border-gray-300` (~8.5:1) - Passes WCAG AAA
- Add `font-bold` to badges for better readability

### Alert & Notification Colors
✅ **Success States:**
```tailwind
bg-green-100 text-green-900 border border-green-300
```

✅ **Error States:**
```tailwind
bg-red-100 text-red-900 border border-red-300
```

✅ **Warning States:**
```tailwind
bg-yellow-100 text-yellow-900 border border-yellow-300
```

✅ **Info States:**
```tailwind
bg-blue-100 text-blue-900 border border-blue-300
```

## Accessibility Checklist

### For Text Elements
- [ ] Headings have sufficient contrast (4.5:1 for normal text)
- [ ] Body text has minimum 4.5:1 contrast ratio
- [ ] Disabled text uses appropriate gray shades
- [ ] Links are clearly distinguishable from regular text

### For Interactive Elements
- [ ] Buttons have visible focus states
- [ ] Hover states have sufficient contrast
- [ ] Form inputs have visible borders
- [ ] Radio buttons and checkboxes are clearly visible

### For Components
- [ ] Status badges use contrasting colors + borders
- [ ] Icons have sufficient contrast
- [ ] Dividers/borders are visible
- [ ] Empty states are clear and readable

### For Forms
- [ ] Labels have good contrast
- [ ] Required field indicators are visible
- [ ] Error messages are prominent and red
- [ ] Placeholder text doesn't fade too much

## Testing Tools

### Online Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Colors](https://accessible-colors.com/)
- [Contrast Ratio](https://contrast-ratio.com/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/) - Use Lighthouse audit

### Browser Extensions
- **axe DevTools** - Automated accessibility testing
- **WAVE** - Web accessibility evaluation tool
- **Lighthouse** - Built into Chrome DevTools

## Implementation Guidelines

### Tailwind CSS Patterns

#### Dark Theme Text on Gray-900 Background
```jsx
// Primary text
className="text-white"

// Secondary text
className="text-gray-100"

// Tertiary text
className="text-gray-200"

// Disabled/muted
className="text-gray-300"
```

#### Light Theme Text on White Background
```jsx
// Primary heading/text
className="text-gray-900"

// Secondary text
className="text-gray-700"

// Tertiary text
className="text-gray-600"

// Disabled/muted
className="text-gray-500"
```

#### Badges & Status Indicators
```jsx
// Success
className="bg-green-100 text-green-900 border border-green-300 font-bold"

// Error
className="bg-red-100 text-red-900 border border-red-300 font-bold"

// Warning
className="bg-yellow-100 text-yellow-900 border border-yellow-300 font-bold"

// Info
className="bg-blue-100 text-blue-900 border border-blue-300 font-bold"
```

## Future Improvements

### Priority 1 (High Impact)
- [ ] Review all form labels and inputs for contrast
- [ ] Update all status badges with borders
- [ ] Ensure all icon colors have 3:1 contrast minimum
- [ ] Test keyboard navigation across all pages

### Priority 2 (Medium Impact)
- [ ] Add focus indicators to all interactive elements
- [ ] Review error message visibility
- [ ] Implement ARIA labels for screen readers
- [ ] Test with accessibility checkers

### Priority 3 (Polish)
- [ ] Create dark mode theme with proper contrast
- [ ] Add high contrast mode option
- [ ] Implement text scaling options
- [ ] Add language-specific font improvements

## Resources

### WCAG Guidelines
- [WCAG 2.1 Overview](https://www.w3.org/WAI/WCAG21/quickref/)
- [Color Contrast Enhancement](https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html)

### Design Resources
- [Material Design Color Accessibility](https://material.io/design/color/the-color-system.html#color-usage-accessibility)
- [Inclusive Components](https://inclusive-components.design/)

### Testing
- [WebAIM Articles](https://webaim.org/articles/)
- [Accessible HTML Form](https://www.w3.org/WAI/tutorials/forms/)

## Maintenance Notes

- Review contrast ratios whenever updating colors
- Test new components with accessibility tools before deployment
- Monitor user feedback for accessibility issues
- Periodically audit the application with Lighthouse
