import './App.css'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Web Claude - Chat Interface</h1>
      </header>

      <main className="app-main">
        <div className="connection-status">
          <span className="status-indicator disconnected"></span>
          <span>WebSocket: Not connected</span>
        </div>

        <div className="chat-container">
          <div className="message-area">
            <p className="placeholder-text">Chat interface will be implemented in a future spec.</p>
          </div>

          <div className="input-area">
            <input
              type="text"
              className="message-input"
              placeholder="Type a message... (placeholder - not functional yet)"
              disabled
            />
            <button className="send-button" disabled>Send</button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
