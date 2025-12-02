import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssTypography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: "",
  // ✅ ФИКС: Явно указываем JIT mode
  mode: 'jit' as const,
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			// 🎯 CYBER-ARCHITECTURE: 3-Font System
  			sans: [
  				'Manrope', // Body, UI, Descriptions
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'sans-serif'
  			],
  			display: [
  				'Space Grotesk', // H1, H2, Big Numbers
  				'sans-serif'
  			],
  			mono: [
  				'JetBrains Mono', // System Labels, Micro-Text (V.3.0, REC, WAITING)
  				'Roboto Mono',
  				'monospace'
  			]
  		},
		colors: {
			// 🎯 CYBER-ARCHITECTURE: Strict Color Palette
			'cyber-void': '#030303', // Background (Infinite Depth)
			'cyber-surface': '#0A0A0A', // Surface (Cards)
			'cyber-acid': '#00FF88', // Primary (Cyber Neon - Money, Growth, CTA)
			'cyber-signal': '#FF3366', // Secondary (Signal Red - Live, Errors, REC)
			'cyber-white': '#FFFFFF', // Text Main (Holo White)
			'cyber-gray': '#9CA3AF', // Text Muted (Tech Gray)
			// Legacy (for compatibility)
			'brand-green': '#00FF88',
			'brand-dark': '#0a0a0a',
  			border: 'hsl(var(--border))',
  			neon: {
  				DEFAULT: 'hsl(var(--neon))',
  				foreground: 'hsl(var(--neon-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			},
			'gradient-shift': {
				'0%, 100%': {
					backgroundPosition: '0% 50%'
				},
				'50%': {
					backgroundPosition: '100% 50%'
				}
			},
			'float': {
				'0%, 100%': {
					transform: 'translateY(0px)'
				},
				'50%': {
					transform: 'translateY(-20px)'
				}
			},
			'glow': {
				'0%, 100%': {
					boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
				},
				'50%': {
					boxShadow: '0 0 40px rgba(0, 255, 136, 0.6)'
				}
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'gradient-shift': 'gradient-shift 15s ease infinite',
			'float': 'float 6s ease-in-out infinite',
			'glow': 'glow 2s ease-in-out infinite'
		}
  	}
  },
  plugins: [tailwindcssAnimate, tailwindcssTypography],
} satisfies Config;
