const { Relay } = require('bedrock-protocol')

const proxy = new Relay({
  version: 'auto', 
  host: '0.0.0.0',
  port: 19132,
  destination: {
    host: 'asia.donutsmp.net', // <--- Udah diubah ke server Asia
    port: 19132
  }
})

let stashFinderActive = true

proxy.on('connect', (player) => {
  player.on('upstream', (packet, cancel) => {
    if (packet.name === 'text' && packet.params.message.startsWith('.')) {
      const msg = packet.params.message.toLowerCase().trim()
      cancel()
      if (msg === '.menu') {
        sendLocalChat(player, '§e--- [ PROXY MENU ] --- \n§a.stash (On/Off) \n§a.status')
      } else if (msg === '.stash') {
        stashFinderActive = !stashFinderActive
        sendLocalChat(player, `§bStash Finder: ${stashFinderActive ? '§aON' : '§cOFF'}`)
      }
    }
  })

  player.on('downstream', (packet) => {
    if (stashFinderActive && packet.name === 'block_entity_data') {
      const { x, y, z } = packet.params.position
      const blockId = packet.params.nbt?.value?.id?.value || ''
      const targetBlocks = ['Hopper', 'Dropper', 'Dispenser']

      if (targetBlocks.some(id => blockId.includes(id))) {
        sendLocalChat(player, `§c[STASH] §f${blockId} di X:${x} Y:${y} Z:${z}`)
      }
    }
  })
})

function sendLocalChat(player, message) {
  player.queue('text', {
    type: 'raw',
    needs_translation: false,
    source_name: '§l§6[PROXY]§r',
    message: message,
    xuid: '',
    platform_chat_id: ''
  })
}

proxy.listen()
console.log('--- PROXY AKTIF (ASIA) ---')

