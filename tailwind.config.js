/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'Arial', 'Helvetica', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Legacy accent kept so the auth screens (SignIn/Splash) still render;
        // mapped onto the dark palette's accents for coherence.
        brand: {
          DEFAULT: '#6FB89E',
          soft: '#7E9AC0',
        },
        // Dark "Timeline" palette (Woody ink/accent stack re-mapped for dark).
        app: '#191612', // screen background
        tabbar: '#141210', // bottom nav
        surface: '#221E19', // cards, panels, inputs
        chip: {
          DEFAULT: '#2A2621', // date chips
          alt: '#2F2A24', // avatar circle
        },
        event: '#22262C', // calendar-event surface (cool tint)
        rail: '#332E28', // timeline connector (default)
        ink: {
          primary: '#F3EDE5', // titles, greeting
          card: '#E8DFD3', // card / event titles
          secondary: '#CFC6BB', // secondary body, chip text
          muted: '#9B9288', // descriptions
          faint: '#8A8178', // eyebrows, meta
          fainter: '#7E766C', // time labels, sub-meta
          empty: '#6B6359', // unchecked circle stroke / inactive tab
          footer: '#5A544C', // copyright
          trailing: '#4F4A43', // leading/trailing calendar days
        },
        accent: {
          event: '#7E9AC0', // slate-blue — events/info
          success: '#6FB89E', // sage — done / confirm / toggle on
          priority: '#D2A46E', // tan — priority / carried / active priority
          destructive: '#D4694E', // oxide red — delete
        },
        // Solid button ink pairings
        'btn-primary': '#E8DFD3',
        'btn-primary-ink': '#191612',
        'btn-success-ink': '#0F1A15',
      },
      borderColor: {
        hairline: 'rgba(245,239,229,0.07)',
        'hairline-08': 'rgba(245,239,229,0.08)',
        'hairline-09': 'rgba(245,239,229,0.09)',
      },
      borderRadius: {
        chip: '6px',
      },
      boxShadow: {
        capture: '0 6px 18px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
