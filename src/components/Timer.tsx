import { createEffect, createMemo, createSignal, Show } from 'solid-js';
import { settings } from '@/stores/settings';
import type { DrawnPlayer } from '@/types/types';
import { getRemainingTimeReadable } from '@/utils/getRemainingTimeReadable';

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
      const timeout = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timeout);
    },
  );
  return (
    <h1 class="timer">
      <Show when={props.countdown} fallback="ShotTimer">
        <Show
          when={visible()}
          fallback={
            <Show when={settings.timerEnabled()}>
              <Clock deadline={props.countdown ?? 0} />
            </Show>
          }
        >
          {props.winner?.name}
        </Show>
      </Show>
    </h1>
  );
}
