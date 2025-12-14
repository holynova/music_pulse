

export interface PulseSettings {
  sensitivity: number;
  minGap: number;
  speed: number;
  alternatingTurns: boolean;
  frequencyMode: 'bass' | 'vocal';
  showDebug: boolean;
}

interface SettingsPanelProps {
  settings: PulseSettings;
  onSettingsChange: (newSettings: PulseSettings) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  
  const handleChange = (key: keyof PulseSettings, value: number | boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="fixed top-4 right-4 bg-slate-800/90 backdrop-blur border border-slate-700 p-4 rounded-lg w-64 shadow-xl z-50 text-xs">
      <h3 className="font-bold mb-3 text-slate-200 uppercase tracking-widest text-[10px]">Tuning</h3>
      
      <div className="space-y-4">
        {/* Sensitivity */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Sensitivity</span>
            <span className="text-blue-400 font-mono">{settings.sensitivity.toFixed(1)}x</span>
          </div>
          <input 
            type="range" 
            min="0.1" max="5.0" step="0.1"
            value={settings.sensitivity} 
            onChange={(e) => handleChange('sensitivity', parseFloat(e.target.value))}
            className="w-full accent-blue-500 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Min Gap */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Min Gap (ms)</span>
            <span className="text-blue-400 font-mono">{settings.minGap}ms</span>
          </div>
          <input 
            type="range" 
            min="50" max="1000" step="10"
            value={settings.minGap} 
            onChange={(e) => handleChange('minGap', parseInt(e.target.value))}
            className="w-full accent-blue-500 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Speed */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Speed</span>
            <span className="text-blue-400 font-mono">{settings.speed}</span>
          </div>
          <input 
            type="range" 
            min="1" max="10" step="0.5"
            value={settings.speed} 
            onChange={(e) => handleChange('speed', parseFloat(e.target.value))}
            className="w-full accent-blue-500 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        {/* Alternating Turns Toggle */}
        <div className="flex items-center gap-2 pt-2">
            <input 
                type="checkbox" 
                id="altTurns"
                checked={settings.alternatingTurns}
                onChange={(e) => handleChange('alternatingTurns', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
            />
            <label htmlFor="altTurns" className="text-slate-300 select-none cursor-pointer">Alternating Turns</label>
        </div>
        
        {/* Frequency Mode */}
        <div className="pt-2">
             <div className="text-slate-400 mb-1">Detection Mode</div>
             <div className="flex bg-slate-700 rounded-lg p-1">
                 <button
                    onClick={() => onSettingsChange({...settings, frequencyMode: 'bass'})}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-colors ${settings.frequencyMode === 'bass' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                 >
                     Bass
                 </button>
                 <button
                    onClick={() => onSettingsChange({...settings, frequencyMode: 'vocal'})}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-colors ${settings.frequencyMode === 'vocal' ? 'bg-pink-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                 >
                     Vocal
                 </button>
             </div>
        </div>

        {/* Debug Toggle */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700">
            <input 
                type="checkbox" 
                id="debugCheck"
                checked={settings.showDebug}
                onChange={(e) => handleChange('showDebug', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
            />
            <label htmlFor="debugCheck" className="text-slate-300 select-none cursor-pointer">Show Analysis Graph</label>
        </div>
      </div>
    </div>
  );
}
