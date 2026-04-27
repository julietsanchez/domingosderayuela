'use strict';

const INTERNAL_HERO_PAGES = [
  {
    path: 'nosotros.html',
    logo: './logorayuela.png',
    expectedFallbackPrefix: './assets/images/'
  },
  {
    path: 'blog.html',
    logo: './logorayuela.png',
    expectedFallbackPrefix: './assets/images/'
  },
  {
    path: 'quieroayudar.html',
    logo: './logorayuela.png',
    expectedFallbackPrefix: './assets/images/'
  },
  {
    path: 'sumate/index.html',
    logo: '../logorayuela.png',
    expectedFallbackPrefix: '../assets/images/'
  }
];

const REDIRECT_PAGES = [
  'sumate.html',
  'donaciones.html',
  'padrinos.html',
  'voluntariado.html'
];

function countMatches(value, regex) {
  if (typeof value !== 'string') {
    throw new TypeError('countMatches espera un string.');
  }

  return (value.match(regex) || []).length;
}

function getHeroSecondaryBlock(html) {
  if (typeof html !== 'string') {
    throw new TypeError('getHeroSecondaryBlock espera el HTML como string.');
  }

  const match = html.match(/<section class="hero-secondary"[\s\S]*?<\/section>/);
  return match ? match[0] : '';
}

function validateInternalHeroPage(html, config) {
  if (typeof html !== 'string' || !html.trim()) {
    throw new TypeError('validateInternalHeroPage espera HTML no vacío como string.');
  }

  if (!config || typeof config !== 'object') {
    throw new TypeError('validateInternalHeroPage espera configuración de página.');
  }

  const errors = [];
  const hero = getHeroSecondaryBlock(html);

  if (!hero) {
    errors.push(`${config.path}: no se encontró .hero-secondary.`);
    return errors;
  }

  if (!/\bdata-random-hero\b/.test(hero)) {
    errors.push(`${config.path}: .hero-secondary debe incluir data-random-hero.`);
  }

  if (!/--internal-hero-img:\s*url\(['"]?/.test(hero)) {
    errors.push(`${config.path}: .hero-secondary debe incluir fallback --internal-hero-img.`);
  }

  if (config.expectedFallbackPrefix && hero.indexOf(config.expectedFallbackPrefix) === -1) {
    errors.push(`${config.path}: el fallback del banner debe usar la ruta ${config.expectedFallbackPrefix}.`);
  }

  const logoPattern = new RegExp(`<img src="${config.logo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" alt="Domingos de Rayuela" class="hero-secondary__logo">`);
  if (!logoPattern.test(hero)) {
    errors.push(`${config.path}: debe incluir el logo blanco centrado del hero interno.`);
  }

  if (countMatches(hero, /class="hero-secondary__logo"/g) !== 1) {
    errors.push(`${config.path}: debe tener exactamente un logo de hero interno.`);
  }

  return errors;
}

function validateRedirectPage(html, path) {
  if (typeof html !== 'string' || !html.trim()) {
    throw new TypeError('validateRedirectPage espera HTML no vacío como string.');
  }

  const errors = [];

  if (!/class="redirect-splash"/.test(html)) {
    errors.push(`${path}: debe conservar .redirect-splash como fallback visual.`);
  }

  if (!/class="redirect-splash__logo"/.test(html)) {
    errors.push(`${path}: debe incluir logo blanco en el fallback de redirección.`);
  }

  if (!/--redirect-splash-img:\s*url\(['"]?/.test(html)) {
    errors.push(`${path}: debe incluir fallback --redirect-splash-img.`);
  }

  if (!/window\.location\.replace/.test(html) && !/http-equiv="refresh"/.test(html)) {
    errors.push(`${path}: no debe perder la redirección existente.`);
  }

  return errors;
}

module.exports = {
  INTERNAL_HERO_PAGES,
  REDIRECT_PAGES,
  getHeroSecondaryBlock,
  validateInternalHeroPage,
  validateRedirectPage
};
