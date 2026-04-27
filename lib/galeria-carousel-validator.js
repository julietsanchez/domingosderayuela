'use strict';

const MIN_SLIDE_COUNT = 20;
const PRIORITY_IMAGE_COUNT = 4;

function countMatches(value, regex) {
  if (typeof value !== 'string') {
    throw new TypeError('countMatches espera un string.');
  }

  return (value.match(regex) || []).length;
}

function getGalleryBlock(html) {
  if (typeof html !== 'string') {
    throw new TypeError('getGalleryBlock espera el HTML como string.');
  }

  const match = html.match(/<section class="section galeria" id="galeria"[\s\S]*?<\/section>/);
  return match ? match[0] : '';
}

function getGalleryImages(galleryHtml) {
  if (typeof galleryHtml !== 'string') {
    throw new TypeError('getGalleryImages espera el HTML de la galería como string.');
  }

  return galleryHtml.match(/<img\s+[^>]+>/g) || [];
}

function validateGaleriaCarousel(html) {
  if (typeof html !== 'string' || !html.trim()) {
    throw new TypeError('validateGaleriaCarousel espera HTML no vacío como string.');
  }

  const errors = [];
  const galleryHtml = getGalleryBlock(html);

  if (!galleryHtml) {
    errors.push('No se encontró la sección #galeria.');
    return {
      isValid: false,
      errors,
      slideCount: 0,
      imageCount: 0
    };
  }

  const slideCount = countMatches(galleryHtml, /class="galeria__slide"/g);
  const images = getGalleryImages(galleryHtml);
  const prevButtonCount = countMatches(galleryHtml, /data-galeria-prev/g);
  const nextButtonCount = countMatches(galleryHtml, /data-galeria-next/g);

  if (countMatches(galleryHtml, /class="galeria__carousel"/g) !== 1) {
    errors.push('La galería debe tener un contenedor .galeria__carousel.');
  }

  if (countMatches(galleryHtml, /data-galeria-track/g) !== 1) {
    errors.push('La galería debe tener exactamente un track con data-galeria-track.');
  }

  if (prevButtonCount !== 1 || nextButtonCount !== 1) {
    errors.push('La galería debe tener un botón anterior y un botón siguiente.');
  }

  if (slideCount < MIN_SLIDE_COUNT) {
    errors.push(`La galería debe tener al menos ${MIN_SLIDE_COUNT} slides y tiene ${slideCount}.`);
  }

  if (images.length !== slideCount) {
    errors.push('Cada slide de galería debe contener exactamente una imagen.');
  }

  images.forEach(function(imageHtml, index) {
    const imageNumber = index + 1;

    if (!/\bdecoding="async"/.test(imageHtml)) {
      errors.push(`La imagen ${imageNumber} debe usar decoding="async".`);
    }

    if (index < PRIORITY_IMAGE_COUNT) {
      if (!/\bloading="eager"/.test(imageHtml)) {
        errors.push(`La imagen prioritaria ${imageNumber} debe usar loading="eager".`);
      }

      if (!/\bfetchpriority="high"/.test(imageHtml)) {
        errors.push(`La imagen prioritaria ${imageNumber} debe usar fetchpriority="high".`);
      }
    } else if (!/\bloading="lazy"/.test(imageHtml)) {
      errors.push(`La imagen ${imageNumber} debe usar loading="lazy".`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    slideCount,
    imageCount: images.length
  };
}

module.exports = {
  MIN_SLIDE_COUNT,
  PRIORITY_IMAGE_COUNT,
  getGalleryBlock,
  getGalleryImages,
  validateGaleriaCarousel
};
