# Rocqet Design System & Style Guide
*Version 1.0 | August 2025*

## Design Philosophy

Rocqet embodies **intelligent simplicity** – a sophisticated prompt management system that feels effortless to use while handling complex workflows. Our design philosophy centers on:

- **Clarity through hierarchy** – Information architecture that guides users naturally through their tasks
- **Purposeful minimalism** – Every element serves a function, nothing is decorative
- **Responsive intelligence** – The interface adapts to user patterns and preferences
- **Professional polish** – Enterprise-ready aesthetics with consumer-friendly approachability

## Color System

### Primary Colors
- **Primary Blue**: `#0F4C75` – Main brand color, CTAs, primary navigation
- **Primary Blue Dark**: `#0A3A5C` – Hover states, active selections
- **Primary Blue Light**: `#1E6BA8` – Links, secondary actions
- **Primary Blue Pale**: `#E8F2FA` – Selected backgrounds, subtle highlights

### Secondary Colors
- **Secondary Slate**: `#475569` – Secondary text, icons
- **Secondary Gray**: `#64748B` – Disabled states, placeholders
- **Secondary Light**: `#94A3B8` – Borders, dividers
- **Secondary Pale**: `#F8FAFC` – Background surfaces

### Accent Colors
- **Accent Emerald**: `#10B981` – Success states, positive actions
- **Accent Amber**: `#F59E0B` – Warnings, important notices
- **Accent Rose**: `#F43F5E` – Errors, destructive actions
- **Accent Purple**: `#8B5CF6` – AI features, premium highlights
- **Accent Indigo**: `#6366F1` – Information, tips

### Gradient System
- **Premium Gradient**: `linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)` – AI features
- **Success Gradient**: `linear-gradient(135deg, #10B981 0%, #34D399 100%)` – Positive feedback
- **Brand Gradient**: `linear-gradient(135deg, #0F4C75 0%, #1E6BA8 100%)` – Hero sections

### Semantic Colors
- **Success**: `#10B981` – Confirmations, completions
- **Warning**: `#F59E0B` – Caution states, alerts
- **Error**: `#EF4444` – Errors, validation failures
- **Info**: `#3B82F6` – Informational messages

### Neutral Palette
- `Neutral-50`: `#FAFAFA` – Lightest backgrounds
- `Neutral-100`: `#F4F4F5` – Subtle backgrounds
- `Neutral-200`: `#E4E4E7` – Dividers, borders
- `Neutral-300`: `#D4D4D8` – Disabled borders
- `Neutral-400`: `#A1A1AA` – Placeholder text
- `Neutral-500`: `#71717A` – Secondary text
- `Neutral-600`: `#52525B` – Body text
- `Neutral-700`: `#3F3F46` – Primary text
- `Neutral-800`: `#27272A` – Headings
- `Neutral-900`: `#18181B` – Darkest text

### Accessibility Notes
- All color combinations maintain WCAG AAA standards where possible (7:1 for critical text)
- Minimum WCAG AA compliance (4.5:1 normal text, 3:1 large text)
- Color-blind safe palette with distinct hue separation
- Never rely solely on color to convey information

## Typography System

### Font Stack
- **Primary**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace**: `"JetBrains Mono", "SF Mono", Monaco, Consolas, monospace`
- **Display**: `"Cal Sans", Inter, sans-serif` – For marketing and hero sections only

### Font Weights
- Light: 300 (Limited use for large display text)
- Regular: 400 (Body text)
- Medium: 500 (Emphasis, buttons)
- Semibold: 600 (Subheadings)
- Bold: 700 (Headings)

### Type Scale

#### Display (Marketing Only)
- **Display**: `56px/64px, 700, -0.02em` – Hero headlines

#### Headings
- **H1**: `36px/44px, 700, -0.018em` – Page titles
- **H2**: `28px/36px, 600, -0.016em` – Section headers
- **H3**: `22px/28px, 600, -0.014em` – Subsection headers
- **H4**: `18px/24px, 600, -0.012em` – Card titles
- **H5**: `16px/20px, 600, -0.01em` – Minor headers
- **H6**: `14px/18px, 600, 0em` – Smallest headers

#### Body Text
- **Body Large**: `16px/24px, 400, 0em` – Primary reading text
- **Body**: `14px/20px, 400, 0em` – Standard UI text
- **Body Small**: `13px/18px, 400, 0.01em` – Secondary information
- **Caption**: `12px/16px, 400, 0.02em` – Metadata, timestamps
- **Tiny**: `11px/14px, 400, 0.02em` – Legal text, version numbers

#### Special Text
- **Label**: `12px/16px, 500, 0.08em, uppercase` – Form labels, section labels
- **Button**: `14px/20px, 500, 0.02em` – Button text
- **Code**: `13px/20px, 400, 0em, monospace` – Code blocks, variables
- **Link**: `inherit, 500, inherit, underline on hover` – Inline links

### Responsive Typography
- **Mobile** (320-767px): Base size 14px, scale factor 0.9
- **Tablet** (768-1023px): Base size 15px, scale factor 0.95
- **Desktop** (1024-1439px): Base size 16px, scale factor 1.0
- **Wide** (1440px+): Base size 16px, scale factor 1.1

## Spacing & Layout System

### Base Unit
`4px` – All spacing values are multiples of this base unit

### Spacing Scale
- `space-0`: 0px – No spacing
- `space-1`: 4px – Micro spacing between related elements
- `space-2`: 8px – Small internal padding
- `space-3`: 12px – Compact spacing
- `space-4`: 16px – Default spacing, standard margins
- `space-5`: 20px – Medium spacing
- `space-6`: 24px – Section spacing
- `space-8`: 32px – Large spacing between sections
- `space-10`: 40px – Extra large spacing
- `space-12`: 48px – Major section separation
- `space-16`: 64px – Hero section spacing
- `space-20`: 80px – Page-level spacing
- `space-24`: 96px – Maximum spacing

### Grid System
- **Columns**: 12 (desktop), 8 (tablet), 4 (mobile)
- **Gutters**: 
  - Mobile: 16px
  - Tablet: 24px
  - Desktop: 32px
  - Wide: 32px
- **Container Max Widths**:
  - Small: 640px
  - Medium: 768px
  - Large: 1024px
  - XL: 1280px
  - 2XL: 1536px
- **Margins (Safe Areas)**:
  - Mobile: 16px
  - Tablet: 24px
  - Desktop: 32px
  - Wide: Auto (centered with max-width)

### Breakpoints
- **Mobile**: 320px – 639px
- **Tablet**: 640px – 1023px
- **Desktop**: 1024px – 1279px
- **Wide**: 1280px – 1535px
- **Ultra**: 1536px+

## Component Specifications

### Buttons

#### Primary Button
**Visual Specifications**
- **Height**: Small: 32px, Medium: 40px, Large: 48px
- **Padding**: Small: 12px, Medium: 16px, Large: 20px
- **Border Radius**: 6px
- **Background**: Primary Blue `#0F4C75`
- **Text**: White `#FFFFFF`, 14px/20px, Medium (500)
- **Border**: None
- **Shadow**: `0 1px 2px 0 rgb(0 0 0 / 0.05)`

**States**
- **Hover**: Background `#0A3A5C`, Shadow `0 4px 6px -1px rgb(0 0 0 / 0.1)`
- **Active**: Background `#082E49`, Shadow `inset 0 2px 4px 0 rgb(0 0 0 / 0.06)`
- **Focus**: Outline `2px solid #1E6BA8`, Outline offset `2px`
- **Disabled**: Background `#E4E4E7`, Text `#A1A1AA`, Cursor `not-allowed`
- **Loading**: Show spinner, reduce opacity to 0.7

#### Secondary Button
**Visual Specifications**
- **Height**: Same as Primary
- **Border**: 1px solid `#D4D4D8`
- **Background**: White `#FFFFFF`
- **Text**: Primary Blue `#0F4C75`

**States**
- **Hover**: Background `#F8FAFC`, Border `#A1A1AA`
- **Active**: Background `#F4F4F5`
- **Focus**: Same as Primary
- **Disabled**: Same as Primary

#### Ghost Button
**Visual Specifications**
- **Background**: Transparent
- **Text**: Primary Blue `#0F4C75`
- **Border**: None

**States**
- **Hover**: Background `rgba(15, 76, 117, 0.08)`
- **Active**: Background `rgba(15, 76, 117, 0.12)`

### Form Elements

#### Input Field
**Visual Specifications**
- **Height**: 40px
- **Padding**: 12px horizontal
- **Border**: 1px solid `#D4D4D8`
- **Border Radius**: 6px
- **Background**: White `#FFFFFF`
- **Font**: 14px/20px, Regular
- **Placeholder**: `#A1A1AA`

**States**
- **Hover**: Border `#A1A1AA`
- **Focus**: Border `#0F4C75`, Shadow `0 0 0 3px rgba(15, 76, 117, 0.1)`
- **Error**: Border `#EF4444`, Shadow `0 0 0 3px rgba(239, 68, 68, 0.1)`
- **Disabled**: Background `#F4F4F5`, Text `#A1A1AA`
- **Success**: Border `#10B981`, Shadow `0 0 0 3px rgba(16, 185, 129, 0.1)`

#### Textarea
- Same as Input Field but with variable height
- Min height: 80px
- Resize: vertical only

#### Select Dropdown
- Same visual specs as Input Field
- Chevron icon on right: `#71717A`
- Dropdown shadow: `0 10px 15px -3px rgb(0 0 0 / 0.1)`

### Cards

#### Base Card
**Visual Specifications**
- **Background**: White `#FFFFFF`
- **Border**: 1px solid `#E4E4E7`
- **Border Radius**: 8px
- **Padding**: 16px (compact), 24px (default), 32px (spacious)
- **Shadow**: `0 1px 3px 0 rgb(0 0 0 / 0.1)`

**Interactive Card**
- **Hover**: Shadow `0 4px 6px -1px rgb(0 0 0 / 0.1)`, Transform `translateY(-2px)`
- **Active**: Shadow `0 1px 3px 0 rgb(0 0 0 / 0.1)`, Transform `translateY(0)`

### Navigation

#### Sidebar Navigation
- **Width**: 240px (collapsed: 64px)
- **Background**: `#FAFAFA`
- **Border Right**: 1px solid `#E4E4E7`
- **Item Height**: 40px
- **Item Padding**: 12px horizontal
- **Active Item**: Background `#E8F2FA`, Text `#0F4C75`, Border-left `3px solid #0F4C75`

#### Top Navigation
- **Height**: 64px
- **Background**: White `#FFFFFF`
- **Border Bottom**: 1px solid `#E4E4E7`
- **Shadow**: `0 1px 3px 0 rgb(0 0 0 / 0.1)`

### Modals

**Visual Specifications**
- **Background**: White `#FFFFFF`
- **Border Radius**: 12px
- **Shadow**: `0 25px 50px -12px rgb(0 0 0 / 0.25)`
- **Overlay**: `rgba(0, 0, 0, 0.5)`
- **Max Width**: Small: 400px, Medium: 600px, Large: 800px
- **Padding**: 24px
- **Header**: 24px padding, border-bottom `1px solid #E4E4E7`
- **Footer**: 24px padding, border-top `1px solid #E4E4E7`

### Tags & Badges

#### Tags
- **Height**: 24px
- **Padding**: 4px 8px
- **Border Radius**: 4px
- **Background**: `#F4F4F5`
- **Text**: 12px, Medium, `#52525B`
- **Removable**: × icon on right, hover color `#EF4444`

#### Badges
- **Height**: 20px
- **Padding**: 2px 8px
- **Border Radius**: 9999px (full)
- **Variants**:
  - Default: Background `#F4F4F5`, Text `#52525B`
  - Success: Background `#DCFCE7`, Text `#166534`
  - Warning: Background `#FEF3C7`, Text `#92400E`
  - Error: Background `#FEE2E2`, Text `#991B1B`
  - Info: Background `#DBEAFE`, Text `#1E40AF`

## Motion & Animation System

### Timing Functions
- **Ease-out**: `cubic-bezier(0.0, 0, 0.2, 1)` – Entrances, expansions
- **Ease-in-out**: `cubic-bezier(0.4, 0, 0.6, 1)` – Transitions, movements
- **Ease-in**: `cubic-bezier(0.4, 0, 1, 1)` – Exits, collapses
- **Spring**: `cubic-bezier(0.34, 1.56, 0.64, 1)` – Playful interactions, bounces

### Duration Scale
- **Instant**: 75ms – Micro interactions, color changes
- **Fast**: 150ms – Hover effects, small state changes
- **Normal**: 250ms – Default transitions, dropdowns
- **Slow**: 350ms – Page transitions, modals
- **Slower**: 500ms – Complex animations, orchestrated sequences

### Animation Patterns

#### Fade
- Enter: opacity 0 → 1, duration 250ms, ease-out
- Exit: opacity 1 → 0, duration 200ms, ease-in

#### Slide
- Enter: translateY(16px) → translateY(0), opacity 0 → 1, duration 350ms, ease-out
- Exit: translateY(0) → translateY(16px), opacity 1 → 0, duration 250ms, ease-in

#### Scale
- Enter: scale(0.95) → scale(1), opacity 0 → 1, duration 250ms, ease-out
- Exit: scale(1) → scale(0.95), opacity 1 → 0, duration 200ms, ease-in

#### Accordion
- Expand: height 0 → auto, duration 350ms, ease-out
- Collapse: height auto → 0, duration 250ms, ease-in

### Loading States

#### Skeleton Screen
- Background: `linear-gradient(90deg, #F4F4F5 25%, #E4E4E7 50%, #F4F4F5 75%)`
- Animation: translateX(-100%) → translateX(100%), duration 1.5s, infinite

#### Spinner
- Size: Small: 16px, Medium: 24px, Large: 32px
- Color: Primary Blue `#0F4C75`
- Animation: rotate 360deg, duration 1s, linear, infinite

#### Progress Bar
- Height: 4px
- Background: `#E4E4E7`
- Fill: Primary Blue `#0F4C75`
- Animation: width transition, duration 350ms, ease-out

## Icon System

### Icon Sizes
- **Tiny**: 12px × 12px – Inline with small text
- **Small**: 16px × 16px – Buttons, inputs
- **Medium**: 20px × 20px – Default size
- **Large**: 24px × 24px – Primary actions
- **XL**: 32px × 32px – Feature icons
- **2XL**: 48px × 48px – Empty states, heroes

### Icon Guidelines
- Use Lucide React icons as primary icon set
- Stroke width: 1.5px for sizes ≤ 20px, 2px for larger
- Color: Inherit from parent text color
- Interactive icons: Include hover state with color change

## Dark Mode Specifications

### Dark Palette
- **Background Primary**: `#0A0A0B` – Main background
- **Background Secondary**: `#18181B` – Cards, surfaces
- **Background Tertiary**: `#27272A` – Elevated surfaces
- **Border**: `#3F3F46` – Dividers, borders
- **Text Primary**: `#FAFAFA` – Headings, primary text
- **Text Secondary**: `#A1A1AA` – Secondary text
- **Text Tertiary**: `#71717A` – Disabled, placeholder

### Dark Component Adaptations
- Shadows become subtle glows: `0 0 20px rgba(255, 255, 255, 0.05)`
- Increase contrast for interactive elements
- Use lighter variants of accent colors for better visibility
- Reduce overall color saturation by 10%

## Accessibility Guidelines

### Focus Management
- All interactive elements must have visible focus indicators
- Focus trap in modals and dropdowns
- Skip links for keyboard navigation
- Logical tab order throughout interface

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for all interactive elements
- Live regions for dynamic content updates
- Alt text for all images and icons

### Color & Contrast
- Minimum WCAG AA compliance (4.5:1 for normal text)
- Don't rely solely on color to convey information
- Provide patterns or icons alongside color coding
- Test with color blindness simulators

### Motion & Animation
- Respect `prefers-reduced-motion` setting
- Provide pause controls for auto-playing content
- Avoid flashing or strobing effects
- Keep essential animations under 5 seconds

### Touch Targets
- Minimum 44×44px for all interactive elements
- 8px minimum spacing between targets
- Provide hover states for desktop
- Include touch feedback for mobile

## Platform-Specific Guidelines

### Web Application
- Progressive enhancement approach
- Responsive from 320px to 4K displays
- Optimize for Core Web Vitals
- Support modern browsers (Chrome, Firefox, Safari, Edge latest 2 versions)

### Electron Desktop
- Native window controls integration
- System tray icon and notifications
- Keyboard shortcuts following OS conventions
- Auto-updater UI patterns

### Mobile Considerations
- Bottom sheet patterns for mobile actions
- Swipe gestures for navigation
- Thumb-friendly interaction zones
- Simplified navigation for small screens

## Implementation Notes

### CSS Architecture
- Use CSS custom properties for design tokens
- Implement CSS Modules or styled-components for scoping
- Maintain separate theme files for light/dark modes
- Use PostCSS for vendor prefixing and optimization

### Component Library Structure
```
/components
  /primitives     # Base components (Button, Input, etc.)
  /patterns       # Composite components (Forms, Cards, etc.)
  /layouts        # Page layouts and containers
  /features       # Feature-specific components
```

### Performance Budgets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1
- CSS Bundle: < 50KB (gzipped)
- Font Files: < 100KB total

### Testing Requirements
- Visual regression testing for all components
- Accessibility audit with axe-core
- Cross-browser testing matrix
- Performance monitoring with Lighthouse

## Version History

### v1.0 - August 2025
- Initial design system release
- Complete component library
- Accessibility compliance verified
- Dark mode support added

---

## Related Documentation
- [Component Library Storybook](#)
- [Design Tokens Repository](#)
- [Figma Design Files](#)
- [Brand Guidelines](#)
- [Accessibility Checklist](#)