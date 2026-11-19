import { useLocation, useNavigate } from '@solidjs/router';
import { onSettled, Show } from 'solid-js';
import { DancingBeers } from '@/components/DancingBeers';
import { Input } from '@/components/Input';
import { Join } from '@/components/Join';
import { Modal } from '@/components/Modal';
import { Scoreboard } from '@/components/Scoreboard';
import { Timer } from '@/components/Timer';
import { httpClient } from '@/lib/http';
import { useGame } from '@/stores/game';
import Rules from './+rules';
import Settings from './+settings';

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation<{ modal?: string }>();
  const open = (modal: string) => navigate(location.pathname, { state: { modal } });
  const close = () => navigate(location.pathname, { replace: true, state: {} });
  const { gameId, setGameId, countdown, winner, players, addPlayer, removePlayer } = useGame();
  onSettled(() => {
    let disposed = false;
    let closer: VoidFunction | undefined;
    void httpClient
      .sse('/rtd', null, ([err, event]) => {
        if (disposed) return;
        if (err) {
          return;
        }

        if (event.type === 'join') {
          setGameId(event.data.id);
          return;
        }

        if (event.type === 'player') {
          addPlayer(event.data);
        }
      })
      .then(([error, close]) => {
        if (error) {
          if (!disposed) window.alert('Something went wrong when opening connection');
        } else if (disposed) close();
        else closer = close;
      });
    return () => {
      disposed = true;
      closer?.();
    };
  });

  return (
    <>
      <div class="host">
        <div class="host-nav">
          <button type="button" onClick={() => open('/settings')} class="cursor-pointer">
            Settings
          </button>
          <button type="button" onClick={() => open('/rules')} class="cursor-pointer">
            Rules
          </button>
        </div>
        <div class="host-content">
          <Timer winner={winner()} countdown={countdown()} />
          <Join gameId={gameId()} />
          <Input addPlayer={addPlayer} />
          <Scoreboard players={players} removePlayer={removePlayer} />
        </div>
        <footer class="host-footer">
          <Show when={players.length === 0}>
            <DancingBeers />
          </Show>
          <a href="https://github.com/kasperrt/shottimer" class="source-link">
            GitHub
          </a>
        </footer>
      </div>
      <Modal title="Settings" open={location.state?.modal === '/settings'} onClose={close}>
        <Settings />
      </Modal>
      <Modal title="Rules" open={location.state?.modal === '/rules'} onClose={close}>
        <Rules />
      </Modal>
    </>
  );
}
