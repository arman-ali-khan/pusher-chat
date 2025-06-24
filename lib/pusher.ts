import Pusher from 'pusher-js';

let pusher: Pusher;

export function getPusher() {
  if (!pusher) {
    pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusher;
}

export function subscribeToChannel(channelName: string) {
  const pusherClient = getPusher();
  return pusherClient.subscribe(channelName);
}

export function unsubscribeFromChannel(channelName: string) {
  const pusherClient = getPusher();
  pusherClient.unsubscribe(channelName);
}