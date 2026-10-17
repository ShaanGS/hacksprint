// Hold-to-talk recording. The microphone is opened once, on the Start tap, so the permission
// prompt comes before the first order and every hold after it starts instantly. The recording is
// sent as the phone makes it: WebM on Chrome and Android, MP4 on iPhone, both of which Sarvam reads.

const PREFERRED_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

export type Recorder = {
  start(): void;
  /** The recording, or null if there was nothing to send. */
  stop(): Promise<Blob | null>;
};

/** Asks for the microphone. Call it from a tap; rejects if the customer says no. */
export async function openMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });
}

export function createRecorder(stream: MediaStream): Recorder {
  const mimeType = PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  return {
    start() {
      chunks = [];
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.start();
    },
    stop() {
      const active = recorder;
      recorder = null;
      if (!active || active.state === "inactive") return Promise.resolve(null);
      return new Promise((resolve) => {
        active.onstop = () => {
          const type = active.mimeType || mimeType || "audio/webm";
          resolve(chunks.length > 0 ? new Blob(chunks, { type }) : null);
        };
        active.stop();
      });
    },
  };
}
