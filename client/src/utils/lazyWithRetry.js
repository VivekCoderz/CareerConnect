import { lazy } from "react";

export const lazyWithRetry = (importer) => lazy(async () => {
  try {
    const mod = await importer();
    sessionStorage.removeItem("cc_chunk_reload");
    return mod;
  } catch (err) {
    if (!sessionStorage.getItem("cc_chunk_reload")) {
      sessionStorage.setItem("cc_chunk_reload", "1");
      window.location.reload();
      return new Promise(() => {});
    }
    throw err;
  }
});
