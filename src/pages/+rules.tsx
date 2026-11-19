export default function Rules() {
  return (
    <>
      <ol class="rules-list">
        <li>
          <strong>Pick a house rule.</strong> A sip, a shot, or whatever your table decides. Agree before the first name
          goes in.
        </li>
        <li>
          <strong>Put your name in.</strong> Type it on the host screen, or scan the code to join from your phone and
          draw your portrait.
        </li>
        <li>
          <strong>Watch for your name.</strong> The first player starts the clock. After 1–6 minutes, someone gets
          picked. Their turn, then the clock starts again.
        </li>
      </ol>
      <dl class="mode-notes">
        <div>
          <dt>Anarchy</dt>
          <dd>Anyone can be picked twice in a row.</dd>
        </div>
        <div>
          <dt>Fair</dt>
          <dd>Favors players with fewer turns. Three ahead? You sit the next draw out.</dd>
        </div>
      </dl>
      <p class="leaving">Heading out? Tap your name on the scoreboard.</p>
    </>
  );
}
