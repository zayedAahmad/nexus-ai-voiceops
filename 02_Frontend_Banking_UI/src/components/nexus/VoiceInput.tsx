import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, MicOff, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n";

type SpeechResult = {
  0: { transcript: string };
  isFinal: boolean;
};

type SpeechError = {
  error?: string;
  message?: string;
};

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((event: { results: ArrayLike<SpeechResult> }) => void)
    | null;
  onerror: ((event: SpeechError) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as unknown as {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  };
  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition || null;
}

function hasMediaRecorder() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.MediaRecorder !== "undefined"
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the audio recording."));
    reader.readAsDataURL(blob);
  });
}

export function VoiceInput({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  placeholder?: string;
}) {
  const { lang, t } = useLang();
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [supported, setSupported] = useState(false);
  const [serverTranscription, setServerTranscription] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const modeRef = useRef<"native" | "server" | null>(null);
  const recRef = useRef<SR | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);

  const message = (key: string) => {
    const ar: Record<string, string> = {
      unsupported:
        "هذا المتصفح لا يدعم التعرف الصوتي. افتح التطبيق في Chrome أو فعّل تحويل الصوت عبر الخادم.",
      permission: "اسمح للموقع باستخدام الميكروفون من شريط عنوان المتصفح ثم حاول مرة أخرى.",
      network: "تعذر الوصول لخدمة التعرف الصوتي. تحقق من الإنترنت أو فعّل تحويل الصوت عبر الخادم.",
      noSpeech: "لم أسمع كلامًا واضحًا. اقترب من الميكروفون وحاول مرة أخرى.",
      recording: "جارٍ التسجيل... اضغط مرة أخرى عند الانتهاء.",
      listening: "أتحدث الآن... سيظهر النص هنا مباشرة.",
      transcribing: "جارٍ تحويل التسجيل إلى نص...",
      failed: "تعذر تحويل الصوت إلى نص. حاول مرة أخرى.",
    };
    const en: Record<string, string> = {
      unsupported:
        "Speech recognition is unavailable here. Open the app in Chrome or enable server transcription.",
      permission: "Allow microphone access from the browser address bar, then try again.",
      network: "The speech service could not be reached. Check the connection or enable server transcription.",
      noSpeech: "No clear speech was detected. Move closer to the microphone and try again.",
      recording: "Recording... press again when you are finished.",
      listening: "Speak now... your words will appear here.",
      transcribing: "Turning the recording into text...",
      failed: "The audio could not be transcribed. Please try again.",
    };
    return (lang === "ar" ? ar : en)[key];
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearStopTimer = () => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  useEffect(() => {
    const nativeSupported = Boolean(getSpeechRecognitionCtor());
    const recorderSupported = hasMediaRecorder();
    setSupported(nativeSupported);

    api
      .voiceCapabilities()
      .then((capabilities) => {
        setServerTranscription(capabilities.serverTranscription);
        setSupported(nativeSupported || (recorderSupported && capabilities.serverTranscription));
        if (!nativeSupported && !(recorderSupported && capabilities.serverTranscription)) {
          setVoiceError(message("unsupported"));
        }
      })
      .catch(() => {
        if (!nativeSupported) setVoiceError(message("unsupported"));
      });

    return () => {
      try {
        recRef.current?.stop();
        if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      } catch {
        // The browser may already have ended the active voice session.
      }
      clearStopTimer();
      stopStream();
    };
  }, []);

  const requestMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  };

  const startServerRecording = async () => {
    try {
      const stream = await requestMicrophone();
      if (!stream) throw new Error("Microphone capture is unavailable.");
      streamRef.current = stream;
      chunksRef.current = [];

      const preferredMime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find(
        (mime) => MediaRecorder.isTypeSupported(mime),
      );
      const recorder = new MediaRecorder(
        stream,
        preferredMime ? { mimeType: preferredMime } : undefined,
      );
      recorderRef.current = recorder;
      modeRef.current = "server";

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        clearStopTimer();
        stopStream();
        setListening(false);
        setVoiceError(message("failed"));
      };
      recorder.onstop = async () => {
        clearStopTimer();
        stopStream();
        setListening(false);
        modeRef.current = null;

        const audio = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (!audio.size) {
          setVoiceError(message("noSpeech"));
          return;
        }

        setTranscribing(true);
        try {
          const result = await api.transcribeAudio({
            audioData: await blobToDataUrl(audio),
            mimeType: audio.type || "audio/webm",
            language: lang,
          });
          onChange(result.text);
          setVoiceError(null);
        } catch (error) {
          setVoiceError(
            error instanceof Error && error.message
              ? error.message
              : message("failed"),
          );
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start(250);
      setListening(true);
      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 20_000);
    } catch (error) {
      stopStream();
      setListening(false);
      const name = error instanceof DOMException ? error.name : "";
      setVoiceError(
        name === "NotAllowedError" || name === "SecurityError"
          ? message("permission")
          : message("failed"),
      );
    }
  };

  const startNativeRecognition = async () => {
    const Recognition = getSpeechRecognitionCtor();
    if (!Recognition) {
      setVoiceError(message("unsupported"));
      return;
    }

    try {
      const permissionStream = await requestMicrophone();
      permissionStream?.getTracks().forEach((track) => track.stop());

      const recognition = new Recognition();
      recognition.lang = lang === "ar" ? "ar-JO" : "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      let heardSpeech = false;
      let recognitionFailed = false;
      let finalText = "";

      recognition.onresult = (event) => {
        let interimText = "";
        for (let index = 0; index < event.results.length; index++) {
          const result = event.results[index];
          const text = result[0]?.transcript || "";
          if (text.trim()) heardSpeech = true;
          if (result.isFinal) finalText += text;
          else interimText += text;
        }
        onChange((finalText + interimText).trim());
      };
      recognition.onerror = (event) => {
        recognitionFailed = true;
        setListening(false);
        modeRef.current = null;
        const code = event.error || "";
        if (code === "not-allowed" || code === "service-not-allowed") {
          setVoiceError(message("permission"));
        } else if (code === "network") {
          setVoiceError(message("network"));
        } else if (code === "no-speech" || code === "audio-capture") {
          setVoiceError(message("noSpeech"));
        } else {
          setVoiceError(event.message || message("failed"));
        }
      };
      recognition.onend = () => {
        setListening(false);
        modeRef.current = null;
        if (!heardSpeech && !recognitionFailed) setVoiceError(message("noSpeech"));
      };

      recRef.current = recognition;
      modeRef.current = "native";
      recognition.start();
      setListening(true);
      setVoiceError(null);
    } catch (error) {
      setListening(false);
      const name = error instanceof DOMException ? error.name : "";
      setVoiceError(
        name === "NotAllowedError" || name === "SecurityError"
          ? message("permission")
          : message("failed"),
      );
    }
  };

  const toggle = async () => {
    if (transcribing) return;
    setVoiceError(null);

    if (listening) {
      if (modeRef.current === "server") {
        clearStopTimer();
        if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      } else {
        recRef.current?.stop();
        setListening(false);
      }
      return;
    }

    if (serverTranscription && hasMediaRecorder()) {
      await startServerRecording();
    } else {
      await startNativeRecognition();
    }
  };

  const voiceStatus = transcribing
    ? message("transcribing")
    : listening
      ? message(modeRef.current === "server" ? "recording" : "listening")
      : voiceError;

  return (
    <div className="nexus-glass relative rounded-3xl p-2">
      <div className="flex items-end gap-2 p-2">
        <button
          type="button"
          data-testid="voice-microphone"
          onClick={toggle}
          disabled={!supported || transcribing}
          title={supported ? t("tapToSpeak") : message("unsupported")}
          className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl transition ${
            listening
              ? "bg-destructive text-destructive-foreground"
              : "nexus-aurora text-primary-foreground nexus-glow"
          } disabled:opacity-40`}
        >
          {transcribing ? (
            <LoaderCircle className="h-6 w-6 animate-spin" />
          ) : listening ? (
            <>
              <span className="absolute inset-0 rounded-2xl bg-destructive/60 nexus-pulse" />
              <MicOff className="relative h-6 w-6" />
            </>
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </button>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder || t("transcriptPlaceholder")}
          rows={2}
          className="min-h-14 w-full min-w-0 resize-none bg-transparent px-2 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || transcribing || !value.trim()}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground transition disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      {listening ? (
        <div className="flex items-end justify-center gap-1 pb-2">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <span
              key={index}
              className="w-1 rounded-full bg-accent"
              style={{
                height: 8 + (index % 3) * 6,
                animation: `nexusWave 0.9s ease-in-out ${index * 0.08}s infinite`,
              }}
            />
          ))}
        </div>
      ) : null}

      {voiceStatus ? (
        <div
          data-testid="voice-status"
          className={`px-4 pb-3 text-center text-xs ${
            voiceError && !listening && !transcribing
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {voiceStatus}
        </div>
      ) : null}
    </div>
  );
}
