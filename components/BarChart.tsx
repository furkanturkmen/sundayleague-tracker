interface Bar {
  label: string;
  value: number;
  /** Longer text for the hover tooltip. */
  hint?: string;
}

interface Props {
  title: string;
  data: Bar[];
  tone?: "accent" | "against";
  unit?: string;
  height?: number;
}

/** Single-series vertical bar chart. Value labels on the peak and on hover; table view underneath. */
export function BarChart({ title, data, tone = "accent", unit = "", height = 160 }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = Math.max(...data.map((d) => d.value));
  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <div className="bars" style={{ height }} role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}${unit}`).join(", ")}`}>
        {data.map((d) => (
          <div className="bar-col" key={d.label} tabIndex={0}>
            <div className="bar-area">
              {d.value === peak && d.value > 0 && <span className="bar-value">{d.value}</span>}
              <div className={`bar bar-${tone}`} style={{ height: `${(d.value / max) * 100}%` }} />
              <span className="tip">
                <strong>{d.hint ?? d.label}</strong>
                <br />
                {d.value}
                {unit}
              </span>
            </div>
            <span className="bar-label">{d.label}</span>
          </div>
        ))}
      </div>
      <details className="chart-table">
        <summary>Show as table</summary>
        <table>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <th scope="row">{d.hint ?? d.label}</th>
                <td className="num">
                  {d.value}
                  {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
