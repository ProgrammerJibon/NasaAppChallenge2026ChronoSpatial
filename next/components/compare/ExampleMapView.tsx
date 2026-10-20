"use client";

const SIZE = 35;
const cells = Array.from({ length: SIZE * SIZE }, (_, index) => {
  const x = index % SIZE;
  const y = Math.floor(index / SIZE);
  const grain = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  const noise = ((grain - Math.floor(grain)) - .5) * .72;
  const brightening = 2.9 * Math.exp(-((x - 22) ** 2 + (y - 14) ** 2) / 22);
  const fading = 1.9 * Math.exp(-((x - 10) ** 2 + (y - 25) ** 2) / 30);
  const difference = brightening - fading + noise;
  return { x, y, difference, significance: difference / .36 };
});

export function ExampleMapView({ kind }: { kind: "difference" | "significance" }) {
  const isDifference = kind === "difference";

  return <div className="compare-example-map">
    <div className="compare-example-notice" role="status">
      <strong>Simulated example</strong>
      <span>No validated map is available for this pair. This is not a measurement from its images.</span>
    </div>
    <div className="compare-example-image">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={isDifference ? "Simulated signed change map with one brighter and one fainter source" : "Simulated noise check highlighting only strong signals"} preserveAspectRatio="xMidYMid meet">
        <rect width={SIZE} height={SIZE} fill="#060b1b"/>
        {cells.map(cell => {
          const value = isDifference ? cell.difference : cell.significance;
          const strength = Math.min(1, Math.abs(value) / (isDifference ? 2.5 : 6));
          const visible = isDifference ? .16 + strength * .84 : Math.abs(value) < 2 ? .06 : .28 + strength * .72;
          const color = value >= 0 ? `rgba(255, ${Math.round(87 + 83 * (1 - strength))}, 83, ${visible})` : `rgba(80, ${Math.round(140 + 58 * (1 - strength))}, 255, ${visible})`;
          return <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" fill={color}/>;
        })}
      </svg>
      <span>{isDifference ? "Signed change" : "Signal / noise"}</span>
    </div>
    <div className="compare-example-legend"><span>{isDifference ? "Blue · fainter" : "Below 2σ · muted"}</span><span>{isDifference ? "Red · brighter" : "Above 3σ · highlighted"}</span></div>
  </div>;
}
