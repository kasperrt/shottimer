import { useLocation, useNavigate } from '@solidjs/router';
import { createEffect, createSignal, onCleanup } from 'solid-js';
import { getHttpError } from 'wiretyped';
import { DancingBeers } from '@/components/DancingBeers';
import { Input } from '@/components/Input';
import { Join } from '@/components/Join';
import { Modal } from '@/components/Modal';
import { Scoreboard } from '@/components/Scoreboard';
import { Timer } from '@/components/Timer';
import { httpClient } from '@/lib/http';
import { useGame } from '@/stores/game';
import { type DrawnPlayer, maxLocalPlayers } from '@/types/types';
import Rules from './+rules';
import Settings from './+settings';

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation<{ modal?: string }>();
  const open = (modal: string) => navigate(location.pathname, { state: { modal } });
  const close = () => navigate(location.pathname, { replace: true, state: {} });
  const { gameId, setGameId, countdown, winner, players, addPlayer, removePlayer } = useGame();
  const removal = new AbortController();
  onCleanup(() => removal.abort());
  async function leave(id: string) {
    const room = gameId();
    if (room && players.find((player) => player.id === id)?.drawing) {
      const [error] = await httpClient.delete(
        '/join/{id}',
        { id: room },
        {
          headers: { Authorization: `Bearer ${id}` },
          signal: removal.signal,
        },
      );
      if (removal.signal.aborted) return;
      if (error && getHttpError(error)?.response.status !== 404) {
        window.alert('Could not remove this player. Please try again.');
        return;
      }
    }
    removePlayer(id);
  }
  const [carried, setCarried] = createSignal<DrawnPlayer | null>(null);
  const revealMs = 3600;
  const announcing = () => (winner() !== carried() ? winner() : null);
  createEffect(winner, (selected) => {
    setCarried(null);
    if (!selected) return;
    const timeout = setTimeout(() => setCarried(selected), revealMs);
    return () => clearTimeout(timeout);
  });
  const [inviteSession, reopen] = createSignal(0);
  const [expired, setExpired] = createSignal(false);
  createEffect(inviteSession, () => {
    setExpired(false);
    const connection = new AbortController();
    let disposed = false;
    let closer: VoidFunction | undefined;
    void httpClient
      .sse(
        '/rtd',
        null,
        ([err, event]) => {
          if (disposed) return;
          if (err) {
            setGameId(null);
            return;
          }

          if (event.type === 'expired') {
            connection.abort();
            setGameId(null);
            setExpired(true);
            return;
          }

          if (event.type === 'join') {
            setGameId(event.data.id);
            return;
          }

          if (event.type === 'player') {
            addPlayer(event.data);
          }
        },
        { signal: connection.signal, errorConnect: true },
      )
      .then(([error, close]) => {
        if (error) {
          if (!disposed) window.alert('Something went wrong when opening connection');
        } else if (disposed) close();
        else closer = close;
      });
    return () => {
      disposed = true;
      connection.abort();
      closer?.();
    };
  });

  return (
    <>
      <div class="host" style={{ '--reveal-duration': `${revealMs}ms` }}>
        <div class="host-nav">
          <button type="button" onClick={() => open('/settings')} class="cursor-pointer">
            Settings
          </button>
          <h1 class="wordmark">
            <img src="/assets/favicon.png" width="150" height="150" alt="" />
            ShotTimer
          </h1>
          <button type="button" onClick={() => open('/rules')} class="cursor-pointer">
            Rules
          </button>
        </div>
        <div class="host-content">
          <Timer winner={announcing()} countdown={countdown()} />
          {expired() ? (
            <button type="button" class="join-link" onClick={() => reopen((session) => session + 1)}>
              Reopen player invites
            </button>
          ) : (
            <Join gameId={gameId()} />
          )}
          <Input addPlayer={addPlayer} full={players.filter((player) => !player.drawing).length >= maxLocalPlayers} />
        </div>
        <Scoreboard players={players} removePlayer={leave} />
        <footer class="host-footer">
          <DancingBeers
            playing={players.length > 0}
            announcing={announcing()}
            carried={winner() === carried() ? carried() : null}
          />
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
