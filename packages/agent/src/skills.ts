/**
 * Skills System — load and manage skill definitions from ~/skyclaw/skills/.
 *
 * Skills are markdown files with YAML frontmatter that teach the agent
 * about available capabilities. Supports both directory layout
 * (skills/<name>/SKILL.md) and flat layout (skills/<name>.md).
 */

import { join } from "node:path";
import {
  readdirSync,
  readFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  statSync,
} from "node:fs";
import { SKYCLAW_DIR } from "./paths.js";

/** Skills directory — ~/skyclaw/skills/ */
export const SKILLS_DIR = join(SKYCLAW_DIR, "skills");

export interface SkillDefinition {
  name: string;
  description: string;
  content: string;
  filePath: string;
}

interface Frontmatter {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Parse YAML frontmatter from a markdown string.
 * Expects `---\nkey: value\n---\ncontent`.
 */
export function parseFrontmatter(raw: string): {
  frontmatter: Frontmatter;
  content: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, content: raw };
  }

  const yamlBlock = match[1];
  const content = match[2];

  // Simple key: value YAML parser (no nested structures needed)
  const frontmatter: Frontmatter = {};
  for (const line of yamlBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes if present
    frontmatter[key] = value.replace(/^["'](.*)["']$/, "$1");
  }

  return { frontmatter, content };
}

/**
 * Load all skills from ~/skyclaw/skills/.
 *
 * Supports:
 * - Directory: skills/<name>/SKILL.md
 * - Flat file: skills/<name>.md
 */
export function loadSkills(): SkillDefinition[] {
  if (!existsSync(SKILLS_DIR)) return [];

  const skills: SkillDefinition[] = [];
  const entries = readdirSync(SKILLS_DIR);

  for (const entry of entries) {
    const entryPath = join(SKILLS_DIR, entry);
    const stat = statSync(entryPath);

    let filePath: string | null = null;

    if (stat.isDirectory()) {
      // Directory layout: skills/<name>/SKILL.md
      const skillFile = join(entryPath, "SKILL.md");
      if (existsSync(skillFile)) {
        filePath = skillFile;
      }
    } else if (entry.endsWith(".md")) {
      // Flat layout: skills/<name>.md
      filePath = entryPath;
    }

    if (!filePath) continue;

    try {
      const raw = readFileSync(filePath, "utf-8");
      const { frontmatter, content } = parseFrontmatter(raw);

      skills.push({
        name: (frontmatter.name as string) ?? entry.replace(/\.md$/, ""),
        description: (frontmatter.description as string) ?? "",
        content: content.trim(),
        filePath,
      });
    } catch {
      // Skip unreadable files
    }
  }

  return skills;
}

/** Ensure the skills directory exists. */
export function initSkillsDir(): void {
  if (!existsSync(SKILLS_DIR)) {
    mkdirSync(SKILLS_DIR, { recursive: true });
  }
}

/** Format skills for injection into the system prompt. */
export function formatSkillsForPrompt(skills: SkillDefinition[]): string {
  if (skills.length === 0) return "";

  const sections = skills.map(
    (s) => `### ${s.name}\n${s.description ? `_${s.description}_\n` : ""}\n${s.content}`,
  );

  return `\n\n## Skills\n\nYou have the following skills available:\n\n${sections.join("\n\n---\n\n")}`;
}

/**
 * Sync bundled skill templates to ~/skyclaw/skills/.
 * Only copies if the skill directory doesn't already exist (won't overwrite user edits).
 */
export function syncBuiltinSkills(templatesDir: string): void {
  if (!existsSync(templatesDir)) return;

  initSkillsDir();

  const templates = readdirSync(templatesDir);
  for (const name of templates) {
    const srcDir = join(templatesDir, name);
    if (!statSync(srcDir).isDirectory()) continue;

    const destDir = join(SKILLS_DIR, name);
    if (existsSync(destDir)) continue; // Don't overwrite user modifications

    mkdirSync(destDir, { recursive: true });

    // Copy all files from the template directory
    const files = readdirSync(srcDir);
    for (const file of files) {
      copyFileSync(join(srcDir, file), join(destDir, file));
    }

    console.log(`[skills] installed builtin skill: ${name}`);
  }
}
