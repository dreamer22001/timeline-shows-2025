import { useState, useEffect, useRef } from 'react';
import './Timeline.css';

function TimelineMonthDivider({ monthLabel }) {
  const [isVisible, setIsVisible] = useState(false);
  const dividerRef = useRef(null);

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

    if (dividerRef.current) {
      observer.observe(dividerRef.current);
    }

    return () => {
      if (dividerRef.current) {
        observer.unobserve(dividerRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={dividerRef}
      className={`timeline-month-divider ${isVisible ? 'visible' : ''}`}
    >
      <div className="timeline-month-marker"></div>
      <div className="timeline-month-label">{monthLabel}</div>
    </div>
  );
}

export default TimelineMonthDivider;

