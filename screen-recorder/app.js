// UI Elements
const btnShare = document.getElementById('btn-share');
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const btnDownload = document.getElementById('btn-download');

const previewVideo = document.getElementById('preview');
const recordedPlayer = document.getElementById('recorded-player');

const micToggle = document.getElementById('mic-toggle');
const statusText = document.getElementById('status-text');
const statusIndicator = document.querySelector('.status-indicator');
const placeholderText = document.getElementById('placeholder-text');
const timerBadge = document.getElementById('timer-badge');
const timerText = document.getElementById('timer-text');
const playbackCard = document.getElementById('playback-card');

// Media Streams and Recorder State
let screenStream = null;
let micStream = null;
let mixedStream = null;
let mediaRecorder = null;
let recordedChunks = [];

// Timer state
let timerInterval = null;
let secondsRecorded = 0;

// Web Audio API context for mixing
let audioCtx = null;
let audioDest = null;

// 1. Start Screen Capture Stream
async function startCapture() {
  try {
    resetState();
    
    // Request screen share stream (video + system audio if selected by user)
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: true // Request system audio
    });

    // Attach to preview video element
    previewVideo.srcObject = screenStream;
    previewVideo.style.display = 'block';
    placeholderText.style.display = 'none';

    // Update buttons state
    btnRecord.disabled = false;
    btnShare.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
      Tela Capturada!
    `;
    btnShare.style.borderColor = 'var(--accent-secondary)';

    // Update Status
    statusText.innerText = 'Pronto para Gravar';
    statusIndicator.className = 'status-indicator ready';

    // Handle user stopping stream from native browser bar ("Parar Compartilhamento")
    screenStream.getVideoTracks()[0].onended = () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        stopRecording();
      } else {
        stopCapture();
      }
    };

  } catch (err) {
    console.error('Error starting capture:', err);
    alert('Não foi possível iniciar a captura. Certifique-se de conceder a permissão de tela.');
    resetState();
  }
}

// 2. Stop Screen Capture
function stopCapture() {
  if (screenStream) {
    const videoTrack = screenStream.getVideoTracks()[0];
    if (videoTrack) videoTrack.onended = null;
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }
  
  previewVideo.srcObject = null;
  previewVideo.style.display = 'none';
  placeholderText.style.display = 'flex';
  
  btnRecord.disabled = true;
  btnShare.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
    1. Iniciar Captura
  `;
  btnShare.style.borderColor = 'var(--accent-primary)';
  
  statusText.innerText = 'Standby';
  statusIndicator.className = 'status-indicator';
}

// 3. Start Recording process
async function startRecording() {
  if (!screenStream) return;
  
  recordedChunks = [];
  
  try {
    const audioTracks = [];
    const videoTracks = screenStream.getVideoTracks();
    const systemAudioTracks = screenStream.getAudioTracks();

    // Request microphone stream if enabled
    if (micToggle.checked) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micAudioTracks = micStream.getAudioTracks();
        if (micAudioTracks.length > 0) {
          audioTracks.push(...micAudioTracks);
        }
      } catch (micErr) {
        console.warn('Microphone permission denied or not found:', micErr);
        alert('Microfone não encontrado ou permissão negada. Gravando apenas áudio da tela.');
        micToggle.checked = false;
      }
    }

    // Combine/mix audio tracks if we have both system audio and microphone
    if (systemAudioTracks.length > 0 && audioTracks.length > 0) {
      // Audio mix via Web Audio API
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioDest = audioCtx.createMediaStreamDestination();

      // System audio node
      const systemSource = audioCtx.createMediaStreamSource(new MediaStream([systemAudioTracks[0]]));
      systemSource.connect(audioDest);

      // Microphone audio node
      const micSource = audioCtx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
      micSource.connect(audioDest);

      // Mix video and combined audio
      mixedStream = new MediaStream([
        videoTracks[0],
        audioDest.stream.getAudioTracks()[0]
      ]);
    } else if (systemAudioTracks.length > 0) {
      // Just system audio
      mixedStream = new MediaStream([videoTracks[0], systemAudioTracks[0]]);
    } else if (audioTracks.length > 0) {
      // Just microphone audio
      mixedStream = new MediaStream([videoTracks[0], audioTracks[0]]);
    } else {
      // No audio, video only
      mixedStream = new MediaStream([videoTracks[0]]);
    }

    // MediaRecorder options (try best supported format)
    let options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }
    }

    mediaRecorder = new MediaRecorder(mixedStream, options);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = handleStop;

    // Start recorder & UI state changes
    mediaRecorder.start(1000); // chunk every 1 sec
    
    // UI state
    btnShare.style.display = 'none';
    btnRecord.style.display = 'none';
    btnStop.style.display = 'flex';
    timerBadge.style.display = 'flex';
    
    statusText.innerText = 'GRAVANDO TELA';
    statusIndicator.className = 'status-indicator recording';
    
    startTimer();

  } catch (err) {
    console.error('Error starting recording:', err);
    alert('Erro ao iniciar a gravação: ' + err.message);
  }
}

// 4. Stop Recording Process
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  
  stopTimer();
  
  // Stop mic stream tracks
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  
  // Stop screen stream tracks (completes screen share session)
  if (screenStream) {
    const videoTrack = screenStream.getVideoTracks()[0];
    if (videoTrack) videoTrack.onended = null;
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
  }

  // Close Audio Context
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }

  // UI state
  btnStop.style.display = 'none';
  btnShare.style.display = 'flex';
  btnRecord.style.display = 'flex';
  btnRecord.disabled = true;
  timerBadge.style.display = 'none';
  
  btnShare.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
    1. Iniciar Captura
  `;
  btnShare.style.borderColor = 'var(--accent-primary)';
  
  previewVideo.srcObject = null;
  previewVideo.style.display = 'none';
  placeholderText.style.display = 'flex';
  
  statusText.innerText = 'Standby';
  statusIndicator.className = 'status-indicator';
}

// 5. Handle Stopped MediaRecorder
function handleStop() {
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  
  recordedPlayer.src = url;
  playbackCard.style.display = 'flex';
  
  // Set up download button
  btnDownload.onclick = () => {
    const a = document.createElement('a');
    a.href = url;
    // Standard timestamp name
    const date = new Date().toISOString().slice(0,10);
    a.download = `gravacao-tela-${date}.webm`;
    a.click();
  };

  // Scroll down to playback card
  playbackCard.scrollIntoView({ behavior: 'smooth' });
}

// Timer helpers
function startTimer() {
  secondsRecorded = 0;
  timerText.innerText = '00:00';
  timerInterval = setInterval(() => {
    secondsRecorded++;
    const mins = Math.floor(secondsRecorded / 60).toString().padStart(2, '0');
    const secs = (secondsRecorded % 60).toString().padStart(2, '0');
    timerText.innerText = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  secondsRecorded = 0;
  timerText.innerText = '00:00';
}

// General resets
function resetState() {
  stopTimer();
  recordedChunks = [];
  playbackCard.style.display = 'none';
}

// Event Listeners
btnShare.addEventListener('click', startCapture);
btnRecord.addEventListener('click', startRecording);
btnStop.addEventListener('click', stopRecording);
micToggle.addEventListener('change', () => {
  if (screenStream && !mediaRecorder) {
    // If capture is running, warn user they will need to record for this to apply
    console.log('Mic toggled while capture is active');
  }
});
