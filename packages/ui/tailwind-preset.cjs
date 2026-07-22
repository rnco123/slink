/**
 * Saludlink Tailwind preset.
 * Maps the design tokens (tokens.css custom properties) into Tailwind's theme so
 * utility classes and components share one source of truth. Consumed by the storefront
 * Tailwind config via `presets: [require("@saludlink/ui/tailwind-preset")]`.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        evergreen: {
          50: "var(--sl-evergreen-50)",
          100: "var(--sl-evergreen-100)",
          200: "var(--sl-evergreen-200)",
          300: "var(--sl-evergreen-300)",
          400: "var(--sl-evergreen-400)",
          500: "var(--sl-evergreen-500)",
          600: "var(--sl-evergreen-600)",
          700: "var(--sl-evergreen-700)",
          800: "var(--sl-evergreen-800)",
          900: "var(--sl-evergreen-900)",
          DEFAULT: "var(--sl-evergreen-600)",
        },
        sand: {
          50: "var(--sl-sand-50)",
          100: "var(--sl-sand-100)",
          200: "var(--sl-sand-200)",
          300: "var(--sl-sand-300)",
          400: "var(--sl-sand-400)",
          500: "var(--sl-sand-500)",
          600: "var(--sl-sand-600)",
        },
        clay: {
          50: "var(--sl-clay-50)",
          100: "var(--sl-clay-100)",
          200: "var(--sl-clay-200)",
          300: "var(--sl-clay-300)",
          400: "var(--sl-clay-400)",
          500: "var(--sl-clay-500)",
          600: "var(--sl-clay-600)",
          700: "var(--sl-clay-700)",
          DEFAULT: "var(--sl-clay-500)",
        },
        gold: {
          300: "var(--sl-gold-300)",
          500: "var(--sl-gold-500)",
          700: "var(--sl-gold-700)",
          DEFAULT: "var(--sl-gold-500)",
        },
        cream: "var(--sl-cream)",
        ink: {
          DEFAULT: "var(--sl-ink)",
          muted: "var(--sl-ink-muted)",
          subtle: "var(--sl-ink-subtle)",
          inverse: "var(--sl-ink-inverse)",
        },
        surface: {
          DEFAULT: "var(--sl-surface)",
          raised: "var(--sl-surface-raised)",
          sunken: "var(--sl-surface-sunken)",
        },
        line: {
          DEFAULT: "var(--sl-border)",
          strong: "var(--sl-border-strong)",
        },
        success: "var(--sl-success)",
        warning: "var(--sl-warning)",
        error: "var(--sl-error)",
        info: "var(--sl-info)",
      },
      fontFamily: {
        display: "var(--sl-font-display)",
        body: "var(--sl-font-body)",
        mono: "var(--sl-font-mono)",
      },
      fontSize: {
        xs: "var(--sl-text-xs)",
        sm: "var(--sl-text-sm)",
        base: "var(--sl-text-base)",
        lg: "var(--sl-text-lg)",
        xl: "var(--sl-text-xl)",
        "2xl": "var(--sl-text-2xl)",
        "3xl": "var(--sl-text-3xl)",
        "4xl": "var(--sl-text-4xl)",
        "5xl": "var(--sl-text-5xl)",
      },
      lineHeight: {
        tight: "var(--sl-leading-tight)",
        snug: "var(--sl-leading-snug)",
        normal: "var(--sl-leading-normal)",
        relaxed: "var(--sl-leading-relaxed)",
      },
      borderRadius: {
        sm: "var(--sl-radius-sm)",
        DEFAULT: "var(--sl-radius)",
        lg: "var(--sl-radius-lg)",
        xl: "var(--sl-radius-xl)",
        pill: "var(--sl-radius-pill)",
      },
      boxShadow: {
        sm: "var(--sl-shadow-sm)",
        DEFAULT: "var(--sl-shadow)",
        lg: "var(--sl-shadow-lg)",
        focus: "var(--sl-shadow-focus)",
      },
      maxWidth: {
        container: "var(--sl-container)",
        narrow: "var(--sl-container-narrow)",
      },
      transitionTimingFunction: {
        editorial: "var(--sl-ease)",
      },
    },
  },
};
