import { Show } from 'solid-js';
import { settings } from '@/stores/settings';
import type { DrawnPlayer } from '@/types/types';

export function Blinker(props: { winner: DrawnPlayer | null }) {
  return (
    <Show keyed when={settings.blinkingEnabled() && props.winner}>
      {(winner) => <div class="blinker" data-round={winner.drawn} />}
    </Show>
  );
}
