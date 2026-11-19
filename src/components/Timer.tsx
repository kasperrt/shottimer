import { createEffect, createMemo, createSignal, Show } from 'solid-js';
import { settings } from '@/stores/settings';
import type { DrawnPlayer } from '@/types/types';
import { getRemainingTimeReadable } from '@/utils/getRemainingTimeReadable';
import { Blinker } from './Blinker';

function Clock(props: { deadline: number }) {
  const [remaining, setRemaining] = createSignal(0);
  createEffect(
    () => props.deadline,
    (deadline) => {
      let frame: number;
      function tick() {
        const left = Math.max(0, deadline - Date.now());
        setRemaining(left);
        if (left > 0) frame = requestAnimationFrame(tick);
      }
      tick();
      return () => cancelAnimationFrame(frame);
    },
  );
  const time = createMemo(() => getRemainingTimeReadable(remaining()));
  return (
    <>
      {time().minutes}:{time().seconds}
      <small>.{time().milliseconds}</small>
    </>
  );
}

export function Timer(props: { countdown: number | null; winner: DrawnPlayer | null }) {
  const [visible, setVisible] = createSignal(false);
  createEffect(
    () => props.winner,
    (winner) => {
      setVisible(!!winner);
      if (!winner) return;
      const timeout = setTimeout(() => setVisible(false), 3600);
      return () => clearTimeout(timeout);
    },
  );
  return (
    <div class="timer">
      <Show when={props.countdown} fallback={<h1>ShotTimer</h1>}>
        <Show
          keyed
          when={visible() && props.winner}
          fallback={
            <Show when={settings.timerEnabled()}>
              <Clock deadline={props.countdown ?? 0} />
            </Show>
          }
        >
          {(winner) => <Blinker winner={winner} />}
        </Show>
      </Show>
    </div>
  );
}
