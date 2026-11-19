import { nanoid } from 'nanoid';
import { createSignal } from 'solid-js';
import type { Game } from '@/stores/game';

interface Props {
  addPlayer: Game['addPlayer'];
}

export function Input(props: Props) {
  const [name, setName] = createSignal('');

  const onSubmit = (e: Event) => {
    e.preventDefault();
    if (!name().trim()) return;
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
    <form onSubmit={onSubmit} class="add-player">
      <input
        name="Name"
        onInput={onChange}
        value={name()}
        aria-label="Player name"
        placeholder="Add a player…"
        class="player-input"
      />
      <button type="submit" aria-label="Add player">
        ↵
      </button>
    </form>
  );
}
