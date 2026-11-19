import { Drawing } from '@/components/Drawing';
import { settings } from '@/stores/settings';
import type { DrawnPlayer } from '@/types/types';

export function Blinker(props: { winner: DrawnPlayer }) {
  return (
    <div class="winner-call" data-animate={settings.blinkingEnabled()} role="status">
      <div class="winner-slip">
        <Drawing winner={props.winner} />
        <div>
          <p>Your turn</p>
          <h1>{props.winner.name}</h1>
        </div>
      </div>
    </div>
  );
}
