# Visual Content Placement Guidelines

## Core Principle

Screenshots and diagrams serve the reader's comprehension, not decoration. Each visual should answer the question: "Would the reader get lost or confused without this?"

---

## Screenshots

### When to Include

**Screenshots go where the reader would otherwise get lost.**

Include a screenshot when:

- The reader encounters a UI for the first time
- The expected result isn't obvious from text alone
- The UI has changed since a prior version (critical for errata/revisions)
- Showing output as a confirmation checkpoint ("your terminal should now show this")

**The test:** "If the reader is following along, could they end up on the wrong screen or clicking the wrong thing?" If yes, add a screenshot.

### When to Skip

Don't screenshot things verifiable from text alone:

- ❌ "Click the Save button" — no screenshot needed
- ✅ "Navigate to Advanced Configuration under Settings > Build > Pipeline Variables" — screenshot helps

### Longevity Warning

Screenshots age poorly. Angular's UI will change. Third-party interfaces evolve. Consider whether a diagram could serve the same purpose with better shelf life.

---

## Architectural Diagrams

### When to Include

**Diagrams go where the reader needs to understand relationships before instructions.**

Place diagrams:

- At the beginning of chapters introducing new system layers
- When data flows through multiple layers (avoid prose like "A calls B which triggers C which writes to D")
- For before/after comparisons ("architecture now vs. after this chapter")
- When multiple team roles interact with different system parts
- When introducing a component that fits into a larger system

### Why Diagrams Age Better

Diagrams represent *your* design decisions, not third-party interfaces. They remain accurate as long as the architecture holds, regardless of UI changes in tools.

---

## Practical Workflow

1. **Write prose first**
2. **Read back as a newcomer** — mark every spot where you think "this would be easier if I could just *show* them"
3. **Prioritize ruthlessly** — too many images break reading flow and inflate production costs
4. **Favor diagrams over screenshots** where either would work, for longevity

---

## Quick Reference

| Situation | Visual Type | Include? |
|-----------|-------------|----------|
| First encounter with UI | Screenshot | ✅ Yes |
| Simple button click | Screenshot | ❌ No |
| Multi-step navigation | Screenshot | ✅ Yes |
| Terminal output checkpoint | Screenshot | ✅ Yes |
| New system layer intro | Diagram | ✅ Yes |
| Multi-layer data flow | Diagram | ✅ Yes |
| Before/after architecture | Diagram | ✅ Yes |
| Team role boundaries | Diagram | ✅ Yes |
