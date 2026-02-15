"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play, Send, Square, Trash2 } from "lucide-react"

interface SaathiAudioRecorderProps {
  disabled?: boolean
  onSend: (file: File, durationSeconds: number) => void
  onCancel: () => void
  onFallbackUpload: () => void
}

type RecorderMode = "recording" | "recorded"

const RECORDER_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
]

const RECORDER_BITRATES = [192000, 128000, 96000]

function chooseAudioExtension(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg"
  if (mimeType.includes("mp4")) return "m4a"
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3"
  return "webm"
}

async function requestPreferredMicrophoneStream(): Promise<MediaStream> {
  const preferredConstraints: MediaTrackConstraints = {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: { ideal: true },
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48000 },
    sampleSize: { ideal: 16 },
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: preferredConstraints })
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: true })
  }
}

function createMediaRecorder(stream: MediaStream, mimeType?: string): MediaRecorder {
  const options: MediaRecorderOptions = mimeType ? { mimeType } : {}

  for (const bitrate of RECORDER_BITRATES) {
    try {
      return new MediaRecorder(stream, { ...options, audioBitsPerSecond: bitrate })
    } catch {
      continue
    }
  }

  return options.mimeType
    ? new MediaRecorder(stream, options)
    : new MediaRecorder(stream)
}

function formatDuration(secondsTotal: number): string {
  const minutes = Math.floor(secondsTotal / 60)
  const seconds = Math.floor(secondsTotal % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function SaathiAudioRecorder({
  disabled = false,
  onSend,
  onCancel,
  onFallbackUpload,
}: SaathiAudioRecorderProps) {
  const [mode, setMode] = useState<RecorderMode>("recording")
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSeconds, setPlaybackSeconds] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const durationTimerRef = useRef<number | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const recordedFileRef = useRef<File | null>(null)

  useEffect(() => {
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        onFallbackUpload()
        onCancel()
        return
      }

      try {
        const stream = await requestPreferredMicrophoneStream()
        mediaStreamRef.current = stream

        const supportedType = RECORDER_MIME_TYPES.find(type => {
          if (typeof MediaRecorder.isTypeSupported !== "function") return false
          return MediaRecorder.isTypeSupported(type)
        })

        const recorder = createMediaRecorder(stream, supportedType)

        chunksRef.current = []
        mediaRecorderRef.current = recorder

        recorder.ondataavailable = event => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data)
          }
        }

        recorder.onstop = () => {
          const mimeType = recorder.mimeType || "audio/webm"
          const recordedBlob = new Blob(chunksRef.current, { type: mimeType })
          chunksRef.current = []

          if (recordedBlob.size === 0) {
            onCancel()
            return
          }

          const extension = chooseAudioExtension(mimeType)
          const file = new File([recordedBlob], `saathi-recording-${Date.now()}.${extension}`, { type: mimeType })
          recordedFileRef.current = file

          const playbackUrl = URL.createObjectURL(recordedBlob)
          const audio = new Audio(playbackUrl)
          audioElementRef.current = audio
          audio.onended = () => setIsPlaying(false)
          audio.ontimeupdate = () => setPlaybackSeconds(audio.currentTime)

          setMode("recorded")
          setIsPlaying(false)
        }

        recorder.start()
        durationTimerRef.current = window.setInterval(() => {
          setDurationSeconds(prev => prev + 1)
        }, 1000)
      } catch {
        onFallbackUpload()
        onCancel()
      }
    }

    void start()

    return () => {
      if (durationTimerRef.current !== null) {
        window.clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }

      if (audioElementRef.current) {
        audioElementRef.current.pause()
        if (audioElementRef.current.src.startsWith("blob:")) {
          URL.revokeObjectURL(audioElementRef.current.src)
        }
        audioElementRef.current = null
      }
    }
  }, [onCancel, onFallbackUpload])

  const stopRecording = () => {
    if (durationTimerRef.current !== null) {
      window.clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.stop()
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
  }

  const togglePlayback = async () => {
    const audio = audioElementRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    try {
      await audio.play()
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }

  const handleSend = () => {
    if (disabled) return
    const file = recordedFileRef.current
    if (!file) return
    onSend(file, durationSeconds)
  }

  const progressPercent = durationSeconds > 0
    ? Math.min(100, (playbackSeconds / durationSeconds) * 100)
    : 0

  if (mode === "recording") {
    return (
      <div className="flex items-center gap-2 w-full rounded-xl border border-border/70 bg-card/75 p-2">
        <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <span className="text-sm text-foreground font-medium tabular-nums flex-1">{formatDuration(durationSeconds)}</span>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Cancel recording"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={stopRecording}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground transition-all hover:opacity-90 active:scale-95"
          aria-label="Stop recording"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 w-full rounded-xl border border-border/70 bg-card/75 p-2">
      <button
        type="button"
        onClick={togglePlayback}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-all hover:opacity-80 active:scale-95 flex-shrink-0"
        aria-label={isPlaying ? "Pause playback" : "Play recording"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDuration(isPlaying ? playbackSeconds : durationSeconds)}
        </span>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
        aria-label="Discard recording"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={handleSend}
        disabled={disabled}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Attach recording"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}
