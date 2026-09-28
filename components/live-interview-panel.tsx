"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { AudioLines, Bot, Camera, CameraOff, Captions, LogOut, Mic, MicOff, PhoneOff, RefreshCcw, RotateCcw, ShieldCheck, Volume2 } from "lucide-react";
import { Button } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { VoiceInterviewContext } from "@/lib/voice-interview";

type VoiceStatus = "idle" | "connecting" | "listening" | "speaking" | "muted" | "closing" | "error";
type Transcript = { student: string; interviewer: string };

export function LiveInterviewPanel({
  context,
  onTranscriptChange,
  onVoiceUsed,
  onActiveChange,
  onExit,
}: {
  context: VoiceInterviewContext;
  onTranscriptChange: (transcript: Transcript) => void;
  onVoiceUsed: () => void;
  onActiveChange: (active: boolean) => void;
  onExit: () => void;
}) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [message, setMessage] = useState("Voice is off. Text practice remains available at all times.");
  const [studentTranscript, setStudentTranscript] = useState("");
  const [interviewerTranscript, setInterviewerTranscript] = useState("");
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selfVideoRef = useRef<HTMLVideoElement | null>(null);
  const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedRef = useRef(false);
  const startInstructionRef = useRef("");
  const studentTranscriptRef = useRef("");
  const interviewerTranscriptRef = useRef("");
  const mutedRef = useRef(false);
  const callbacksRef = useRef({ onTranscriptChange, onVoiceUsed, onActiveChange, onExit });
  const active = ["listening", "speaking", "muted"].includes(status);

  useEffect(() => {
    callbacksRef.current = { onTranscriptChange, onVoiceUsed, onActiveChange, onExit };
  }, [onActiveChange, onExit, onTranscriptChange, onVoiceUsed]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [active]);

  const dispose = useCallback((notify = true, updateUi = true) => {
    connectedRef.current = false;
    mutedRef.current = false;
    if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
    connectionTimerRef.current = null;
    speakingTimerRef.current = null;
    closingTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (channelRef.current && channelRef.current.readyState !== "closed") channelRef.current.close();
    channelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    if (selfVideoRef.current) selfVideoRef.current.srcObject = null;
    if (updateUi) setCameraOn(false);
    if (notify) callbacksRef.current.onActiveChange(false);
  }, []);

  useEffect(() => () => dispose(false, false), [dispose]);

  function publishTranscript(speaker: "student" | "interviewer", delta: string) {
    if (!delta) return;
    if (speaker === "student") {
      studentTranscriptRef.current = `${studentTranscriptRef.current}${delta}`.slice(-12_000);
      setStudentTranscript(studentTranscriptRef.current);
    } else {
      interviewerTranscriptRef.current = `${interviewerTranscriptRef.current}${delta}`.slice(-12_000);
      setInterviewerTranscript(interviewerTranscriptRef.current);
    }
    callbacksRef.current.onTranscriptChange({
      student: studentTranscriptRef.current,
      interviewer: interviewerTranscriptRef.current,
    });
  }

  function sendEvent(event: Record<string, unknown>) {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") return false;
    channel.send(JSON.stringify(event));
    return true;
  }

  async function startVoice() {
    if (status === "connecting" || status === "closing") return;
    dispose();
    setStatus("connecting");
    setMessage("Requesting microphone access and creating a secure voice session…");
    setPlaybackBlocked(false);
    setCameraMessage("");
    setElapsedSeconds(0);
    studentTranscriptRef.current = "";
    interviewerTranscriptRef.current = "";
    setStudentTranscript("");
    setInterviewerTranscript("");
    callbacksRef.current.onTranscriptChange({ student: "", interviewer: "" });

    try {
      if (!window.RTCPeerConnection) throw new Error("Real-time voice is not supported by this browser. Continue in text mode.");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is unavailable. Continue in text mode or use a supported browser.");

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      peer.addEventListener("track", (event) => {
        if (!audioRef.current) return;
        audioRef.current.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void audioRef.current.play().catch(() => {
          setPlaybackBlocked(true);
          setMessage("The interviewer is connected. Press play below if your browser blocked audio playback.");
        });
      });
      peer.addEventListener("connectionstatechange", () => {
        if (peer.connectionState === "failed") {
          dispose();
          setStatus("error");
          setMessage("The voice connection failed. Your text answer is still available; retry when ready.");
        }
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.addEventListener("message", ({ data }) => {
        let event: Record<string, unknown>;
        try { event = JSON.parse(String(data)) as Record<string, unknown>; }
        catch { return; }
        const eventType = typeof event.type === "string" ? event.type : "";

        if (eventType === "session.started") {
          if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
          connectedRef.current = true;
          setStatus("listening");
          setMessage("Maya is live. She will begin with a foundation question and adapt from your answers.");
          callbacksRef.current.onVoiceUsed();
          callbacksRef.current.onActiveChange(true);
          sendEvent({
            type: "session.instructions.append",
            event_id: `start_${Date.now()}`,
            delegation_id: null,
            content: startInstructionRef.current,
          });
          return;
        }

        if (eventType === "session.input_transcript.delta" && typeof event.delta === "string") {
          publishTranscript("student", event.delta);
          if (!mutedRef.current) setStatus("listening");
          return;
        }

        if (eventType === "session.output_transcript.delta" && typeof event.delta === "string") {
          publishTranscript("interviewer", event.delta);
          setStatus("speaking");
          if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
          speakingTimerRef.current = setTimeout(() => setStatus(mutedRef.current ? "muted" : "listening"), 1_100);
          return;
        }

        if (eventType === "session.input_audio.muted") {
          mutedRef.current = true;
          setStatus("muted");
        }
        if (eventType === "session.input_audio.unmuted") {
          mutedRef.current = false;
          setStatus("listening");
        }
        if (eventType === "session.closed") {
          dispose();
          setStatus("idle");
          setMessage("Voice interview ended. Review or edit the transcript, then evaluate your answer.");
          return;
        }
        if (eventType === "error") {
          const detail = typeof event.error === "object" && event.error && "message" in event.error ? String(event.error.message) : "The live voice service reported an error.";
          dispose();
          setStatus("error");
          setMessage(`${detail} Continue in text mode or retry.`);
        }
      });
      channel.addEventListener("close", () => {
        if (!connectedRef.current) return;
        dispose();
        setStatus("error");
        setMessage("The voice connection closed unexpectedly. Your transcript is preserved for text mode.");
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitForIceGathering(peer);
      const sdp = peer.localDescription?.sdp;
      if (!sdp) throw new Error("The browser could not create a voice connection offer.");

      const token = await getVoiceAccessToken();
      const response = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ sdp, interview: context }),
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        startInstruction?: string;
        transport?: { sdp?: string };
      };
      if (!response.ok) throw new Error(payload.error || "The voice service could not start.");
      if (!payload.transport?.sdp) throw new Error("The voice service returned an incomplete connection response.");
      startInstructionRef.current = payload.startInstruction || "Introduce yourself as an AI interviewer, ask the opening question, then listen.";
      connectionTimerRef.current = setTimeout(() => {
        if (connectedRef.current) return;
        dispose();
        setStatus("error");
        setMessage("Voice connection timed out. Continue in text mode or retry.");
      }, 15_000);
      await peer.setRemoteDescription({ type: "answer", sdp: payload.transport.sdp });
    } catch (caught) {
      dispose();
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : "Voice connection failed. Continue in text mode or retry.");
    }
  }

  function toggleMute() {
    if (!connectedRef.current) return;
    const muted = mutedRef.current;
    const accepted = sendEvent({ type: muted ? "session.input_audio.unmute" : "session.input_audio.mute", event_id: `mute_${Date.now()}` });
    if (!accepted) return;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = muted; });
    mutedRef.current = !muted;
    setStatus(muted ? "listening" : "muted");
    setMessage(muted ? "Microphone is on. Maya is listening." : "Microphone muted. The live session remains connected.");
  }

  async function toggleCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      if (selfVideoRef.current) selfVideoRef.current.srcObject = null;
      setCameraOn(false);
      setCameraMessage("Camera preview is off.");
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera preview is unavailable in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (selfVideoRef.current) {
        selfVideoRef.current.srcObject = stream;
        await selfVideoRef.current.play();
      }
      setCameraOn(true);
      setCameraMessage("Private self-view is on. Your video stays on this device.");
    } catch (caught) {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraOn(false);
      setCameraMessage(caught instanceof Error ? caught.message : "Camera preview could not start.");
    }
  }

  function repeatQuestion() {
    if (!connectedRef.current) return;
    sendEvent({
      type: "session.instructions.append",
      event_id: `repeat_${Date.now()}`,
      delegation_id: null,
      content: "Briefly repeat your most recent interview question in simpler wording, then pause and listen. Do not answer it for the student.",
    });
  }

  function endVoice() {
    if (!connectedRef.current || !sendEvent({ type: "session.close", event_id: `close_${Date.now()}` })) {
      dispose();
      setStatus("idle");
      setMessage("Voice interview ended. Text mode is ready.");
      return;
    }
    setStatus("closing");
    setMessage("Finishing the voice interview and preserving the transcript…");
    closingTimerRef.current = setTimeout(() => {
      dispose();
      setStatus("idle");
      setMessage("Voice interview ended. The final usage event was not received, but your local transcript is preserved.");
    }, 15_000);
  }

  function exitPractice() {
    if (connectedRef.current) sendEvent({ type: "session.close", event_id: `exit_${Date.now()}` });
    dispose();
    callbacksRef.current.onExit();
  }

  const statusLabel = status === "speaking" ? "Maya is speaking" : status === "listening" ? "Listening" : status === "muted" ? "Microphone muted" : status === "connecting" ? "Connecting" : status === "closing" ? "Ending safely" : status === "error" ? "Text fallback ready" : "Voice ready";
  const activeCaption = status === "speaking"
    ? (interviewerTranscript || "Maya is preparing the next question…").slice(-240)
    : (studentTranscript || (active ? "Speak naturally when you are ready." : "Start the call to speak with Maya.")).slice(-240);
  const callDuration = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  return <div className="overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[#101722] text-white shadow-2xl shadow-black/20">
    <div className="voice-frame relative min-h-[390px] overflow-hidden bg-gradient-to-b from-slate-700 to-slate-950 sm:min-h-[520px]" data-voice-status={status}>
      <img src="/interviewer.png" alt="AI-generated professional interviewer" className="voice-avatar-image absolute inset-0 h-full w-full object-cover object-top opacity-95" />
      <div className="voice-ambient-glow absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/5 to-slate-950/25" />

      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3 sm:inset-x-5 sm:top-5">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/65 px-3 py-1.5 text-xs shadow-lg backdrop-blur-md">
          <span className={`size-2 rounded-full ${active ? "animate-pulse bg-emerald-400" : status === "error" ? "bg-rose-400" : "bg-slate-400"}`} />
          {statusLabel}
          {active && <span className="text-slate-400">· {callDuration}</span>}
        </div>
        <div className="flex items-center gap-2">
          {status === "speaking" && <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[var(--brand)]/85 px-3 py-1.5 text-xs shadow-lg backdrop-blur-md"><AudioLines className="size-3.5" /><span className="hidden sm:inline">Live response</span><VoiceEqualizer /></div>}
          <div className="rounded-full border border-white/10 bg-slate-950/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-slate-300 backdrop-blur-md">AI interviewer</div>
        </div>
      </div>

      <div className="absolute bottom-24 left-4 right-32 sm:bottom-28 sm:left-5 sm:right-40">
        <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--brand-strong)]"><span className="flex items-center gap-2"><Captions className="size-3.5" />Live captions</span><span className="text-slate-400">Maya · {context.personality}</span></div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-100">{activeCaption}</p>
        </div>
      </div>

      <div className={`voice-self-view absolute bottom-24 right-4 h-28 w-24 overflow-hidden rounded-2xl border bg-slate-900 shadow-2xl sm:bottom-28 sm:right-5 sm:h-36 sm:w-28 ${cameraOn ? "border-emerald-400/60" : "border-white/15"}`}>
        <video ref={selfVideoRef} muted playsInline className={`h-full w-full -scale-x-100 object-cover ${cameraOn ? "block" : "hidden"}`} aria-label="Private camera self-view" />
        {!cameraOn && <div className="grid h-full place-items-center bg-gradient-to-br from-slate-800 to-slate-950"><div className="text-center"><div className="mx-auto grid size-10 place-items-center rounded-full bg-white/10 text-sm font-bold">YOU</div><p className="mt-2 text-[9px] uppercase tracking-wider text-slate-400">Camera off</p></div></div>}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-5 text-[9px] font-semibold">You</div>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-slate-950/72 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-center gap-2.5 sm:gap-3">
          {!active && status !== "connecting" && status !== "closing" && <Button onClick={() => void startVoice()} className="min-h-12 bg-emerald-500 px-5 text-slate-950 shadow-lg shadow-emerald-950/20 hover:bg-emerald-400"><Mic className="size-4" />Start video-style interview</Button>}
          {status === "connecting" && <Button disabled className="min-h-12 bg-white/10"><RefreshCcw className="size-4 animate-spin" />Connecting securely…</Button>}
          {active && <CallControl onClick={toggleMute} active={status !== "muted"} label={status === "muted" ? "Unmute microphone" : "Mute microphone"}>{status === "muted" ? <MicOff className="size-5" /> : <Mic className="size-5" />}</CallControl>}
          {active && <CallControl onClick={() => void toggleCamera()} active={cameraOn} label={cameraOn ? "Turn camera preview off" : "Turn camera preview on"}>{cameraOn ? <Camera className="size-5" /> : <CameraOff className="size-5" />}</CallControl>}
          {active && <CallControl onClick={repeatQuestion} label="Repeat the last question"><RotateCcw className="size-5" /></CallControl>}
          {(active || status === "closing") && <button type="button" onClick={endVoice} disabled={status === "closing"} className="grid size-12 place-items-center rounded-full bg-rose-500 shadow-lg shadow-rose-950/30 transition hover:bg-rose-400 disabled:opacity-60" aria-label="End voice interview" title="End voice interview"><PhoneOff className="size-5" /></button>}
          <CallControl onClick={exitPractice} label="Leave interview practice"><LogOut className="size-5" /></CallControl>
        </div>
      </div>
    </div>

    <div className="border-t border-white/10 p-4">
      <p className={`text-center text-xs leading-5 ${status === "error" ? "text-rose-200" : "text-slate-300"}`} role="status" aria-live="polite">{message}</p>
      {cameraMessage && <p className="mt-1 text-center text-[11px] leading-5 text-slate-400" role="status">{cameraMessage}</p>}
      <audio ref={audioRef} autoPlay controls={playbackBlocked} className={playbackBlocked ? "mt-3 h-10 w-full" : "hidden"} aria-label="AI interviewer audio" />
    </div>

    {(studentTranscript || interviewerTranscript) && <div className="max-h-52 space-y-3 overflow-y-auto border-t border-white/10 bg-slate-950/45 p-4 text-xs leading-5" aria-label="Live interview transcript">
      {interviewerTranscript && <div className="flex gap-2"><Bot className="mt-0.5 size-4 shrink-0 text-violet-300" /><p><strong className="text-violet-200">Maya:</strong> <span className="text-slate-300">{interviewerTranscript}</span></p></div>}
      {studentTranscript && <div className="flex gap-2"><Volume2 className="mt-0.5 size-4 shrink-0 text-emerald-300" /><p><strong className="text-emerald-200">You:</strong> <span className="text-slate-300">{studentTranscript}</span></p></div>}
    </div>}
    <div className="flex gap-2 border-t border-white/10 px-4 py-3 text-[11px] leading-5 text-slate-400"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-400" /><span>Voice uses your microphone only after permission. Camera is an optional local self-view and is never sent to OpenAI. Maya is an animated AI interviewer, not a live human or photorealistic lip-synced video.</span></div>
  </div>;
}

function VoiceEqualizer() {
  return <span className="voice-equalizer" aria-hidden="true"><span /><span /><span /><span /></span>;
}

function CallControl({ children, label, onClick, active = false }: { children: ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return <button type="button" onClick={onClick} className={`grid size-12 place-items-center rounded-full border shadow-lg transition hover:-translate-y-0.5 ${active ? "border-emerald-300/50 bg-emerald-500 text-slate-950" : "border-white/10 bg-white/10 text-white hover:bg-white/15"}`} aria-label={label} title={label}>{children}</button>;
}

async function getVoiceAccessToken() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function waitForIceGathering(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === "complete") return;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      peer.removeEventListener("icegatheringstatechange", onChange);
      reject(new Error("Timed out while creating the voice connection."));
    }, 10_000);
    function onChange() {
      if (peer.iceGatheringState !== "complete") return;
      clearTimeout(timeout);
      peer.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }
    peer.addEventListener("icegatheringstatechange", onChange);
    onChange();
  });
}
