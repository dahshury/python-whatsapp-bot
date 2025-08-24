export interface CallbackFactoryInput {
  isChangingHours: boolean;
  setIsChangingHours: (v: boolean) => void;
  isRTL: boolean;
  currentView: string;
  isVacationDate: (d: string) => boolean;
  openEditor: (opts?: any) => void;
  handleOpenConversation: (id: string) => void;
  handleEventChange: (eventId: string, updates: any) => void;
}

export type CallbackHandlers = CallbackFactoryInput;

export function createCallbackHandlers(input: CallbackFactoryInput): CallbackHandlers {
  return input;
}


