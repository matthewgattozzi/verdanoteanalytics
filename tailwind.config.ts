import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        heading: ["Outfit", "sans-serif"],
        body: ["Outfit", "sans-serif"],
        data: ["Space Mono", "monospace"],
        mono: ["Space Mono", "monospace"],
        label: ["Space Grotesk", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        verdant: {
          DEFAULT: "hsl(152 63% 29%)",
          light: "hsl(152 55% 36%)",
        },
        forest: "hsl(155 56% 15%)",
        sage: {
          DEFAULT: "hsl(150 18% 72%)",
          light: "hsl(147 35% 93%)",
        },
        cream: {
          DEFAULT: "hsl(40 33% 96%)",
          dark: "hsl(38 24% 92%)",
        },
        gold: {
          DEFAULT: "hsl(40 60% 55%)",
          light: "hsl(40 55% 90%)",
        },
        scale: "hsl(var(--scale))",
        watch: "hsl(var(--watch))",
        kill: "hsl(var(--kill))",
        "tag-parsed": "hsl(var(--tag-parsed))",
        "tag-csv": "hsl(var(--tag-csv))",
        "tag-manual": "hsl(var(--tag-manual))",
        "tag-untagged": "hsl(var(--tag-untagged))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "8px",
        button: "6px",
        input: "4px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(13,59,37,0.06), 0 1px 2px rgba(13,59,37,0.04)",
        "card-hover": "0 4px 12px rgba(13,59,37,0.08), 0 2px 4px rgba(13,59,37,0.04)",
        modal: "0 12px 40px rgba(13,59,37,0.12), 0 4px 12px rgba(13,59,37,0.06)",
      },
      fontSize: {
        display: ["2.5rem", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["1.875rem", { lineHeight: "1.2", fontWeight: "600" }],
        h2: ["1.375rem", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["1.125rem", { lineHeight: "1.4", fontWeight: "500" }],
        "data-lg": ["1.5rem", { lineHeight: "1.2", fontWeight: "700" }],
        data: ["0.9375rem", { lineHeight: "1.5", fontWeight: "400" }],
        "data-sm": ["0.8125rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
