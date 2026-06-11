/** Ambient animated background: drifting color fields + a static grain pass. */
export default function Aurora() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="blob3" />
      <div className="blob4" />
      <div className="aurora-grain" />
    </div>
  );
}
