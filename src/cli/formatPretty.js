// backend/src/cli/formatPretty.js

function formatPretty(obj) {
  return JSON.stringify(obj, null, 2);
}

module.exports = { formatPretty };
