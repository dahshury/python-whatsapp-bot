# Glass Button Component - CSS Classes Reference

This document shows the exact CSS implementation for each class used in the glass button component from `test.css`.

## Main Button Element Classes

### Layout Classes

```css
.relative {
  position: relative;
}
.absolute {
  position: absolute;
}
.inline-block {
  display: inline-block;
}
.flex {
  display: flex;
}
```

### Sizing Classes

```css
.h-10 {
  height: calc(var(--spacing) * 10);
} /* 2.5rem / 40px */
.w-10 {
  width: calc(var(--spacing) * 10);
} /* 2.5rem / 40px */
.h-full {
  height: 100%;
}
.w-full {
  width: 100%;
}
```

### Spacing Classes

```css
.gap-1 {
  gap: calc(var(--spacing) * 1);
} /* 0.25rem */
.gap-1\.5 {
  gap: calc(var(--spacing) * 1.5);
} /* 0.375rem */
.p-1 {
  padding: calc(var(--spacing) * 1);
} /* 0.25rem */
.px-6 {
  padding-left: calc(var(--spacing) * 6);
  padding-right: calc(var(--spacing) * 6);
}
.py-1 {
  padding-block: calc(var(--spacing) * 1);
} /* 0.25rem */
```

### Positioning Classes

```css
.top-0 {
  top: calc(var(--spacing) * 0);
} /* 0px */
.right-0 {
  right: calc(var(--spacing) * 0);
} /* 0px */
.bottom-0 {
  bottom: calc(var(--spacing) * 0);
} /* 0px */
.left-0 {
  left: calc(var(--spacing) * 0);
} /* 0px */
.inset-0 {
  inset: calc(var(--spacing) * 0);
} /* 0px on all sides */
```

### Flexbox Alignment

```css
.items-center {
  align-items: center;
}
.justify-center {
  justify-content: center;
}
```

### Appearance & Interaction

```css
.appearance-none {
  appearance: none;
}
.cursor-pointer {
  cursor: pointer;
}
.select-none {
  -webkit-user-select: none;
  user-select: none;
}
.pointer-events-none {
  pointer-events: none;
}
.shrink-0 {
  flex-shrink: 0;
}
```

### Text & Typography

```css
.text-left {
  text-align: left;
}
.text-sm {
  font-size: var(--text-sm); /* 0.875rem */
  line-height: var(--tw-leading, var(--text-sm--line-height));
}
.font-semibold {
  --tw-font-weight: var(--font-weight-semibold);
  font-weight: var(--font-weight-semibold); /* 600 */
}
.text-t0-on-surface {
  color: var(--color-t0-on-surface);
} /* #e0e0e0 */
```

### Border & Radius

```css
.rounded-full {
  border-radius: 3.40282e38px;
} /* Essentially infinite */
.border-2 {
  border-style: var(--tw-border-style);
  border-width: 2px;
}
.border-t0-surface-border {
  border-color: var(--color-t0-surface-border);
} /* #000 */
```

### Background Gradients

```css
.bg-gradient-to-br {
  background-image: linear-gradient(var(--tw-gradient-stops));
  --tw-gradient-position: to bottom right in oklab;
}

.from-t0-surface-edge {
  --tw-gradient-from: var(--color-t0-surface-edge);
  --tw-gradient-stops: var(
    --tw-gradient-via-stops,
    var(--tw-gradient-position),
    var(--tw-gradient-from) var(--tw-gradient-from-position),
    var(--tw-gradient-to) var(--tw-gradient-to-position)
  );
}

.from-t0-surface-highlight {
  --tw-gradient-from: var(--color-t0-surface-highlight);
  --tw-gradient-stops: var(
    --tw-gradient-via-stops,
    var(--tw-gradient-position),
    var(--tw-gradient-from) var(--tw-gradient-from-position),
    var(--tw-gradient-to) var(--tw-gradient-to-position)
  );
}

.to-t0-surface {
  --tw-gradient-to: var(--color-t0-surface);
  --tw-gradient-stops: var(
    --tw-gradient-via-stops,
    var(--tw-gradient-position),
    var(--tw-gradient-from) var(--tw-gradient-from-position),
    var(--tw-gradient-to) var(--tw-gradient-to-position)
  );
}

.to-50\% {
  --tw-gradient-to-position: 50%;
}
```

### Overlay Gradients (For Press/Hover Effects)

```css
.via-t0-surface-black\/0 {
  --tw-gradient-via: color-mix(
    in oklab,
    var(--color-t0-surface-black) 0%,
    transparent
  );
  --tw-gradient-via-stops: var(--tw-gradient-position),
    var(--tw-gradient-from) var(--tw-gradient-from-position), var(
        --tw-gradient-via
      ) var(--tw-gradient-via-position),
    var(--tw-gradient-to) var(--tw-gradient-to-position);
  --tw-gradient-stops: var(--tw-gradient-via-stops);
}

.from-t0-surface-black\/\[0\.5\] {
  --tw-gradient-from: color-mix(
    in oklab,
    var(--color-t0-surface-black) 50%,
    transparent
  );
  --tw-gradient-stops: var(
    --tw-gradient-via-stops,
    var(--tw-gradient-position),
    var(--tw-gradient-from) var(--tw-gradient-from-position),
    var(--tw-gradient-to) var(--tw-gradient-to-position)
  );
}

.to-t0-surface-white\/\[0\.1\] {
  --tw-gradient-to: color-mix(
    in oklab,
    var(--color-t0-surface-white) 10%,
    transparent
  );
  --tw-gradient-stops: var(
    --tw-gradient-via-stops,
    var(--tw-gradient-position),
    var(--tw-gradient-from) var(--tw-gradient-from-position),
    var(--tw-gradient-to) var(--tw-gradient-to-position)
  );
}
```

### Shadow & Depth

```css
.shadow-t0-surface-raised {
  --tw-shadow: 2px 2px 4px color-mix(in oklab, var(--color-t0-surface-black) var(
            --t0-shadow-raised-black-opacity
          ), transparent), -2px -2px 4px color-mix(in oklab, var(
            --color-t0-surface-white
          ) var(--t0-shadow-raised-white-opacity), transparent);
  box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(
      --tw-ring-offset-shadow
    ), var(--tw-ring-shadow), var(--tw-shadow);
}
```

Where:

- `--t0-shadow-raised-black-opacity: 50%`
- `--t0-shadow-raised-white-opacity: 5%`

### Focus States

```css
.focus:ring-0 { focus-visible:ring-width: 0px; }
.focus:outline-0 { focus-visible:outline-width: 0px; }
```

### Opacity & Visibility

```css
.opacity-0 {
  opacity: 0;
}

.group-active\/button\: opacity-100:is(:where(.group\/button):active *) {
  opacity: 1;
}

.group-active\/button\: opacity-75:is(:where(.group\/button):active *) {
  opacity: 0.75;
}
```

### Transforms & Scale

```css
.scale-95 {
  --tw-scale-x: 95%;
  --tw-scale-y: 95%;
  --tw-scale-z: 95%;
}

.group-active\/button\: scale-95:is(:where(.group\/button):active *) {
  --tw-scale-x: 95%;
  --tw-scale-y: 95%;
  --tw-scale-z: 95%;
  scale: var(--tw-scale-x) var(--tw-scale-y);
}
```

### Duration & Transitions

```css
.duration-200 {
  --tw-duration: 0.2s;
  transition-duration: 0.2s;
}

.transition-\[transform\,opacity\,scale\] {
  transition-property: transform, opacity, scale;
  transition-timing-function: var(
    --tw-ease,
    var(--default-transition-timing-function)
  );
  transition-duration: var(--tw-duration, var(--default-transition-duration));
}

/* Where defaults are: */
/* --default-transition-duration: 0.15s */
/* --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) */
```

## T0 Design System Variables

```css
--color-t0-surface: #101010
--color-t0-on-surface: #e0e0e0
--color-t0-surface-border: #000
--color-t0-surface-edge: color-mix(in oklab, var(--color-t0-surface-white) 22%, var(--color-t0-surface-original))
--color-t0-surface-highlight: color-mix(in oklab, var(--color-t0-surface-white) 6%, var(--color-t0-surface-original))
--color-t0-surface-white: #fff
--color-t0-surface-black: #000
--spacing: 0.25rem
```

## Complete Button Composition

The glass button consists of these nested elements:

```
<a class="relative h-10 w-10 flex shrink-0 rounded-full cursor-pointer ...">
  <!-- Outer gradient border (3D depth) -->
  <div class="absolute top-0 right-0 bottom-0 left-0 rounded-full pointer-events-none
              bg-gradient-to-br to-50% from-t0-surface-edge to-t0-surface
              shadow-t0-surface-raised border-2 border-t0-surface-border">
  </div>

  <!-- Inner highlight gradient (glass shine) -->
  <div class="absolute left-[3px] top-[3px] right-[3px] bottom-[3px] rounded-full
              pointer-events-none
              bg-gradient-to-br to-50% from-t0-surface-highlight to-t0-surface">
    <!-- Press overlay (opacity changes on active) -->
    <div class="absolute inset-0 rounded-full
                bg-gradient-to-br via-t0-surface-black/0
                from-t0-surface-black/[0.5] to-t0-surface-white/[0.1]
                opacity-0 group-active/button:opacity-100 duration-200">
    </div>
  </div>

  <!-- Content with transitions -->
  <div class="relative flex items-center justify-center font-semibold text-sm
              duration-200 px-6 py-1 gap-1 transition-[transform,opacity,scale]
              group-active/button:scale-95 group-active/button:opacity-75">
    [Content here]
  </div>

  <!-- Ripple effect container -->
  <span class="absolute pointer-events-none rounded-full" style="inset: 3px">
    [Ripple element]
  </span>
</a>
```

## Key CSS Properties Explained

### 3D Depth Effect

The `shadow-t0-surface-raised` creates 3D depth with:

- **Right-bottom shadow**: `2px 2px 4px #000 (50% opacity)` - Creates shadow below
- **Left-top highlight**: `-2px -2px 4px #fff (5% opacity)` - Creates light reflection above

### Glass Morphism

Two-layer gradient system:

1. **Outer**: `to-50% from-t0-surface-edge to-t0-surface` - Darker outer edge
2. **Inner**: `to-50% from-t0-surface-highlight to-t0-surface` - Lighter inner shine

### Press Animation

- Scale down to 95% via `group-active/button:scale-95`
- Opacity to 75% via `group-active/button:opacity-75`
- Gradient overlay from 0% to 100% opacity via `group-active/button:opacity-100`

### Ripple Effect (JavaScript-Driven)

- Container: `inset: 3px` (3px margin from edges)
- Radius: `radial-gradient(circle, color-mix(in oklab, rgb(255, 255, 255) 15%, transparent), transparent 50%)`
- Follows mouse position with `transform: translate3d(x, y, 0)`
