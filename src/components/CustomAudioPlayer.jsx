import { useState, useRef, useEffect } from 'react';

function CustomAudioPlayer({ src, duration }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setTotalDuration(audio.duration);
      setIsLoading(false);
      console.log('🎵 Áudio carregado - Duração:', audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = (e) => {
      console.error('❌ Erro ao carregar áudio:', e);
      console.error('Src:', audio.src?.substring(0, 100) + '...');
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        console.log('▶️ Tentando reproduzir áudio...');
        await audio.play();
        setIsPlaying(true);
        console.log('✅ Áudio reproduzindo');
      }
    } catch (error) {
      console.error('❌ Erro ao reproduzir áudio:', error);
      console.error('Tipo de erro:', error.name);
      console.error('Mensagem:', error.message);
      setIsPlaying(false);

      // Mostra alerta para o usuário
      alert('Não foi possível reproduzir o áudio. Verifique o formato ou o console para mais detalhes.');
    }
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const width = bounds.width;
    const percentage = x / width;
    const newTime = percentage * totalDuration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = totalDuration ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={`message-audio ${isLoading ? 'audio-loading' : ''} ${isPlaying ? 'audio-playing' : ''}`}>
      <audio ref={audioRef} src={src} className="audio-message-player" preload="metadata" />

      <div className="custom-audio-player">
        {/* Botão Play/Pause */}
        <button
          className="audio-play-btn"
          onClick={togglePlayPause}
          disabled={isLoading}
        >
          {isPlaying ? (
            // Ícone de Pause
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            // Ícone de Play
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Informações do áudio */}
        <div className="audio-info">
          {/* Barra de progresso */}
          <div
            className="audio-progress-container"
            onClick={handleProgressClick}
          >
            <div
              className="audio-progress-bar"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Tempo */}
          <div className="audio-time-info">
            <span className="audio-current-time">{formatTime(currentTime)}</span>
            <span className="audio-total-duration">{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Ícone de microfone */}
        <svg className="audio-mic-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.05 7.44-7 7.93V19h4v2H8v-2h4v-3.07z"/>
        </svg>
      </div>
    </div>
  );
}

export default CustomAudioPlayer;
