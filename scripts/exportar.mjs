#!/usr/bin/env node
// Genera, a partir de los agentes de Claude Code, las versiones para Gemini CLI, Codex, GitHub
// Copilot y Cursor. Los agentes de plugins/<plugin>/agents/ son la única fuente: nada de lo que
// sale de aquí se edita a mano.
//
//   node scripts/exportar.mjs              escribe los archivos
//   node scripts/exportar.mjs --verificar  falla si alguno no coincide con su fuente
//
// Formatos según la documentación oficial de cada herramienta (06-11-2026):
//   Gemini CLI  gemini-extension.json + agents/*.md en la raíz (docs/extensions/reference.md, docs/core/subagents.md)
//   Codex       .codex/agents/*.toml (developers.openai.com/codex/subagents)
//   Copilot     .github/agents/*.agent.md (docs.github.com/en/copilot/reference/custom-agents-configuration)
//   Cursor      .cursor/agents/*.md (cursor.com/docs/subagents)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const raiz = new URL("..", import.meta.url).pathname;
const verificar = process.argv.includes("--verificar");

const plugins = readdirSync(join(raiz, "plugins"));
if (plugins.length !== 1) throw new Error(`se esperaba un plugin en plugins/, hay ${plugins.length}`);
const plugin = plugins[0];
const pluginDir = join(raiz, "plugins", plugin);
const manifiesto = JSON.parse(readFileSync(join(pluginDir, ".claude-plugin/plugin.json"), "utf8"));
const servidores = JSON.parse(readFileSync(join(pluginDir, ".mcp.json"), "utf8")).mcpServers ?? {};

// ── lectura de los agentes de Claude Code ─────────────────────────────────────
function leerAgente(archivo) {
	const texto = readFileSync(archivo, "utf8");
	const m = texto.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) throw new Error(`sin frontmatter: ${archivo}`);
	const lineas = m[1].split("\n");
	const campo = (k) => {
		const l = lineas.find((x) => x.startsWith(k + ":"));
		return l ? l.slice(k.length + 1).trim() : "";
	};
	const skills = [];
	const i = lineas.findIndex((l) => l.startsWith("skills:"));
	if (i >= 0)
		for (let j = i + 1; j < lineas.length && /^\s+- /.test(lineas[j]); j++)
			skills.push(lineas[j].replace(/^\s+- /, "").trim());
	return {
		nombre: campo("name"),
		descripcion: campo("description"),
		tools: campo("tools")
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean),
		skills,
		cuerpo: m[2].trim()
	};
}

const agentes = readdirSync(join(pluginDir, "agents"))
	.filter((f) => f.endsWith(".md"))
	.sort()
	.map((f) => leerAgente(join(pluginDir, "agents", f)));

// Tools MCP: mcp__plugin_<plugin>_<servidor>__<tool> → { servidor, tool }
const prefijoMcp = new RegExp(`^mcp__plugin_${plugin}_([^_]+(?:-[^_]+)*)__(.+)$`);
const mcp = (t) => {
	const m = t.match(prefijoMcp);
	return m ? { servidor: m[1], tool: m[2] } : null;
};
const escribe = (a) => a.tools.some((t) => ["Write", "Edit", "Bash", "NotebookEdit"].includes(t));

// El cuerpo se escribió para Claude Code. Fuera de él no hay skills precargadas ni el tool Skill:
// el aviso le dice al agente que las cargue y como se llaman las herramientas del servidor MCP.
function aviso(a, herramienta) {
	const lineas = [
		`> Versión para ${herramienta}, generada desde \`plugins/${plugin}/agents/${a.nombre}.md\` (Claude Code). Donde el texto dice "tool Skill", usa el mecanismo de skills de ${herramienta}.`
	];
	if (a.skills.length)
		lineas.push(
			`> Antes de empezar, carga estas skills si están instaladas: ${a.skills.map((s) => `\`${s}\``).join(", ")}.`
		);
	const delMcp = a.tools.map(mcp).filter(Boolean);
	if (delMcp.length)
		lineas.push(
			`> Herramientas del servidor MCP \`${delMcp[0].servidor}\` que usa este agente: ${delMcp.map((x) => `\`${x.tool}\``).join(", ")}.`
		);
	return lineas.join("\n>\n") + "\n\n";
}

const yaml = (s) => JSON.stringify(s); // una cadena JSON es una cadena YAML válida

// ── Gemini CLI ────────────────────────────────────────────────────────────────
const toolsGemini = {
	Read: "read_file",
	Grep: "grep_search",
	Glob: "glob",
	Bash: "run_shell_command",
	Write: "write_file",
	Edit: "replace",
	WebFetch: "web_fetch",
	Skill: "activate_skill"
};
function gemini(a) {
	const tools = a.tools
		.map((t) => {
			const x = mcp(t);
			return x ? `mcp_${x.servidor}_${x.tool}` : toolsGemini[t];
		})
		.filter(Boolean);
	return (
		`---\nname: ${a.nombre}\ndescription: ${yaml(a.descripcion)}\nkind: local\ntools:\n${tools.map((t) => `  - ${t}`).join("\n")}\n---\n\n` +
		aviso(a, "Gemini CLI") +
		a.cuerpo +
		"\n"
	);
}

// ── Codex ─────────────────────────────────────────────────────────────────────
function codex(a) {
	const instrucciones = aviso(a, "Codex") + a.cuerpo;
	if (instrucciones.includes("'''")) throw new Error(`${a.nombre}: el cuerpo tiene ''' y rompe el TOML`);
	return `name = ${JSON.stringify(a.nombre)}\ndescription = ${JSON.stringify(a.descripcion)}\ndeveloper_instructions = '''\n${instrucciones}\n'''\n`;
}

// ── GitHub Copilot ────────────────────────────────────────────────────────────
const toolsCopilot = {
	Read: "read",
	Grep: "search",
	Glob: "search",
	Bash: "execute",
	Write: "edit",
	Edit: "edit",
	WebFetch: "web"
};
function copilot(a) {
	const tools = [
		...new Set(
			a.tools
				.map((t) => {
					const x = mcp(t);
					return x ? `${x.servidor}/${x.tool}` : toolsCopilot[t];
				})
				.filter(Boolean)
		)
	];
	const skills = a.skills.length ? `skills:\n${a.skills.map((s) => `  - ${s}`).join("\n")}\n` : "";
	return (
		`---\nname: ${a.nombre}\ndescription: ${yaml(a.descripcion)}\ntools: [${tools.map(yaml).join(", ")}]\n${skills}---\n\n` +
		aviso(a, "GitHub Copilot") +
		a.cuerpo +
		"\n"
	);
}

// ── Cursor ────────────────────────────────────────────────────────────────────
// Cursor no tiene lista de tools: el subagente hereda las del padre. Lo único que se puede
// restringir es la escritura, con readonly.
function cursor(a) {
	return (
		`---\nname: ${a.nombre}\ndescription: ${yaml(a.descripcion)}\nmodel: inherit\nreadonly: ${!escribe(a)}\n---\n\n` +
		aviso(a, "Cursor") +
		a.cuerpo +
		"\n"
	);
}

// ── salida ────────────────────────────────────────────────────────────────────
const archivos = new Map();
const extension = {
	name: manifiesto.name,
	version: manifiesto.version,
	description: manifiesto.description,
	// stdio con su env; los remotos (type http) van como httpUrl, que es como Gemini CLI llama al transporte HTTP.
	mcpServers: Object.fromEntries(
		Object.entries(servidores).map(([k, s]) => [
			k,
			s.type === "http" || s.url
				? { httpUrl: s.url, ...(s.headers ? { headers: s.headers } : {}) }
				: { command: s.command, args: s.args, ...(s.env ? { env: s.env } : {}) }
		])
	)
};
archivos.set("gemini-extension.json", JSON.stringify(extension, null, "\t") + "\n");
for (const a of agentes) {
	archivos.set(`agents/${a.nombre}.md`, gemini(a));
	archivos.set(`adaptadores/codex/${a.nombre}.toml`, codex(a));
	archivos.set(`adaptadores/copilot/${a.nombre}.agent.md`, copilot(a));
	archivos.set(`adaptadores/cursor/${a.nombre}.md`, cursor(a));
}

let distintos = 0;
for (const [ruta, contenido] of archivos) {
	const destino = join(raiz, ruta);
	const actual = existsSync(destino) ? readFileSync(destino, "utf8") : null;
	if (actual === contenido) continue;
	if (verificar) {
		console.error(`desactualizado: ${ruta}`);
		distintos++;
	} else {
		mkdirSync(dirname(destino), { recursive: true });
		writeFileSync(destino, contenido);
		console.log(`escrito: ${ruta}`);
	}
}
// Un archivo generado que ya no tiene fuente también es una diferencia.
for (const dir of ["agents", "adaptadores/codex", "adaptadores/copilot", "adaptadores/cursor"]) {
	if (!existsSync(join(raiz, dir))) continue;
	for (const f of readdirSync(join(raiz, dir))) {
		if (!archivos.has(`${dir}/${f}`)) {
			console.error(`sin fuente: ${dir}/${f}`);
			distintos++;
		}
	}
}
if (verificar && distintos) {
	console.error(`\n${distintos} archivo(s) distintos de su fuente: corre 'node scripts/exportar.mjs'`);
	process.exit(1);
}
if (verificar) console.log(`✓ ${archivos.size} archivos generados coinciden con los agentes de Claude Code`);
