export default function Loading() {
  return (
    <main>
      <div className="skeleton skeleton-block" />
      <div className="card" aria-busy="true">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
      </div>
      <div className="card" aria-busy="true">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
      </div>
    </main>
  );
}