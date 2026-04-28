'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateAboutTeamPage } = require('../lib/about-team-validator');

const nosotrosPath = path.join(__dirname, '..', 'nosotros.html');

function main() {
  if (!fs.existsSync(nosotrosPath)) {
    throw new Error(`No se encontró nosotros.html en ${nosotrosPath}.`);
  }

  const html = fs.readFileSync(nosotrosPath, 'utf8');
  const result = validateAboutTeamPage(html);

  if (!result.isValid) {
    console.error('La verificación del equipo y ex voluntarias falló:');
    result.errors.forEach(function(error) {
      console.error(`- ${error}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`Equipo verificado correctamente: ${result.teamMemberCount} integrantes y ${result.alumniVoiceCount} voces de ex voluntarias.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
