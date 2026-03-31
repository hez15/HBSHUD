-- ============================================================
--  HBSHUD  –  Client
-- ============================================================
local QBX           = exports.qbx_core
local PlayerData    = {}
local HUDVisible    = Config.DefaultVisible
local playerLoaded  = false
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
        },
    })
end

-- ─── Initialise after resource starts ───────────────────────
-- Handles the case where the resource is restarted mid-session
AddEventHandler('onClientResourceStart', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    SetTimeout(1000, function()
        local pData = QBX:GetPlayerData()
        -- Only mark as loaded if the data is actually populated
        if pData and pData.citizenid then
            PlayerData   = pData
            playerLoaded = true
            sendConfig()
        end
    end)
end)

-- ─── QBX Core events ────────────────────────────────────────
AddEventHandler('QBXCore:client:onPlayerLoaded', function(pData)
    PlayerData   = pData
    playerLoaded = true
    sendConfig()
end)

AddEventHandler('QBXCore:client:playerLoggedOut', function()
    PlayerData   = {}
    playerLoaded = false
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
        -- Don't send data until the character is actually loaded
        if not HUDVisible or not playerLoaded then goto continue end

        local ped   = PlayerPedId()
        local pData = QBX:GetPlayerData()

        -- QBX returns {} before character loads — guard with citizenid
        if not pData or not pData.citizenid then goto continue end

        -- Health: native returns 100–200; subtract 100 to get 0–100
        local rawHp  = GetEntityHealth(ped)
        local health = math.floor(math.max(0, rawHp - 100))
        local armor  = GetPedArmour(ped)

        local meta   = pData.metadata or {}
        -- QBX stores hunger/thirst as 0-100 (100 = full, 0 = starving)
        local hunger = math.floor(meta.hunger  or 100)
        local thirst = math.floor(meta.thirst  or 100)
        -- Stress: 0 = calm, 100 = maxed
        local stress = math.floor(meta.stress  or 0)

        SendNUIMessage({
            action     = 'updateStats',
            health     = health,
            armor      = armor,
            hunger     = hunger,
            thirst     = thirst,
            stress     = stress,
            oxygen     = math.floor(oxygenLevel),
            underwater = IsPedSwimmingUnderWater(ped),
        })

        ::continue::
    end
end)
