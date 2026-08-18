const { Relay } = require('bedrock-protocol');
const fs = require('fs');

const relay = new Relay({
  host: '0.0.0.0',
  port: 19132,
  destination: {
    host: 'donutsmp.net',
    port: 19132
  },
  motd: {
    motd: '§bStash Proxy §a[ONLINE]',
    levelName: 'DonutSMP Helper'
  }
});

const containerMap = new Map();
const alertedLocations = new Set();

relay.on('connect', (player) => {
  console.log('Player terhubung ke Proxy!');
  
  player.on('packet', (packet) => {
    // Memantau paket 'block_entity_data' dari server
    if (packet.data.name === 'block_entity_data') {
      const p = packet.data.params;
      if (!p || !p.pos) return;

      const { x, y, z } = p.pos;
      const blockId = JSON.stringify(p).toLowerCase();

      let type = null;
      if (blockId.includes('hopper')) type = 'hopper';
      else if (blockId.includes('chest') || blockId.includes('barrel')) type = 'chest'; // Support Barrel
      else if (blockId.includes('spawner')) type = 'spawner';
      else if (blockId.includes('shulker_box')) type = 'shulker'; // Deteksi Shulker Box
      else if (blockId.includes('beacon')) type = 'beacon';       // Deteksi Beacon

      if (type) {
        const posKey = `${x},${y},${z}`;
        if (!containerMap.has(posKey)) {
          containerMap.set(posKey, { x, y, z, type });
          checkAreaCluster(x, y, z, player);
        }
      }
    }
  });
});

function checkAreaCluster(centerX, centerY, centerZ, client) {
  const RADIUS = 24; // Radius 48x48 blok
  
  let totalHoppers = 0;
  let totalChests = 0;
  let totalSpawners = 0;
  let totalShulkers = 0;
  let totalBeacons = 0;

  for (const item of containerMap.values()) {
    if (
      Math.abs(item.x - centerX) <= RADIUS &&
      Math.abs(item.z - centerZ) <= RADIUS &&
      Math.abs(item.y - centerY) <= 40
    ) {
      if (item.type === 'hopper') totalHoppers++;
      if (item.type === 'chest') totalChests++;
      if (item.type === 'spawner') totalSpawners++;
      if (item.type === 'shulker') totalShulkers++;
      if (item.type === 'beacon') totalBeacons++;
    }
  }

  const clusterKey = `${Math.floor(centerX / 16)},${Math.floor(centerZ / 16)}`;
  
  // LOGIKA DETEKSI / TRIGGER SYARAT
  const isStashMatch = totalHoppers >= 10 && totalChests >= 6;
  const isSpawnerMatch = totalSpawners >= 1;
  const isShulkerMatch = totalShulkers >= 2; // Minimal 2 Shulker Box
  const isBeaconMatch = totalBeacons >= 1;   // Minimal 1 Beacon

  if ((isStashMatch || isSpawnerMatch || isShulkerMatch || isBeaconMatch) && !alertedLocations.has(clusterKey)) {
    alertedLocations.add(clusterKey);

    const logText = `[FOUND] Hoppers:${totalHoppers} | Chests:${totalChests} | Spawners:${totalSpawners} | Shulkers:${totalShulkers} | Beacons:${totalBeacons} | Pos: X:${centerX} Y:${centerY} Z:${centerZ}\n`;
    fs.appendFileSync('stash_log.txt', logText);

    // Kirim Notifikasi Chat ke Client Minecraft
    client.write('text', {
      type: 'json_chat',
      needs_translation: false,
      source_name: '',
      message: JSON.stringify({
        rawtext: [
          { text: '§4§l[🚨 HIGH-VALUE TARGET DETECTED 🚨]§r\n' },
          { text: `§a✔ Shulker Box : §f${totalShulkers} (Min 2)\n` },
          { text: `§a✔ Spawner     : §f${totalSpawners} (Min 1)\n` },
          { text: `§a✔ Beacon      : §f${totalBeacons}\n` },
          { text: `§a✔ Hopper      : §f${totalHoppers} (Min 10)\n` },
          { text: `§a✔ Chest/Barrel: §f${totalChests} (Min 6)\n` },
          { text: `§b📍 Posisi      : §fX:${centerX} Y:${centerY} Z:${centerZ}\n` },
          { text: '§7================================' }
        ]
      })
    });
  }
}

console.log('========================================');
console.log('       PROXY READY & RUNNING            ');
console.log('========================================');
