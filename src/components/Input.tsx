import { nanoid } from 'nanoid';
import { createSignal } from 'solid-js';
import type { Game } from '@/stores/game';
import { maxNameLength } from '@/types/types';

interface Props {
  full: boolean;
  addPlayer: Game['addPlayer'];
}

export function Input(props: Props) {
  const [name, setName] = createSignal('');

  const onSubmit = (e: Event) => {
    e.preventDefault();
    if (props.full || !name().trim()) return;
    props.addPlayer({
      name: name().trim(),
      id: nanoid(),
      joined: Date.now(),
      score: 0,
    });
    setName('');
  };

  const onChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setName(target.value);
  };

  return (
    <form autocomplete="off" onSubmit={onSubmit} class="add-player">
      <input
        maxlength={maxNameLength}
        disabled={props.full}
        name="Name"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="none"
        spellcheck={false}
        onInput={onChange}
        value={name()}
        aria-label="Player name"
        placeholder={props.full ? 'Host player list full' : 'Add a player…'}
        class="player-input"
      />
      <button type="submit" disabled={props.full} aria-label="Add player">
        ↵
      </button>
    </form>
  );
}
