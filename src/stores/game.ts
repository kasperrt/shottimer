import { createEffect, createMemo, createSignal, createStore, onCleanup } from 'solid-js';
import type { DrawnPlayer, Player } from '@/types/types';
import { drawPlayer } from '@/utils/drawPlayer';
import { settings } from './settings';

export function useGame() {
  const [gameId, setGameId] = createSignal<string | null>(null);
  const [players, setPlayers] = createStore<Player[]>([]);
  const [countdown, setCountdown] = createSignal<number | null>(null);
  const [winner, setWinner] = createSignal<DrawnPlayer | null>(null);
  const bell = new Audio('/assets/sound/bell.mp3');
  const sanic = new Audio('/assets/sound/sanic.mp3');
  sanic.volume = 0.2;
  let roundTimeout: ReturnType<typeof setTimeout>;
  let soundTimeout: ReturnType<typeof setTimeout>;
  let command: SpeechSynthesisUtterance | undefined;

  function stopSound() {
    clearTimeout(soundTimeout);
    if (command) {
      command.onend = command.onerror = null;
      window.speechSynthesis.cancel();
      command = undefined;
    }
    for (const sound of [bell, sanic]) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  function playCommand(name: string) {
    if (!settings.soundEnabled() || !window.speechSynthesis) return;
    stopSound();
    command = new SpeechSynthesisUtterance(`Your turn to drink ${name}`);
    command.onend = command.onerror = () => {
      const sound = Math.floor(Math.random() * 1000 + 1) === 137 ? sanic : bell;
      void sound.play().catch(() => {});
      soundTimeout = setTimeout(stopSound, 10000);
    };
    window.speechSynthesis.speak(command);
  }

  function startRound() {
    const minutes = settings.intervals() ?? Math.floor(Math.random() * 6) + 1;
    const delay = minutes * 60000;
    const deadline = Date.now() + delay;
    setCountdown(deadline);
    function finishRound() {
      const remaining = deadline - Date.now();
      if (remaining > 0) {
        roundTimeout = setTimeout(finishRound, Math.min(remaining, 2 ** 31 - 1));
        return;
      }
      if (!players.length) return;
      const selected = drawPlayer(players, settings.gameType());
      setWinner(selected);
      setPlayers((draft) => {
        const player = draft.find((entry) => entry.id === selected.id);
        if (player) player.score++;
      });
      playCommand(selected.name);
      startRound();
    }
    roundTimeout = setTimeout(finishRound, Math.min(delay, 2 ** 31 - 1));
  }

  const hasPlayers = createMemo(() => players.length > 0);
  createEffect(hasPlayers, (active) => {
    if (active) startRound();
    else {
      clearTimeout(roundTimeout);
      setCountdown(null);
      setWinner(null);
    }
  });

  createEffect(settings.soundEnabled, (enabled) => {
    if (!enabled) stopSound();
  });
  onCleanup(() => {
    clearTimeout(roundTimeout);
    stopSound();
  });

  return {
    players,
    gameId,
    setGameId,
    winner,
    countdown,
    addPlayer: (player: Player) =>
      setPlayers((draft) => {
        draft.push(player);
      }),
    removePlayer: (id: string) =>
      setPlayers((draft) => {
        const index = draft.findIndex((player) => player.id === id);
        if (index >= 0) draft.splice(index, 1);
      }),
  };
}

export type Game = ReturnType<typeof useGame>;
