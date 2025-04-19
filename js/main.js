document.addEventListener('DOMContentLoaded', () => {
    // Get reference to the iframe
    const playerFrame = document.getElementById('playerFrame');
    
    // Control buttons
    const playPauseButton = document.getElementById('playPauseButton');
    
    // Playback rate controls
    const tortoiseButton = document.getElementById('tortoiseButton');
    const hareButton = document.getElementById('hareButton');
    const rateDisplay = document.getElementById('rateDisplay');
    
    // Seek slider and time displays
    const seekSlider = document.getElementById('seekSlider');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationDisplay = document.getElementById('duration');
    
    // Variables to track media state
    let mediaDuration = 0;
    let isUserSeeking = false;
    let currentPlaybackRate = 1.0;
    let isPlaying = false;
    
    // Variables to track current media
    let currentMediaType = null; // 'media' or 'youtube'
    let currentMediaSource = null;
    let currentYoutubeId = null;
    
    // Flag to track if the iframe is ready to receive messages
    let isIframeReady = false;
    
    // Get the current query parameters from the main page URL
    const urlParams = new URLSearchParams(window.location.search);
    const mediaSource = urlParams.get('mediasrc');
    const youtubeId = urlParams.get('ytid');
    
    // Set initial media state based on query parameters
    if (youtubeId) {
        currentMediaType = 'youtube';
        currentYoutubeId = youtubeId;
        console.log('URL parameter found: YouTube ID =', youtubeId);
    } else if (mediaSource) {
        currentMediaType = 'media';
        currentMediaSource = mediaSource;
        console.log('URL parameter found: Media source =', mediaSource);
    } else {
        // Default to the sample song
        currentMediaType = 'media';
        currentMediaSource = 'high street tarantella.mp3';
        console.log('No URL parameters found, using default song');
    }
    
    // Set the iframe source to just the base player page
    const baseUrl = "player/index.html";
    playerFrame.src = baseUrl;
    
    // Function to attempt sending media information to the iframe
    function attemptLoadMedia() {
        if (isIframeReady && playerFrame.contentWindow) {
            console.log('Attempting to load media based on URL parameters');
            if (currentMediaType === 'youtube') {
                sendMessage('loadYouTube', { videoId: currentYoutubeId });
            } else if (currentMediaType === 'media') {
                sendMessage('loadMedia', { src: currentMediaSource });
            }
            return true;
        }
        return false;
    }
    
    // Wait for iframe to load
    playerFrame.addEventListener('load', () => {
        console.log('Player iframe loaded');
        isIframeReady = true;
        
        // Try to load media, but don't force it here as we'll wait for iframeReady message
        attemptLoadMedia();
    });
    
    // Send message to iframe
    function sendMessage(action, data = {}) {
        // Make sure iframe has loaded before sending messages
        if (isIframeReady && playerFrame.contentWindow) {
            console.log('Sending message to iframe:', action, data);
            playerFrame.contentWindow.postMessage({
                action,
                ...data
            }, '*');
        } else {
            console.error("Cannot send message: iframe not ready");
        }
    }
    
    // Format time in seconds to MM:SS format
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) {
            return '0:00';
        }
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Update play/pause button based on playback state
    function updatePlayPauseButton() {
        if (isPlaying) {
            playPauseButton.textContent = 'Pause';
        } else {
            playPauseButton.textContent = 'Play';
        }
    }
    
    // Update seek slider and time displays
    function updateSeekBar(currentTime, duration) {
        // Don't update the slider position while the user is dragging it
        if (!isUserSeeking && duration > 0) {
            const percent = (currentTime / duration) * 100;
            seekSlider.value = percent;
        }
        
        // Always update the time displays
        currentTimeDisplay.textContent = formatTime(currentTime);
        
        // Only update duration display if we have a valid duration
        if (duration > 0 && !isNaN(duration)) {
            mediaDuration = duration;
            durationDisplay.textContent = formatTime(duration);
        }
    }
    
    // Update playback rate and display
    function updatePlaybackRate(newRate) {
        // Round to 1 decimal place (increments of 0.1)
        newRate = Math.round(newRate * 10) / 10;
        
        // Clamp rate between 0.25 and 3.0
        currentPlaybackRate = Math.max(0.25, Math.min(3.0, newRate));
        
        // Update display with one decimal place
        rateDisplay.textContent = currentPlaybackRate.toFixed(1) + 'x';
        
        // Send message to iframe
        sendMessage('setPlaybackRate', { rate: currentPlaybackRate });
    }
    
    // Event listener for play/pause button
    playPauseButton.addEventListener('click', () => {
        if (isPlaying) {
            sendMessage('pause');
        } else {
            sendMessage('play');
        }
    });
    
    // Event listeners for playback rate buttons
    tortoiseButton.addEventListener('click', () => {
        // Decrease playback rate by 0.1
        updatePlaybackRate(currentPlaybackRate - 0.1);
    });
    
    hareButton.addEventListener('click', () => {
        // Increase playback rate by 0.1
        updatePlaybackRate(currentPlaybackRate + 0.1);
    });
    
    // Event listeners for seek slider
    seekSlider.addEventListener('mousedown', () => {
        isUserSeeking = true;
    });
    
    seekSlider.addEventListener('mouseup', () => {
        isUserSeeking = false;
        
        // Calculate the time based on slider position and send seek message
        const seekTime = (seekSlider.value / 100) * mediaDuration;
        sendMessage('seek', { time: seekTime });
    });
    
    seekSlider.addEventListener('input', () => {
        // Update the current time display while dragging
        const seekTime = (seekSlider.value / 100) * mediaDuration;
        currentTimeDisplay.textContent = formatTime(seekTime);
    });
    
    // Function to update the URL query parameters without reloading the page
    function updateUrlQueryParams() {
        const url = new URL(window.location);
        
        // Clear existing parameters
        url.searchParams.delete('mediasrc');
        url.searchParams.delete('ytid');
        
        // Set the appropriate parameter based on current media
        if (currentMediaType === 'youtube' && currentYoutubeId) {
            url.searchParams.set('ytid', currentYoutubeId);
        } else if (currentMediaType === 'media' && currentMediaSource) {
            url.searchParams.set('mediasrc', currentMediaSource);
        }
        
        // Update the URL without reloading the page
        window.history.replaceState({}, '', url);
    }
    
    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
        console.log("Message received from iframe:", event.data);
        const data = event.data;
        
        switch (data.status) {
            case 'iframeReady':
                // Iframe is ready to receive messages
                console.log('Received iframeReady signal');
                isIframeReady = true;
                
                // This is the critical moment - now we can be confident the iframe is ready
                attemptLoadMedia();
                break;
                
            case 'playing':
                console.log('Now playing:', data.media || 'Unknown media');
                isPlaying = true;
                updatePlayPauseButton();
                break;
                
            case 'paused':
                console.log('Playback paused');
                isPlaying = false;
                updatePlayPauseButton();
                break;
            
            case 'ended':
                console.log('Playback ended');
                isPlaying = false;
                updatePlayPauseButton();
                break;
                
            case 'loaded':
                console.log('Media loaded:', data.media || 'Unknown media');
                isPlaying = false;
                updatePlayPauseButton();
                break;
                
            case 'progress':
                // Update seek slider and time displays with current playback position
                updateSeekBar(data.currentTime, data.duration);
                break;
                
            case 'duration':
                // Update with initial duration when media is loaded
                updateSeekBar(0, data.duration);
                
                // Initialize slider max value
                seekSlider.min = 0;
                seekSlider.max = 100;
                seekSlider.value = 0;
                break;
                
            case 'seeked':
                // Update the seek bar after a seek operation
                updateSeekBar(data.currentTime, data.duration);
                break;
                
            case 'rateChanged':
                // Update the rate display when changed from the player
                if (data.rate) {
                    currentPlaybackRate = data.rate;
                    rateDisplay.textContent = currentPlaybackRate.toFixed(1) + 'x';
                }
                break;
        }
    });

    // For direct access - to be used in debugging or from console
    window.playerController = {
        loadMedia: function(src) {
            currentMediaType = 'media';
            currentMediaSource = src;
            sendMessage('loadMedia', { src: src });
            updateUrlQueryParams();
        },
        loadYouTube: function(videoId) {
            currentMediaType = 'youtube';
            currentYoutubeId = videoId;
            sendMessage('loadYouTube', { videoId: videoId });
            updateUrlQueryParams();
        }
    };
    
    // Update URL parameters to reflect the current media
    updateUrlQueryParams();
});