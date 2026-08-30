# Signal — Design Exploration

## Three Possible Directions

### 1. The Product Ledger
**Very Brief Intro:** A modern consumer-reports ledger: confident typography, warm paper-like neutrals, and dense but beautifully ordered product intelligence. It makes shopping feel calmer and more considered.

**Probability:** 0.07

### 2. Interface for Curiosity
**Very Brief Intro:** A tactile editorial explorer composed of overlapping media panels, hand-drawn data marks, and inky product cards. It invites discovery without the visual noise of a marketplace.

**Probability:** 0.04

### 3. Quiet Signal
**Very Brief Intro:** A precision-led shopping workspace inspired by premium print magazines and the clarity of a modern operating system. The visual system uses a warm ivory field, dark ink typography, and one highly recognizable electric tangerine signal.

**Probability:** 0.09

## Chosen Direction: Quiet Signal

### Design Movement
**Contemporary editorial minimalism**, drawing from independent product journalism, mid-century information design, and restrained industrial UI systems.

### Core Principles
1. **Signal over noise:** Every panel earns its place and presents a clear decision aid: price, fit, trade-off, or next action.
2. **Editorial confidence:** Information feels evaluated and authored, never like an undifferentiated product feed.
3. **Warm precision:** Generous paper-toned space tempers the technical rigor of scores, filters, and comparison cues.
4. **Guided autonomy:** The assistant helps shoppers reason, but always leaves them in control of the search and decision.

### Color Philosophy
A soft **porcelain-ivory** background establishes trust and allows product visuals to breathe. **Graphite ink** carries all important text for print-like legibility. A vivid, warm **signal tangerine** is reserved for decisive moments—assistant activation, active choices, and value highlights—so it reads as intelligence arriving, not a blanket marketing color. Moss green is an earned positive status, never a decorative accent.

### Layout Paradigm
The homepage is an **editorial field**, rather than a centered landing-page stack. A strong left-aligned hero begins the story; a floating assistant console cuts across it, while secondary discovery modules form an intentionally staggered lower landscape. On wider screens, a slender vertical rail acts as a navigation and status anchor. Mobile collapses these into a thumb-friendly bottom dock.

### Signature Elements
1. **The Signal Dot:** an oversize tangerine circular indicator that marks personalized, active, or decision-ready moments.
2. **Verdict Strips:** compact, color-aware editorial verdicts inside cards, such as “Good buy at this price” and “Built for your desk setup.”
3. **Contour Lines:** understated curved linework and faint granular texture that imply scanning, matching, and movement through a product landscape.

### Interaction Philosophy
Interactions feel brisk and grounded. The assistant query control visibly enters a focused “listening” state; product cards lift a few pixels and surface comparison or save controls only when relevant. All key decisions—saving, comparing, refining a search—receive immediate, plain-language feedback.

### Animation
Use only transform and opacity animation. Cards can rise 4px over 180ms with a crisp cubic-bezier ease; assistant selections and the signal dot use restrained 160–220ms transitions. Section content may enter in 40ms staggered steps on first render. The experience honors reduced-motion preferences by removing all non-essential transitions.

### Typography System
**DM Serif Display** leads with high-contrast, editorial headlines and occasional italic emphasis. **Manrope** handles UI, metadata, navigation, and product intelligence for compact clarity. Headlines are uncommonly large and tightly tracked; assistant and commerce labels use small uppercase Manrope with relaxed tracking. No generic default sans-serif is used as the visual identity.

### Brand Essence
**Signal is an editorially intelligent shopping companion for people who want to choose with confidence, not browse endlessly.**

Personality: **discerning, calm, incisive**.

### Brand Voice
Headlines are specific, informative, and slightly conversational. CTAs are direct but never aggressive. Microcopy exposes reasoning in friendly, concise language.

Example lines:

> Tell Signal what you need. We’ll do the narrowing.

> Better for your desk. Less bulk in your bag.

### Wordmark & Logo
The mark is a bold **tangerine signal orb** cut by two graphite scan arcs—an abstract S that reads as both discovery and a focused point of attention. The wordmark pairs a custom-feeling narrow serif “Signal” with a restrained sans descriptor in the product UI.

### Signature Brand Color
**Signal Tangerine — #FF5A36**

## Style Decisions

### Catalog-First Revision
Signal now prioritizes a **business-first affiliate storefront** over a showcase-led homepage. The first screen must provide a fast path into product discovery: department navigation, a search field, high-intent category chips, and visible deal or budget entry points. The core page is a working catalog, not a marketing story.

The visual system remains Quiet Signal, but its role is more restrained. It should make high-value conversion signals easier to see: editorial fit, product use-case, current-price handoff, comparison selection, and clear retailer access. Promotional illustration is minimized in favor of dense but breathable product cards, practical filters, trustworthy disclosures, and no invented reviews, prices, scarcity, or claims.

The product grid is the dominant visual area. Cards use readable product names, a concise editorial reason, a transparent score label, and a clear **Check current price** retailer action. Until a compliant product/affiliate feed is connected, prices and destination links are intentionally not fabricated; CTA feedback clearly describes this prototype limitation.
