// The handles face outwards so the two glasses can knock rims on the downbeat.
function Beer() {
  return (
    <svg
      class="beer"
      viewBox="0 0 78 92"
      fill="none"
      stroke="currentColor"
      stroke-width="3.3"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <g class="beer-body">
        <path d="M48 28c17-6 23 0 22 11-1 11-10 16-20 15l1-8c7 1 12-2 12-8 0-5-5-6-12-3" fill="white" />
        <path d="m12 23 3 39q1 6 8 5l24-2q5-1 5-7l-2-37z" fill="var(--marker)" />
        <path
          d="M10 24c-5-7 2-13 8-12 1-8 11-10 15-4 8-6 17-2 17 5 9-1 11 11 2 13-6 1-8-3-11-2s-1 10-7 10c-5 0-2-9-7-9-6 4-13 4-17-1z"
          fill="white"
        />
        <path d="m19 37 1 10m3 8 1 4" stroke="white" />
        <path d="m30 40 .3 1m11-2 .3 1m-10 5q5 6 10-1" />
      </g>
      <path class="beer-foot" d="m24 68-3 11-9 1" />
      <path class="beer-foot other" d="m40 68 5 9 8-2" />
    </svg>
  );
}

export function DancingBeers() {
  return (
    <div class="dancing-beers" aria-hidden="true">
      <span>
        <Beer />
      </span>
      <span>
        <Beer />
      </span>
    </div>
  );
}
