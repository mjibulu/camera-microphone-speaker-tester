import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Circle, Mic, MonitorSpeaker, Octagon, Play, ShieldCheck, Trash2 } from "lucide-react";
type SpeakerChannel = "left" | "right" | "stereo";
type SinkCapableAudio = HTMLAudioElement & {
    setSinkId?: (deviceId: string) => Promise<void>;
};
function createTestTone(channel: SpeakerChannel): Blob {
    const sampleRate = 44100;
    const duration = 0.75;
    const sampleCount = Math.floor(sampleRate * duration);
    const bytesPerSample = 2;
    const channelCount = 2;
    const buffer = new ArrayBuffer(44 + sampleCount * channelCount * bytesPerSample);
    const view = new DataView(buffer);
    const write = (offset: number, value: string) => {
        for (let index = 0; index < value.length; index += 1)
            view.setUint8(offset + index, value.charCodeAt(index));
    };
    write(0, "RIFF");
    view.setUint32(4, buffer.byteLength - 8, true);
    write(8, "WAVE");
    write(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
    view.setUint16(32, channelCount * bytesPerSample, true);
    view.setUint16(34, 16, true);
    write(36, "data");
    view.setUint32(40, sampleCount * channelCount * bytesPerSample, true);
    for (let index = 0; index < sampleCount; index += 1) {
        const envelope = Math.min(1, index / 700, (sampleCount - index) / 1200);
        const left = channel === "right" ? 0 : Math.sin(2 * Math.PI * 440 * index / sampleRate) * envelope;
        const right = channel === "left" ? 0 : Math.sin(2 * Math.PI * 554.37 * index / sampleRate) * envelope;
        view.setInt16(44 + index * 4, Math.round(left * 0x3fff), true);
        view.setInt16(46 + index * 4, Math.round(right * 0x3fff), true);
    }
    return new Blob([buffer], { type: "audio/wav" });
}
function permissionMessage(error: unknown, device: "camera" | "microphone"): string {
    if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
        return `${device === "camera" ? "Camera" : "Microphone"} access was not allowed. Check the permission beside the address bar and try again.`;
    }
    if (error instanceof DOMException && error.name === "NotFoundError") {
        return `No ${device} was found. Connect one and try again.`;
    }
    return `The ${device} could not be started. Check that another application is not using it.`;
}
export function MediaDeviceTester() {
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
    const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
    const [cameraId, setCameraId] = useState("");
    const [microphoneId, setMicrophoneId] = useState("");
    const [speakerId, setSpeakerId] = useState("");
    const [cameraActive, setCameraActive] = useState(false);
    const [microphoneActive, setMicrophoneActive] = useState(false);
    const [speakerActive, setSpeakerActive] = useState<SpeakerChannel | null>(null);
    const [microphoneLevel, setMicrophoneLevel] = useState(0);
    const [recordingActive, setRecordingActive] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [recordedSampleUrl, setRecordedSampleUrl] = useState("");
    const [cameraError, setCameraError] = useState("");
    const [microphoneError, setMicrophoneError] = useState("");
    const [speakerError, setSpeakerError] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const meterFrameRef = useRef<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingGenerationRef = useRef(0);
    const recordingTimerRef = useRef<number | null>(null);
    const recordingStartedAtRef = useRef(0);
    const recordedSampleUrlRef = useRef("");
    const toneUrlRef = useRef("");
    const unmountingRef = useRef(false);
    const applyDevices = useCallback((devices: MediaDeviceInfo[]) => {
        const nextCameras = devices.filter((device) => device.kind === "videoinput");
        const nextMicrophones = devices.filter((device) => device.kind === "audioinput");
        const nextSpeakers = devices.filter((device) => device.kind === "audiooutput");
        setCameras(nextCameras);
        setMicrophones(nextMicrophones);
        setSpeakers(nextSpeakers);
        setCameraId((current) => nextCameras.some((device) => device.deviceId === current)
            ? current
            : nextCameras[0]?.deviceId || "");
        setMicrophoneId((current) => nextMicrophones.some((device) => device.deviceId === current)
            ? current
            : nextMicrophones[0]?.deviceId || "");
        setSpeakerId((current) => nextSpeakers.some((device) => device.deviceId === current)
            ? current
            : nextSpeakers[0]?.deviceId || "");
    }, []);
    const refreshDevices = useCallback(async () => {
        if (!navigator.mediaDevices?.enumerateDevices)
            return;
        try {
            applyDevices(await navigator.mediaDevices.enumerateDevices());
        }
        catch {
            // An active device test remains usable when labels cannot be refreshed.
        }
    }, [applyDevices]);
    const stopCamera = useCallback(() => {
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
        if (videoRef.current)
            videoRef.current.srcObject = null;
        setCameraActive(false);
    }, []);
    const stopRecording = useCallback(() => {
        if (recordingTimerRef.current !== null)
            window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        if (mediaRecorderRef.current?.state === "recording")
            mediaRecorderRef.current.stop();
        setRecordingActive(false);
    }, []);
    const stopMicrophone = useCallback(() => {
        stopRecording();
        if (meterFrameRef.current !== null)
            cancelAnimationFrame(meterFrameRef.current);
        meterFrameRef.current = null;
        microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
        microphoneStreamRef.current = null;
        void audioContextRef.current?.close();
        audioContextRef.current = null;
        setMicrophoneActive(false);
        setMicrophoneLevel(0);
    }, [stopRecording]);
    const stopSpeaker = useCallback(() => {
        audioRef.current?.pause();
        if (audioRef.current)
            audioRef.current.removeAttribute("src");
        if (toneUrlRef.current)
            URL.revokeObjectURL(toneUrlRef.current);
        toneUrlRef.current = "";
        setSpeakerActive(null);
    }, []);
    const stopAll = useCallback(() => {
        stopCamera();
        stopMicrophone();
        stopSpeaker();
    }, [stopCamera, stopMicrophone, stopSpeaker]);
    useEffect(() => {
        unmountingRef.current = false;
        const devices = navigator.mediaDevices;
        void devices?.enumerateDevices?.().then(applyDevices).catch(() => undefined);
        devices?.addEventListener?.("devicechange", refreshDevices);
        const release = () => stopAll();
        window.addEventListener("pagehide", release);
        return () => {
            unmountingRef.current = true;
            devices?.removeEventListener?.("devicechange", refreshDevices);
            window.removeEventListener("pagehide", release);
            stopAll();
            if (recordedSampleUrlRef.current)
                URL.revokeObjectURL(recordedSampleUrlRef.current);
        };
    }, [applyDevices, refreshDevices, stopAll]);
    const startCamera = useCallback(async (requestedId = cameraId) => {
        setCameraError("");
        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError("Camera testing is not supported by this browser.");
            return;
        }
        stopCamera();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: requestedId ? { deviceId: { exact: requestedId } } : true,
                audio: false,
            });
            cameraStreamRef.current = stream;
            stream.getVideoTracks()[0]?.addEventListener("ended", () => setCameraActive(false), { once: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => undefined);
            }
            setCameraActive(true);
            await refreshDevices();
        }
        catch (error) {
            stopCamera();
            setCameraError(permissionMessage(error, "camera"));
        }
    }, [cameraId, refreshDevices, stopCamera]);
    async function startMicrophone(requestedId = microphoneId) {
        setMicrophoneError("");
        if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
            setMicrophoneError("Microphone level testing is not supported by this browser.");
            return;
        }
        stopMicrophone();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: requestedId ? { deviceId: { exact: requestedId } } : true,
            });
            const context = new AudioContext();
            const analyser = context.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.72;
            context.createMediaStreamSource(stream).connect(analyser);
            const samples = new Uint8Array(analyser.fftSize);
            const updateMeter = () => {
                analyser.getByteTimeDomainData(samples);
                let total = 0;
                for (const sample of samples) {
                    const normalized = (sample - 128) / 128;
                    total += normalized * normalized;
                }
                setMicrophoneLevel(Math.min(100, Math.sqrt(total / samples.length) * 230));
                meterFrameRef.current = requestAnimationFrame(updateMeter);
            };
            microphoneStreamRef.current = stream;
            audioContextRef.current = context;
            stream.getAudioTracks()[0]?.addEventListener("ended", () => stopMicrophone(), { once: true });
            setMicrophoneActive(true);
            updateMeter();
            startRecording(stream);
            await refreshDevices();
        }
        catch (error) {
            stopMicrophone();
            setMicrophoneError(permissionMessage(error, "microphone"));
        }
    }
    async function playSpeakerTest(channel: SpeakerChannel) {
        setSpeakerError("");
        stopSpeaker();
        try {
            const audio = audioRef.current as SinkCapableAudio | null;
            if (!audio)
                return;
            if (speakerId && audio.setSinkId)
                await audio.setSinkId(speakerId);
            const url = URL.createObjectURL(createTestTone(channel));
            toneUrlRef.current = url;
            audio.src = url;
            audio.onended = stopSpeaker;
            setSpeakerActive(channel);
            await audio.play();
        }
        catch {
            stopSpeaker();
            setSpeakerError("The test sound could not be played. Check the browser and system output settings.");
        }
    }
    function discardRecording() {
        recordingGenerationRef.current += 1;
        if (recordedSampleUrlRef.current)
            URL.revokeObjectURL(recordedSampleUrlRef.current);
        recordedSampleUrlRef.current = "";
        setRecordedSampleUrl("");
        setRecordingSeconds(0);
    }
    function startRecording(streamOverride?: MediaStream) {
        const stream = streamOverride ?? microphoneStreamRef.current;
        if (!stream)
            return;
        if (typeof MediaRecorder === "undefined") {
            setMicrophoneError("Audio recording is not supported by this browser.");
            return;
        }
        discardRecording();
        const generation = recordingGenerationRef.current;
        const chunks: Blob[] = [];
        const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
            .find((type) => MediaRecorder.isTypeSupported(type));
        const recorder = preferredType
            ? new MediaRecorder(stream, { mimeType: preferredType })
            : new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
            if (event.data.size)
                chunks.push(event.data);
        };
        recorder.onstop = () => {
            const blob = new Blob(chunks, {
                type: recorder.mimeType || "audio/webm",
            });
            if (mediaRecorderRef.current === recorder)
                mediaRecorderRef.current = null;
            if (unmountingRef.current
                || generation !== recordingGenerationRef.current)
                return;
            if (!blob.size) {
                setMicrophoneError("No audio was captured. Try recording the sample again.");
                return;
            }
            const url = URL.createObjectURL(blob);
            recordedSampleUrlRef.current = url;
            setRecordedSampleUrl(url);
        };
        recorder.onerror = () => {
            if (generation !== recordingGenerationRef.current)
                return;
            setRecordingActive(false);
            setMicrophoneError("The microphone sample could not be recorded.");
        };
        recorder.start(200);
        mediaRecorderRef.current = recorder;
        recordingStartedAtRef.current = Date.now();
        setRecordingSeconds(0);
        setRecordingActive(true);
        recordingTimerRef.current = window.setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000);
            setRecordingSeconds(elapsed);
            if (elapsed >= 30)
                stopRecording();
        }, 250);
    }
    const anyHardwareActive = cameraActive || microphoneActive;
    return (<div className="media-tester">
      <div className={`hardware-status ${anyHardwareActive ? "active" : ""}`}>
        <ShieldCheck size={18} aria-hidden="true"/>
        <strong role="status" aria-live="polite">{anyHardwareActive ? "Hardware active" : "No camera or microphone active"}</strong>
        {cameraActive ? <span><Camera size={14} aria-hidden="true"/> Camera</span> : null}
        {microphoneActive ? <span><Mic size={14} aria-hidden="true"/> Microphone</span> : null}
        {recordingActive ? <span className="recording-indicator"><Circle size={12} fill="currentColor" aria-hidden="true"/> Recording</span> : null}
        {anyHardwareActive ? (<button type="button" className="danger-button" onClick={stopAll}><Octagon size={15} aria-hidden="true"/> Stop all hardware</button>) : null}
      </div>

      <div className="media-test-grid">
        <section className={`device-test-card ${cameraActive ? "is-active" : ""}`} aria-labelledby="camera-test-heading">
          <div className="device-test-heading">
            <div className="device-icon"><Camera size={22} aria-hidden="true"/></div>
            <div><h2 id="camera-test-heading">Camera</h2><p>Preview one selected camera.</p></div>
            <span className="device-state">{cameraActive ? "Active" : "Off"}</span>
          </div>
          <div className="camera-preview">
            <video ref={videoRef} muted playsInline aria-label="Selected camera preview"/>
            {!cameraActive ? <div><Camera size={30} aria-hidden="true"/><span>Camera preview is off</span></div> : null}
          </div>
          <label className="device-select"><span>Camera device</span><select value={cameraId} onChange={(event) => {
            setCameraId(event.target.value);
            if (cameraActive)
                void startCamera(event.target.value);
        }} disabled={!cameras.length}>
            {!cameras.length ? <option value="">Camera labels appear after permission</option> : null}
            {cameras.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
          </select></label>
          {cameraError ? <p className="device-error" role="alert">{cameraError}</p> : null}
          <div className="device-actions">
            {!cameraActive ? <button type="button" className="primary-button" onClick={() => void startCamera()}><Play size={15} aria-hidden="true"/> Start camera</button> : <button type="button" className="secondary-button" onClick={stopCamera}><Octagon size={15} aria-hidden="true"/> Stop camera</button>}
          </div>
        </section>

        <section className={`device-test-card ${microphoneActive ? "is-active" : ""}`} aria-labelledby="microphone-test-heading">
          <div className="device-test-heading">
            <div className="device-icon"><Mic size={22} aria-hidden="true"/></div>
            <div><h2 id="microphone-test-heading">Microphone</h2><p>Watch the live input level.</p></div>
            <span className="device-state">{microphoneActive ? "Active" : "Off"}</span>
          </div>
          <div className="microphone-meter" aria-label={`Microphone level ${Math.round(microphoneLevel)} percent`}>
            <div style={{ width: `${microphoneLevel}%` }}/>
            <span>{microphoneActive ? `${Math.round(microphoneLevel)}%` : "Start speaking after permission"}</span>
          </div>
          <label className="device-select"><span>Microphone device</span><select value={microphoneId} onChange={(event) => {
            setMicrophoneId(event.target.value);
            if (microphoneActive)
                void startMicrophone(event.target.value);
        }} disabled={!microphones.length}>
            {!microphones.length ? <option value="">Microphone labels appear after permission</option> : null}
            {microphones.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
          </select></label>
          {microphoneError ? <p className="device-error" role="alert">{microphoneError}</p> : null}
          <div className="device-actions">
            {!microphoneActive ? <button type="button" className="primary-button" onClick={() => void startMicrophone()}><Play size={15} aria-hidden="true"/> Start microphone</button> : <button type="button" className="secondary-button" onClick={stopMicrophone}><Octagon size={15} aria-hidden="true"/> Stop microphone</button>}
          </div>
          <div className="microphone-recording">
            <div>
              <strong>Automatic recording and playback</strong>
              <span>Starting the microphone records up to 30 seconds so you can check clarity and volume.</span>
            </div>
            <div className="recording-actions">
              {recordingActive ? (<button type="button" className="danger-button" onClick={stopRecording}>
                  <Octagon size={14} aria-hidden="true"/> Stop recording ({recordingSeconds}s)
                </button>) : null}
              {recordedSampleUrl ? <button type="button" className="text-button danger" onClick={discardRecording}><Trash2 size={14} aria-hidden="true"/> Discard</button> : null}
            </div>
            {recordedSampleUrl ? (<audio className="microphone-playback" src={recordedSampleUrl} controls aria-label="Recorded microphone sample playback"/>) : (<div className="recording-empty">{recordingActive ? "Speak normally, then stop the recording to listen." : "The recording starts with the microphone."}</div>)}
          </div>
        </section>

        <section className="device-test-card speaker-card" aria-labelledby="speaker-test-heading">
          <div className="device-test-heading">
            <div className="device-icon"><MonitorSpeaker size={22} aria-hidden="true"/></div>
            <div><h2 id="speaker-test-heading">Speakers</h2><p>Check left, right, and stereo channels.</p></div>
            <span className="device-state">{speakerActive ? "Playing" : "Ready"}</span>
          </div>
          <label className="device-select"><span>Output device</span><select value={speakerId} onChange={(event) => setSpeakerId(event.target.value)} disabled={!speakers.length}>
            {!speakers.length ? <option value="">Current system output</option> : null}
            {speakers.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Speaker ${index + 1}`}</option>)}
          </select></label>
          <div className="speaker-buttons">
            {(["left", "stereo", "right"] as const).map((channel) => (<button key={channel} type="button" className={speakerActive === channel ? "primary-button" : "secondary-button"} onClick={() => void playSpeakerTest(channel)}>
                <MonitorSpeaker size={15} aria-hidden="true"/> {channel[0].toUpperCase() + channel.slice(1)}
              </button>))}
          </div>
          {speakerError ? <p className="device-error" role="alert">{speakerError}</p> : null}
          <audio ref={audioRef} aria-label="Speaker test audio"/>
        </section>
      </div>
    </div>);
}
