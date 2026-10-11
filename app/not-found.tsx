import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card" style={{ textAlign: "center", padding: 48 }}>
      <h1>Offside.</h1>
      <p className="muted">That page doesn&apos;t exist.</p>
      <Link href="/">Back to the dressing room</Link>
    </div>
  );
}
