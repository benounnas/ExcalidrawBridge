# Recommended Prompt

Copy-paste this into your AI client **before** your drawing request. It ensures clean, non-overlapping diagrams with proper spacing and layout.

---

You are about to draw an Excalidraw diagram. Before writing any elements, you MUST follow these layout rules strictly:

## Layout Planning (do this mentally before any create_view call)

1. **Grid-based placement**: Divide your canvas into a logical grid. For a standard 800x600 camera:
   - Columns: x = 100, 320, 540 (3-column layout, 220px wide each, 20px gaps)
   - Rows: y = 100, 240, 380 (3-row layout, 140px tall each, 20px gaps)
   - Adjust grid size based on how many elements you need

2. **Calculate all positions first**: Before emitting ANY elements, mentally assign every shape, label, and arrow to a grid cell. Write them down in your reasoning. Never place elements ad-hoc.

3. **Minimum spacing**: Always keep at least **60px** between any two shapes (edge to edge, not center to center). This gap must accommodate arrow lines AND their labels without overlapping either shape. If an arrow between two shapes has a label, increase the gap to **at least label_width + 40px** so the label floats freely in the space between shapes.

## Element Rules

4. **Consistent sizing**: All shapes serving the same role must have identical dimensions. For example, if one process box is 200x80, ALL process boxes must be 200x80.

5. **Label fitting**: When using `label` on shapes, ensure the shape is wide enough: `width >= text.length * fontSize * 0.55 + 40`. If the label is long, make the shape wider — never let text overflow. For diamonds, multiply the required width by **1.5** since the diamond inscribes the label area.

6. **Title placement**: Titles go at the top, centered over the total diagram width. Calculate: `title_x = diagram_left + (diagram_width - title_text_width) / 2`.

7. **Arrow labels — space budget**: Before placing an arrow with a label, calculate: `label_width = text.length * fontSize * 0.5`. The gap between the two connected shapes MUST be `>= label_width + 40px`. If the gap is too small, **widen the gap** by repositioning elements — never squeeze a label into a tight space. Unlabeled arrows can use shorter gaps (minimum 60px).

8. **Arrow routing**:
   - Arrows connect from the **nearest edges** of their source and target
   - Horizontal flow: use right edge (fixedPoint [1, 0.5]) to left edge (fixedPoint [0, 0.5])
   - Vertical flow: use bottom edge (fixedPoint [0.5, 1]) to top edge (fixedPoint [0.5, 0])
   - Never route arrows diagonally through other elements — use L-shaped paths with intermediate points if needed

9. **Annotations and subtitles**: If a shape has a subtitle or annotation text below it, leave at least **30px** between the shape's bottom edge and the annotation. The annotation must not extend horizontally beyond the gap between neighboring shapes.

## Camera Rules

10. **Camera padding**: The camera must have at least **80px** padding on all sides around your content. If your elements span from x=100 to x=700 (600px wide), use an 800px wide camera starting at x=20.

11. **Camera FIRST**: Always emit a cameraUpdate as the very first element. Pick the right size:
   - 2-4 elements: 400x300 or 600x450
   - 5-10 elements: 800x600
   - 11-20 elements: 1200x900
   - 20+ elements: 1600x1200 (increase font sizes to 18+ minimum)

12. **Prefer fewer elements per camera**: If your diagram has many elements, split into two rows or use a larger camera rather than cramming everything into a tight single row. A 10-element horizontal flow should use 1200x900 minimum, not 800x600.

## Visual Consistency

13. **Color coding**: Assign colors by role and stick to them throughout:
    - Input/source nodes: light blue (`#a5d8ff`)
    - Processing/action nodes: light purple (`#d0bfff`)
    - Output/result nodes: light green (`#b2f2bb`)
    - Warning/decision nodes: light yellow (`#fff3bf`)
    - Error/critical nodes: light red (`#ffc9c9`)
    - Storage/data nodes: light teal (`#c3fae8`)

14. **Flow direction**: Pick ONE primary direction (left-to-right OR top-to-bottom) and stick with it. Never mix flow directions in the same diagram.

15. **Font sizes**: Use exactly 2-3 font sizes in a diagram, no more:
    - Title: 24-28
    - Shape labels: 16-20
    - Arrow labels / annotations: 14-16

## Anti-Overlap Checklist (verify before emitting)

Before calling create_view, mentally verify:
- [ ] No two shapes share the same grid cell
- [ ] No text extends beyond its container shape
- [ ] **Every arrow label fits inside its gap**: for each labeled arrow, confirm `gap_between_shapes >= label_width + 40px`
- [ ] All elements have >= 60px clearance from neighbors (edge to edge)
- [ ] Title doesn't overlap with the first row of shapes (leave >= 40px gap below title)
- [ ] Zone/background rectangles (if used) have opacity <= 35 and don't obscure foreground elements
- [ ] Annotations/subtitles don't extend into neighboring shapes' columns
- [ ] Diamonds have 1.5x the width a rectangle would need for the same label

## Progressive Drawing Order

Emit elements in this exact order:
1. cameraUpdate (set the viewport)
2. Background zones (large, low-opacity rectangles) if any
3. Title text
4. For each logical group (left to right, top to bottom):
   a. Shape with label
   b. Any standalone text annotations for that shape
   c. Arrows FROM that shape to the next
5. Decorative elements (icons, illustrations) last

Now, with all these rules in mind, draw the following:

[YOUR REQUEST HERE]
