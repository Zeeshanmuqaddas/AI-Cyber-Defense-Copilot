import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from "jspdf";
import { AlertTriangle, Activity, Shield, ShieldAlert, FileText, Volume2, VolumeX, Cpu, Network, Server, Terminal, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { cn } from './lib/utils';
import { SOCService, SecurityEvent, IncidentReport, ThreatLevel } from './services/socService';

export default function App() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Simulation Loop
  useEffect(() => {
    // Initial chart data
    const initialData = Array.from({ length: 20 }, (_, i) => ({
      time: i,
      traffic: 500 + Math.random() * 200,
      threats: Math.random() * 10
    }));
    setChartData(initialData);

    const interval = setInterval(async () => {
      const newEvent = await SOCService.generateSimulatedEvent();
      
      setEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep last 50 events

      // Update chart
      setChartData(prev => {
        const newData = [...prev.slice(1), {
          time: prev[prev.length - 1].time + 1,
          traffic: 500 + Math.random() * 500 + (newEvent.threatLevel === 'CRITICAL' ? 1000 : 0),
          threats: newEvent.riskScore
        }];
        return newData;
      });

      // Handle Critical / High threats
      if (newEvent.threatLevel === 'CRITICAL' || newEvent.threatLevel === 'HIGH') {
        if (isVoiceEnabled && newEvent.threatLevel === 'CRITICAL') {
          SOCService.triggerVoiceAlert(`Warning. ${newEvent.eventType} detected from ${newEvent.sourceIp}. Risk score ${newEvent.riskScore}.`);
        }

        // Generate AI Analysis and open incident
        const aiAnalysis = await SOCService.analyzeThreat(newEvent);
        
        const newIncident: IncidentReport = {
          id: `INC-${newEvent.id}`,
          event: newEvent,
          aiExplanation: aiAnalysis.explanation,
          recommendedMitigation: aiAnalysis.mitigation,
          status: 'OPEN',
          timestamp: new Date().toISOString()
        };

        setIncidents(prev => [newIncident, ...prev].slice(0, 10)); // Keep last 10 incidents
        if (!selectedIncident) setSelectedIncident(newIncident); // Auto-select first incident
      }

    }, 3000); // New event every 3 seconds

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceEnabled]);

  const exportPDF = (incident: IncidentReport) => {
    const doc = new jsPDF();
    
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(24);
    doc.text("AI CYBER DEFENSE COPILOT", 20, 30);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`INCIDENT REPORT: ${incident.id}`, 20, 50);
    
    doc.setFontSize(12);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 60);
    
    doc.setDrawColor(50, 50, 50);
    doc.line(20, 65, 190, 65);
    
    doc.setTextColor(255, 255, 255);
    doc.text(`Threat Type: ${incident.event.eventType}`, 20, 80);
    doc.text(`Risk Score: ${incident.event.riskScore}/100 [${incident.event.threatLevel}]`, 20, 90);
    doc.text(`Source IP: ${incident.event.sourceIp}`, 20, 100);
    doc.text(`Target IP: ${incident.event.destinationIp}`, 20, 110);
    
    doc.line(20, 115, 190, 115);
    
    let currentY = 130;

    if (incident.event.threatIntel && incident.event.threatIntel.isMalicious) {
      doc.setTextColor(239, 68, 68); // Red
      doc.text("THREAT INTELLIGENCE ENRICHMENT", 20, currentY);
      doc.setTextColor(200, 200, 200);
      currentY += 10;
      
      const families = incident.event.threatIntel.malwareFamilies?.join(", ") || "None";
      const tags = incident.event.threatIntel.tags?.join(", ") || "None";
      
      doc.setFontSize(10);
      doc.text(`Malware Families: ${families}`, 20, currentY);
      currentY += 8;
      doc.text(`Tags: ${tags}`, 20, currentY);
      currentY += 15;
      doc.setFontSize(12);
    }
    
    doc.setTextColor(56, 189, 248);
    doc.text("AI THREAT EXPLANATION", 20, currentY);
    doc.setTextColor(200, 200, 200);
    const splitExplanation = doc.splitTextToSize(incident.aiExplanation, 170);
    doc.text(splitExplanation, 20, currentY + 10);
    
    currentY += 20 + (splitExplanation.length * 6);
    
    doc.setTextColor(56, 189, 248);
    doc.text("RECOMMENDED MITIGATION", 20, currentY);
    doc.setTextColor(200, 200, 200);
    const splitMitigation = doc.splitTextToSize(incident.recommendedMitigation, 170);
    doc.text(splitMitigation, 20, currentY + 10);

    doc.save(`${incident.id}.pdf`);
  };

  const getThreatColor = (level: ThreatLevel) => {
    switch(level) {
      case 'CRITICAL': return 'bg-destructive text-destructive-foreground glow-destructive border-transparent';
      case 'HIGH': return 'bg-warn text-warn-foreground glow-warn border-transparent';
      case 'MEDIUM': return 'bg-amber-600/20 text-amber-500 border-amber-600/50';
      case 'LOW': return 'bg-blue-600/20 text-blue-500 border-blue-600/50';
      default: return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const activeIncidentsCount = incidents.filter(i => i.status === 'OPEN').length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans" ref={dashboardRef}>
      {/* Decorative scanning line */}
      <div className="scan-line" />
      
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-sky-500" />
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase text-sky-400">AI Cyber Defense Copilot</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Autonomous SOC Intelligence System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs uppercase font-mono text-green-500 tracking-wider">Isolation Forest Active</span>
          </div>
          <button 
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className="p-2 rounded-full hover:bg-white/5 transition-colors border border-white/10"
            title="Toggle Voice Alerts"
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 grid grid-cols-12 gap-4 p-4 z-10 overflow-hidden h-[calc(100vh-64px)]">
        
        {/* Left Column: Live Traffic & Attack Feed */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-hidden h-full">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card border border-border p-4 rounded-lg flex flex-col justify-center items-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-sky-500/5 group-hover:bg-sky-500/10 transition-colors" />
              <Activity className="w-5 h-5 text-sky-400 mb-2" />
              <span className="text-3xl font-mono font-light">{events.length}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 text-center">Events Logged</span>
            </div>
            <div className={cn("border p-4 rounded-lg flex flex-col justify-center items-center relative overflow-hidden transition-all", activeIncidentsCount > 0 ? "bg-destructive/10 border-destructive/50 glow-destructive" : "bg-card border-border")}>
              <AlertTriangle className={cn("w-5 h-5 mb-2", activeIncidentsCount > 0 ? "text-destructive" : "text-muted-foreground")} />
              <span className={cn("text-3xl font-mono font-light", activeIncidentsCount > 0 ? "text-destructive-foreground" : "")}>{activeIncidentsCount}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 text-center">Active Threats</span>
            </div>
          </div>

          {/* Live Attack Feed */}
          <div className="flex-1 bg-card border border-border rounded-lg flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Live Traffic Stream
              </h2>
              <span className="text-[10px] text-green-500 font-mono flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
              {events.map(event => (
                <div key={event.id} className="p-2 hover:bg-white/5 rounded border border-transparent transition-colors flex gap-2 items-start opacity-80 hover:opacity-100">
                   <div className={cn("px-1.5 py-0.5 rounded text-[9px] border whitespace-nowrap mt-0.5", getThreatColor(event.threatLevel))}>
                    {event.threatLevel}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-center">
                        <span className="text-sky-400 truncate">{event.sourceIp}</span>
                        <span className="text-muted-foreground text-[10px]">{new Date(event.timestamp).toLocaleTimeString()}</span>
                     </div>
                     <p className="text-gray-300 truncate mt-1">{event.eventType}</p>
                   </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Network className="w-8 h-8 mb-2 opacity-20" />
                  <p>Awaiting network signals...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Column: Central AI Engine & Charts */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 overflow-hidden h-full">
          {/* Main Chart */}
          <div className="bg-card border border-border rounded-lg p-4 h-64 flex flex-col">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                <Network className="w-4 h-4" /> ML Anomaly Detection Model
              </h2>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
                  <span className="w-3 h-0.5 bg-sky-500"></span> Base Traffic
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
                  <span className="w-3 h-0.5 bg-destructive"></span> Threat Score
                </div>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis stroke="#ffffff30" fontSize={10} fontFamily="monospace" tickFormatter={(v: number) => `${v/1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', fontSize: '12px' }}
                    itemStyle={{ fontFamily: 'monospace' }}
                  />
                  <Area type="monotone" dataKey="traffic" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorTraffic)" isAnimationActive={false} />
                  <Area type="monotone" dataKey="threats" stroke="#ef4444" fillOpacity={1} fill="url(#colorThreats)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Threat Explanation Panel */}
          <div className="flex-1 bg-card border border-border rounded-lg flex flex-col overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="p-3 border-b border-border flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" /> AI Threat Explanation Engine
              </h2>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {selectedIncident ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-light tracking-tight">{selectedIncident.event.eventType}</h3>
                      <p className="text-sm text-muted-foreground font-mono mt-1">ID: {selectedIncident.id} | TS: {new Date(selectedIncident.timestamp).toLocaleString()}</p>
                    </div>
                    <div className={cn("px-4 py-2 rounded-lg border font-mono text-sm shadow-lg flex items-center justify-center", getThreatColor(selectedIncident.event.threatLevel))}>
                      RISK SCORE: {selectedIncident.event.riskScore}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded border border-white/5 bg-black/40">
                      <p className="text-[10px] uppercase text-muted-foreground mb-1">Source Vector</p>
                      <p className="font-mono text-sm text-sky-400">{selectedIncident.event.sourceIp}</p>
                    </div>
                    <div className="p-4 rounded border border-white/5 bg-black/40">
                      <p className="text-[10px] uppercase text-muted-foreground mb-1">Target Surface</p>
                      <p className="font-mono text-sm text-white">{selectedIncident.event.destinationIp}</p>
                    </div>
                  </div>

                  {selectedIncident.event.threatIntel && selectedIncident.event.threatIntel.isMalicious && (
                    <div className="p-4 rounded border border-destructive/20 bg-destructive/5">
                      <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-destructive mb-3">
                        <Activity className="w-3 h-3" /> Threat Intelligence Enrichment (OSINT)
                      </h4>
                      <div className="space-y-3">
                        {selectedIncident.event.threatIntel.malwareFamilies && selectedIncident.event.threatIntel.malwareFamilies.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground mb-1">Known Malware Families</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedIncident.event.threatIntel.malwareFamilies.map((family, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-destructive/10 text-destructive border border-destructive/30">
                                  {family}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedIncident.event.threatIntel.tags && selectedIncident.event.threatIntel.tags.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground mb-1">Malicious Indicator Tags</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedIncident.event.threatIntel.tags.map((tag, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/30">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedIncident.event.threatIntel.lastSeen && (
                           <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground pt-1 border-t border-white/5">
                             <span>INTEL SOURCE: ALIENVAULT OTX</span>
                             <span>LAST SEEN: {new Date(selectedIncident.event.threatIntel.lastSeen).toLocaleString()}</span>
                           </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-sky-500 mb-3">
                      <Shield className="w-3 h-3" /> Autonomous Analysis
                    </h4>
                    <div className="p-5 rounded-lg border border-sky-500/20 bg-sky-500/5 text-sm leading-relaxed backdrop-blur relative">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sky-500 rounded-l-lg" />
                      {selectedIncident.aiExplanation}
                    </div>
                  </div>

                  <div>
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3">
                      <ShieldAlert className="w-3 h-3" /> Recommended Mitigation
                    </h4>
                    <div className="p-4 rounded border border-emerald-500/20 bg-emerald-500/5 text-sm font-mono text-emerald-100">
                      &gt; {selectedIncident.recommendedMitigation}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end shrink-0">
                    <button 
                      onClick={() => exportPDF(selectedIncident)}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded hover:bg-white/90 transition-all uppercase tracking-wider text-xs"
                    >
                      <Download className="w-4 h-4" /> Export Enterprise PDF
                    </button>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                  <Cpu className="w-16 h-16 mb-4" />
                  <p className="font-mono uppercase tracking-widest text-xs">Waiting for incidents to analyze...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Incident Reports */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-hidden h-full">
          <div className="flex-1 bg-card border border-border rounded-lg flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4" /> Incident Reports
              </h2>
              <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-mono">{incidents.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {incidents.map(incident => (
                <div 
                  key={incident.id} 
                  onClick={() => setSelectedIncident(incident)}
                  className={cn(
                    "p-3 rounded border cursor-pointer transition-all",
                    selectedIncident?.id === incident.id 
                      ? "bg-sky-500/10 border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.1)]" 
                      : "bg-black/20 border-white/5 hover:bg-white/5"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", incident.event.threatLevel === 'CRITICAL' ? 'bg-destructive animate-pulse' : 'bg-warn')} />
                      <span className="text-xs font-bold truncate text-gray-200">{incident.event.eventType}</span>
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">{new Date(incident.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">RISK: {incident.event.riskScore}</span>
                    <span className="text-[10px] font-mono text-sky-400">{incident.id}</span>
                  </div>
                </div>
              ))}
              {incidents.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-4">
                  <Shield className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">No active incidents.</p>
                  <p className="text-[10px] mt-1 opacity-50">System is secure.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

