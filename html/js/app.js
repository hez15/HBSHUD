'use strict';

// ============================================================
//  HBSHUD  –  NUI Application
// ============================================================

/* ─── State ────────────────────────────────────────────────── */
const state = {
    visible:      true,
    lowThreshold: 25,
    showBars:     { health: true, armor: true, hunger: true, thirst: true, stress: true, oxygen: true },
};

/* ─── DOM cache ─────────────────────────────────────────────── */
const el = {
    statusPanel:    document.getElementById('status-panel'),
    minimapBorder:  document.getElementById('minimap-border'),

    // Status items (for .low class toggling)
    items: {
        health: document.getElementById('s-health'),
        armor:  document.getElementById('s-armor'),
        hunger: document.getElementById('s-hunger'),
        thirst: document.getElementById('s-thirst'),
        stress: document.getElementById('s-stress'),
        oxygen: document.getElementById('s-oxygen'),
    },

    // Progress rings
    rings: {
        health: document.getElementById('ring-health'),
        armor:  document.getElementById('ring-armor'),
        hunger: document.getElementById('ring-hunger'),
        thirst: document.getElementById('ring-thirst'),
        stress: document.getElementById('ring-stress'),
        oxygen: document.getElementById('ring-oxygen'),
    },
};

/* ─── Helpers ───────────────────────────────────────────────── */

/**
 * Set a circular progress ring.
 * @param {SVGCircleElement} ring   – the .ring-fill element
 * @param {HTMLElement}      item   – the .status-item wrapper (for .low class)
 * @param {number}           value  – 0-100
 * @param {boolean}          invert – if true, HIGH value triggers .low (stress)
 */
function setRing(ring, item, value, invert = false) {
    const v = Math.max(0, Math.min(100, value));
    ring.style.strokeDasharray = `${v} ${100 - v}`;

    const threshold = state.lowThreshold;
    const isLow = invert ? v >= (100 - threshold) : v <= threshold;
    item.classList.toggle('low', isLow);
}

function show(element) { element.classList.remove('hidden'); }
function hide(element) { element.classList.add('hidden');    }

/* ─── NUI message dispatcher ────────────────────────────────── */
window.addEventListener('message', ({ data }) => {
    if (!data || !data.action) return;
    const { action, ...rest } = data;

    switch (action) {
        case 'init':        return handleInit(rest);
        case 'setVisible':  return handleSetVisible(rest.visible);
        case 'updateStats': return handleStats(rest);
    }
});

/* ─── Handlers ──────────────────────────────────────────────── */

function handleInit(data) {
    state.visible      = data.visible ?? true;
    state.lowThreshold = data.config?.lowThreshold ?? 25;

    const cfg  = data.config ?? {};
    const root = document.documentElement;

    if (cfg.theme) {
        const t = cfg.theme;
        if (t.accent) {
            root.style.setProperty('--accent', t.accent);
            root.style.setProperty('--accent-glow', t.accent + '59');       // ~35% opacity
            root.style.setProperty('--accent-glow-inset', t.accent + '14'); // ~8% opacity
        }
        if (t.border)     root.style.setProperty('--border', t.border);
        if (t.background) root.style.setProperty('--background', t.background);
        if (t.text)       root.style.setProperty('--text', t.text);
    }

    if (cfg.barColors) {
        const b = cfg.barColors;
        if (b.health) root.style.setProperty('--c-health', b.health);
        if (b.armor)  root.style.setProperty('--c-armor',  b.armor);
        if (b.hunger) root.style.setProperty('--c-hunger', b.hunger);
        if (b.thirst) root.style.setProperty('--c-thirst', b.thirst);
        if (b.stress) root.style.setProperty('--c-stress', b.stress);
        if (b.oxygen) root.style.setProperty('--c-oxygen', b.oxygen);
    }

    if (cfg.showBars) {
        state.showBars = cfg.showBars;
        for (const [key, item] of Object.entries(el.items)) {
            if (key === 'oxygen') continue; // oxygen has its own visibility logic
            if (!state.showBars[key]) hide(item); else show(item);
        }
    }

    handleSetVisible(state.visible);
}

function handleSetVisible(visible) {
    state.visible = visible;
    visible ? show(el.statusPanel)   : hide(el.statusPanel);
    visible ? show(el.minimapBorder) : hide(el.minimapBorder);
}

function handleStats(data) {
    if (!state.visible) return;

    const sb = state.showBars;
    if (sb.health) setRing(el.rings.health, el.items.health, data.health ?? 100);
    if (sb.armor)  setRing(el.rings.armor,  el.items.armor,  data.armor  ?? 0);
    if (sb.hunger) setRing(el.rings.hunger, el.items.hunger, data.hunger ?? 100);
    if (sb.thirst) setRing(el.rings.thirst, el.items.thirst, data.thirst ?? 100);
    // Stress: high value = danger (invert = true)
    if (sb.stress) setRing(el.rings.stress, el.items.stress, data.stress ?? 0, true);

    // Oxygen: visible when underwater OR still recovering, and not disabled
    if (sb.oxygen) {
        if (data.underwater || (data.oxygen ?? 100) < 100) {
            show(el.items.oxygen);
            setRing(el.rings.oxygen, el.items.oxygen, data.oxygen ?? 100);
        } else {
            hide(el.items.oxygen);
        }
    }
}

/* ─── Notify client the NUI is ready ───────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    fetch(`https://${GetParentResourceName()}/hudReady`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
    }).catch(() => {});
});
