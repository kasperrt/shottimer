import type { JSX } from '@solidjs/web';
import { createEffect } from 'solid-js';

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: JSX.Element;
}

export function Modal(props: Props) {
  let dialog!: HTMLDialogElement;
  createEffect(
    () => props.open,
    (open) => {
      if (open) {
        dialog.dataset.phase = 'opening';
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) {
        dialog.dataset.phase = 'closing';
      }
    },
  );

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
      onAnimationEnd={(event) => {
        if (event.target === dialog && event.animationName === 'sheet-out' && !props.open) dialog.close();
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
