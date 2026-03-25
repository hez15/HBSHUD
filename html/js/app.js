'use strict';

// ============================================================
//  HBSHUD  –  NUI Application
// ============================================================

/* ─── State ────────────────────────────────────────────────── */
const state = {
    visible:      true,
    config:       null,
    lowThreshold: 25,
};

/* ─── DOM cache ─────────────────────────────────────────────── */
const el = {
    // Panels
    locationPanel: document.getElementById('location-panel'),
    statusPanel:   document.getElementById('status-panel'),

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

    // Location
    streetName:   document.getElementById('street-name'),
    crossingName: document.getElementById('crossing-name'),
    zoneName:     document.getElementById('zone-name'),
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
        case 'init':           return handleInit(rest);
        case 'setVisible':     return handleSetVisible(rest.visible);
        case 'updateStats':    return handleStats(rest);
        case 'updateLocation': return handleLocation(rest);
    }
});

/* ─── Handlers ──────────────────────────────────────────────── */

function handleInit(data) {
    state.visible      = data.visible ?? true;
    state.config       = data.config  ?? {};
    state.lowThreshold = data.config?.lowThreshold ?? 25;

    // Apply theme CSS variables
    const cfg = data.config ?? {};
    const root = document.documentElement;

    if (cfg.theme) {
        const t = cfg.theme;
        if (t.accent)     root.style.setProperty('--accent', t.accent);
        if (t.background) root.style.setProperty('--bg',     t.background);
        if (t.border)     root.style.setProperty('--border', t.border);
        if (t.text)       root.style.setProperty('--text',   t.text);
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

    handleSetVisible(state.visible);
}

function handleSetVisible(visible) {
    state.visible = visible;

    if (visible) {
        show(el.locationPanel);
        show(el.statusPanel);
    } else {
        hide(el.locationPanel);
        hide(el.statusPanel);
    }
}

function handleStats(data) {
    if (!state.visible) return;

    setRing(el.rings.health, el.items.health, data.health ?? 100);
    setRing(el.rings.armor,  el.items.armor,  data.armor  ?? 0);
    setRing(el.rings.hunger, el.items.hunger, data.hunger ?? 100);
    setRing(el.rings.thirst, el.items.thirst, data.thirst ?? 100);
    // Stress: high stress = danger (invert = true)
    setRing(el.rings.stress, el.items.stress, data.stress ?? 0, true);

    // Oxygen only visible when underwater
    if (data.underwater) {
        show(el.items.oxygen);
        setRing(el.rings.oxygen, el.items.oxygen, data.oxygen ?? 100);
    } else {
        hide(el.items.oxygen);
    }
}

function handleLocation(data) {
    if (!state.visible) return;

    el.streetName.textContent = data.street || 'Unknown Street';
    el.zoneName.textContent   = data.zone   || '';

    if (data.crossing && data.crossing.trim() !== '') {
        el.crossingName.textContent = `& ${data.crossing}`;
        show(el.crossingName);
    } else {
        hide(el.crossingName);
    }
}

/* ─── Notify client the NUI is ready ───────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    fetch(`https://${GetParentResourceName()}/hudReady`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
    }).catch(() => {
        // Running outside FiveM (browser preview) — ignore fetch errors
    });
});
