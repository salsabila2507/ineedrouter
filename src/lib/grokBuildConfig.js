export const GROK_MAIN_MODEL_SLOT = "ineedrouter";
export const GROK_LEGACY_MODEL_SLOT = "9router";
export const GROK_BUILTIN_DEFAULT = "grok-build";
export const GROK_SUBAGENT_TYPES = ["general-purpose", "explore", "plan"];

// Kept byte-stable on purpose: these marker comment lines are written into
// users' grok configs by older releases and parsed back verbatim. Renaming
// them would orphan previously saved "previous model" state.
const UNSET_SENTINEL = "__9router_unset__";
const PREVIOUS_DEFAULT_MARKER_PREFIX = "# 9router-prev-default = ";
const PREVIOUS_SUBAGENT_MARKER_PREFIX = "# 9router-prev-subagent-";
const MODELS_SECTION = "models";
const SUBAGENT_MODELS_SECTION = "subagents.models";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tomlString = (value) => JSON.stringify(String(value));

const sectionRegExp = (section) =>
  new RegExp(
    `^\\[${escapeRegExp(section)}\\][ \\t]*\\r?\\n((?:(?!\\[)[^\\r\\n]*\\r?\\n?)*)`,
    "m",
  );

const modelSlot = (type) => `${GROK_MAIN_MODEL_SLOT}-${type}`;
const legacyModelSlot = (type) => `${GROK_LEGACY_MODEL_SLOT}-${type}`;
const isMainSlotKey = (value) =>
  value === GROK_MAIN_MODEL_SLOT || value === GROK_LEGACY_MODEL_SLOT;

const previousDefaultRegExp =
  /^# 9router-prev-default = "([^"]*)"[ \t]*\r?\n?/m;
const previousSubagentRegExp = (type) =>
  new RegExp(
    `^# 9router-prev-subagent-${escapeRegExp(type)} = "([^"]*)"[ \\t]*\\r?\\n?`,
    "m",
  );

function getSectionField(toml, section, key) {
  const match = toml.match(sectionRegExp(section));
  if (!match) return null;
  const field = match[1].match(
    new RegExp(`^[ \\t]*${escapeRegExp(key)}[ \\t]*=[ \\t]*"([^"]*)"`, "m"),
  );
  return field ? field[1] : null;
}

function getSectionNumber(toml, section, key) {
  const match = toml.match(sectionRegExp(section));
  if (!match) return null;
  const field = match[1].match(
    new RegExp(`^[ \\t]*${escapeRegExp(key)}[ \\t]*=[ \\t]*([0-9]+(?:\\.[0-9]+)?)`, "m"),
  );
  if (!field) return null;
  const value = Number(field[1]);
  return Number.isFinite(value) ? value : null;
}

function setSectionField(toml, section, key, value) {
  const match = toml.match(sectionRegExp(section));
  const line = `${key} = ${tomlString(value)}`;
  if (!match) {
    const prefix = toml.length > 0 && !toml.endsWith("\n") ? `${toml}\n` : toml;
    return `${prefix}\n[${section}]\n${line}\n`;
  }

  const body = match[1] || "";
  const fieldRegExp = new RegExp(
    `^[ \\t]*${escapeRegExp(key)}[ \\t]*=[ \\t]*"[^"]*"`,
    "m",
  );
  const nextBody = fieldRegExp.test(body)
    ? body.replace(fieldRegExp, line)
    : `${line}\n${body}`;
  return toml.replace(match[0], `[${section}]\n${nextBody}`);
}

function deleteSectionField(toml, section, key) {
  const match = toml.match(sectionRegExp(section));
  if (!match) return toml;
  const fieldRegExp = new RegExp(
    `^[ \\t]*${escapeRegExp(key)}[ \\t]*=[^\\r\\n]*\\r?\\n?`,
    "m",
  );
  const nextBody = (match[1] || "").replace(fieldRegExp, "");
  if (!nextBody.trim()) return toml.replace(match[0], "").replace(/\n{3,}/g, "\n\n");
  return toml.replace(match[0], `[${section}]\n${nextBody}`);
}

function parseModelSection(toml, slot) {
  const match = toml.match(sectionRegExp(`model.${slot}`));
  if (!match) return null;
  const body = match[1] || "";
  const contextWindow = getSectionNumber(toml, `model.${slot}`, "context_window");
  return {
    model: getSectionField(toml, `model.${slot}`, "model"),
    base_url: getSectionField(toml, `model.${slot}`, "base_url"),
    name: getSectionField(toml, `model.${slot}`, "name"),
    api_key: getSectionField(toml, `model.${slot}`, "api_key"),
    api_backend: getSectionField(toml, `model.${slot}`, "api_backend"),
    context_window: Number.isFinite(contextWindow) && contextWindow > 0 ? contextWindow : null,
    raw: body,
  };
}

function buildModelSection({ slot, model, baseUrl, apiKey, contextWindow, name }) {
  const lines = [
    `[model.${slot}]`,
    `model = ${tomlString(model)}`,
    `base_url = ${tomlString(baseUrl)}`,
    `name = ${tomlString(name)}`,
    `description = ${tomlString("Routed via iNeedRouter gateway")}`,
    `api_backend = "chat_completions"`,
  ];
  if (apiKey) lines.push(`api_key = ${tomlString(apiKey)}`);
  if (Number.isFinite(contextWindow) && contextWindow > 0) {
    lines.push(`context_window = ${Math.floor(contextWindow)}`);
  }
  return `${lines.join("\n")}\n`;
}

function upsertModelSection(toml, config) {
  const regexp = sectionRegExp(`model.${config.slot}`);
  const section = buildModelSection(config);
  if (regexp.test(toml)) return toml.replace(regexp, section);
  const prefix = toml.length > 0 && !toml.endsWith("\n") ? `${toml}\n` : toml;
  return `${prefix}\n${section}`;
}

function removeModelSections(toml, slots) {
  let next = toml;
  for (const slot of slots) {
    next = next.replace(sectionRegExp(`model.${slot}`), "");
  }
  return next.replace(/\n{3,}/g, "\n\n");
}

function insertMarker(toml, marker) {
  // Anchor beside whichever managed main-model section exists (new or legacy).
  for (const anchor of [GROK_MAIN_MODEL_SLOT, GROK_LEGACY_MODEL_SLOT]) {
    const mainSection = sectionRegExp(`model.${anchor}`);
    if (mainSection.test(toml)) {
      return toml.replace(mainSection, (section) => `${marker}${section}`);
    }
  }
  const prefix = toml.length > 0 && !toml.endsWith("\n") ? `${toml}\n` : toml;
  return `${prefix}${marker}`;
}

function rememberPreviousDefault(toml) {
  if (previousDefaultRegExp.test(toml)) return toml;
  const current = getSectionField(toml, MODELS_SECTION, "default");
  if (!current || isMainSlotKey(current)) return toml;
  return insertMarker(
    toml,
    `${PREVIOUS_DEFAULT_MARKER_PREFIX}${tomlString(current)}\n`,
  );
}

function restorePreviousDefault(toml) {
  const previous = toml.match(previousDefaultRegExp)?.[1] || GROK_BUILTIN_DEFAULT;
  let next = toml.replace(previousDefaultRegExp, "");
  if (isMainSlotKey(getSectionField(next, MODELS_SECTION, "default"))) {
    next = setSectionField(next, MODELS_SECTION, "default", previous);
  }
  return next;
}

function rememberPreviousSubagent(toml, type) {
  const regexp = previousSubagentRegExp(type);
  if (regexp.test(toml)) return toml;
  const current = getSectionField(toml, SUBAGENT_MODELS_SECTION, type);
  const previous = current == null ? UNSET_SENTINEL : current;
  return insertMarker(
    toml,
    `${PREVIOUS_SUBAGENT_MARKER_PREFIX}${type} = ${tomlString(previous)}\n`,
  );
}

function restorePreviousSubagent(toml, type) {
  const regexp = previousSubagentRegExp(type);
  const previous = toml.match(regexp)?.[1] || UNSET_SENTINEL;
  let next = toml.replace(regexp, "");
  const current = getSectionField(next, SUBAGENT_MODELS_SECTION, type);
  // Managed mappings exist under both the new and the legacy slot prefix.
  if (current !== modelSlot(type) && current !== legacyModelSlot(type)) {
    return next;
  }
  if (previous === UNSET_SENTINEL) {
    return deleteSectionField(next, SUBAGENT_MODELS_SECTION, type);
  }
  return setSectionField(next, SUBAGENT_MODELS_SECTION, type, previous);
}

/**
 * Remove leftover legacy [model.9router*] sections after their values were
 * migrated to the new "ineedrouter" slots.
 */
function stripLegacyModelSections(toml) {
  return removeModelSections(toml, [
    GROK_LEGACY_MODEL_SLOT,
    ...GROK_SUBAGENT_TYPES.map(legacyModelSlot),
  ]);
}

export function parseGrokBuildConfig(toml) {
  const subagentModels = {};
  const subagentMappings = {};
  for (const type of GROK_SUBAGENT_TYPES) {
    const mapping = getSectionField(toml, SUBAGENT_MODELS_SECTION, type);
    subagentMappings[type] = mapping;
    const isManaged =
      mapping != null &&
      (mapping.startsWith(`${GROK_MAIN_MODEL_SLOT}-`) ||
        mapping.startsWith(`${GROK_LEGACY_MODEL_SLOT}-`));
    subagentModels[type] = isManaged ? parseModelSection(toml, mapping) : null;
  }

  const main =
    parseModelSection(toml, GROK_MAIN_MODEL_SLOT) ??
    parseModelSection(toml, GROK_LEGACY_MODEL_SLOT);

  return {
    model: main,
    default: getSectionField(toml, MODELS_SECTION, "default"),
    subagentModels,
    subagentMappings,
  };
}

/**
 * Apply main model and optional per-type subagent overrides while preserving all unrelated TOML.
 * `subagentModels === undefined` leaves existing subagent config untouched for API compatibility.
 */
export function applyGrokBuildConfig(
  toml,
  { baseUrl, apiKey, model, contextWindow, subagentModels },
) {
  let next = rememberPreviousDefault(toml);

  // Main slot must exist before subagent markers are inserted: insertMarker
  // anchors to the main section, and writing it later would let the loop's
  // first remember-append orphan markers inside a subagent section body.
  next = upsertModelSection(next, {
    slot: GROK_MAIN_MODEL_SLOT,
    model,
    baseUrl,
    apiKey,
    contextWindow,
    name: "iNeedRouter",
  });
  next = setSectionField(next, MODELS_SECTION, "default", GROK_MAIN_MODEL_SLOT);

  if (subagentModels && typeof subagentModels === "object") {
    for (const type of GROK_SUBAGENT_TYPES) {
      const selected = subagentModels[type];
      const slot = modelSlot(type);
      if (selected?.model) {
        next = rememberPreviousSubagent(next, type);
        next = upsertModelSection(next, {
          slot,
          model: selected.model,
          baseUrl,
          apiKey,
          contextWindow: selected.contextWindow,
          name: `iNeedRouter ${type}`,
        });
        next = setSectionField(next, SUBAGENT_MODELS_SECTION, type, slot);
      } else {
        next = restorePreviousSubagent(next, type);
        next = removeModelSections(next, [slot]);
      }
    }
  }

  // Migrate away from legacy sections once their values were preserved above.
  next = stripLegacyModelSections(next);

  return next;
}

export function resetGrokBuildConfig(toml) {
  let next = toml;
  for (const type of GROK_SUBAGENT_TYPES) {
    next = restorePreviousSubagent(next, type);
    next = removeModelSections(next, [modelSlot(type), legacyModelSlot(type)]);
  }
  next = removeModelSections(next, [
    GROK_MAIN_MODEL_SLOT,
    GROK_LEGACY_MODEL_SLOT,
  ]);
  next = restorePreviousDefault(next);
  return next.replace(/\n{3,}/g, "\n\n");
}

export function getGrokSubagentSlot(type) {
  return GROK_SUBAGENT_TYPES.includes(type) ? modelSlot(type) : null;
}
