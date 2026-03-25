-- ============================================================
--  HBSHUD  –  Client
-- ============================================================
local QBX         = exports.qbx_core
local PlayerData  = {}
local HUDVisible  = Config.DefaultVisible
local seatbeltOn  = false
local oxygenLevel = 100
local wasUnderwater = false
local lastVehicle = 0

-- ─── Helper ─────────────────────────────────────────────────
local function sendConfig()
    SendNUIMessage({
        action = 'init',
        visible = HUDVisible,
        config  = {
            theme          = Config.Theme,
            barColors      = Config.BarColors,
            lowThreshold   = Config.LowThreshold,
            speedUnit      = Config.SpeedUnit,
            showBars       = Config.ShowBars,
            showPlayerInfo = Config.ShowPlayerInfo,
            showLocation   = Config.ShowLocation,
            showVehicleHUD = Config.ShowVehicleHUD,
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

AddEventHandler('QBXCore:client:onJobUpdate', function(job)
    if PlayerData then
        PlayerData.job = job
    end
end)

AddEventHandler('QBXCore:client:onGangUpdate', function(gang)
    if PlayerData then
        PlayerData.gang = gang
    end
end)

-- ─── Commands & keybinds ────────────────────────────────────
RegisterCommand('togglehud', function()
    HUDVisible = not HUDVisible
    SendNUIMessage({ action = 'setVisible', visible = HUDVisible })
end, false)

RegisterKeyMapping('togglehud', 'Toggle HUD Visibility', 'keyboard', Config.ToggleKey)

RegisterCommand('seatbelt', function()
    local ped = PlayerPedId()
    if GetVehiclePedIsIn(ped, false) == 0 then return end

    seatbeltOn = not seatbeltOn
    local sound = seatbeltOn and 'SEATBELT_ON' or 'SEATBELT_OFF'
    PlaySoundFrontend(-1, sound, 'HUD_FRONTEND_DEFAULT_SOUNDSET', false)
    SendNUIMessage({ action = 'updateSeatbelt', on = seatbeltOn })
end, false)

RegisterKeyMapping('seatbelt', 'Toggle Seatbelt', 'keyboard', Config.SeatbeltKey)

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
            wasUnderwater  = true
            oxygenLevel    = math.max(0, oxygenLevel - 2)
        elseif oxygenLevel < 100 then
            oxygenLevel    = math.min(100, oxygenLevel + 4)
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
        local hunger = math.floor(meta.hunger  or 100)
        local thirst = math.floor(meta.thirst  or 100)
        local stress = math.floor(meta.stress  or 0)
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

-- ─── Vehicle thread (100 ms for smooth speed) ───────────────
CreateThread(function()
    while true do
        Wait(100)
        if not HUDVisible or not Config.ShowVehicleHUD then goto continue end

        local ped = PlayerPedId()
        local veh = GetVehiclePedIsIn(ped, false)

        if veh ~= 0 then
            -- Reset seatbelt on new vehicle
            if veh ~= lastVehicle then
                lastVehicle  = veh
                seatbeltOn   = false
            end

            local speed = GetEntitySpeed(veh)
            local displaySpeed = Config.SpeedUnit == 'mph'
                and math.floor(speed * 2.23694)
                or  math.floor(speed * 3.6)

            local fuel         = math.floor(GetVehicleFuelLevel(veh))
            local engineHealth = math.floor(GetVehicleEngineHealth(veh) / 10)  -- 0-100
            local gear         = GetVehicleCurrentGear(veh)
            local engineOn     = GetIsVehicleEngineRunning(veh)

            SendNUIMessage({
                action        = 'updateVehicle',
                inVehicle     = true,
                speed         = displaySpeed,
                speedUnit     = Config.SpeedUnit,
                fuel          = fuel,
                engineHealth  = engineHealth,
                engineOn      = engineOn,
                seatbelt      = seatbeltOn,
                gear          = gear,
            })
        else
            if lastVehicle ~= 0 then
                lastVehicle = 0
                seatbeltOn  = false
                SendNUIMessage({ action = 'updateVehicle', inVehicle = false })
            end
        end

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

-- ─── Player info thread (5 s) ───────────────────────────────
CreateThread(function()
    while true do
        Wait(5000)
        if not HUDVisible or not Config.ShowPlayerInfo then goto continue end

        local pData = QBX:GetPlayerData()
        if not pData then goto continue end

        local ci   = pData.charinfo or {}
        local name = ((ci.firstname or '') .. ' ' .. (ci.lastname or '')):match('^%s*(.-)%s*$')

        SendNUIMessage({
            action    = 'updatePlayerInfo',
            name      = name,
            job       = pData.job       and pData.job.label                    or 'Unemployed',
            jobGrade  = pData.job       and pData.job.grade and pData.job.grade.name or '',
            gang      = pData.gang      and pData.gang.label                   or nil,
            cash      = pData.money     and pData.money.cash                   or 0,
            bank      = pData.money     and pData.money.bank                   or 0,
        })

        ::continue::
    end
end)
