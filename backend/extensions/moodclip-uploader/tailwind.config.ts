import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx,js,jsx}",
    "./web-app/src/**/*.{ts,tsx,js,jsx}"
  ],
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
      },
      fontFamily: {
        heading: ["Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(320 100% 65% / 0.4)",
          },
          "50%": {
            boxShadow: "0 0 30px hsl(320 100% 65% / 0.6)",
          },
        },
        "progress-fill": {
          "0%": {
            width: "0%",
          },
          "100%": {
            width: "100%",
          },
        },
        "gradient-breathe": {
          "0%, 100%": {
            backgroundPosition: "0% 50%",
          },
          "50%": {
            backgroundPosition: "100% 50%",
          },
        },
        "gradient-entrance": {
          "0%": {
            opacity: "0",
            backgroundPosition: "0% 50%",
          },
          "100%": {
            opacity: "1",
            backgroundPosition: "50% 50%",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px) scale(0.95)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
        },
        "liquid-wobble": {
          "0%, 100%": {
            borderRadius: "1.5rem",
            transform: "scale(1)",
          },
          "25%": {
            borderRadius: "1.6rem 1.4rem 1.5rem 1.5rem",
            transform: "scale(1.002)",
          },
          "50%": {
            borderRadius: "1.4rem 1.6rem 1.5rem 1.5rem",
            transform: "scale(1)",
          },
          "75%": {
            borderRadius: "1.5rem 1.5rem 1.6rem 1.4rem",
            transform: "scale(1.001)",
          },
        },
        "aurora-drift": {
          "0%, 100%": {
            backgroundPosition: "0% 0%",
            transform: "rotate(0deg)",
          },
          "25%": {
            backgroundPosition: "100% 50%",
            transform: "rotate(1deg)",
          },
          "50%": {
            backgroundPosition: "50% 100%",
            transform: "rotate(0deg)",
          },
          "75%": {
            backgroundPosition: "0% 50%",
            transform: "rotate(-1deg)",
          },
        },
        "ambience-flow": {
          "0%, 100%": {
            backgroundPosition: "0% 0%, 0% 0%",
            opacity: "1",
          },
          "33%": {
            backgroundPosition: "100% 50%, 50% 100%",
            opacity: "0.8",
          },
          "66%": {
            backgroundPosition: "50% 100%, 100% 0%",
            opacity: "1",
          },
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-fade-in": "slide-fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "liquid-wobble": "liquid-wobble 4s ease-in-out infinite",
        "gradient-breathe": "gradient-breathe 15s ease-in-out infinite",
        "aurora-drift": "aurora-drift 25s ease-in-out infinite",
        "ambience-flow": "ambience-flow 35s ease-in-out infinite",
        "scale-in": "scale-in 0.2s ease-out",
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
