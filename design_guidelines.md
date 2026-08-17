# LiLove - Design Guidelines

## Design Approach
**Design System Approach**: Following Material Design 3 principles with inspiration from Linear, Notion, and professional analytics platforms like Amplitude. Emphasizes data clarity, progress visualization, and trustworthy intelligence interfaces with sophisticated dark-first implementation.

## Core Design Elements

### A. Color Palette
**Dark Mode Primary** (default):
- Background: 215 25% 6% (deep navy)
- Surface: 215 20% 10% (elevated panels)
- Surface variant: 215 15% 14% (cards, inputs)
- Primary brand: 210 100% 60% (intelligent blue)
- Secondary: 165 75% 50% (progress teal)
- Success: 140 70% 55% (achievement green)
- Warning: 35 85% 60% (attention amber)

**Light Mode** (toggle available):
- Background: 210 20% 98% (clean white)
- Surface: 210 15% 100% (pure panels)
- Primary maintains saturation for accessibility

### B. Typography
- **Primary**: Inter (Google Fonts) - data clarity and readability
- **Display**: Cal Sans (or Inter Black) - confident headers
- **Monospace**: JetBrains Mono - metrics and code
- Hierarchy: Display (28-40px), H1 (24px), H2 (20px), Body (16px), Caption (14px)

### C. Layout System
**Tailwind Spacing Units**: 2, 4, 6, 8, 12, 16, 20
- Tight spacing: p-2, gap-4
- Standard: p-6, gap-8
- Generous: py-12, px-16
- Dashboard grids: gap-6 for cards, gap-8 for sections

### D. Component Library

**Navigation**:
- Collapsible sidebar with achievement indicators
- Breadcrumb navigation for deep task hierarchies
- Command palette for quick actions (⌘K)

**Data Visualization**:
- Clean line charts with gradient fills below curves
- Progress rings with animated completion states
- Metric cards with large numbers and trend arrows
- Heat maps for habit tracking with subtle color variations

**AI Coaching Interface**:
- Chat bubbles with user/AI distinction
- Typing indicators and message timestamps
- Suggestion chips for quick responses
- Context-aware coaching panels

**Task Management**:
- Kanban boards with drag-and-drop
- Priority indicators using color-coded borders
- Due date badges with urgency states
- Checkbox animations with satisfying micro-interactions

**Gamification Elements**:
- Badge collections with earning animations
- Experience bars with level progression
- Streak counters with fire emojis
- Achievement unlocks with celebration effects

### E. Visual Effects

**Material Design Elevation**:
- Cards: shadow-sm with hover:shadow-md
- Modals: shadow-xl with backdrop blur
- FABs: shadow-lg with subtle bounce

**Data-Focused Gradients**:
- Chart fills: Subtle blue-to-teal for positive metrics
- Progress bars: Linear gradients showing completion
- Background accents: Very subtle surface-to-background gradients

**Micro-Animations**:
- Number counting up for new achievements
- Chart data animating in on load
- Checkbox completion with scale transform
- Loading skeletons for data fetching

## Dashboard Layout Strategy

**Main Dashboard Sections**:
1. **Overview**: Key metrics, recent achievements, AI insights
2. **Goals**: Active objectives with progress visualization
3. **Analytics**: Detailed performance charts and trends
4. **Tasks**: Prioritized action items with smart scheduling
5. **AI Coach**: Conversational guidance and recommendations

**Information Hierarchy**:
- Primary metrics prominently displayed
- Secondary data accessible but not overwhelming
- AI suggestions contextually placed
- Actions clearly separated from analytics

## Responsive Behavior
- Desktop: Multi-column dashboard with detailed charts
- Tablet: Stacked cards with preserved data density
- Mobile: Single-column flow with swipeable metric cards
- Consistent dark mode across all form inputs and interactive elements

## Trust & Intelligence Indicators
- Subtle animation on AI thinking states
- Confidence scores for AI recommendations
- Data source transparency in tooltips
- Professional color usage avoiding gaming aesthetics
- Clean typography emphasizing credibility over excitement

## Images
**Dashboard Background**: Minimal geometric patterns or subtle grid overlay (not a large hero image)
**Empty States**: Simple illustrations for goal setting, task completion
**Achievement Graphics**: Icon-based badges and progress indicators
**AI Avatar**: Clean, professional representation (optional geometric avatar)

This design creates a sophisticated platform that balances analytical depth with motivational engagement, positioning LiLove as a premium intelligence tool for high-performing individuals.