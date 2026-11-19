import { Show } from 'solid-js';
import type { DrawnPlayer } from '@/types/types';
import { draw } from '@/utils/draw';

export function Drawing(props: { winner: DrawnPlayer | null }) {
  return (
    <Show keyed when={props.winner?.drawing?.x.length ? props.winner.drawing : undefined}>
      {(portrait) => (
        <div class="winner-portrait">
          <canvas
            ref={(canvas) => {
              canvas.width = portrait.width;
              canvas.height = portrait.height;
              draw({ canvas, ...portrait, full: true });
            }}
          />
        </div>
      )}
    </Show>
  );
}
