fx_version 'cerulean'
game 'gta5'

name        'HBSHUD'
description 'QBX Core Player HUD — ps-hud style'
version     '1.0.0'
author      'HBS'

shared_scripts {
    'config.lua',
}

client_scripts {
    'client/main.lua',
}

server_scripts {
    'server/main.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/style.css',
    'html/js/app.js',
}

lua54 'yes'
