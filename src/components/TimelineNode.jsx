import { useState, useRef, useEffect } from 'react';
import './TimelineNode.css';

function TimelineNode({ show, index, total, onPlay, onStop, registerAudio, currentPlayingId, onVideoTitleChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoTitle, setVideoTitle] = useState(null); // Título do vídeo do YouTube
  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const nodeRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const pendingPlayRef = useRef(false); // Flag para rastrear se há uma tentativa de play pendente
  const retryCountRef = useRef(0); // Contador de tentativas de retry
  const maxRetries = 2; // Máximo de tentativas de retry
  const isYouTube = show.audio && (show.audio.includes('youtube.com') || show.audio.includes('youtu.be'));
  
  // Audio visualizer
  const [audioData, setAudioData] = useState(new Array(32).fill(0)); // 32 barras
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Simulação de áudio para YouTube
  const [simulatedAudioData, setSimulatedAudioData] = useState(new Array(32).fill(0));
  const simulationIntervalRef = useRef(null);
  
  // Log inicial para debug
  useEffect(() => {
    if (isYouTube) {
      console.log(`[YouTube Debug] Show ${show.id} (${show.banda}): Detectado como YouTube`, {
        audioUrl: show.audio,
        isYouTube: isYouTube
      });
    }
  }, [show.id, show.audio, show.banda, isYouTube]);

  const formatarData = (dataString) => {
    // Formato: YYYY-MM-DD do JSON
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const formatarTempo = (segundos) => {
    if (!segundos || isNaN(segundos)) return '0:00';
    const mins = Math.floor(segundos / 60);
    const secs = Math.floor(segundos % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (duration === 0) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;

    if (isYouTube && isYouTubePlayerReady()) {
      try {
        youtubePlayerRef.current.seekTo(newTime, true);
        setCurrentTime(newTime);
      } catch (e) {
        // Ignorar erros
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };


  // Extrair ID do vídeo do YouTube a partir da URL
  const extractYouTubeId = (url) => {
    if (!url) {
      console.log(`[YouTube Debug] Show ${show.id}: URL vazia`);
      return null;
    }
    
    // Tentar diferentes padrões de URL do YouTube
    let match;
    
    // Padrão: youtu.be/VIDEO_ID ou youtu.be/VIDEO_ID?params
    match = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      console.log(`[YouTube Debug] Show ${show.id}: ID extraído (youtu.be):`, match[1]);
      return match[1];
    }
    
    // Padrão: youtube.com/watch?v=VIDEO_ID ou youtube.com/embed/VIDEO_ID
    match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      console.log(`[YouTube Debug] Show ${show.id}: ID extraído (youtube.com):`, match[1]);
      return match[1];
    }
    
    // Padrão genérico como fallback
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    match = url.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      console.log(`[YouTube Debug] Show ${show.id}: ID extraído (fallback):`, match[2]);
      return match[2];
    }
    
    console.warn(`[YouTube Debug] Show ${show.id}: Não foi possível extrair ID do YouTube da URL:`, url);
    return null;
  };

  // Verificar se o player do YouTube está pronto e válido
  const isYouTubePlayerReady = () => {
    if (!youtubePlayerRef.current) {
      console.log(`[YouTube Debug] Show ${show.id}: Player ref é null`);
      return false;
    }
    try {
      // Verificar se o player tem os métodos necessários
      if (typeof youtubePlayerRef.current.getPlayerState !== 'function') {
        console.log(`[YouTube Debug] Show ${show.id}: getPlayerState não é uma função`);
        return false;
      }
      const state = youtubePlayerRef.current.getPlayerState();
      const stateNames = {
        '-1': 'UNSTARTED',
        '0': 'ENDED',
        '1': 'PLAYING',
        '2': 'PAUSED',
        '3': 'BUFFERING',
        '5': 'CUED'
      };
      console.log(`[YouTube Debug] Show ${show.id}: Estado do player:`, state, `(${stateNames[state] || 'UNKNOWN'})`);
      // PlayerState pode ser -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
      // Qualquer estado válido significa que o player está pronto
      return state !== undefined && state !== null;
    } catch (e) {
      console.error(`[YouTube Debug] Show ${show.id}: Erro ao verificar estado do player:`, e);
      return false;
    }
  };

  const startProgressUpdate = () => {
    stopProgressUpdate();
    progressIntervalRef.current = setInterval(() => {
      if (isYouTube && isYouTubePlayerReady()) {
        try {
          const current = youtubePlayerRef.current.getCurrentTime();
          const total = youtubePlayerRef.current.getDuration();
          if (typeof current === 'number' && typeof total === 'number' && total > 0) {
            setCurrentTime(current);
            setDuration(total);
          }
        } catch (e) {
          // Ignorar erros
        }
      } else if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        if (audioRef.current.duration) {
          setDuration(audioRef.current.duration);
        }
      }
    }, 100);
  };

  const stopProgressUpdate = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const togglePlayPause = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isYouTube) {
      console.log(`[YouTube Debug] Show ${show.id}: togglePlayPause chamado`, {
        isPlaying,
        hasPlayerRef: !!youtubePlayerRef.current,
        isPlayerReady,
        showId: show.id,
        banda: show.banda
      });
      
      // Lógica para YouTube
      if (!youtubePlayerRef.current || !isPlayerReady) {
        // Player não está pronto ainda
        console.warn(`[YouTube Debug] Show ${show.id}: Player ainda não está pronto`, {
          hasPlayerRef: !!youtubePlayerRef.current,
          isPlayerReady
        });
        return;
      }
      
      if (!isYouTubePlayerReady()) {
        console.warn(`[YouTube Debug] Show ${show.id}: Player não está pronto (isYouTubePlayerReady retornou false)`);
        return;
      }

      if (isPlaying) {
        // Pausar
        console.log(`[YouTube Debug] Show ${show.id}: Pausando vídeo`);
        setIsLoading(false); // Desativar loading ao pausar
        try {
          if (typeof youtubePlayerRef.current.pauseVideo === 'function') {
            youtubePlayerRef.current.pauseVideo();
            console.log(`[YouTube Debug] Show ${show.id}: pauseVideo() chamado com sucesso`);
          } else {
            console.warn(`[YouTube Debug] Show ${show.id}: pauseVideo não é uma função`);
          }
          setIsPlaying(false);
          stopProgressUpdate();
          if (onStop) onStop();
        } catch (error) {
          console.error(`[YouTube Debug] Show ${show.id}: Erro ao pausar vídeo:`, error);
          setIsPlaying(false);
          setIsLoading(false);
          if (onStop) onStop();
        }
      } else {
        // Tocar
        console.log(`[YouTube Debug] Show ${show.id}: Tentando tocar vídeo (tentativa ${retryCountRef.current + 1})`);
        pendingPlayRef.current = true; // Marcar que há uma tentativa de play
        setIsLoading(true); // Ativar loading
        
        try {
          // Primeiro, garantir que o player está pronto
          let playerState;
          try {
            // Verificar se o player existe e tem o método
            if (!youtubePlayerRef.current) {
              console.error(`[YouTube Debug] Show ${show.id}: Player ref é null - tentando retry`);
              
              // Tentar retry se ainda não excedeu o limite
              if (retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                console.log(`[YouTube Debug] Show ${show.id}: Tentativa de retry ${retryCountRef.current}/${maxRetries}`);
                
                // Aguardar um pouco e tentar reinicializar o player
                setTimeout(() => {
                  // Forçar reinicialização do player
                  setIsPlayerReady(false);
                  
                  // Aguardar um pouco mais e simular outro clique
                  setTimeout(() => {
                    console.log(`[YouTube Debug] Show ${show.id}: Simulando novo clique após retry`);
                    togglePlayPause(null);
                  }, 1000);
                }, 500);
              } else {
                console.error(`[YouTube Debug] Show ${show.id}: Máximo de tentativas de retry atingido`);
                retryCountRef.current = 0; // Resetar contador
              }
              
              setIsLoading(false);
              pendingPlayRef.current = false;
              return;
            }
            
            if (typeof youtubePlayerRef.current.getPlayerState !== 'function') {
              console.error(`[YouTube Debug] Show ${show.id}: getPlayerState não é uma função - tentando retry`);
              
              // Tentar retry se ainda não excedeu o limite
              if (retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                console.log(`[YouTube Debug] Show ${show.id}: Tentativa de retry ${retryCountRef.current}/${maxRetries}`);
                
                // Aguardar um pouco e tentar reinicializar o player
                setTimeout(() => {
                  // Forçar reinicialização do player
                  setIsPlayerReady(false);
                  
                  // Aguardar um pouco mais e simular outro clique
                  setTimeout(() => {
                    console.log(`[YouTube Debug] Show ${show.id}: Simulando novo clique após retry`);
                    togglePlayPause(null);
                  }, 1000);
                }, 500);
              } else {
                console.error(`[YouTube Debug] Show ${show.id}: Máximo de tentativas de retry atingido`);
                retryCountRef.current = 0; // Resetar contador
              }
              
              setIsLoading(false);
              pendingPlayRef.current = false;
              return;
            }
            
            playerState = youtubePlayerRef.current.getPlayerState();
            console.log(`[YouTube Debug] Show ${show.id}: Estado atual do player antes de tocar:`, playerState);
          } catch (e) {
            console.error(`[YouTube Debug] Show ${show.id}: Erro ao obter estado do player:`, e);
            setIsLoading(false);
            pendingPlayRef.current = false;
            return;
          }
          
          const videoId = extractYouTubeId(show.audio);
          
          if (!videoId) {
            console.error(`[YouTube Debug] Show ${show.id}: Não foi possível extrair videoId`);
            setIsLoading(false);
            pendingPlayRef.current = false;
            return;
          }
          
          // Notificar antes de carregar/tocar
          if (onPlay) {
            console.log(`[YouTube Debug] Show ${show.id}: Chamando onPlay callback`);
            onPlay(show.id, youtubePlayerRef.current);
          }
          
          // Se o player estiver em estado unstarted (-1) ou ended (0), precisa carregar o vídeo primeiro
          if (playerState === window.YT.PlayerState.UNSTARTED || playerState === window.YT.PlayerState.ENDED) {
            console.log(`[YouTube Debug] Show ${show.id}: Player em estado ${playerState}, carregando vídeo primeiro...`);
            
            // Usar loadVideoById para garantir que o vídeo está carregado e pronto para tocar
            if (typeof youtubePlayerRef.current.loadVideoById === 'function') {
              try {
                console.log(`[YouTube Debug] Show ${show.id}: Chamando loadVideoById(${videoId})`);
                youtubePlayerRef.current.loadVideoById(videoId);
                // Tentar obter o título após carregar o vídeo
                setTimeout(() => {
                  try {
                    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.getVideoData === 'function') {
                      const videoData = youtubePlayerRef.current.getVideoData();
                      if (videoData && videoData.title && onVideoTitleChange) {
                        console.log(`[YouTube Debug] Show ${show.id}: Título obtido após loadVideoById:`, videoData.title);
                        setVideoTitle(videoData.title);
                        onVideoTitleChange(show.id, videoData.title);
                      }
                    }
                  } catch (e) {
                    console.warn(`[YouTube Debug] Show ${show.id}: Erro ao obter título após loadVideoById:`, e);
                  }
                }, 1000);
                // O onStateChange vai detectar quando estiver CUED e tocar automaticamente
              } catch (e) {
                console.error(`[YouTube Debug] Show ${show.id}: Erro ao chamar loadVideoById:`, e);
                setIsLoading(false);
                pendingPlayRef.current = false;
              }
            } else if (typeof youtubePlayerRef.current.cueVideoById === 'function') {
              // Fallback para cueVideoById se loadVideoById não estiver disponível
              try {
                console.log(`[YouTube Debug] Show ${show.id}: Usando cueVideoById como fallback`);
                youtubePlayerRef.current.cueVideoById(videoId);
                // Tentar obter o título após carregar o vídeo
                setTimeout(() => {
                  try {
                    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.getVideoData === 'function') {
                      const videoData = youtubePlayerRef.current.getVideoData();
                      if (videoData && videoData.title && onVideoTitleChange) {
                        console.log(`[YouTube Debug] Show ${show.id}: Título obtido após cueVideoById:`, videoData.title);
                        setVideoTitle(videoData.title);
                        onVideoTitleChange(show.id, videoData.title);
                      }
                    }
                  } catch (e) {
                    console.warn(`[YouTube Debug] Show ${show.id}: Erro ao obter título após cueVideoById:`, e);
                  }
                }, 1000);
                // O onStateChange vai detectar quando estiver CUED e tocar automaticamente
              } catch (e) {
                console.error(`[YouTube Debug] Show ${show.id}: Erro ao chamar cueVideoById:`, e);
                setIsLoading(false);
                pendingPlayRef.current = false;
              }
            } else {
              console.error(`[YouTube Debug] Show ${show.id}: Nem loadVideoById nem cueVideoById estão disponíveis`);
              setIsLoading(false);
              pendingPlayRef.current = false;
            }
          } else {
            // Player já tem vídeo carregado, apenas tocar
            // Tocar o vídeo
            if (typeof youtubePlayerRef.current.playVideo === 'function') {
              try {
                console.log(`[YouTube Debug] Show ${show.id}: Chamando playVideo()`);
                youtubePlayerRef.current.playVideo();
                console.log(`[YouTube Debug] Show ${show.id}: playVideo() chamado com sucesso`);
                
                // Verificar o estado após um pequeno delay para garantir que foi atualizado
                setTimeout(() => {
                  try {
                    // Verificar se o player ainda existe e tem o método
                    if (!youtubePlayerRef.current) {
                      console.warn(`[YouTube Debug] Show ${show.id}: Player ref é null após playVideo - tentando retry`);
                      
                      // Tentar retry se ainda não excedeu o limite
                      if (retryCountRef.current < maxRetries) {
                        retryCountRef.current++;
                        console.log(`[YouTube Debug] Show ${show.id}: Tentativa de retry ${retryCountRef.current}/${maxRetries} após playVideo`);
                        
                        // Aguardar um pouco e tentar reinicializar o player
                        setTimeout(() => {
                          // Forçar reinicialização do player
                          setIsPlayerReady(false);
                          
                          // Aguardar um pouco mais e simular outro clique
                          setTimeout(() => {
                            console.log(`[YouTube Debug] Show ${show.id}: Simulando novo clique após retry (após playVideo)`);
                            togglePlayPause(null);
                          }, 1000);
                        }, 500);
                      } else {
                        console.error(`[YouTube Debug] Show ${show.id}: Máximo de tentativas de retry atingido após playVideo`);
                        retryCountRef.current = 0; // Resetar contador
                      }
                      
                      setIsLoading(false);
                      pendingPlayRef.current = false;
                      return;
                    }
                    
                    if (typeof youtubePlayerRef.current.getPlayerState !== 'function') {
                      console.warn(`[YouTube Debug] Show ${show.id}: getPlayerState não é uma função após playVideo - tentando retry`);
                      
                      // Tentar retry se ainda não excedeu o limite
                      if (retryCountRef.current < maxRetries) {
                        retryCountRef.current++;
                        console.log(`[YouTube Debug] Show ${show.id}: Tentativa de retry ${retryCountRef.current}/${maxRetries} após playVideo (getPlayerState)`);
                        
                        // Aguardar um pouco e tentar reinicializar o player
                        setTimeout(() => {
                          // Forçar reinicialização do player
                          setIsPlayerReady(false);
                          
                          // Aguardar um pouco mais e simular outro clique
                          setTimeout(() => {
                            console.log(`[YouTube Debug] Show ${show.id}: Simulando novo clique após retry (getPlayerState)`);
                            togglePlayPause(null);
                          }, 1000);
                        }, 500);
                      } else {
                        console.error(`[YouTube Debug] Show ${show.id}: Máximo de tentativas de retry atingido após playVideo (getPlayerState)`);
                        retryCountRef.current = 0; // Resetar contador
                      }
                      
                      setIsLoading(false);
                      pendingPlayRef.current = false;
                      return;
                    }
                    
                    const state = youtubePlayerRef.current.getPlayerState();
                    console.log(`[YouTube Debug] Show ${show.id}: Estado após playVideo (verificação):`, state);
                    if (state === window.YT.PlayerState.PLAYING && !isPlaying) {
                      console.log(`[YouTube Debug] Show ${show.id}: Estado é PLAYING mas isPlaying é false - corrigindo`);
                      setIsPlaying(true);
                      setIsLoading(false);
                      startProgressUpdate();
                      pendingPlayRef.current = false;
                    } else if (state !== window.YT.PlayerState.PLAYING) {
                      setIsLoading(false);
                      pendingPlayRef.current = false;
                    }
                  } catch (e) {
                    console.error(`[YouTube Debug] Show ${show.id}: Erro ao verificar estado após playVideo:`, e);
                    setIsLoading(false);
                    pendingPlayRef.current = false;
                  }
                }, 500);
              } catch (e) {
                console.error(`[YouTube Debug] Show ${show.id}: Erro ao chamar playVideo:`, e);
                setIsLoading(false);
                pendingPlayRef.current = false;
              }
            } else {
              console.warn(`[YouTube Debug] Show ${show.id}: playVideo não é uma função`);
              setIsLoading(false);
              pendingPlayRef.current = false;
            }
          }
        } catch (error) {
          console.error(`[YouTube Debug] Show ${show.id}: Erro ao tocar vídeo:`, error);
          setIsPlaying(false);
          setIsLoading(false);
          pendingPlayRef.current = false;
          if (onStop) onStop();
        }
      }
    } else {
      // Lógica para áudio HTML5
      if (!audioRef.current) return;

      if (isPlaying) {
        // Pausar
        audioRef.current.pause();
        setIsPlaying(false);
        stopProgressUpdate();
        if (onStop) onStop();
      } else {
        // Tocar
        if (onPlay) {
          onPlay(show.id, audioRef.current);
        }
        // Ir para o segundo 0:01 antes de tocar
        audioRef.current.currentTime = 1;
        setCurrentTime(1);
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            startProgressUpdate();
          })
          .catch((error) => {
            console.error('Erro ao tocar áudio:', error);
            setIsPlaying(false);
            if (onStop) onStop();
          });
      }
    }
  };

  // Inicializar player do YouTube
  useEffect(() => {
    if (!isYouTube) {
      // Para áudio HTML5, apenas registrar
      setIsPlayerReady(true); // Áudio HTML5 está sempre pronto
      if (audioRef.current && registerAudio) {
        registerAudio(show.id, audioRef.current);
      }
      return;
    }

    // Resetar estado quando for YouTube
    setIsPlayerReady(false);

    const videoId = extractYouTubeId(show.audio);
    if (!videoId) {
      console.error(`[YouTube Debug] Show ${show.id}: Não foi possível extrair videoId`);
      setIsPlayerReady(false);
      return;
    }

    console.log(`[YouTube Debug] Show ${show.id}: Iniciando inicialização do player`, {
      videoId,
      showId: show.id,
      banda: show.banda
    });

    let cleanup = () => {};

    const initPlayer = () => {
      console.log(`[YouTube Debug] Show ${show.id}: initPlayer() chamado`);
      const playerElement = document.getElementById(`youtube-player-${show.id}`);
      if (!playerElement) {
        console.warn(`[YouTube Debug] Show ${show.id}: Elemento do player não encontrado: youtube-player-${show.id}`);
        return false;
      }
      console.log(`[YouTube Debug] Show ${show.id}: Elemento do player encontrado`);

      if (!window.YT || !window.YT.Player) {
        console.warn(`[YouTube Debug] Show ${show.id}: API do YouTube não está disponível`, {
          hasYT: !!window.YT,
          hasYTPlayer: !!(window.YT && window.YT.Player)
        });
        return false;
      }
      console.log(`[YouTube Debug] Show ${show.id}: API do YouTube está disponível`);

      // Verificar se já existe um player válido - se sim, reutilizar em vez de destruir
      if (youtubePlayerRef.current) {
        try {
          // Verificar se o player ainda é válido
          if (typeof youtubePlayerRef.current.getPlayerState === 'function') {
            const existingState = youtubePlayerRef.current.getPlayerState();
            // Se o player está válido e funcionando, reutilizar em vez de destruir
            if (existingState !== undefined && existingState !== null) {
              console.log(`[YouTube Debug] Show ${show.id}: Reutilizando player existente (não destruindo)`);
              // Marcar como pronto novamente
              setIsPlayerReady(true);
              // Registrar o player novamente
              if (registerAudio) {
                registerAudio(show.id, youtubePlayerRef.current);
              }
              // Não destruir o player - apenas retornar indicando sucesso
              return true; // Player reutilizado com sucesso
            }
          }
        } catch (e) {
          // Se houver erro ao verificar o player, destruir e criar novo
          console.log(`[YouTube Debug] Show ${show.id}: Player existente inválido, criando novo`);
        }
        
        // Apenas destruir se o player não for válido
        try {
          if (typeof youtubePlayerRef.current.destroy === 'function') {
            youtubePlayerRef.current.destroy();
          }
        } catch (e) {
          // Ignorar erros
        }
        youtubePlayerRef.current = null;
      }
      
      // Resetar estado de pronto
      setIsPlayerReady(false);

      try {
        console.log(`[YouTube Debug] Show ${show.id}: Criando novo YT.Player`, {
          elementId: `youtube-player-${show.id}`,
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          }
        });
        
        youtubePlayerRef.current = new window.YT.Player(`youtube-player-${show.id}`, {
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              const player = event.target;
              console.log(`[YouTube Debug] Show ${show.id}: onReady event disparado`, {
                videoId,
                playerState: player.getPlayerState ? player.getPlayerState() : 'N/A'
              });
              
              // Marcar player como pronto
              setIsPlayerReady(true);
              retryCountRef.current = 0; // Resetar contador de retry quando o player estiver pronto
              console.log(`[YouTube Debug] Show ${show.id}: Player marcado como pronto (isPlayerReady = true)`);
              
              // Obter título do vídeo
              const getVideoTitle = (retries = 3) => {
                try {
                  if (typeof player.getVideoData === 'function') {
                    const videoData = player.getVideoData();
                    if (videoData && videoData.title) {
                      console.log(`[YouTube Debug] Show ${show.id}: Título do vídeo obtido:`, videoData.title);
                      setVideoTitle(videoData.title);
                      // Notificar o componente pai sobre o título
                      if (onVideoTitleChange) {
                        onVideoTitleChange(show.id, videoData.title);
                      }
                      return true;
                    } else if (retries > 0) {
                      // Título ainda não disponível, tentar novamente após um delay
                      console.log(`[YouTube Debug] Show ${show.id}: Título ainda não disponível, tentando novamente...`);
                      setTimeout(() => getVideoTitle(retries - 1), 500);
                    }
                  } else if (retries > 0) {
                    // Método ainda não disponível, tentar novamente
                    setTimeout(() => getVideoTitle(retries - 1), 500);
                  }
                } catch (e) {
                  if (retries > 0) {
                    console.log(`[YouTube Debug] Show ${show.id}: Erro ao obter título, tentando novamente...`, e);
                    setTimeout(() => getVideoTitle(retries - 1), 500);
                  } else {
                    console.warn(`[YouTube Debug] Show ${show.id}: Erro ao obter título do vídeo após todas as tentativas:`, e);
                  }
                }
                return false;
              };
              
              // Tentar obter o título imediatamente e com retry
              getVideoTitle();
              
              // Registrar o player
              if (registerAudio) {
                console.log(`[YouTube Debug] Show ${show.id}: Registrando player`);
                registerAudio(show.id, player);
              }

              // Configurar volume
              try {
                if (typeof player.setVolume === 'function') {
                  player.setVolume(volume * 100);
                  console.log(`[YouTube Debug] Show ${show.id}: Volume configurado para ${volume * 100}%`);
                }
              } catch (e) {
                console.warn(`[YouTube Debug] Show ${show.id}: Erro ao configurar volume:`, e);
              }

              // Configurar para não mostrar controles e tocar inline
              try {
                if (typeof player.setPlaybackQuality === 'function') {
                  player.setPlaybackQuality('medium');
                  console.log(`[YouTube Debug] Show ${show.id}: Qualidade de reprodução configurada para 'medium'`);
                }
              } catch (e) {
                console.log(`[YouTube Debug] Show ${show.id}: setPlaybackQuality não disponível ou erro:`, e);
              }

              // Obter duração
              const getDuration = () => {
                try {
                  // Verificar se o player ainda é válido
                  if (!player || !youtubePlayerRef.current || player !== youtubePlayerRef.current) {
                    console.warn(`[YouTube Debug] Show ${show.id}: Player inválido ao obter duração`);
                    return;
                  }
                  
                  if (typeof player.getDuration !== 'function') {
                    console.warn(`[YouTube Debug] Show ${show.id}: getDuration não é uma função`);
                    return;
                  }
                  
                  const dur = player.getDuration();
                  if (dur && dur > 0) {
                    console.log(`[YouTube Debug] Show ${show.id}: Duração obtida: ${dur} segundos (${Math.floor(dur / 60)}:${Math.floor(dur % 60).toString().padStart(2, '0')})`);
                    setDuration(dur);
                  } else {
                    console.log(`[YouTube Debug] Show ${show.id}: Duração ainda não disponível, tentando novamente...`);
                    // Tentar novamente após um delay
                    setTimeout(getDuration, 500);
                  }
                } catch (e) {
                  console.log(`[YouTube Debug] Show ${show.id}: Erro ao obter duração, tentando novamente...`, e);
                  // Tentar novamente após um delay apenas se o player ainda for válido
                  if (youtubePlayerRef.current && player === youtubePlayerRef.current) {
                    setTimeout(getDuration, 500);
                  }
                }
              };
              getDuration();
            },
            onStateChange: (event) => {
              const state = event.data;
              const player = event.target;
              
              // Verificar se o player ainda é válido
              if (!player || !youtubePlayerRef.current || player !== youtubePlayerRef.current) {
                console.warn(`[YouTube Debug] Show ${show.id}: Player inválido no onStateChange`);
                return;
              }
              
              const stateNames = {
                '-1': 'UNSTARTED',
                '0': 'ENDED',
                '1': 'PLAYING',
                '2': 'PAUSED',
                '3': 'BUFFERING',
                '5': 'CUED'
              };
              
              let currentTime = 'N/A';
              try {
                if (typeof player.getCurrentTime === 'function') {
                  currentTime = player.getCurrentTime();
                }
              } catch (e) {
                // Ignorar erro ao obter tempo
              }
              
              console.log(`[YouTube Debug] Show ${show.id}: onStateChange`, {
                state,
                stateName: stateNames[state] || 'UNKNOWN',
                currentTime
              });
              
              if (state === window.YT.PlayerState.PLAYING) {
                console.log(`[YouTube Debug] Show ${show.id}: Estado PLAYING detectado - atualizando isPlaying para true`);
                setIsPlaying(true);
                setIsLoading(false); // Desativar loading
                pendingPlayRef.current = false; // Limpar flag de play pendente
                retryCountRef.current = 0; // Resetar contador de retry quando o vídeo começar a tocar
                startProgressUpdate();
                
                // Verificar se está no início (0 segundos) e ir para o segundo 1
                try {
                  if (typeof player.getCurrentTime === 'function' && typeof player.seekTo === 'function') {
                    const currentTime = player.getCurrentTime();
                    console.log(`[YouTube Debug] Show ${show.id}: Tempo atual: ${currentTime} segundos`);
                    if (currentTime < 1) {
                      console.log(`[YouTube Debug] Show ${show.id}: Fazendo seek para 1 segundo`);
                      player.seekTo(1, true);
                      setCurrentTime(1);
                    }
                  }
                } catch (e) {
                  console.error(`[YouTube Debug] Show ${show.id}: Erro ao fazer seek:`, e);
                }
              } else if (state === window.YT.PlayerState.PAUSED) {
                console.log(`[YouTube Debug] Show ${show.id}: Estado PAUSED detectado`);
                setIsPlaying(false);
                setIsLoading(false); // Desativar loading
                pendingPlayRef.current = false; // Limpar flag de play pendente
                stopProgressUpdate();
              } else if (state === window.YT.PlayerState.ENDED) {
                console.log(`[YouTube Debug] Show ${show.id}: Estado ENDED detectado`);
                setIsPlaying(false);
                setIsLoading(false); // Desativar loading
                setCurrentTime(0);
                stopProgressUpdate();
                try {
                  if (typeof player.seekTo === 'function') {
                    player.seekTo(0, true);
                  }
                } catch (e) {
                  console.error(`[YouTube Debug] Show ${show.id}: Erro ao fazer seek para 0:`, e);
                }
                if (onStop) onStop();
              } else if (state === window.YT.PlayerState.BUFFERING) {
                console.log(`[YouTube Debug] Show ${show.id}: Estado BUFFERING detectado`);
                // Manter o estado atual durante buffering
              } else if (state === window.YT.PlayerState.CUED) {
                console.log(`[YouTube Debug] Show ${show.id}: Estado CUED detectado - vídeo está pronto`);
                // Vídeo está pronto mas não está tocando ainda
                // Se há uma tentativa de play pendente ou o currentPlayingId corresponde, tocar automaticamente
                if (pendingPlayRef.current || currentPlayingId === show.id) {
                  console.log(`[YouTube Debug] Show ${show.id}: Vídeo está CUED e há play pendente - tocando automaticamente`);
                  pendingPlayRef.current = false; // Limpar flag
                  try {
                    // Verificar se o player ainda é válido antes de tocar
                    if (player && youtubePlayerRef.current && player === youtubePlayerRef.current && typeof player.playVideo === 'function') {
                      player.playVideo();
                      console.log(`[YouTube Debug] Show ${show.id}: playVideo() chamado após CUED`);
                    } else {
                      console.warn(`[YouTube Debug] Show ${show.id}: Player inválido ou playVideo não disponível após CUED`);
                      setIsLoading(false);
                    }
                  } catch (e) {
                    console.error(`[YouTube Debug] Show ${show.id}: Erro ao tocar vídeo CUED:`, e);
                    setIsLoading(false);
                  }
                }
              } else if (state === window.YT.PlayerState.UNSTARTED) {
                console.log(`[YouTube Debug] Show ${show.id}: Estado UNSTARTED detectado`);
                // Vídeo ainda não foi iniciado
              }
            },
            onError: (event) => {
              console.error(`[YouTube Debug] Show ${show.id}: onError event disparado`, {
                errorCode: event.data,
                errorMessages: {
                  2: 'INVALID_PARAMETER_VALUE',
                  5: 'HTML5_PLAYER_ERROR',
                  100: 'VIDEO_NOT_FOUND',
                  101: 'NOT_ALLOWED_IN_EMBED',
                  150: 'NOT_ALLOWED_IN_EMBED'
                }
              });
              setIsPlaying(false);
              setIsLoading(false);
              setIsPlayerReady(false);
              pendingPlayRef.current = false;
              stopProgressUpdate();
              if (onStop) onStop();
            }
          }
        });
        console.log(`[YouTube Debug] Show ${show.id}: YT.Player criado com sucesso`);
        return true;
      } catch (error) {
        console.error(`[YouTube Debug] Show ${show.id}: Erro ao criar YouTube Player:`, error);
        youtubePlayerRef.current = null;
        return false;
      }
    };

    // Função para tentar inicializar com retry
    const tryInitPlayer = (retries = 5) => {
      console.log(`[YouTube Debug] Show ${show.id}: tryInitPlayer chamado (${retries} tentativas restantes)`);
      const playerElement = document.getElementById(`youtube-player-${show.id}`);
      if (!playerElement && retries > 0) {
        console.log(`[YouTube Debug] Show ${show.id}: Elemento não encontrado, tentando novamente em 200ms...`);
        setTimeout(() => tryInitPlayer(retries - 1), 200);
        return;
      }
      if (playerElement) {
        console.log(`[YouTube Debug] Show ${show.id}: Elemento encontrado, chamando initPlayer()`);
        const result = initPlayer();
        if (result === true) {
          console.log(`[YouTube Debug] Show ${show.id}: Player reutilizado com sucesso`);
        }
      } else {
        console.error(`[YouTube Debug] Show ${show.id}: Elemento não encontrado após todas as tentativas`);
      }
    };

    // Função para verificar se a API está realmente pronta
    const isAPIReady = () => {
      try {
        const ready = window.YT && 
               window.YT.Player && 
               typeof window.YT.Player === 'function' &&
               (window.ytAPIReady || window.YTReady || window.onYouTubeIframeAPIReady);
        if (!ready) {
          console.log(`[YouTube Debug] Show ${show.id}: API não está pronta`, {
            hasYT: !!window.YT,
            hasYTPlayer: !!(window.YT && window.YT.Player),
            isYTPlayerFunction: !!(window.YT && window.YT.Player && typeof window.YT.Player === 'function'),
            ytAPIReady: window.ytAPIReady,
            YTReady: window.YTReady,
            hasCallback: !!window.onYouTubeIframeAPIReady
          });
        }
        return ready;
      } catch (e) {
        console.error(`[YouTube Debug] Show ${show.id}: Erro ao verificar se API está pronta:`, e);
        return false;
      }
    };

    // Tentar inicializar
    if (isAPIReady()) {
      console.log(`[YouTube Debug] Show ${show.id}: API já está pronta, aguardando DOM...`);
      // API já está pronta - aguardar um pouco para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        tryInitPlayer();
      }, 300);
      cleanup = () => clearTimeout(timer);
    } else {
      console.log(`[YouTube Debug] Show ${show.id}: API não está pronta, aguardando...`);
      // Aguardar API ficar pronta
      const handleReady = () => {
        console.log(`[YouTube Debug] Show ${show.id}: handleReady chamado`);
        // Verificar novamente se está pronta
        if (!isAPIReady()) {
          console.warn(`[YouTube Debug] Show ${show.id}: API não está pronta em handleReady`);
          return;
        }
        console.log(`[YouTube Debug] Show ${show.id}: API confirmada como pronta, aguardando DOM...`);
        // Aguardar um pouco para garantir que o DOM está pronto
        const timer = setTimeout(() => {
          tryInitPlayer();
        }, 300);
        cleanup = () => clearTimeout(timer);
      };

      // Listener para o evento customizado
      console.log(`[YouTube Debug] Show ${show.id}: Adicionando listener para 'youtube-api-ready'`);
      window.addEventListener('youtube-api-ready', handleReady);

      // Também verificar o callback global diretamente
      if (!window.onYouTubeIframeAPIReady) {
        window.onYouTubeIframeAPIReady = function() {
          window.ytAPIReady = true;
          window.dispatchEvent(new Event('youtube-api-ready'));
        };
      }

      let checkInterval;
      let attempts = 0;
      const maxAttempts = 100; // 20 segundos (100 * 200ms)
      let timeoutCleared = false;
      let timeout;
      
      timeout = setTimeout(() => {
        timeoutCleared = true;
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        // Verificar uma última vez se a API está pronta antes de mostrar o warning
        if (!isAPIReady()) {
          console.warn('Timeout ao aguardar API do YouTube após 20 segundos. Verifique sua conexão com a internet.');
          setIsPlayerReady(false);
        } else {
          // API está pronta, tentar inicializar mesmo após o timeout
          handleReady();
        }
      }, 20000);

      checkInterval = setInterval(() => {
        attempts++;
        if (isAPIReady()) {
          console.log(`[YouTube Debug] Show ${show.id}: API detectada como pronta após ${attempts} tentativas`);
          if (!timeoutCleared && timeout) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            timeoutCleared = true;
          }
          handleReady();
        } else if (attempts >= maxAttempts && !timeoutCleared) {
          console.warn(`[YouTube Debug] Show ${show.id}: Máximo de tentativas (${maxAttempts}) atingido sem sucesso`);
          clearInterval(checkInterval);
          // Não mostrar warning aqui, o timeout já vai mostrar se necessário
        } else if (attempts % 10 === 0) {
          // Log a cada 10 tentativas para não poluir muito
          console.log(`[YouTube Debug] Show ${show.id}: Aguardando API... (tentativa ${attempts}/${maxAttempts})`);
        }
      }, 200);

      cleanup = () => {
        window.removeEventListener('youtube-api-ready', handleReady);
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        if (!timeoutCleared && timeout) {
          clearTimeout(timeout);
        }
        // NÃO destruir o player no cleanup - apenas marcar como não pronto
        // O player será destruído apenas quando o componente for desmontado completamente
        setIsPlayerReady(false);
        // Manter o player vivo para reutilização
      };
    }

    return cleanup;
  }, [show.id, show.audio, isYouTube, registerAudio, volume, onStop]);

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
    if (!isYouTube) {
      const audio = audioRef.current;

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        stopProgressUpdate();
        // Notificar que parou
        if (onStop) {
          onStop();
        }
      };

      const handlePause = () => {
        setIsPlaying(false);
        stopProgressUpdate();
        // Notificar que parou
        if (onStop) {
          onStop();
        }
      };

      const handlePlay = () => {
        setIsPlaying(true);
        if (onPlay && audio) {
          onPlay(show.id, audio);
        }
        startProgressUpdate();
      };

      const handleLoadedMetadata = () => {
        if (audio && audio.duration) {
          setDuration(audio.duration);
        }
      };

      const handleTimeUpdate = () => {
        if (audio) {
          setCurrentTime(audio.currentTime);
        }
      };

      if (audio) {
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        
        // Configurar volume inicial - garantir que seja aplicado
        if (audio.volume !== volume) {
          audio.volume = volume;
        }
        
        // Sincronizar estado inicial
        setIsPlaying(!audio.paused);
        if (audio.duration) {
          setDuration(audio.duration);
        }
        if (audio.paused) {
          stopProgressUpdate();
        } else {
          startProgressUpdate();
        }
      }

      return () => {
        stopProgressUpdate();
        if (audio) {
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('pause', handlePause);
          audio.removeEventListener('play', handlePlay);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.pause();
          audio.currentTime = 0;
        }
      };
    } else {
      return () => {
        stopProgressUpdate();
        // NÃO destruir ou parar o player ao desmontar - apenas pausar se estiver tocando
        if (youtubePlayerRef.current) {
          try {
            // Apenas pausar se estiver tocando, mas não destruir o player
            if (typeof youtubePlayerRef.current.getPlayerState === 'function') {
              const state = youtubePlayerRef.current.getPlayerState();
              if (state === window.YT.PlayerState.PLAYING) {
                if (typeof youtubePlayerRef.current.pauseVideo === 'function') {
                  youtubePlayerRef.current.pauseVideo();
                }
              }
            }
            // NÃO chamar stopVideo ou destroy - manter o player vivo
          } catch (e) {
            // Ignorar erros
          }
        }
      };
    }
  }, [show.id, onPlay, onStop, isYouTube, volume]);

  // Sincronizar volume
  useEffect(() => {
    if (isYouTube && isYouTubePlayerReady()) {
      try {
        // Verificar se o player existe e tem o método
        if (!youtubePlayerRef.current) {
          return;
        }
        
        if (typeof youtubePlayerRef.current.setVolume !== 'function') {
          return;
        }
        
        youtubePlayerRef.current.setVolume(volume * 100);
      } catch (e) {
        // Ignorar erros
      }
    } else if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, isYouTube]);

  // Simulação de visualizador de áudio para YouTube
  useEffect(() => {
    if (!isPlaying || !isYouTube) {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      setSimulatedAudioData(new Array(32).fill(0));
      return;
    }

    // Simular dados de áudio para YouTube
    const simulateAudio = () => {
      const newData = new Array(32).fill(0).map((_, i) => {
        // Criar padrão que simula frequências musicais
        const time = Date.now() / 1000;
        const baseValue = Math.sin(time * 2 + i * 0.3) * 0.5 + 0.5;
        const variation = Math.sin(time * 5 + i * 0.5) * 0.3;
        const random = Math.random() * 0.2;
        
        // Frequências mais baixas (índices menores) tendem a ser mais altas
        const frequencyBias = i < 8 ? 1.2 : i < 16 ? 1.0 : 0.7;
        
        // Combinar todos os fatores
        let value = (baseValue + variation + random) * frequencyBias;
        
        // Garantir que o valor está entre 0 e 1
        value = Math.max(0, Math.min(1, value));
        
        // Adicionar alguns picos aleatórios ocasionais para simular batidas
        if (Math.random() < 0.1) {
          value = Math.min(1, value * 1.5);
        }
        
        return value;
      });
      
      setSimulatedAudioData(newData);
    };

    // Atualizar a cada ~60ms (aproximadamente 60fps)
    simulationIntervalRef.current = setInterval(simulateAudio, 60);
    simulateAudio(); // Primeira atualização imediata

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      setSimulatedAudioData(new Array(32).fill(0));
    };
  }, [isPlaying, isYouTube]);

  // Audio Visualizer - Inicializar Web Audio API
  useEffect(() => {
    if (!isPlaying || isYouTube) {
      // Para YouTube, não podemos acessar o áudio diretamente
      // Limpar visualizador se parar ou for YouTube
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setAudioData(new Array(32).fill(0));
      return;
    }

    // Apenas para áudio HTML5 (não YouTube)
    const audio = audioRef.current;
    if (!audio) return;

    try {
      // Criar AudioContext
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audio);

      analyser.fftSize = 64; // 32 barras
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Função para atualizar as barras
      const updateBars = () => {
        if (!analyserRef.current || !dataArrayRef.current || !isPlaying || isYouTube) {
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Normalizar os dados para valores entre 0 e 1
        const normalizedData = Array.from(dataArrayRef.current).map(value => value / 255);
        setAudioData(normalizedData);

        if (isPlaying && !isYouTube) {
          animationFrameRef.current = requestAnimationFrame(updateBars);
        }
      };

      updateBars();
    } catch (error) {
      console.warn('Erro ao inicializar visualizador de áudio:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setAudioData(new Array(32).fill(0));
    };
  }, [isPlaying, isYouTube]);

  // Sincronizar com o estado global (currentPlayingId)
  useEffect(() => {
    const shouldBePlaying = currentPlayingId === show.id;
    
    if (shouldBePlaying) {
      // Este show deve estar tocando
      // Para YouTube, não forçar o estado - deixar o onStateChange gerenciar
      if (!isYouTube) {
        if (!isPlaying) {
          setIsPlaying(true);
          startProgressUpdate();
        }
      } else {
        // Para YouTube, apenas iniciar o progress update se já estiver tocando
        // O estado será gerenciado pelo onStateChange
        if (isPlaying) {
          startProgressUpdate();
        }
      }
    } else {
      // Este show não deve estar tocando - parar se estiver
      if (isPlaying) {
        setIsPlaying(false);
        stopProgressUpdate();
        
        if (isYouTube && isYouTubePlayerReady()) {
          try {
            // Verificar se o player existe e tem os métodos
            if (!youtubePlayerRef.current) {
              return;
            }
            
            if (typeof youtubePlayerRef.current.getPlayerState !== 'function') {
              return;
            }
            
            const state = youtubePlayerRef.current.getPlayerState();
            console.log(`[YouTube Debug] Show ${show.id}: Parando vídeo (currentPlayingId mudou)`, {
              currentState: state,
              shouldBePlaying
            });
            
            if (state === window.YT.PlayerState.PLAYING) {
              if (typeof youtubePlayerRef.current.pauseVideo === 'function') {
                youtubePlayerRef.current.pauseVideo();
              }
            }
            
            // Apenas fazer seek para 0, mas NÃO destruir o player
            // O player permanece carregado e pronto para tocar novamente
            if (typeof youtubePlayerRef.current.seekTo === 'function') {
              youtubePlayerRef.current.seekTo(0, true);
            }
          } catch (e) {
            console.error(`[YouTube Debug] Show ${show.id}: Erro ao parar vídeo:`, e);
          }
        } else if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }
    }
  }, [currentPlayingId, show.id, isYouTube, isPlaying]);

  const isEven = index % 2 === 0;

  return (
    <div 
      ref={nodeRef}
      className={`timeline-node ${isEven ? 'left' : 'right'} ${isVisible ? 'visible' : ''}`}
    >
      <div className={`timeline-content ${isPlaying ? 'playing' : ''}`}>
        {isPlaying && (
          <div className="audio-visualizer">
            {(isYouTube ? simulatedAudioData : audioData).map((value, i) => {
              const height = Math.max(2, value * 100); // Altura da barra baseada no áudio (2px mínimo, até 100%)
              return (
                <div
                  key={i}
                  className="audio-bar"
                  style={{
                    height: `${height}%`,
                    animationDelay: `${i * 0.05}s`
                  }}
                />
              );
            })}
          </div>
        )}
        <div className="timeline-image-container">
          <img 
            src={`${import.meta.env.BASE_URL}${show.imagem.replace(/^\//, '')}`} 
            alt={`${show.banda} - ${show.turnê}`}
            className="timeline-image"
            loading="lazy"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="timeline-info">
          <div className="timeline-info-content">
            <h3 className="timeline-banda">{show.banda}</h3>
            <p className="timeline-turne">{show.turnê}</p>
            <p className="timeline-data">{formatarData(show.data)}</p>
          </div>
          <div className="timeline-player-controls">
            <div className="timeline-progress-container">
              <div 
                className="timeline-progress-bar"
                onClick={handleProgressClick}
              >
                <div 
                  className="timeline-progress-fill"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="timeline-time-display">
                <span>{formatarTempo(currentTime)}</span>
                <span>{formatarTempo(duration)}</span>
              </div>
            </div>
            <div className="timeline-controls-row">
              <button 
                className={`timeline-play-button ${isLoading ? 'loading' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePlayPause(e);
                }}
                type="button"
                aria-label={isLoading ? 'Carregando...' : (isPlaying ? 'Pausar' : 'Tocar')}
                disabled={(isYouTube && !isPlayerReady) || isLoading}
              >
                {isLoading ? (
                  <svg className="loading-spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="23.562" fill="none" opacity="0.3"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="15.708" fill="none">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 12 12"
                        to="360 12 12"
                        dur="0.8s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </svg>
                ) : isPlaying ? (
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
        </div>
      </div>
      {isYouTube ? (
        <div 
          id={`youtube-player-${show.id}`}
          style={{ 
            position: 'absolute',
            width: '320px',
            height: '240px',
            opacity: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            left: '-9999px',
            top: '-9999px',
            zIndex: -1
          }}
        />
      ) : (
        <audio ref={audioRef} src={show.audio} preload="metadata" />
      )}
      <div className="timeline-marker"></div>
    </div>
  );
}

export default TimelineNode;

