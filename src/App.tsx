function App() {
  return (
    <div style={{ padding: 40 }}>
      <h1>🚀 Lib26 React Frontend</h1>
      <p>If you see this on server → deployment works.</p>

      <button onClick={async () => {
        const r = await fetch("/api/health");
        const data = await r.json();
        alert(JSON.stringify(data));
      }}>
        Test API
      </button>
    </div>
  );
}

export default App;
