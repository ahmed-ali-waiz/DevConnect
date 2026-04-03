Add fully functional voice note recording to my ChatPage.jsx. 
The Mic button already exists in the input bar. Make it work end-to-end.

=== DESIRED BEHAVIOR ===

1. PRESS & HOLD the Mic button → starts recording
2. While recording:
   - Show a red pulsing recording indicator with a live timer (00:01, 00:02...)
   - Show a "slide to cancel" hint text sliding left
   - The message input bar should be replaced by the recording UI
3. RELEASE the Mic button → stops recording and sends the voice note automatically
4. SWIPE LEFT while holding → cancels the recording (no send)
5. The sent voice note appears as a message bubble with:
   - A play/pause button
   - A waveform or progress bar
   - Duration label (e.g. 0:08)
   - Styled like other messages (blue gradient for sent, dark for received)

=== TECHNICAL IMPLEMENTATION ===

Recording:
- Use the MediaRecorder API with getUserMedia({ audio: true })
- Format: audio/webm or audio/ogg (whatever browser supports)
- On stop: collect Blob chunks → create a Blob → convert to base64 or FormData
- Send via your existing sendMessage service (add an audioFile param like imageFile)
- Handle microphone permission denial gracefully with a toast error

State to add:
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

Mic button behavior:
  - onPointerDown → startRecording()
  - onPointerUp → stopAndSend()
  - onPointerLeave → cancelRecording()

startRecording():
  - navigator.mediaDevices.getUserMedia({ audio: true })
  - new MediaRecorder(stream)
  - mediaRecorder.start()
  - Start a setInterval timer incrementing recordingTime every second
  - Set isRecording = true

stopAndSend():
  - mediaRecorder.stop()
  - On mediaRecorder.onstop: collect chunks into Blob
  - Call sendMessage with the audio Blob
  - Reset all recording state

cancelRecording():
  - mediaRecorder.stop() without sending
  - Clear chunks, reset state
  - Show toast: 'Recording cancelled'

=== VOICE NOTE MESSAGE BUBBLE ===

When a message has an audio field (not image or text):
  <div className="flex items-center gap-3 px-4 py-3 rounded-[22px] min-w-[200px] 
    bg-gradient-to-tr from-[#3797f0] to-[#6a35ff] (if sent) 
    or bg-[#262626] (if received)">
    
    <button onClick={togglePlay}>
      {isPlaying ? <Pause /> : <Play />}
    </button>
    
    {/* Progress bar */}
    <div className="flex-1 h-1 bg-white/30 rounded-full relative">
      <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
    </div>
    
    {/* Duration */}
    <span className="text-xs text-white/80">{formatDuration(duration)}</span>
  </div>

Use the HTML5 Audio API to play: new Audio(src) with onended, ontimeupdate handlers.
Each bubble manages its own play state independently.

=== RECORDING UI (replaces input bar while recording) ===

<div className="flex items-center gap-3 px-4 py-3">
  {/* Red pulsing dot */}
  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
  
  {/* Timer */}
  <span className="text-white font-mono text-sm">
    {String(Math.floor(recordingTime/60)).padStart(2,'0')}:
    {String(recordingTime%60).padStart(2,'0')}
  </span>
  
  {/* Slide to cancel */}
  <span className="flex-1 text-center text-[#8e8e8e] text-sm animate-pulse">
    ← Slide to cancel
  </span>
  
  {/* Mic icon glowing red */}
  <Mic className="w-6 h-6 text-red-500" />
</div>

=== CONSTRAINTS ===
- Do NOT change any other UI, colors, layout, redux logic, or socket code
- Do NOT break existing text or image sending
- Do NOT change the left panel (conversation list)
- Only modify: the Mic button behavior, the input bar area, 
  and the message bubble renderer to support audio messages
- Handle cleanup: stop MediaRecorder and clear timers on component unmount
- Add permission error handling with toast.error('Microphone access denied')