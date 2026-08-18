const fs = require('fs');

// Map untuk menyimpan lokasi semua container yang ditemukan
// Format key: "x,y,z" -> type: 'hopper' | 'chest'
const containerMap = new Map();
const alertedLocations = new Set();

function processBlockEntity(packet, client) {
  if (!packet.position || !packet.id) return;

  const { x, y, z } = packet.position;
  const blockId = packet.id.toLowerCase();

  let type = null;
  if (blockId.includes('hopper')) type = 'hopper';
  else if (blockId.includes('chest')) type = 'chest';

  if (!type) return;

  const posKey = `${x},${y},${z}`;
  if (!containerMap.has(posKey)) {
    containerMap.set(posKey, { x, y, z, type });
    checkAreaCluster(x, y, z, client);
  }
}

// Fungsi Scan Area 48x48 Blok (3x3 Chunk Area)
function checkAreaCluster(centerX, centerY, centerZ, client) {
  const RADIUS = 24; // 24 blok ke kiri, kanan, depan, belakang (Total Area 48x48)
  
  let totalHoppers = 0;
  let totalChests = 0;

  for (const container of containerMap.values()) {
    // Cek apakah container berada dalam jangkauan 48x48 blok
    if (
      Math.abs(container.x - centerX) <= RADIUS &&
      Math.abs(container.z - centerZ) <= RADIUS &&
      Math.abs(container.y - centerY) <= 40 // Toleransi beda tinggi 40 blok
    ) {
      if (container.type === 'hopper') totalHoppers++;
      if (container.type === 'chest') totalChests++;
    }
  }

  // Buat ID unik untuk area cluster ini agar tidak spamming chat
  const clusterKey = `${Math.floor(centerX / 16)},${Math.floor(centerZ / 16)}`;

  // SYARAT: Minimal 10 Hopper DAN Minimal 6 Chest dalam area 48x48 blok
  if (totalHoppers >= 10 && totalChests >= 6 && !alertedLocations.has(clusterKey)) {
    alertedLocations.add(clusterKey);

    const logText = `[TARGET BASE] ${totalHoppers} Hoppers & ${totalChests} Chests | Area X:${centerX} Y:${centerY} Z:${centerZ}\n`;
    fs.appendFileSync('stash_log.txt', logText);

    // Kirim Notifikasi ke Chat Minecraft
    client.write('text', {
      type: 'json_chat',
      needs_translation: false,
      source_name: '',
      message: JSON.stringify({
        rawtext: [
          { text: '§4§l[🚨 MAIN BASE DETECTED (48x48) 🚨]§r\n' },
          { text: `§eKombinasi Area Terdeteksi:\n` },
          { text: `§a✔ Hopper : §f${totalHoppers} unit (Min. 10)\n` },
          { text: `§a✔ Chest  : §f${totalChests} unit (Min. 6)\n` },
          { text: `§b📍 Koordinat Sekitar: §fX: ${centerX} | Y: ${centerY} | Z: ${centerZ}\n` },
          { text: '§7================================' }
        ]
      })
    });
  }
}
