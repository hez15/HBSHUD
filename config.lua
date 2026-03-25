Config = {}

-- Key to toggle HUD visibility
Config.ToggleKey  = 'F5'
-- Key to toggle seatbelt
Config.SeatbeltKey = 'K'

-- Show HUD by default on spawn
Config.DefaultVisible = true

-- Speed unit: 'mph' or 'kph'
Config.SpeedUnit = 'mph'

-- Value (%) below which a status bar shows the low/danger pulse
Config.LowThreshold = 25

-- ─── Theme ──────────────────────────────────────────────────────────────────
-- These override the default CSS variables. Use valid CSS colour strings.
Config.Theme = {
    accent     = '#7c3aed',                -- Purple accent
    background = 'rgba(6, 6, 18, 0.90)',
    border     = 'rgba(124, 58, 237, 0.20)',
    text       = '#f1f5f9',
}

-- Colours for each individual status ring
Config.BarColors = {
    health  = '#10b981',   -- Emerald green
    armor   = '#3b82f6',   -- Blue
    hunger  = '#f97316',   -- Orange
    thirst  = '#06b6d4',   -- Cyan
    stress  = '#a855f7',   -- Purple
    oxygen  = '#0ea5e9',   -- Sky blue
    fuel    = '#fbbf24',   -- Amber
}

-- ─── Feature toggles ────────────────────────────────────────────────────────
Config.ShowBars = {
    health  = true,
    armor   = true,
    hunger  = true,
    thirst  = true,
    stress  = true,
    oxygen  = true,   -- auto-hides when not underwater
}

Config.ShowPlayerInfo  = true   -- Name / job / money panel (top-left)
Config.ShowLocation    = true   -- Street / zone overlay (bottom-left)
Config.ShowVehicleHUD  = true   -- Speed / fuel / engine panel
