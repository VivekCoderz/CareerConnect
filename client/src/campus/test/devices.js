// One camera and microphone stream for the whole test, so the device check and the test use the
// same permission (PRD R10: no camera or microphone, no test).

let stream = null;

export const getStream = () => (stream && stream.active ? stream : null);

/** Asks for camera and microphone; resolves with the stream or throws a readable error. */
export const requestDevices = async () => {
  if (getStream()) return stream;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot use a camera. Please use Chrome, Edge or Firefox on a laptop.");
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: true });
    return stream;
  } catch (error) {
    stream = null;
    if (error?.name === "NotAllowedError") {
      throw new Error("Camera and microphone access was blocked. Allow both in your browser's site settings (the camera icon in the address bar), then try again.", { cause: error });
    }
    if (error?.name === "NotFoundError") throw new Error("No camera or microphone was found on this device.", { cause: error });
    throw new Error("Could not start the camera and microphone. Close other apps that use the camera and try again.", { cause: error });
  }
};

export const stopDevices = () => {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
};

export const fullscreenSupported = () => Boolean(document.documentElement.requestFullscreen);

export const enterFullscreen = async () => {
  if (!fullscreenSupported() || document.fullscreenElement) return;
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    // Some browsers refuse outside a click; the runner shows a button to try again.
  }
};
