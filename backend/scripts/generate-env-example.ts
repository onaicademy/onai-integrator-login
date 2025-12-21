#!/usr/bin/env npx tsx
/**
 * 🔍 Generate complete .env.example from ENV_GROUPS
 * Run: npx tsx scripts/generate-env-example.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { ENV_GROUPS } from '../src/config/env-validated.js';

function generateEnvExample(): string {
  const lines: string[] = [];
  
  lines.push('# ═══════════════════════════════════════════════════════════════');
  lines.push('# 🔐 onAI Backend Environment Configuration');
  lines.push('# Generated: ' + new Date().toISOString());
  lines.push('# ═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('# Variables marked with ⭐ are REQUIRED');
  lines.push('# Variables marked with ◌ are optional');
  lines.push('');

  for (const [key, group] of Object.entries(ENV_GROUPS)) {
    lines.push('# ───────────────────────────────────────────────────────────────');
    lines.push(`# 🔧 ${group.name}`);
    lines.push('# ───────────────────────────────────────────────────────────────');
    
    for (const varDef of group.vars) {
      const requiredMark = varDef.required ? '⭐' : '◌';
      lines.push(`# ${requiredMark} ${varDef.description}`);
      lines.push(`${varDef.name}=${varDef.example || ''}`);
      lines.push('');
    }
    
    lines.push('');
  }

  return lines.join('\n');
}

// Generate and save
const envExample = generateEnvExample();
const outputPath = path.join(__dirname, '../.env.example');

fs.writeFileSync(outputPath, envExample);
console.log(`✅ Generated .env.example with ${Object.keys(ENV_GROUPS).length} feature groups`);
console.log(`📁 Saved to: ${outputPath}`);
