/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:      '#1D4ED8',   // blue-700
        'primary-dk': '#1E40AF',   // blue-800
        'primary-lt': '#EFF6FF',   // blue-50
        'primary-md': '#DBEAFE',   // blue-100
        accent:       '#0EA5E9',   // sky-500
        'accent-lt':  '#E0F2FE',   // sky-100

        // Surface
        'app-bg':     '#F0F7FF',   // near-white blue tint
        'card-bg':    '#FFFFFF',
        'panel-bg':   '#F8FAFF',

        // Text
        'ink':        '#0F172A',   // slate-900
        'ink-2':      '#334155',   // slate-700
        'ink-3':      '#64748B',   // slate-500
        'ink-4':      '#94A3B8',   // slate-400

        // Border
        'border-lt':  '#E2E8F0',   // slate-200
        'border-md':  '#CBD5E1',   // slate-300
        'border-blue': '#BFDBFE',  // blue-200

        // Semantic
        success:      '#16A34A',   // green-600
        'success-lt': '#DCFCE7',   // green-50
        danger:       '#DC2626',   // red-600
        'danger-lt':  '#FEF2F2',   // red-50
        warning:      '#D97706',   // amber-600
        'warning-lt': '#FFFBEB',   // amber-50
      },
      fontFamily: {
        display: ['"Cinzel Decorative"', 'serif'],
        body:    ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card:  '12px',
        modal: '16px',
        pill:  '999px',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)',
        'card-hover': '0 4px 12px rgba(29,78,216,0.12)',
        modal: '0 20px 60px rgba(15,23,42,0.18)',
        blue:  '0 0 0 3px rgba(29,78,216,0.15)',
      },
      animation: {
        'slide-in':  'slideIn 0.28s cubic-bezier(0.16,1,0.3,1)',
        'slide-up':  'slideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':   'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideIn:  { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        slideUp:  { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },
  plugins: [],
}
