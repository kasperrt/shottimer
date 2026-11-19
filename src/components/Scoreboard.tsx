import { For, Show } from 'solid-js';
import type { Game } from '@/stores/game';
import { settings } from '@/stores/settings';

interface Props {
  players: Game['players'];
  removePlayer: Game['removePlayer'];
}

export function Scoreboard(props: Props) {
  const { scoreEnabled } = settings;

  return (
    <Show when={scoreEnabled() && props.players.length > 0}>
      <div class="top-20 left-20 w-full px-8 lg:absolute lg:max-w-48 lg:px-0">
        <h2>Score</h2>
        <hr />
        <ul>
          <For each={props.players}>
            {(player) => (
              <li>
                <button
                  type="button"
                  class="flex w-full cursor-pointer items-center justify-between py-1"
                  aria-label={`Remove ${player.name}`}
                  onClick={() => props.removePlayer(player.id)}
                >
                  <span>{player.name}</span>
                  <span>{player.score}</span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </div>
    </Show>
  );
}
