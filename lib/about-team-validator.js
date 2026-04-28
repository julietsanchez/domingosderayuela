'use strict';

const EXPECTED_TEAM_MEMBERS = [
  'Nicole Montivero',
  'Jimena Montoya',
  'Emilia Baez',
  'Martina Garnica',
  'Julieta Sanchez',
  'Facundo Garnica',
  'Jorgelina Ruiz',
  'Romina Ramirez',
  'Yanina Pajón'
];

const EXPECTED_ALUMNI_VOICE_COUNT = 4;

const LEGACY_TEAM_NAMES = [
  'Mariana Vega',
  'Camila Rodríguez',
  'Florencia Álvarez',
  'Lucía Méndez',
  'Valentina Gómez',
  'Sofía Pereyra',
  'Agustina Benítez',
  'Paula Torres',
  'Rocío Domínguez',
  'Micaela Navarro',
  'Emilia Castro'
];

function ensureHtml(html, callerName) {
  if (typeof html !== 'string' || !html.trim()) {
    throw new TypeError(`${callerName} espera HTML no vacío como string.`);
  }
}

function getBlocks(html, regex) {
  if (typeof html !== 'string') {
    throw new TypeError('getBlocks espera HTML como string.');
  }

  if (!(regex instanceof RegExp)) {
    throw new TypeError('getBlocks espera una expresión regular.');
  }

  return html.match(regex) || [];
}

function getTeamMemberBlocks(html) {
  ensureHtml(html, 'getTeamMemberBlocks');
  return getBlocks(html, /<article class="team-card">[\s\S]*?<\/article>/g);
}

function getAlumniVoiceBlocks(html) {
  ensureHtml(html, 'getAlumniVoiceBlocks');
  return getBlocks(html, /<article class="alumni-voice-card">[\s\S]*?<\/article>/g);
}

function extractText(block, regex) {
  if (typeof block !== 'string') {
    throw new TypeError('extractText espera un bloque HTML como string.');
  }

  const match = block.match(regex);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function validateAboutTeamPage(html) {
  ensureHtml(html, 'validateAboutTeamPage');

  const errors = [];
  const teamMemberBlocks = getTeamMemberBlocks(html);
  const alumniVoiceBlocks = getAlumniVoiceBlocks(html);
  const teamMemberNames = teamMemberBlocks.map(function(block) {
    return extractText(block, /<h3 class="team-card__name">([^<]+)<\/h3>/);
  });

  if (teamMemberBlocks.length !== EXPECTED_TEAM_MEMBERS.length) {
    errors.push(`Se esperaban ${EXPECTED_TEAM_MEMBERS.length} integrantes del equipo y se encontraron ${teamMemberBlocks.length}.`);
  }

  EXPECTED_TEAM_MEMBERS.forEach(function(memberName) {
    if (!teamMemberNames.includes(memberName)) {
      errors.push(`Falta integrante del equipo: ${memberName}.`);
    }
  });

  LEGACY_TEAM_NAMES.forEach(function(legacyName) {
    if (html.includes(legacyName)) {
      errors.push(`No debería quedar el nombre anterior: ${legacyName}.`);
    }
  });

  teamMemberBlocks.forEach(function(block) {
    const name = extractText(block, /<h3 class="team-card__name">([^<]+)<\/h3>/) || 'Integrante sin nombre';
    const role = extractText(block, /<p class="team-card__role">([^<]+)<\/p>/);
    const time = extractText(block, /<span class="team-card__time">([^<]+)<\/span>/);
    const expectedTimePattern = name === 'Facundo Garnica' ? /^Voluntario desde \d{4}$/ : /^Voluntaria desde \d{4}$/;

    if (!role) {
      errors.push(`${name}: debe tener un texto descriptivo.`);
    }

    if (!expectedTimePattern.test(time)) {
      errors.push(`${name}: debe indicar antigüedad con el formato correcto.`);
    }
  });

  if (!html.includes('id="ex-voluntarias-title">Voces de ex voluntarias</h2>')) {
    errors.push('Falta el título "Voces de ex voluntarias".');
  }

  if (alumniVoiceBlocks.length !== EXPECTED_ALUMNI_VOICE_COUNT) {
    errors.push(`Se esperaban ${EXPECTED_ALUMNI_VOICE_COUNT} voces de ex voluntarias y se encontraron ${alumniVoiceBlocks.length}.`);
  }

  alumniVoiceBlocks.forEach(function(block, index) {
    const voiceNumber = index + 1;
    const name = extractText(block, /<strong class="alumni-voice-card__name">([^<]+)<\/strong>/);
    const time = extractText(block, /<span class="alumni-voice-card__time">([^<]+)<\/span>/);

    if (!name) {
      errors.push(`Voz ${voiceNumber}: debe tener nombre.`);
    }

    if (!/^Fue voluntaria durante \d+ años$/.test(time)) {
      errors.push(`Voz ${voiceNumber}: debe indicar cuánto tiempo fue voluntaria.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    teamMemberCount: teamMemberBlocks.length,
    alumniVoiceCount: alumniVoiceBlocks.length
  };
}

module.exports = {
  EXPECTED_TEAM_MEMBERS,
  EXPECTED_ALUMNI_VOICE_COUNT,
  getTeamMemberBlocks,
  getAlumniVoiceBlocks,
  validateAboutTeamPage
};
