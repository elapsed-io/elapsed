/**
 * Gives the main thread back before going on (plan, Principles: loading never blocks the main thread): long work,
 * such as a mode's hundreds of animations, goes in slices, each a task of its own, so input and drawing come
 * between them. The browser's own yield where it has one; else a message to itself, a task behind those waiting.
 */
export async function nextTask(win: Window): Promise<void> {
  if ('scheduler' in win && 'yield' in win.scheduler) {
    await win.scheduler.yield();
    return;
  }
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}
