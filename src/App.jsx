import { useState } from 'react';
import Timeline from './components/Timeline'
import Header from './components/Header'
import Footer from './components/Footer'
import './App.css'

function App() {
  const [currentPlayingShow, setCurrentPlayingShow] = useState(null);

  const handleShowPlaying = (show) => {
    setCurrentPlayingShow(show);
  };

  const handleShowStopped = () => {
    setCurrentPlayingShow(null);
  };

  return (
    <div className="App">
      <Header currentPlayingShow={currentPlayingShow} />
      <Timeline 
        onShowPlaying={handleShowPlaying}
        onShowStopped={handleShowStopped}
      />
      <Footer />
    </div>
  )
}

export default App
