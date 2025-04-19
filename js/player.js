document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const mediaPlayer = document.getElementById('mediaPlayer');
    const youtubePlayerDiv = document.getElementById('youtubePlayer');
    
    // Add console logs for debugging
    console.log("Player.js loaded");
    console.log("Media player element found:", mediaPlayer ? "yes" : "no");
    console.log("YouTube player div found:", youtubePlayerDiv ? "yes" : "no");
    
    // Variables
    let progressInterval = null;
    let ytPlayer = null;
    let currentMediaType = null; // 'media' for audio/video, 'youtube' for YT
    let mediaTitle = "Media";
    
    // Send a ready message to the parent window as soon as the iframe is loaded
    sendMessageToParent('iframeReady');
    
    // Initialize regular media player
    function initMediaPlayer(src) {
        // Show media player, hide YouTube player
        mediaPlayer.classList.remove('hidden');
        youtubePlayerDiv.classList.add('hidden');
        
        // Process the source URL
        let mediaSource;
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('../') || src.startsWith('./')) {
            // Full URL or relative path
            mediaSource = src;
        } else {
            // Local file in music folder
            mediaSource = `../music/${src}`;
        }
        
        console.log("Setting media source:", mediaSource);
        mediaTitle = src.split('/').pop(); // Extract filename from path
        
        // Set media source
        mediaPlayer.src = mediaSource;
        
        // Set crossOrigin if it's a remote URL
        if (mediaSource.startsWith('http')) {
            mediaPlayer.crossOrigin = 'anonymous';
        }
        
        // Configure event handlers if not already configured
        if (!mediaPlayer.configured) {
            mediaPlayer.addEventListener('play', () => {
                console.log("Media play event fired");
                sendMessageToParent('playing', { media: mediaTitle });
                // Start sending progress updates
                startProgressUpdates();
            });
            
            mediaPlayer.addEventListener('pause', () => {
                console.log("Media pause event fired");
                // Only send paused message if not at the end of the track
                if (mediaPlayer.currentTime < mediaPlayer.duration) {
                    sendMessageToParent('paused');
                }
                // Stop progress updates when paused
                stopProgressUpdates();
            });
            
            mediaPlayer.addEventListener('ended', () => {
                console.log("Media ended event fired");
                sendMessageToParent('ended');
                stopProgressUpdates();
            });
            
            mediaPlayer.addEventListener('loadedmetadata', () => {
                console.log("Media loadedmetadata event fired, duration:", mediaPlayer.duration);
                // Send duration information when the media is loaded
                sendMessageToParent('duration', { duration: mediaPlayer.duration });
            });
            
            mediaPlayer.addEventListener('error', (e) => {
                console.error("Media error:", mediaPlayer.error, e);
            });
            
            mediaPlayer.configured = true;
        }
        
        // Notify parent that media is loaded
        currentMediaType = 'media';
        sendMessageToParent('loaded', { media: mediaTitle });
    }
    
    // Initialize YouTube player
    function initYouTubePlayer(videoId) {
        // Show YouTube player, hide media player
        youtubePlayerDiv.classList.remove('hidden');
        mediaPlayer.classList.add('hidden');
        
        mediaTitle = `YouTube: ${videoId}`;
        currentMediaType = 'youtube';
        
        // Create YouTube player when API is ready
        if (typeof YT !== 'undefined' && YT.Player) {
            createYouTubePlayer(videoId);
        } else {
            window.onYouTubeIframeAPIReady = () => {
                createYouTubePlayer(videoId);
            };
        }
    }
    
    // Create YouTube player instance
    function createYouTubePlayer(videoId) {
        // If player already exists, destroy it and create a new one
        if (ytPlayer) {
            try {
                ytPlayer.destroy();
            } catch (e) {
                console.error("Error destroying YouTube player:", e);
            }
        }
        
        ytPlayer = new YT.Player('youtubePlayer', {
            videoId: videoId,
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'disablekb': 1,
                'playsinline': 1,
                'rel': 0,
                'modestbranding': 1,
                'fs': 0
            },
            events: {
                'onReady': onYouTubePlayerReady,
                'onStateChange': onYouTubePlayerStateChange
            }
        });
    }
    
    // YouTube player ready callback
    function onYouTubePlayerReady(event) {
        // Send info that player is loaded
        sendMessageToParent('loaded', { media: mediaTitle });
        
        // Send duration when ready
        const duration = ytPlayer.getDuration();
        sendMessageToParent('duration', { duration: duration });
    }
    
    // YouTube player state change callback
    function onYouTubePlayerStateChange(event) {
        switch (event.data) {
            case YT.PlayerState.PLAYING:
                sendMessageToParent('playing', { media: mediaTitle });
                // Start sending progress updates
                startYouTubeProgressUpdates();
                break;
                
            case YT.PlayerState.PAUSED:
                sendMessageToParent('paused');
                // Stop progress updates when paused
                stopProgressUpdates();
                break;
                
            case YT.PlayerState.ENDED:
                sendMessageToParent('ended');
                stopProgressUpdates();
                break;
        }
    }
    
    // Play media
    function playMedia() {
        if (currentMediaType === 'youtube' && ytPlayer) {
            ytPlayer.playVideo();
        } else if (currentMediaType === 'media') {
            mediaPlayer.play().catch(error => {
                console.error("Error playing media:", error);
            });
        }
    }
    
    // Pause media
    function pauseMedia() {
        if (currentMediaType === 'youtube' && ytPlayer) {
            ytPlayer.pauseVideo();
        } else if (currentMediaType === 'media') {
            mediaPlayer.pause();
        }
    }
    
    // Seek to a specific position
    function seekTo(time) {
        if (currentMediaType === 'youtube' && ytPlayer) {
            ytPlayer.seekTo(time, true);
            sendMessageToParent('seeked', { 
                currentTime: ytPlayer.getCurrentTime(),
                duration: ytPlayer.getDuration() 
            });
        } else if (currentMediaType === 'media') {
            if (time >= 0 && time <= mediaPlayer.duration) {
                mediaPlayer.currentTime = time;
                sendMessageToParent('seeked', { 
                    currentTime: mediaPlayer.currentTime,
                    duration: mediaPlayer.duration 
                });
            }
        }
    }
    
    // Set playback rate
    function setPlaybackRate(rate) {
        // Ensure rate is rounded to 1 decimal place (increments of 0.1)
        rate = Math.round(rate * 10) / 10;
        
        // Clamp rate between 0.25 and 3.0
        rate = Math.max(0.25, Math.min(3.0, rate));
        
        if (currentMediaType === 'youtube' && ytPlayer) {
            // YouTube supports rates: 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2
            ytPlayer.setPlaybackRate(rate);
            sendMessageToParent('rateChanged', { rate: rate });
        } else if (currentMediaType === 'media') {
            mediaPlayer.playbackRate = rate;
            sendMessageToParent('rateChanged', { rate: mediaPlayer.playbackRate });
        }
    }
    
    // Start sending progress updates for media player
    function startProgressUpdates() {
        // Clear any existing interval
        stopProgressUpdates();
        
        // Set up a new interval to send progress updates every second
        progressInterval = setInterval(() => {
            if (currentMediaType === 'youtube' && ytPlayer) {
                sendMessageToParent('progress', { 
                    currentTime: ytPlayer.getCurrentTime(),
                    duration: ytPlayer.getDuration() 
                });
            } else if (currentMediaType === 'media') {
                sendMessageToParent('progress', { 
                    currentTime: mediaPlayer.currentTime,
                    duration: mediaPlayer.duration 
                });
            }
        }, 1000);
    }
    
    // Start YouTube specific progress updates
    function startYouTubeProgressUpdates() {
        // Same as startProgressUpdates, but calling it separately
        // to make sure it's called for YouTube
        stopProgressUpdates();
        
        progressInterval = setInterval(() => {
            if (ytPlayer && ytPlayer.getCurrentTime) {
                sendMessageToParent('progress', { 
                    currentTime: ytPlayer.getCurrentTime(),
                    duration: ytPlayer.getDuration() 
                });
            }
        }, 1000);
    }
    
    // Stop progress updates
    function stopProgressUpdates() {
        if (progressInterval !== null) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }
    
    // Send message to parent window
    function sendMessageToParent(status, data = {}) {
        console.log("Sending message to parent:", status, data);
        window.parent.postMessage({
            status,
            ...data
        }, '*');
    }
    
    // Listen for messages from parent window
    window.addEventListener('message', (event) => {
        console.log("Message received from parent:", event.data);
        const data = event.data;
        
        switch (data.action) {
            case 'loadMedia':
                initMediaPlayer(data.src);
                break;
                
            case 'loadYouTube':
                initYouTubePlayer(data.videoId);
                break;
                
            case 'play':
                playMedia();
                break;
                
            case 'pause':
                pauseMedia();
                break;
                
            case 'seek':
                seekTo(data.time);
                break;
                
            case 'setPlaybackRate':
                setPlaybackRate(data.rate);
                break;
                
            default:
                console.log('Unknown action:', data.action);
        }
    });
});