import qrcode from 'qrcode';
import { createMemo, Loading, Show } from 'solid-js';

function Code(props: { url: string }) {
  const image = createMemo(() => qrcode.toDataURL(props.url));
  return <img width="112" height="112" src={image()} alt="Scan to join the game" />;
}

export function Join(props: { gameId: string | null }) {
  const url = () => `${window.location.origin}/${props.gameId}`;
  return (
    <Show when={props.gameId}>
      <a class="join-link" href={url()} target="_blank" rel="noreferrer">
        <Loading>
          <Code url={url()} />
        </Loading>
        <span>
          Join on your phone
          <small>
            {window.location.host}/{props.gameId}
          </small>
        </span>
      </a>
    </Show>
  );
}
