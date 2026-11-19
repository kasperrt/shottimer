import type { JSX } from '@solidjs/web';
import { createEffect, onCleanup } from 'solid-js';

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: JSX.Element;
}

export function Modal(props: Props) {
  let dialog!: HTMLDialogElement;
  let flight: Animation | undefined;
  createEffect(
    () => props.open,
    (open) => {
      if (!open && !dialog.open) return;
      const inFlight = flight?.playState === 'running';
      const current = getComputedStyle(dialog).transform;
      flight?.cancel();
      if (open && !dialog.open) dialog.showModal();
      dialog.dataset.phase = open ? 'opening' : 'closing';

      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      const distance =
        Math.min(
          (window.innerWidth + dialog.offsetWidth) / (2 * Math.abs(x)),
          (window.innerHeight + dialog.offsetHeight) / (2 * Math.abs(y)),
        ) +
        Math.max(dialog.offsetWidth, dialog.offsetHeight) / 2;
      const twist = (12 + Math.random() * 20) * (x < 0 ? -1 : 1);
      const away = `translate(${x * distance}px, ${y * distance}px) rotate(${twist}deg)`;
      const frames = open
        ? [
            { transform: inFlight ? current : away, easing: 'cubic-bezier(.15,.7,.25,1)' },
            { transform: `translate(${-x * 6}px, ${-y * 6}px) rotate(${-twist / 10}deg)`, offset: 0.78 },
            { transform: 'none' },
          ]
        : [
            { transform: current },
            {
              transform: `translate(${x * 10}px, ${y * 10}px) rotate(${twist / 5}deg)`,
              offset: 0.32,
              easing: 'ease-in',
            },
            { transform: away },
          ];
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      flight = dialog.animate(frames, { duration: reduced ? 0 : open ? 480 : 350, fill: 'forwards' });
      flight.onfinish = () => {
        if (!open) dialog.close();
        flight?.cancel();
      };
    },
  );
  onCleanup(() => flight?.cancel());

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: native dialog cancel handles Escape for backdrop dismissal.
    <dialog
      ref={dialog}
      class="game-dialog"
      aria-label={props.title}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog) props.onClose();
      }}
    >
      <section class="dialog-sheet">
        <header>
          <h2>{props.title}</h2>
          <button type="button" onClick={() => props.onClose()} aria-label="Close">
            ×
          </button>
        </header>
        {props.children}
      </section>
    </dialog>
  );
}
