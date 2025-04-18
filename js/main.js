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
    
    // Wait for iframe to load
    playerFrame.addEventListener('load', () => {
        console.log('Player iframe loaded');
    });
    
    // Send message to iframe
    function sendMessage(action, data = {}) {
        playerFrame.contentWindow.postMessage({
            action,
            ...data
        }, '*');
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
    
    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
        const data = event.data;
        
        switch (data.status) {
            case 'playing':
                console.log('Now playing:', data.song);
                isPlaying = true;
                updatePlayPauseButton();
                break;
                
            case 'paused':
                console.log('Playback paused');
                isPlaying = false;
                updatePlayPauseButton();
                break;
                
            case 'stopped':
                console.log('Playback stopped');
                isPlaying = false;
                updatePlayPauseButton();
                updateSeekBar(0, mediaDuration);
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
});