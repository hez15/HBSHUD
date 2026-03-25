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
    playerPanel:   document.getElementById('player-panel'),
    locationPanel: document.getElementById('location-panel'),
    statusPanel:   document.getElementById('status-panel'),
    vehiclePanel:  document.getElementById('vehicle-panel'),

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

    // Vehicle
    speedValue:        document.getElementById('speed-value'),
    speedUnit:         document.getElementById('speed-unit'),
    fuelBar:           document.getElementById('fuel-bar'),
    fuelValue:         document.getElementById('fuel-value'),
    engineIndicator:   document.getElementById('engine-indicator'),
    seatbeltIndicator: document.getElementById('seatbelt-indicator'),
    gearValue:         document.getElementById('gear-value'),

    // Location
    streetName:   document.getElementById('street-name'),
    crossingName: document.getElementById('crossing-name'),
    zoneName:     document.getElementById('zone-name'),

    // Player info
    playerName: document.getElementById('player-name'),
    playerJob:  document.getElementById('player-job'),
    playerCash: document.getElementById('player-cash'),
    playerBank: document.getElementById('player-bank'),
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

function formatMoney(n) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
    return `$${Math.floor(n)}`;
}

function show(element) { element.classList.remove('hidden'); }
function hide(element) { element.classList.add('hidden');    }

/* ─── NUI message dispatcher ────────────────────────────────── */
window.addEventListener('message', ({ data }) => {
    if (!data || !data.action) return;
    const { action, ...rest } = data;

    switch (action) {
        case 'init':          return handleInit(rest);
        case 'setVisible':    return handleSetVisible(rest.visible);
        case 'updateStats':   return handleStats(rest);
        case 'updateVehicle': return handleVehicle(rest);
        case 'updateLocation':return handleLocation(rest);
        case 'updatePlayerInfo': return handlePlayerInfo(rest);
        case 'updateSeatbelt':   return handleSeatbelt(rest.on);
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
        if (b.fuel)   root.style.setProperty('--c-fuel',   b.fuel);
    }

    // Respect feature flags
    if (cfg.showPlayerInfo === false) hide(el.playerPanel);
    if (cfg.showLocation   === false) hide(el.locationPanel);

    handleSetVisible(state.visible);
}

function handleSetVisible(visible) {
    state.visible = visible;
    const mainPanels = [el.playerPanel, el.locationPanel, el.statusPanel];

    if (visible) {
        mainPanels.forEach(p => show(p));
    } else {
        mainPanels.forEach(p => hide(p));
        hide(el.vehiclePanel);
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

function handleVehicle(data) {
    if (!state.visible) return;

    if (!data.inVehicle) {
        hide(el.vehiclePanel);
        return;
    }

    show(el.vehiclePanel);

    // Speed
    el.speedValue.textContent = data.speed    ?? 0;
    el.speedUnit.textContent  = (data.speedUnit ?? 'mph').toUpperCase();

    // Fuel
    const fuel = data.fuel ?? 100;
    el.fuelBar.style.width     = `${fuel}%`;
    el.fuelValue.textContent   = Math.floor(fuel);
    el.fuelBar.style.background =
        fuel < 15  ? 'var(--c-low)'     :
        fuel < 30  ? 'var(--c-warning)' :
                     'var(--c-fuel)';

    // Engine
    const eng = data.engineHealth ?? 100;
    el.engineIndicator.classList.remove('active', 'warning');
    el.engineIndicator.classList.add(eng > 50 ? 'active' : 'warning');

    // Seatbelt
    handleSeatbelt(data.seatbelt);

    // Gear (0 = reverse)
    if (data.gear !== undefined) {
        el.gearValue.textContent = data.gear === 0 ? 'R' : data.gear;
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

function handlePlayerInfo(data) {
    if (!state.visible) return;

    el.playerName.textContent = data.name || 'Unknown';
    el.playerJob.textContent  = data.jobGrade
        ? `${data.job} · ${data.jobGrade}`
        : (data.job || 'Unemployed');
    el.playerCash.textContent = formatMoney(data.cash || 0);
    el.playerBank.textContent = formatMoney(data.bank || 0);
}

function handleSeatbelt(isOn) {
    el.seatbeltIndicator.classList.remove('active', 'warning');
    el.seatbeltIndicator.classList.add(isOn ? 'active' : 'warning');
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
