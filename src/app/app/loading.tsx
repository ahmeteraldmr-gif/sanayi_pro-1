export default function AppLoading() {
  return (
    <div
      className="app-route-loading"
      role="status"
      aria-live="polite"
      aria-label="Sayfa yükleniyor"
    >
      <div className="app-loading-bar" />
    </div>
  );
}
