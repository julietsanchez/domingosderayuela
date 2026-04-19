'use strict';

/**
 * Utilidades compartidas para el endpoint /api/quieroayudar (validación auxiliar y armado de mail).
 */

function trimString(value) {
  if (value == null) return '';
  return String(value).trim();
}

/**
 * @param {string | undefined | null} raw
 * @returns {string[]}
 */
function parseBccList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map(function (part) {
      return part.trim();
    })
    .filter(Boolean);
}

/**
 * Escapa texto de usuario para insertarlo en HTML del correo.
 * @param {unknown} input
 * @returns {string}
 */
function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  trimString,
  parseBccList,
  escapeHtml
};
