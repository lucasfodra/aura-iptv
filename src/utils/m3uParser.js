/**
 * Simple M3U/M3U8 playlist parser
 * Reads the raw string content of an M3U file and parses it into a structured array of channels.
 */
export function parseM3U(rawContent) {
  if (!rawContent) return [];

  const lines = rawContent.split(/\r?\n/);
  const channels = [];
  let currentChannel = null;
  let idCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      idCounter++;
      currentChannel = {
        id: `channel-${idCounter}`,
        name: 'Canal Sem Nome',
        url: '',
        logo: '',
        category: 'Outros',
        tvgId: '',
        tvgName: ''
      };

      // Extract attributes using regex
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const nameMatch = line.match(/tvg-name="([^"]+)"/i);
      const idMatch = line.match(/tvg-id="([^"]+)"/i);

      if (logoMatch) currentChannel.logo = logoMatch[1];
      if (groupMatch) currentChannel.category = groupMatch[1];
      if (nameMatch) currentChannel.tvgName = nameMatch[1];
      if (idMatch) currentChannel.tvgId = idMatch[1];

      // Extract channel name (everything after the last comma on the #EXTINF line)
      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        const namePart = line.substring(commaIndex + 1).trim();
        if (namePart) {
          currentChannel.name = namePart;
        }
      }
    } else if (line && !line.startsWith('#')) {
      // It's a URL line
      if (currentChannel) {
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = null; // reset for the next channel
      } else {
        // Just in case we find a URL without a previous #EXTINF, we can still parse it as a basic channel
        idCounter++;
        channels.push({
          id: `channel-${idCounter}`,
          name: `Fluxo ${idCounter}`,
          url: line,
          logo: '',
          category: 'Geral',
          tvgId: '',
          tvgName: ''
        });
      }
    }
  }

  return channels;
}

/**
 * Extracts all unique categories from parsed channels
 * @param {Array} channels 
 * @returns {Array} Array of strings
 */
export function getCategories(channels) {
  const categoriesSet = new Set();
  channels.forEach(channel => {
    if (channel.category) {
      categoriesSet.add(channel.category);
    }
  });
  
  // Return sorted categories, with 'Favoritos' and 'Todos' handled at application level
  return Array.from(categoriesSet).sort((a, b) => a.localeCompare(b));
}
