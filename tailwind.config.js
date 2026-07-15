/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind scanne ce fichier pour savoir quelles classes générer.
  // C'est ce mécanisme qui permet de passer d'un CSS de ~3 Mo (le CDN, qui contient
  // TOUTES les classes possibles) à un CSS de quelques dizaines de Ko (seulement
  // les classes réellement utilisées dans ta page).
  content: ["./index.html"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy:      '#0F1F38',
        navylight: '#1C3358',
        cream:     '#F5F3ED',
        amber:     '#E8A33D',
        amberdark: '#C7862A',
        teal:      '#1B7A72',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      }
    }
  },
  plugins: [],
}
