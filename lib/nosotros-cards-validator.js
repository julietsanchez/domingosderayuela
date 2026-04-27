'use strict';

const EXPECTED_CARD_COUNT = 6;
const EXPECTED_MINI_PHOTO_COUNT = 4;

function countMatches(value, regex) {
  if (typeof value !== 'string') {
    throw new TypeError('countMatches espera un string.');
  }

  return (value.match(regex) || []).length;
}

function getNosotrosCardBlocks(html) {
  if (typeof html !== 'string') {
    throw new TypeError('getNosotrosCardBlocks espera el HTML como string.');
  }

  return html.match(/<article class="nosotros__card-item" data-nosotros-card>[\s\S]*?<\/article>/g) || [];
}

function getTitle(cardHtml) {
  if (typeof cardHtml !== 'string') {
    throw new TypeError('getTitle espera el HTML de una card como string.');
  }

  const match = cardHtml.match(/<h3 class="nosotros__card-text">([^<]+)<\/h3>/);
  return match ? match[1].trim() : '';
}

function validateNosotrosCards(html) {
  if (typeof html !== 'string' || !html.trim()) {
    throw new TypeError('validateNosotrosCards espera HTML no vacío como string.');
  }

  const errors = [];
  const cards = getNosotrosCardBlocks(html);

  if (cards.length !== EXPECTED_CARD_COUNT) {
    errors.push(`Se esperaban ${EXPECTED_CARD_COUNT} cards interactivas y se encontraron ${cards.length}.`);
  }

  cards.forEach(function(cardHtml, index) {
    const cardNumber = index + 1;
    const title = getTitle(cardHtml) || `card ${cardNumber}`;
    const frontCount = countMatches(cardHtml, /nosotros__card-face--front/g);
    const backCount = countMatches(cardHtml, /nosotros__card-face--back/g);
    const toggleCount = countMatches(cardHtml, /<button class="[^"]*\bnosotros__card-toggle\b/g);
    const miniPhotoCount = countMatches(cardHtml, /class="nosotros__mini-photo"/g);
    const descriptionCount = countMatches(cardHtml, /class="nosotros__card-description"/g);
    const ariaControlsCount = countMatches(cardHtml, /aria-controls="nosotros-card-[^"]+"/g);

    if (frontCount !== 1) {
      errors.push(`${title}: debe tener exactamente una cara frontal.`);
    }

    if (backCount !== 1) {
      errors.push(`${title}: debe tener exactamente una cara posterior.`);
    }

    if (toggleCount !== 2) {
      errors.push(`${title}: debe tener un botón para abrir y otro para volver.`);
    }

    if (ariaControlsCount !== 2) {
      errors.push(`${title}: ambos botones deben declarar aria-controls.`);
    }

    if (miniPhotoCount !== EXPECTED_MINI_PHOTO_COUNT) {
      errors.push(`${title}: debe tener ${EXPECTED_MINI_PHOTO_COUNT} fotos internas y tiene ${miniPhotoCount}.`);
    }

    if (descriptionCount !== 1) {
      errors.push(`${title}: debe tener exactamente un texto descriptivo.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    cardCount: cards.length
  };
}

module.exports = {
  EXPECTED_CARD_COUNT,
  EXPECTED_MINI_PHOTO_COUNT,
  getNosotrosCardBlocks,
  validateNosotrosCards
};
