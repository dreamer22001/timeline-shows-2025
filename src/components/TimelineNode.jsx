import { useState, useRef, useEffect } from 'react';
import './TimelineNode.css';

function TimelineNode({ show, index, total, onPlay, registerAudio }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef(null);
  const nodeRef = useRef(null);

  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        if (onPlay) {
          onPlay(show.id, audioRef.current);
        }
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    
    if (audio && registerAudio) {
      registerAudio(show.id, audio);
    }
  }, [show.id, registerAudio]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (nodeRef.current) {
      observer.observe(nodeRef.current);
    }

    return () => {
      if (nodeRef.current) {
        observer.unobserve(nodeRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlay && audio) {
        onPlay(show.id, audio);
      }
    };

    if (audio) {
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('play', handlePlay);
      
      // Sincronizar estado inicial
      setIsPlaying(!audio.paused);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [show.id, onPlay]);

  const isEven = index % 2 === 0;

  return (
    <div 
      ref={nodeRef}
      className={`timeline-node ${isEven ? 'left' : 'right'} ${isVisible ? 'visible' : ''}`}
    >
      <div className="timeline-content">
        <div className="timeline-image-container">
          <img 
            src={show.imagem} 
            alt={`${show.banda} - ${show.turnê}`}
            className="timeline-image"
            loading="lazy"
          />
        </div>
        <div className="timeline-info">
          <div className="timeline-info-content">
            <h3 className="timeline-banda">{show.banda}</h3>
            <p className="timeline-turne">{show.turnê}</p>
            <p className="timeline-data">{formatarData(show.data)}</p>
          </div>
          <button 
            className="timeline-play-button"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pausar' : 'Tocar'}
          >
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5v14l11-7z" fill="currentColor"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      <audio ref={audioRef} src={show.audio} preload="metadata" />
      <div className="timeline-marker"></div>
    </div>
  );
}

export default TimelineNode;

