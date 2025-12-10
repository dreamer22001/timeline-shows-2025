import { useState, useEffect, useRef } from 'react';
import TimelineNode from './TimelineNode';
import TimelineMonthDivider from './TimelineMonthDivider';
import { shows } from '../data/shows';
import './Timeline.css';

function Timeline({ onShowPlaying, onShowStopped }) {
  const [showsOrdenados, setShowsOrdenados] = useState([]);
  const [isYearNodeVisible, setIsYearNodeVisible] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const audioRefs = useRef({});
  const videoTitlesRef = useRef({}); // Armazenar títulos dos vídeos do YouTube
  const yearNodeRef = useRef(null);
  const carouselRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    // Ordenar shows por data de acontecimento (cronologicamente - do mais antigo para o mais recente)
    const ordenados = [...shows].sort((a, b) => {
      const dataA = new Date(a.data);
      const dataB = new Date(b.data);
      return dataA - dataB; // Ordem crescente: mais antigo primeiro
    });
    setShowsOrdenados(ordenados);
  }, []);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsYearNodeVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (yearNodeRef.current) {
      observer.observe(yearNodeRef.current);
    }

    return () => {
      if (yearNodeRef.current) {
        observer.unobserve(yearNodeRef.current);
      }
    };
  }, []);

  const handlePlay = (showId, audioElement) => {
    try {
      // Pausar todos os outros áudios/players
      Object.keys(audioRefs.current).forEach(id => {
        if (id !== showId.toString() && audioRefs.current[id]) {
          const player = audioRefs.current[id];
          try {
            // Verificar se é YouTube Player ou elemento de áudio
            if (player && typeof player.pauseVideo === 'function') {
              // É um YouTube Player - verificar se está pronto antes de pausar
              try {
                // Verificar se o player ainda está válido
                const playerState = player.getPlayerState();
                if (playerState !== undefined && playerState !== null) {
                  // Player está pronto e válido, pausar
                  if (typeof player.pauseVideo === 'function') {
                    player.pauseVideo();
                  }
                  if (typeof player.stopVideo === 'function') {
                    player.stopVideo();
                  }
                }
              } catch (e) {
                // Player não está pronto ou foi destruído, ignorar silenciosamente
              }
            } else if (player && typeof player.pause === 'function' && !player.paused) {
              // É um elemento de áudio e está tocando
              try {
                player.pause();
                player.currentTime = 0;
              } catch (e) {
                // Ignorar erros silenciosamente
              }
            }
          } catch (e) {
            // Ignorar erros silenciosamente
          }
        }
      });
      
      // Atualizar o ID do show que está tocando
      setCurrentPlayingId(showId);
      
      // Registrar o áudio/player atual
      audioRefs.current[showId] = audioElement;
      
      // Notificar qual show está tocando
      if (onShowPlaying && showsOrdenados.length > 0) {
        const show = showsOrdenados.find(s => s.id === showId);
        if (show) {
          // Adicionar título do vídeo se disponível
          const showWithTitle = {
            ...show,
            videoTitle: videoTitlesRef.current[showId] || null
          };
          onShowPlaying(showWithTitle);
        }
      }
    } catch (error) {
      // Ignorar erros silenciosamente
    }
  };

  const handleStop = () => {
    // Limpar o ID do show que está tocando
    setCurrentPlayingId(null);
    // Notificar que o show parou
    if (onShowStopped) {
      onShowStopped();
    }
  };

  const registerAudio = (showId, audioElement) => {
    audioRefs.current[showId] = audioElement;
  };

  const handleVideoTitleChange = (showId, title) => {
    videoTitlesRef.current[showId] = title;
    // Se este show está tocando, atualizar o título
    if (currentPlayingId === showId && onShowPlaying) {
      const show = showsOrdenados.find(s => s.id === showId);
      if (show) {
        const showWithTitle = {
          ...show,
          videoTitle: title
        };
        onShowPlaying(showWithTitle);
      }
    }
  };

  const formatarMesAno = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      month: 'long'
    });
  };

  const shouldShowMonthDivider = (currentShow, previousShow, index) => {
    // Mostrar o mês para o primeiro item também
    if (!previousShow || index === 0) return true;
    const currentDate = new Date(currentShow.data);
    const previousDate = new Date(previousShow.data);
    return (
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  // Funções do carrossel
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % showsOrdenados.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + showsOrdenados.length) % showsOrdenados.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Touch handlers para swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }
  };

  return (
    <div className={`timeline-container ${isMobile ? 'mobile' : ''}`}>
      {isMobile ? (
        // Modo carrossel para mobile
        <div 
          className="carousel-container"
          ref={carouselRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="carousel-wrapper"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {showsOrdenados.map((show, index) => {
              const previousShow = index > 0 ? showsOrdenados[index - 1] : null;
              const showMonthDivider = shouldShowMonthDivider(show, previousShow, index);
              
              return (
                <div key={`carousel-slide-${show.id}`} className="carousel-slide">
                  {showMonthDivider && (
                    <TimelineMonthDivider monthLabel={formatarMesAno(show.data)} />
                  )}
                  <TimelineNode
                    show={show}
                    index={index}
                    total={showsOrdenados.length}
                    onPlay={handlePlay}
                    onStop={handleStop}
                    registerAudio={registerAudio}
                    currentPlayingId={currentPlayingId}
                    onVideoTitleChange={handleVideoTitleChange}
                  />
                </div>
              );
            })}
          </div>
          
          {/* Controles de navegação */}
          <button 
            className="carousel-button carousel-button-prev"
            onClick={prevSlide}
            aria-label="Slide anterior"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <button 
            className="carousel-button carousel-button-next"
            onClick={nextSlide}
            aria-label="Próximo slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Indicadores */}
          <div className="carousel-indicators">
            {showsOrdenados.map((_, index) => (
              <button
                key={index}
                className={`carousel-indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      ) : (
        // Modo timeline para desktop
        <div className="timeline-wrapper">
          <div className="timeline-line"></div>
          <div className="timeline-nodes">
            <div 
              ref={yearNodeRef}
              className={`timeline-year-node ${isYearNodeVisible ? 'visible' : ''}`}
            >
              <div className="timeline-year-marker"></div>
              <div className="timeline-year-label">2025</div>
            </div>
            {showsOrdenados.map((show, index) => {
              const previousShow = index > 0 ? showsOrdenados[index - 1] : null;
              const showMonthDivider = shouldShowMonthDivider(show, previousShow, index);
              
              return (
                <div key={`wrapper-${show.id}`}>
                  {showMonthDivider && (
                    <TimelineMonthDivider monthLabel={formatarMesAno(show.data)} />
                  )}
                  <TimelineNode
                    key={show.id}
                    show={show}
                    index={index}
                    total={showsOrdenados.length}
                    onPlay={handlePlay}
                    onStop={handleStop}
                    registerAudio={registerAudio}
                    currentPlayingId={currentPlayingId}
                    onVideoTitleChange={handleVideoTitleChange}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Timeline;

