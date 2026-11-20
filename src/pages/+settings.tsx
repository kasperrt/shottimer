import { Toggle } from '@/components/Toggle';
import { settings } from '@/stores/settings';

export default function SettingsModal(props: { toggleRemoteJoin: () => void; changingRemoteJoin: boolean }) {
  const {
    remoteJoin,
    soundEnabled,
    scoreEnabled,
    intervals,
    gameType,
    timerEnabled,
    blinkingEnabled,
    setSoundEnabled,
    setScoreEnabled,
    setGameType,
    setIntervals,
    setTimerEnabled,
    setBlinkingEnabled,
  } = settings;

  const onChangeIntervals = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const interval = Number.parseInt(target.value, 10);
    if (!Number.isFinite(interval) || interval < 1) {
      setIntervals(null);
      return;
    }

    setIntervals(interval);
  };

  return (
    <div class="settings-list">
      <Toggle
        label="Remote join"
        checked={remoteJoin()}
        disabled={props.changingRemoteJoin}
        onChange={props.toggleRemoteJoin}
      />
      <Toggle label="Sound" checked={soundEnabled()} onChange={() => setSoundEnabled(!soundEnabled())} />
      <Toggle label="Show scores" checked={scoreEnabled()} onChange={() => setScoreEnabled(!scoreEnabled())} />
      <Toggle
        label="Winner animation"
        checked={blinkingEnabled()}
        onChange={() => setBlinkingEnabled(!blinkingEnabled())}
      />
      <Toggle label="Show countdown" checked={timerEnabled()} onChange={() => setTimerEnabled(!timerEnabled())} />
      <label class="setting-row">
        Draw mode
        <select
          value={gameType()}
          onChange={(event) => setGameType(event.currentTarget.value === 'FAIR' ? 'FAIR' : 'ANARCHY')}
        >
          <option value="ANARCHY">Anarchy</option>
          <option value="FAIR">Fair</option>
        </select>
      </label>
      <label class="setting-row">
        Intervals (minutes)
        <input
          autocomplete="off"
          type="number"
          min="1"
          onInput={onChangeIntervals}
          value={intervals() ?? ''}
          placeholder="Random (1-6)"
        />
      </label>
    </div>
  );
}
