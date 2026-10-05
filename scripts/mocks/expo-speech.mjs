export const speak = (_text, options) => {
  if (options?.onDone) setTimeout(options.onDone, 10);
};
export const stop = () => {};
export const isSpeakingAsync = async () => false;

export default {
  speak,
  stop,
  isSpeakingAsync,
};
