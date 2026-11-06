# vtex-migration-agents

**Un subagente de Claude Code que migra storefronts VTEX: de Legacy a VTEX IO, de VTEX IO a FastStore o de Legacy a
FastStore. Con el servidor MCP vtex-io-mcp incluido.**

[![versión](https://img.shields.io/github/v/tag/commentemeapp/vtex-migration-agents?label=versi%C3%B3n&labelColor=005278&color=FFBD38)](./CHANGELOG.md)
[![licencia](https://img.shields.io/github/license/commentemeapp/vtex-migration-agents?label=licencia&labelColor=005278&color=FFBD38)](./LICENSE)

## Instalación

```bash
/plugin marketplace add commentemeapp/vtex-migration-agents
/plugin install vtex-migration-agents@vtex-migration-agents
```

Reinicia Claude Code o corre `/reload-plugins`. El agente aparece en el typeahead de `@` como
`vtex-migration-agents:vtex-migrator`.

## Uso rápido

La forma recomendada es una sesión completa con el agente, abierta en el repositorio de la tienda. Así puede
preguntarte el destino y pedirte el OK del plan sin intermediarios:

```bash
claude --agent vtex-migration-agents:vtex-migrator
```

```
que generación de VTEX es este repositorio y a que conviene migrarlo
```

También se puede invocar como subagente desde otra sesión (`@vtex-migration-agents:vtex-migrator`). En ese modo no
puede preguntarte directamente: se detiene después del diagnóstico o del plan y la conversación principal te hace las
preguntas.

## Que hace

| Fase        | Que pasa                                                                                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnóstico | Lee el repositorio y dice que generación es (Legacy CMS Portal, Store Framework, FastStore u otra cosa), con las rutas que lo prueban, e inventaría páginas, componentes, scripts de terceros, apps, URLs y SEO. |
| Pregunta    | Ofrece solo los destinos que tienen sentido desde el origen, con su recomendación y el costo de cada uno, y pregunta lo que no se ve en el código.                                                               |
| Plan        | Mapa de equivalencias pieza por pieza, lo que no migra solo (contenido, Edition App, tickets a soporte), fases, riesgos y preguntas abiertas.                                                                    |
| Ejecución   | Con el plan aprobado, escribe el código nuevo en una rama propia, separado del storefront actual, y valida cada fase con el build del proyecto.                                                                  |

| Origen            | Destino         | Base oficial                                                                      |
| ----------------- | --------------- | --------------------------------------------------------------------------------- |
| Legacy CMS Portal | Store Framework | Migrating your storefront from Legacy CMS Portal to Store Framework               |
| Store Framework   | FastStore       | Migrating from Store Framework to FastStore                                       |
| Legacy CMS Portal | FastStore       | Sin guía oficial de punta a punta: el agente combina las dos y lo dice en el plan |

Lo que nunca hace, porque son acciones sobre la tienda real: `vtex publish`, `vtex deploy`, `vtex install` o
`vtex link` en master, `vtex workspace promote`, subir el schema del CMS a producción, cambiar DNS, abrir tickets a
soporte, hacer push a ramas compartidas o escribir en `main` y `master`. Cuando el plan llega a uno de esos pasos,
deja el comando exacto y quién lo corre.

| Agente          | Skills que precarga                                                                                                                   | Herramientas del servidor MCP | Modelo |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------ |
| `vtex-migrator` | `vtex-io-storefront-theme-app`, `vtex-io-render-runtime-and-blocks`, `faststore-storefront`, `architecture-well-architected-commerce` | las nueve                     | opus   |

Las demás skills de VTEX las invoca bajo demanda: versionado de themes, React de storefront, i18n, BFF, checkout e
Intelligent Search headless, Master Data y seguridad. El razonamiento detrás del diseño está en
[docs/agente.md](docs/agente.md).

## Documentación

### Requisitos

- Claude Code con soporte de plugins.
- Node `>= 18`, para que `npx` ejecute el servidor MCP.
- Las skills oficiales de VTEX instaladas, con `gh skill install vtex/skills` o `npx skills add vtex/skills`.
  `--scope user` las deja disponibles en todos los proyectos. Sin ellas el agente funciona, pero sin el conocimiento
  de VTEX que hace preciso el mapa de equivalencias.

### Junto con vtex-io-agents

Este plugin no reemplaza a [vtex-io-agents](https://github.com/commentemeapp/vtex-io-agents) y no lo modifica. Los
dos traen el servidor MCP `vtex-io`, cada uno con su propio prefijo, así que pueden estar instalados a la vez. Durante
una migración a Store Framework, `vtex-io-agents:vtex-reviewer` y `vtex-io-agents:vtex-qa` sirven para revisar y
validar lo que `vtex-migrator` escribió.

### Actualizar y desinstalar

| Acción      | Comando                                                         |
| ----------- | --------------------------------------------------------------- |
| Actualizar  | `/plugin marketplace update vtex-migration-agents`              |
| Desinstalar | `/plugin uninstall vtex-migration-agents@vtex-migration-agents` |

### Estructura

```
.claude-plugin/marketplace.json       catálogo del marketplace de Claude Code
plugins/vtex-migration-agents/
	.claude-plugin/plugin.json          manifiesto del plugin; mcpServers apunta a .mcp.json
	.mcp.json                           el servidor MCP vtex-io: npx -y @commenteme/vtex-io-mcp
	agents/vtex-migrator.md             el agente
docs/agente.md                        por que el agente es como es
scripts/verificar.sh                  gate de este repositorio
scripts/probar-mcp.mjs                arranca el servidor MCP y comprueba las herramientas que usa el agente
```

### Desarrollo

Para desarrollar este repositorio necesitas **Node >= 20**.

```bash
git clone https://github.com/commentemeapp/vtex-migration-agents.git
cd vtex-migration-agents
npm ci
./scripts/verificar.sh
node scripts/probar-mcp.mjs
claude --plugin-dir ./plugins/vtex-migration-agents
```

`scripts/verificar.sh` es el gate, el mismo que corre el CI: JSON válido, la misma versión en los tres manifiestos,
la configuración del servidor MCP, el frontmatter del agente (nombre igual al archivo, `description`, tool `Skill`,
máximo cuatro skills precargadas que existan en `vtex/skills`, prefijo MCP propio y, como escribe archivos, las
acciones prohibidas escritas en el cuerpo), `claude plugin validate --strict`, Prettier, `bash -n` y una búsqueda de
rastros. La versión vive en tres lugares (las dos de `.claude-plugin/marketplace.json` y `plugin.json`): súbela en
los tres a la vez.

## Contribuir · Licencia

Conventional Commits, rama desde `dev` y PR contra `dev`. [MIT](./LICENSE).

---

Hecho por [commente.me](https://www.commente.me) · hablecon@commente.me
