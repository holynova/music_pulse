import type { ChangeEvent } from 'react';
import { Icon } from './Icons';
import { getCopy, type Language } from '../lib/i18n';
import type { PulseSettings } from '../types/audio';

interface SettingsPanelProps {
  settings: PulseSettings;
  language: Language;
  onChange: (settings: PulseSettings) => void;
}

export function SettingsPanel({ settings, language, onChange }: SettingsPanelProps) {
  const copy = getCopy(language);
  const updateNumber = (key: keyof Pick<PulseSettings, 'sensitivity' | 'minGap' | 'speed' | 'trailLength'>) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...settings, [key]: Number(event.target.value) });
    };
  };

  return (
    <aside className="settings-panel" aria-label={copy.tuning}>
      <div className="settings-heading">
        <div>
          <p className="eyebrow">{copy.tuning}</p>
          <h2>{copy.shapePulse}</h2>
        </div>
        <Icon name="settings" className="settings-heading-icon" />
      </div>

      <label className="setting-row">
        <span className="setting-label"><span>{copy.detectionSensitivity}</span><strong>{settings.sensitivity.toFixed(1)}×</strong></span>
        <input type="range" min="0.1" max="3" step="0.1" value={settings.sensitivity} onChange={updateNumber('sensitivity')} />
        <span className="setting-scale"><span>{copy.fewerMoments}</span><span>{copy.moreMoments}</span></span>
      </label>

      <label className="setting-row">
        <span className="setting-label"><span>{copy.minimumGap}</span><strong>{Math.round(settings.minGap * 1000)} ms</strong></span>
        <input type="range" min="0.12" max="0.6" step="0.01" value={settings.minGap} onChange={updateNumber('minGap')} />
        <span className="setting-scale"><span>{copy.tight}</span><span>{copy.spacious}</span></span>
      </label>

      <label className="setting-row">
        <span className="setting-label"><span>{copy.travelSpeed}</span><strong>{settings.speed} px/s</strong></span>
        <input type="range" min="40" max="180" step="5" value={settings.speed} onChange={updateNumber('speed')} />
        <span className="setting-scale"><span>{copy.calm}</span><span>{copy.restless}</span></span>
      </label>

      <label className="setting-row">
        <span className="setting-label"><span>{copy.trailLength}</span><strong>{settings.trailLength}s</strong></span>
        <input type="range" min="6" max="30" step="1" value={settings.trailLength} onChange={updateNumber('trailLength')} />
        <span className="setting-scale"><span>{copy.close}</span><span>{copy.long}</span></span>
      </label>

      <div className="setting-row">
        <span className="setting-label"><span>{copy.turnStyle}</span><strong>{settings.turnStyle === 'random' ? copy.random : copy.zigzag}</strong></span>
        <div className="segmented-control" role="group" aria-label={copy.turnStyle}>
          <button type="button" className={settings.turnStyle === 'random' ? 'segment-active' : ''} onClick={() => onChange({ ...settings, turnStyle: 'random' })}>{copy.random}</button>
          <button type="button" className={settings.turnStyle === 'zigzag' ? 'segment-active' : ''} onClick={() => onChange({ ...settings, turnStyle: 'zigzag' })}>{copy.zigzag}</button>
        </div>
      </div>

      <label className="setting-toggle">
        <input
          type="checkbox"
          checked={settings.showMarkers}
          onChange={(event) => onChange({ ...settings, showMarkers: event.target.checked })}
        />
        <span className="toggle-visual" aria-hidden="true" />
        <span>{copy.showBeatMarkers}</span>
      </label>
    </aside>
  );
}
