import { GameCanvas } from './components/GameCanvas'
import { CameraFeed } from './components/CameraFeed'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <GameCanvas />
      <CameraFeed />
    </div>
  )
}

export default App
