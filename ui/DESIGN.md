---
name: Clinical Precision
colors:
  surface: '#FFFFFF'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#069669'
  error: '#EF4444'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  border: '#E2E8F0'
  success: '#22C55E'
  warning: '#EAB308'
  info: '#0EA5E9'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.25'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  code-tabular:
    fontFamily: monospace
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 800px
  gutter: 24px
---

## Brand & Style

This design system is engineered for clinical precision, reliability, and emotional calm. It bridges the gap between professional medical standards and modern developer tools, prioritizing clarity and trust. The aesthetic is rooted in **Corporate / Modern** principles with a focus on high-utility information density balanced by generous whitespace to reduce cognitive load during technical tasks.

The visual language communicates authority through deep, stable tones (Primary Navy) and progress through organic, health-oriented accents (Sage Green). The design avoids decorative flourishes, relying instead on systematic layouts, crisp typography, and subtle elevation to guide the user through the GitHub data fetching process. The result is an interface that feels like a dependable diagnostic tool rather than a standard consumer app.

## Colors

The palette is anchored by **Primary Navy**, used for structural elements and primary actions to establish a sense of gravity and professional permanence. **Tertiary Sage** is utilized strategically for success states, secondary calls to action, and indicators of active health or connectivity (e.g., a valid GitHub Token).

- **Primary Navy (#0F172A):** Use for headers, primary buttons, and heavy text.
- **Secondary Slate (#64748B):** Reserved for supporting text and non-critical UI borders.
- **Sage Green (#059669):** Used for highlighting "healthy" states and verified data points.
- **Neutral Blue-Gray (#F8FAFC):** The standard background color to ensure high contrast against white surface cards.

Color application must be disciplined: use Sage only for positive validation (Token Verified) and Navy for the structural hierarchy.

## Typography

The typography system uses a dual-font approach to balance editorial authority with functional legibility. **Plus Jakarta Sans** provides a modern, geometric feel for headings, ensuring that titles like "GitHub Account Fetcher" feel impactful. **DM Sans** is used for all body copy and form inputs, chosen for its neutral, highly readable character.

For numerical data, such as "Public Repos" or "Followers," use a monospaced font or the `code-tabular` style to ensure vertical alignment in lists and tables, reinforcing the medical-grade precision of the tool. Label styles for chips and metadata should use the `label-caps` variant to create a clear visual distinction from standard body text.

## Layout & Spacing

The design system employs a **Fixed Grid** philosophy for the main tool interface, centering content within an 800px container to focus the user's attention on the form and results. This prevents long-form GitHub data (like bios) from stretching awkwardly on ultra-wide monitors.

A strict **8px base unit** governs all spacing.
- **Form Layout:** Use `xl` (32px) gaps between the Token Input section and the Results display.
- **Internal Padding:** Cards and result modules should use `lg` (24px) padding to maintain a spacious, clinical feel.
- **Mobile Adaptivity:** On devices below 640px, reduce horizontal margins to `md` (16px) and switch to a single-column layout for all user attributes (e.g., Repo count and Followers stack vertically).

## Elevation & Depth

This system utilizes **Tonal Layers** supplemented by **Ambient Shadows** to create a focused hierarchy. The background remains flat and neutral (#F8FAFC), while interactive elements and data containers reside on white surface cards (#FFFFFF).

Depth is communicated through two primary levels:
1. **Flat Surface:** Default state for inactive cards or secondary information. Defined by a 1px #E2E8F0 border and no shadow.
2. **Raised Surface:** Used for the active Token Input card and the primary User Profile result. These use a "Clinical Shadow": a very soft, diffused 16px blur with low-opacity navy tinting (#0F172A at 7%).

Avoid high-contrast shadows or vibrant blurs. The goal is to make elements feel "placed" on a sterilized surface rather than floating in space.

## Shapes

The shape language is **Rounded**, using an 8px (0.5rem) base radius for buttons, input fields, and cards. This specific curvature is chosen to soften the "industrial" feel of the deep navy palette, making the tool feel approachable and modern.

Smaller elements like badges or status chips use a smaller 4px radius (`rounded-sm`), while larger container transitions or profile avatars should utilize the `full` pill-shape to distinguish them from functional UI components.

## Components

### Buttons
- **Primary:** Navy (#0F172A) fill with White text. High-contrast and solid for the "Fetch Account" action.
- **Secondary:** Sage Green (#059669) fill for "Save to Database" or "Verify" actions.
- **States:** Hovering on Primary buttons should slightly darken the navy; disabled states for both should be 40% opacity with a `not-allowed` cursor.

### Input Fields (Token Input)
- **Visuals:** 1px #E2E8F0 border, 8px radius. 
- **Privacy:** Must use `type="password"` styling to mask the GitHub Token.
- **Focus:** 2px Navy border with a soft Navy ring shadow (3px) to indicate active engagement.

### User Information Cards
- **Structure:** White background, 8px radius, elevated shadow.
- **Header:** A tinted Navy strip at the top of the card can be used to display the GitHub Login name.
- **Layout:** Use a 2-column grid for user stats (Repos, Followers, Following) and a full-width row for the Bio and Company info.

### Status Chips
- **Validation:** Use Sage Green for "Token Valid" and Error Red for "Invalid Token". 
- **Style:** Small 4px radius, uppercase text, 12px font size with 0.5px tracking.

### Lists (Account Fields)
- **Style:** Clean rows with 1px #F1F5F9 dividers. 
- **Typography:** DM Sans 14px for labels, Navy 16px for the value (e.g., "Email: example@git.com").