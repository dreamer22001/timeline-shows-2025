import './Header.css';

function Header({ currentPlayingShow }) {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">Shows de 2025</h1>
        {currentPlayingShow && currentPlayingShow.banda && (
          <div className="header-now-playing">
            <span className="header-now-playing-label">Tocando agora:</span>
            <span className="header-now-playing-name">
              {currentPlayingShow.videoTitle || currentPlayingShow.banda}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;

