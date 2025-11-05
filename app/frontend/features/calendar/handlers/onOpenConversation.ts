export function handleOpenConversation(args: {
  eventId: string;
  openConversation: (id: string) => void;
}): Promise<void> {
  args.openConversation(args.eventId);
  return Promise.resolve();
}
