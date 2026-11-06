# Changelog

Todos los cambios de vtex-migration-agents. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
las versiones siguen [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

## [0.2.0] - 2026-11-06

### Agregado

- Versión del agente para Gemini CLI (extensión con `gemini-extension.json` y `agents/` en la raíz),
  Codex (`adaptadores/codex/`), GitHub Copilot (`adaptadores/copilot/`) y Cursor (`adaptadores/cursor/`), generadas
  desde el agente de Claude Code con `scripts/exportar.mjs`.
- El gate comprueba que esas versiones coinciden con su fuente.

El agente de Claude Code no cambia.

## [0.1.0] - 2026-11-06

### Agregado

- `vtex-migrator`: detecta la generación del storefront (Legacy CMS Portal, VTEX IO Store Framework, FastStore),
  pregunta el destino, arma el plan de migración y, con el OK de la persona, escribe el código nuevo en una rama
  propia. Cubre Legacy a Store Framework, Store Framework a FastStore y Legacy a FastStore.
- Servidor MCP `vtex-io` con `npx -y @commenteme/vtex-io-mcp`.
- Gate `scripts/verificar.sh`, `scripts/probar-mcp.mjs` y CI.
- README en el estándar commente.me Atacama, con header, social preview y avatar.
