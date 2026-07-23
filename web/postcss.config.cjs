module.exports = {
  plugins: [
    // use the new postcss wrapper for Tailwind
    // requires installing @tailwindcss/postcss
    require('@tailwindcss/postcss')(),
    require('autoprefixer')
  ]
}
