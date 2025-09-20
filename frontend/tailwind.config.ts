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
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Cybercept Brand Colors */
        'cybercept-blue': 'hsl(var(--cybercept-blue))',
        'cybercept-teal': 'hsl(var(--cybercept-teal))',
        'cybercept-navy': 'hsl(var(--cybercept-navy))',
        
        /* Text Colors */
        'heading-text': 'hsl(var(--heading-text))',
        'body-text': 'hsl(var(--body-text))',
        'subtext': 'hsl(var(--subtext))',
        
        /* Interface Colors */
        'app-bg': 'hsl(var(--app-bg))',
        'surface': 'hsl(var(--surface))',
        'border-color': 'hsl(var(--border-color))',
        
        /* Status Colors */
        'risk-low': 'hsl(var(--risk-low))',
        'risk-medium': 'hsl(var(--risk-medium))',
        'risk-high': 'hsl(var(--risk-high))',
        
        /* Standard Design System */
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
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-brand-subtle': 'var(--gradient-brand-subtle)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        '2xl': '1rem',
      },
      boxShadow: {
        'brand': '0 4px 20px -4px hsl(var(--cybercept-blue) / 0.15)',
        'brand-lg': '0 10px 30px -10px hsl(var(--cybercept-blue) / 0.25)',
        'elegant': '0 1px 3px 0 hsl(var(--border-color)), 0 1px 2px -1px hsl(var(--border-color))',
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
        "brand-glow": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--cybercept-teal) / 0.5)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--cybercept-teal) / 0.8)" }
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "brand-glow": "brand-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite"
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }: any) {
      const newUtilities = {
        '.gradient-border': {
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            padding: '2px',
            background: 'var(--gradient-primary)',
            borderRadius: 'inherit',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
          }
        },
        '.brand-gradient-text': {
          background: 'var(--gradient-primary)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        }
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;
