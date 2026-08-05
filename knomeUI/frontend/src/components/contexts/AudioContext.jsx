import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { resolveMediaUrl } from '../../utils/apiService';

const defaultAudioContext = {
    currentPodcast: null,
    isPlaying: false,
    volume: 1,
    speed: 1,
    progress: 0,
    currentTime: 0,
    duration: 0,
    playPodcast: () => {},
    togglePlay: () => {},
    closePlayer: () => {},
    setVolume: () => {},
    setSpeed: () => {},
    handleSeek: () => {}
};

const AudioContext = createContext(defaultAudioContext);

export const useAudio = () => useContext(AudioContext) || defaultAudioContext;

export function AudioProvider({ children }) {
    const [currentPodcast, setCurrentPodcast] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [speed, setSpeed] = useState(1);
    const [progress, setProgress] = useState(0); // 0 to 100
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const audioRef = useRef(null);

    // Default sample fallback if no audio uploaded
    const sampleAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
        
        const audio = audioRef.current;
        
        const updateTime = () => {
            setCurrentTime(audio.currentTime);
            setDuration(audio.duration || 0);
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', updateTime);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadedmetadata', updateTime);
        };
    }, []);

    useEffect(() => {
        if (currentPodcast) {
            const mediaUrl = currentPodcast.audioUrl ? resolveMediaUrl(currentPodcast.audioUrl) : sampleAudioUrl;
            audioRef.current.src = mediaUrl;
            audioRef.current.play().catch(e => console.error("Playback error:", e));
            setIsPlaying(true);
        }
    }, [currentPodcast]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("Playback error:", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    }, [speed]);

    const playPodcast = (podcast) => {
        if (currentPodcast?.id === podcast.id) {
            setIsPlaying(!isPlaying); // toggle if same
        } else {
            setCurrentPodcast(podcast);
        }
    };

    const togglePlay = () => setIsPlaying(!isPlaying);
    
    const closePlayer = () => {
        setCurrentPodcast(null);
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    const handleSeek = (percentage) => {
        if (audioRef.current && audioRef.current.duration) {
            const time = (percentage / 100) * audioRef.current.duration;
            audioRef.current.currentTime = time;
            setProgress(percentage);
        }
    };

    return (
        <AudioContext.Provider value={{
            currentPodcast,
            isPlaying,
            volume,
            speed,
            progress,
            duration,
            currentTime,
            playPodcast,
            togglePlay,
            closePlayer,
            setVolume,
            setSpeed,
            handleSeek
        }}>
            {children}
        </AudioContext.Provider>
    );
}
