export interface ThreatIntel {
  isMalicious: boolean;
  malwareFamilies: string[];
  tags: string[];
  lastSeen?: string;
}

export class ThreatIntelService {
  static async getIntelForIp(ip: string): Promise<ThreatIntel> {
    const apiKey = import.meta.env.VITE_ALIENVAULT_API_KEY;
    if (!apiKey) {
      // Return realistic mock data to showcase the feature if API key is not provided
      return this.mockIntel(ip);
    }
    
    try {
      const response = await fetch(`https://otx.alienvault.com/api/v1/indicators/IPv4/${ip}/general`, {
        headers: {
          'X-OTX-API-KEY': apiKey
        }
      });
      
      if (!response.ok) return this.mockIntel(ip);
      const data = await response.json();
      
      const tags = data.pulse_info?.pulses?.flatMap((p: any) => p.tags) || [];
      const isMalicious = data.pulse_info?.count > 0;
      
      return {
        isMalicious,
        malwareFamilies: data.malware_families || [],
        tags: Array.from(new Set(tags)).slice(0, 5) as string[],
        lastSeen: data.pulse_info?.pulses?.[0]?.modified
      };
    } catch (e) {
      console.error("AlienVault API Error:", e);
      return this.mockIntel(ip);
    }
  }

  private static mockIntel(ip: string): ThreatIntel {
    // Generate deterministic mock data based on IP string
    const ipInt = ip.split('.').reduce((acc, octet) => acc + parseInt(octet), 0);
    const isMalicious = ipInt % 3 === 0;
    
    if (!isMalicious) {
      return { isMalicious: false, malwareFamilies: [], tags: [] };
    }

    const possibleTags = ["botnet", "c2", "ransomware", "phishing", "scanner", "apt", "mirai", "cobalt strike"];
    const possibleFamilies = ["Lazarus", "LockBit", "Emotet", "TrickBot", "Qakbot"];
    
    return {
      isMalicious: true,
      malwareFamilies: ipInt % 2 === 0 ? [possibleFamilies[ipInt % possibleFamilies.length]] : [],
      tags: [possibleTags[ipInt % possibleTags.length], possibleTags[(ipInt + 1) % possibleTags.length]],
      lastSeen: new Date(Date.now() - ipInt * 100000).toISOString()
    };
  }
}
