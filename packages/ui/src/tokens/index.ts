/**
 * Saludlink design tokens as typed JS — for non-CSS consumers (OG image generation,
 * JSON-LD theme color, email templates, canvas). Mirrors tokens.css; keep in sync.
 */
export const colors = {
  evergreen: {
    50: "#f0f4f1",
    100: "#dbe7de",
    200: "#b8cfbf",
    300: "#8fb29a",
    400: "#5e8a6e",
    500: "#3d6b50",
    600: "#2e5540",
    700: "#234233",
    800: "#1a3227",
    900: "#12241c",
  },
  sand: {
    50: "#f7f2ea",
    100: "#f0e9dd",
    200: "#e4d9c7",
    300: "#d2c3aa",
    400: "#b3a284",
    500: "#8f7f62",
    600: "#6f6249",
  },
  clay: {
    50: "#fbf0ea",
    100: "#f5dccf",
    200: "#e9b79f",
    300: "#dd9270",
    400: "#d1734b",
    500: "#c56b4e",
    600: "#a5523a",
    700: "#83402e",
  },
  gold: { 300: "#e0c583", 500: "#c99a4e", 700: "#9a7433" },
  cream: "#fbf8f3",
  ink: "#1b211d",
  inkMuted: "#5a625b",
} as const;

export const brand = {
  name: "Saludlink",
  legalEntity: "Saludlink, Inc.", // TODO: replace with the real registered entity for LegitScript
  domain: "saludlinkusa.com",
  themeColor: colors.evergreen[600],
  tagline: "Metabolic health, thoughtfully delivered.",
} as const;

export const fonts = {
  display: "Fraunces",
  body: "Inter",
  mono: "IBM Plex Mono",
} as const;
