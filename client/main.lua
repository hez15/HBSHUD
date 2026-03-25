-- ============================================================
--  HBSHUD  –  Client
-- ============================================================
local QBX           = exports.qbx_core
local PlayerData    = {}
local HUDVisible    = Config.DefaultVisible
local oxygenLevel   = 100
local wasUnderwater = false

-- ─── Helper ─────────────────────────────────────────────────
local function sendConfig()
    SendNUIMessage({
        action = 'init',
        visible = HUDVisible,
        config  = {
            theme        = Config.Theme,
            barColors    = Config.BarColors,
            lowThreshold = Config.LowThreshold,
            showBars     = Config.ShowBars,
            showLocation = Config.ShowLocation,
        },
    })
end

-- ─── Initialise after resource starts ───────────────────────
AddEventHandler('onClientResourceStart', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    SetTimeout(500, function()
        PlayerData = QBX:GetPlayerData() or {}
        sendConfig()
    end)
end)

-- ─── QBX Core events ────────────────────────────────────────
AddEventHandler('QBXCore:client:onPlayerLoaded', function(pData)
    PlayerData = pData
    sendConfig()
end)

AddEventHandler('QBXCore:client:playerLoggedOut', function()
    PlayerData = {}
    SendNUIMessage({ action = 'setVisible', visible = false })
end)

-- ─── Commands & keybinds ────────────────────────────────────
RegisterCommand('togglehud', function()
    HUDVisible = not HUDVisible
    SendNUIMessage({ action = 'setVisible', visible = HUDVisible })
end, false)

RegisterKeyMapping('togglehud', 'Toggle HUD Visibility', 'keyboard', Config.ToggleKey)

-- ─── NUI Callbacks ──────────────────────────────────────────
RegisterNUICallback('hudReady', function(_, cb)
    sendConfig()
    cb('ok')
end)

-- ─── Oxygen tracking (manual) ───────────────────────────────
CreateThread(function()
    while true do
        Wait(200)
        local ped = PlayerPedId()
        if IsPedSwimmingUnderWater(ped) then
            wasUnderwater = true
            oxygenLevel   = math.max(0, oxygenLevel - 2)
        elseif oxygenLevel < 100 then
            oxygenLevel   = math.min(100, oxygenLevel + 4)
            if oxygenLevel >= 100 then wasUnderwater = false end
        end
    end
end)

-- ─── Main stats thread (333 ms) ─────────────────────────────
CreateThread(function()
    while true do
        Wait(333)
        if not HUDVisible then goto continue end

        local ped   = PlayerPedId()
        local pData = QBX:GetPlayerData()
        if not pData then goto continue end

        local rawHp  = GetEntityHealth(ped)
        local health = math.floor(math.max(0, (rawHp - 100)))   -- 0-100
        local armor  = GetPedArmour(ped)                         -- 0-100

        local meta   = pData.metadata or {}
        local hunger = math.floor(meta.hunger or 100)
        local thirst = math.floor(meta.thirst or 100)
        local stress = math.floor(meta.stress or 0)
        local underwater = IsPedSwimmingUnderWater(ped)

        SendNUIMessage({
            action     = 'updateStats',
            health     = health,
            armor      = armor,
            hunger     = hunger,
            thirst     = thirst,
            stress     = stress,
            oxygen     = math.floor(oxygenLevel),
            underwater = underwater,
        })

        ::continue::
    end
end)

-- ─── Location thread (2 s) ──────────────────────────────────
CreateThread(function()
    while true do
        Wait(2000)
        if not HUDVisible or not Config.ShowLocation then goto continue end

        local ped  = PlayerPedId()
        local pos  = GetEntityCoords(ped)
        local sh, ch = GetStreetNameAtCoord(pos.x, pos.y, pos.z)

        local street   = GetStreetNameFromHashKey(sh)
        local crossing = ch ~= 0 and GetStreetNameFromHashKey(ch) or ''
        local zone     = GetLabelText(GetNameOfZone(pos.x, pos.y, pos.z))

        SendNUIMessage({
            action   = 'updateLocation',
            street   = street,
            crossing = crossing,
            zone     = zone,
        })

        ::continue::
    end
end)
