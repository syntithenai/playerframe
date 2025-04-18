document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const audioPlayer = document.getElementById('audioPlayer');
    const currentSongDisplay = document.getElementById('currentSong');
    const playlistContainer = document.getElementById('playlist');
    
    // Variable to track progress updates interval
    let progressInterval = null;
    
    // Songs list - will dynamically scan the music directory
    const songs = [
        { title: "High Street Tarantella", file: "../music/high street tarantella.mp3" }
    ];
    
    // Initialize the player
    function initPlayer() {
        // Create playlist items
        songs.forEach((song, index) => {
            const playlistItem = document.createElement('div');
            playlistItem.classList.add('playlist-item');
            playlistItem.textContent = song.title;
            playlistItem.dataset.index = index;
            
            playlistItem.addEventListener('click', () => {
                loadSong(index);
                playSong();
            });
            
            playlistContainer.appendChild(playlistItem);
        });
        
        // Load the first song by default
        if (songs.length > 0) {
            loadSong(0);
        }
        
        // Add event listener for play state changes
        audioPlayer.addEventListener('play', () => {
            sendMessageToParent('playing', { song: currentSongDisplay.textContent });
        });
        
        audioPlayer.addEventListener('pause', () => {
            // Only send paused message if not at the end of the track
            if (audioPlayer.currentTime < audioPlayer.duration) {
                sendMessageToParent('paused');
            }
        });
    }
    
    // Load song
    function loadSong(index) {
        if (index >= 0 && index < songs.length) {
            // Update active song in playlist
            const playlistItems = document.querySelectorAll('.playlist-item');
            playlistItems.forEach(item => item.classList.remove('active'));
            playlistItems[index].classList.add('active');
            
            // Set the audio source
            audioPlayer.src = songs[index].file;
            currentSongDisplay.textContent = songs[index].title;
            
            // Notify the parent window
            sendMessageToParent('loaded', { song: songs[index].title });
        }
    }
    
    // Play the current song
    function playSong() {
        audioPlayer.play()
            .then(() => {
                // Start sending progress updates
                startProgressUpdates();
            })
            .catch(error => {
                console.error("Error playing audio:", error);
            });
    }
    
    // Pause the current song
    function pauseSong() {
        audioPlayer.pause();
        
        // Stop progress updates when paused
        stopProgressUpdates();
    }
    
    // Seek to a specific position
    function seekTo(time) {
        if (time >= 0 && time <= audioPlayer.duration) {
            audioPlayer.currentTime = time;
            sendMessageToParent('seeked', { 
                currentTime: audioPlayer.currentTime,
                duration: audioPlayer.duration 
            });
        }
    }
    
    // Set playback rate
    function setPlaybackRate(rate) {
        // Ensure rate is rounded to 1 decimal place (increments of 0.1)
        rate = Math.round(rate * 10) / 10;
        
        if (rate >= 0.25 && rate <= 3.0) {
            audioPlayer.playbackRate = rate;
            sendMessageToParent('rateChanged', { 
                rate: audioPlayer.playbackRate 
            });
        }
    }
    
    // Start sending progress updates
    function startProgressUpdates() {
        // Clear any existing interval
        stopProgressUpdates();
        
        // Set up a new interval to send progress updates every second
        progressInterval = setInterval(() => {
            sendMessageToParent('progress', { 
                currentTime: audioPlayer.currentTime,
                duration: audioPlayer.duration 
            });
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
        window.parent.postMessage({
            status,
            ...data
        }, '*');
    }
    
    // Listen for messages from parent window
    window.addEventListener('message', (event) => {
        const data = event.data;
        
        switch (data.action) {
            case 'play':
                playSong();
                break;
                
            case 'pause':
                pauseSong();
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
    
    // Audio player events
    audioPlayer.addEventListener('loadedmetadata', () => {
        // Send duration information when the audio metadata is loaded
        sendMessageToParent('duration', { 
            duration: audioPlayer.duration 
        });
    });
    
    audioPlayer.addEventListener('ended', () => {
        // Find the index of the current song
        const currentIndex = songs.findIndex(song => 
            song.title === currentSongDisplay.textContent
        );
        
        // Stop progress updates
        stopProgressUpdates();
        
        // Notify parent that playback has ended
        sendMessageToParent('ended');
        
        // Load and play the next song if available
        if (currentIndex < songs.length - 1) {
            loadSong(currentIndex + 1);
            playSong();
        }
    });
    
    // Initialize the player
    initPlayer();
});