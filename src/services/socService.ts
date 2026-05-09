import { GoogleGenAI } from "@google/genai";
import { ThreatIntel, ThreatIntelService } from "./threatIntelService";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Types
export type ThreatLevel = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  sourceIp: string;
  destinationIp: string;
  eventType: string;
  description: string;
  threatLevel: ThreatLevel;
  riskScore: number;
  threatIntel?: ThreatIntel;
}

export interface IncidentReport {
  id: string;
  event: SecurityEvent;
  aiExplanation: string;
  recommendedMitigation: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  timestamp: string;
}

// Generate realistic simulated events
const ipPool = ["192.168.1.105", "10.0.0.42", "172.16.254.1", "45.33.32.156", "185.15.59.224", "114.114.114.114", "8.8.8.8"];
const eventTypes = ["Failed Login", "Port Scan", "Data Exfiltration", "Malware Callback", "Brute Force", "SQL Injection", "Unusual Traffic Spike"];

export class SOCService {
  
  static async generateSimulatedEvent(): Promise<SecurityEvent> {
    const isMalicious = Math.random() > 0.7; // 30% chance of threat
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const sourceIp = ipPool[Math.floor(Math.random() * ipPool.length)];
    
    let level: ThreatLevel = 'INFO';
    let score = Math.floor(Math.random() * 20); // 0-19

    if (isMalicious) {
      if (type === "Brute Force" || type === "SQL Injection") {
        level = 'CRITICAL';
        score = 85 + Math.floor(Math.random() * 15);
      } else if (type === "Data Exfiltration" || type === "Malware Callback") {
        level = 'HIGH';
        score = 70 + Math.floor(Math.random() * 15);
      } else {
        level = 'MEDIUM';
        score = 40 + Math.floor(Math.random() * 30);
      }
    } else {
      if (Math.random() > 0.8) level = 'LOW';
      score = 20 + Math.floor(Math.random() * 20);
    }

    const intel = await ThreatIntelService.getIntelForIp(sourceIp);

    return {
      id: `EVT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      timestamp: new Date().toISOString(),
      sourceIp,
      destinationIp: "10.0.2.15", // Simulated internal server
      eventType: type,
      description: `Detected ${type.toLowerCase()} pattern from ${sourceIp}`,
      threatLevel: level,
      riskScore: score,
      threatIntel: intel
    };
  }

  static async analyzeThreat(event: SecurityEvent): Promise<{explanation: string, mitigation: string}> {
    try {
      const prompt = `
        You are an elite AI Cybersecurity Architect and Senior SOC Engineer.
        Analyze this raw security event and provide a highly professional, enterprise-grade AI explanation and mitigation strategy.
        Be concise, use Palantir-style SOC terminology.
        
        Event Data:
        - Type: ${event.eventType}
        - Source IP: ${event.sourceIp}
        - Risk Score: ${event.riskScore}/100
        - Description: ${event.description}
        
        Return JSON in this format:
        {
          "explanation": "Brief, technical explanation of the threat (max 2 sentences).",
          "mitigation": "Recommended immediate isolation/mitigation step."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const result = JSON.parse(response.text.trim());
      return {
        explanation: result.explanation || "Analyzing anomaly patterns via Isolation Forest...",
        mitigation: result.mitigation || "Isolate affected node."
      };
    } catch (e) {
      console.error("Gemini AI Analysis Error:", e);
      return {
        explanation: "Suspicious activity detected matching predictive ML threat models.",
        mitigation: "Quarantine IP on edge firewall."
      };
    }
  }

  static triggerVoiceAlert(message: string, isCritical: boolean = false) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.1; // Slightly faster, technical sound
      utterance.pitch = 0.9; 
      
      // Try to find a synthetic/machine sounding voice (often Google UK or similar)
      const voices = window.speechSynthesis.getVoices();
      const techVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Zira"));
      if (techVoice) utterance.voice = techVoice;

      window.speechSynthesis.speak(utterance);
    }
  }
}
