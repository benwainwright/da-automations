/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
const config = {
  "*.{ts,mts,js,mjs}": ["oxfmt", "oxlint"],
};

export default config;
