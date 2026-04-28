'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EXPECTED_TEAM_MEMBERS,
  EXPECTED_ALUMNI_VOICE_COUNT,
  getTeamMemberBlocks,
  getAlumniVoiceBlocks,
  validateAboutTeamPage
} = require('../lib/about-team-validator');

const nosotrosHtml = fs.readFileSync(path.join(__dirname, '..', 'nosotros.html'), 'utf8');

test('la página nosotros muestra el equipo actual', function() {
  const result = validateAboutTeamPage(nosotrosHtml);

  assert.deepEqual(result.errors, []);
  assert.equal(result.isValid, true);
  assert.equal(result.teamMemberCount, EXPECTED_TEAM_MEMBERS.length);
});

test('cada integrante tiene nombre, texto e inicio como voluntaria o voluntario', function() {
  const teamMemberBlocks = getTeamMemberBlocks(nosotrosHtml);

  assert.equal(teamMemberBlocks.length, EXPECTED_TEAM_MEMBERS.length);

  EXPECTED_TEAM_MEMBERS.forEach(function(memberName) {
    assert.match(nosotrosHtml, new RegExp(`<h3 class="team-card__name">${memberName}</h3>`));
  });

  assert.match(nosotrosHtml, /Facundo Garnica[\s\S]*?Voluntario desde \d{4}/);
  assert.match(nosotrosHtml, /Nicole Montivero[\s\S]*?Voluntaria desde \d{4}/);
});

test('la página incluye voces de ex voluntarias tipo review', function() {
  const alumniVoiceBlocks = getAlumniVoiceBlocks(nosotrosHtml);

  assert.equal(alumniVoiceBlocks.length, EXPECTED_ALUMNI_VOICE_COUNT);
  assert.match(nosotrosHtml, /Voces de ex voluntarias/);

  alumniVoiceBlocks.forEach(function(block) {
    assert.match(block, /<blockquote class="alumni-voice-card__quote">/);
    assert.match(block, /Fue voluntaria durante \d+ años/);
  });
});

test('validateAboutTeamPage rechaza HTML vacío o incompleto', function() {
  assert.throws(function() {
    validateAboutTeamPage('');
  }, /HTML no vacío/);

  const result = validateAboutTeamPage('<main></main>');
  assert.equal(result.isValid, false);
  assert.match(result.errors[0], /Se esperaban 9 integrantes/);
});
