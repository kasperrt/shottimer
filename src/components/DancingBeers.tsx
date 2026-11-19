import { createEffect, For, Show } from 'solid-js';
import { Drawing } from '@/components/Drawing';
import { settings } from '@/stores/settings';
import type { DrawnPlayer } from '@/types/types';
import { walkBeer } from '@/utils/walkBeer';

function Beer(props: { holding: boolean }) {
  return (
    <svg
      class="beer"
      viewBox="0 0 78 92"
      fill="none"
      stroke="currentColor"
      stroke-width="3.3"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <g class="beer-body">
        <path d="M48 28c17-6 23 0 22 11-1 11-10 16-20 15l1-8c7 1 12-2 12-8 0-5-5-6-12-3" fill="white" />
        <path d="m12 23 3 39q1 6 8 5l24-2q5-1 5-7l-2-37z" fill="var(--marker)" />
        <path
          d="M10 24c-5-7 2-13 8-12 1-8 11-10 15-4 8-6 17-2 17 5 9-1 11 11 2 13-6 1-8-3-11-2s-1 10-7 10c-5 0-2-9-7-9-6 4-13 4-17-1z"
          fill="white"
        />
        <path d="m19 37 1 10m3 8 1 4" stroke="white" />
        <path d="m30 40 .3 1m11-2 .3 1m-10 5q5 6 10-1" />
        <Show when={props.holding}>
          <path d="M15 44Q0 39 5 5l4-4m40 41q20-6 15-39l-5-3" />
        </Show>
      </g>
      <path class="beer-foot" d="m24 68-3 11-9 1" />
      <path class="beer-foot other" d="m40 68 5 9 8-2" />
    </svg>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => {
    const angle = (0.13 + Math.random() * 0.74) * Math.PI;
    const reach = 38 + Math.random() * 55;
    return {
      '--dx': `${Math.cos(angle) * reach}px`,
      '--dy': `${-Math.sin(angle) * reach}px`,
      '--spin': `${Math.random() * 480 - 240}deg`,
      '--delay': `${(i % 3) * 700 + Math.random() * 130}ms`,
    };
  });
  return (
    <div class="confetti">
      <For each={pieces}>{(style) => <i style={style} />}</For>
    </div>
  );
}

function Walker(props: { lane: number; playing: boolean; party: DrawnPlayer | null; carried?: DrawnPlayer | null }) {
  let actor!: HTMLDivElement;
  createEffect(
    () => props.playing && !props.party,
    (walking) => {
      if (walking) return walkBeer(actor, props.lane);
    },
  );
  const holding = () => !!props.carried?.drawing?.x.length;
  return (
    <div class="beer-actor" ref={actor} data-mode={props.party ? 'party' : props.playing ? 'walking' : 'idle'}>
      <div class="beer-facing">
        <Beer holding={holding()} />
      </div>
      <Show when={holding()}>
        <div class="beer-sign">
          <Drawing winner={props.carried ?? null} />
        </div>
      </Show>
      <Show keyed when={props.party}>
        {(_winner) => <Confetti />}
      </Show>
    </div>
  );
}

export function DancingBeers(props: { playing: boolean; announcing: DrawnPlayer | null; carried: DrawnPlayer | null }) {
  const party = () => (settings.blinkingEnabled() ? props.announcing : null);
  return (
    <div class="beer-floor" aria-hidden="true">
      <Walker lane={0} playing={props.playing} party={party()} carried={props.carried} />
      <Walker lane={1} playing={props.playing} party={party()} />
    </div>
  );
}
