import { useState, useEffect, useRef } from 'react';
import TimelineNode from './TimelineNode';
import TimelineMonthDivider from './TimelineMonthDivider';
import { shows } from '../data/shows';
import './Timeline.css';

function Timeline() {
  const [showsOrdenados, setShowsOrdenados] = useState([]);
  const [isYearNodeVisible, setIsYearNodeVisible] = useState(false);
  const audioRefs = useRef({});
  const yearNodeRef = useRef(null);

  useEffect(() => {
    // Ordenar shows por data de acontecimento (cronologicamente - do mais antigo para o mais recente)
    const ordenados = [...shows].sort((a, b) => {
      const dataA = new Date(a.data);
      const dataB = new Date(b.data);
      return dataA - dataB; // Ordem crescente: mais antigo primeiro
    });
    setShowsOrdenados(ordenados);
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
    // Pausar todos os outros áudios
    Object.keys(audioRefs.current).forEach(id => {
      if (id !== showId.toString() && audioRefs.current[id]) {
        audioRefs.current[id].pause();
        audioRefs.current[id].currentTime = 0;
      }
    });
    // Registrar o áudio atual
    audioRefs.current[showId] = audioElement;
  };

  const registerAudio = (showId, audioElement) => {
    audioRefs.current[showId] = audioElement;
  };

  const formatarMesAno = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      month: 'long'
    });
  };

  const shouldShowMonthDivider = (currentShow, previousShow) => {
    if (!previousShow) return false;
    const currentDate = new Date(currentShow.data);
    const previousDate = new Date(previousShow.data);
    return (
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  return (
    <div className="timeline-container">
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
            const showMonthDivider = shouldShowMonthDivider(show, previousShow);
            
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
                  registerAudio={registerAudio}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Timeline;

