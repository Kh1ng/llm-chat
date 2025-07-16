# LLM Chat Style Guide

## Design Philosophy
Our design system emphasizes clarity, consistency, and subtle interactions in a dark-first theme. The interface should be clean and distraction-free while maintaining our unique teal accent identity.

## Core Colors

### Base Colors
```css
/* Dark theme foundation */
--bg-primary: rgb(13, 17, 23);        /* Main background - deep dark */
--bg-secondary: rgb(22, 27, 34);      /* Secondary surfaces - slightly lighter */
--accent: rgb(0, 128, 128);           /* Teal accent - our unique identity */
--accent-subtle: rgba(0, 128, 128, 0.2); /* Subtle accent for highlights */

/* Text hierarchy */
--text-primary: rgba(255, 255, 255, 0.9);
--text-secondary: rgba(255, 255, 255, 0.7);
--text-muted: rgba(255, 255, 255, 0.5);

/* Interactive overlays */
--overlay-light: rgba(255, 255, 255, 0.1);
--overlay-medium: rgba(13, 17, 23, 0.8);
--overlay-dark: rgba(13, 17, 23, 0.95);
```

## Typography

### Font Stack
```css
font-family: Inter, system-ui, -apple-system, sans-serif;
```

### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px - Small labels */
--text-sm: 0.875rem;   /* 14px - Secondary text */
--text-base: 1rem;     /* 16px - Body text */
--text-lg: 1.125rem;   /* 18px - Important content */
--text-xl: 1.25rem;    /* 20px - Headers */
```

## Layout

### Chat Interface
- Clean, minimal layout
- Maximum width of 900px for optimal readability
- Sticky header and input areas
- Smooth message spacing
- Full viewport height utilization

### Spacing Scale
```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 0.75rem;   /* 12px */
--space-lg: 1rem;      /* 16px */
--space-xl: 1.5rem;    /* 24px */
```

### Border Radius
```css
--radius-sm: 0.25rem;  /* 4px - Small elements */
--radius-md: 0.5rem;   /* 8px - Cards, inputs */
--radius-lg: 0.75rem;  /* 12px - Modal dialogs */
```

## Interactive Elements

### Text Input
- Clean, minimal appearance
- Subtle border: 1px solid var(--overlay-light)
- Focus state uses accent color
- Comfortable padding: 0.75rem
- Minimum height: 44px

### Buttons
- Height: 32px (compact) or 40px (standard)
- Ghost style with hover feedback
- Optional teal accent variant
- Subtle transition on hover

### Model Selector
- Minimal dropdown design
- Right-aligned in header
- Small text: var(--text-sm)
- Subtle background

## Message Display

### User Messages
- Right-aligned
- Subtle background: var(--overlay-light)
- Rounded corners
- Max-width for readability

### AI Messages
- Left-aligned
- Clean background
- Markdown support
- Code block styling

### Code Blocks
- Syntax highlighting
- Dark background: var(--bg-secondary)
- Monospace font
- Proper padding and scrolling

## Animation & Interaction

### Transitions
```css
/* Standard interaction transition */
transition: all 0.2s ease;
```

### Hover States
- Subtle background lightening
- Smooth opacity changes
- No dramatic movements

## Best Practices

1. Keep the interface clean and minimal
2. Use subtle transitions
3. Maintain consistent spacing
4. Follow dark theme principles
5. Ensure good contrast ratios
6. Use semantic HTML
7. Keep interactions smooth
8. Implement proper accessibility
9. Use CSS variables
10. Document style changes
