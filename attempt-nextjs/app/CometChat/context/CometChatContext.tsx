import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { CometChatSettings } from '../CometChatSettings';

interface CometChatContextInterface {
  chatFeatures: CometChatSettingsInterface['chatFeatures'];
  callFeatures: CometChatSettingsInterface['callFeatures'];
  styleFeatures: CometChatSettingsInterface['style'];
  layoutFeatures: CometChatSettingsInterface['layout'];
  setChatFeatures: React.Dispatch<React.SetStateAction<CometChatSettingsInterface['chatFeatures']>>;
  setCallFeatures: React.Dispatch<React.SetStateAction<CometChatSettingsInterface['callFeatures']>>;
  setStyleFeatures: React.Dispatch<React.SetStateAction<CometChatSettingsInterface['style']>>;
  setLayoutFeatures: React.Dispatch<React.SetStateAction<CometChatSettingsInterface['layout']>>;
}

interface CometChatProviderProps {
  children: ReactNode;
  authBuilderSetting?: CometChatSettingsInterface;
}
const CometChatContext = createContext<CometChatContextInterface | undefined>(undefined);

export const CometChatProvider: React.FC<CometChatProviderProps> = ({ children, authBuilderSetting }) => {
  const [chatFeatures, setChatFeatures] = useState<CometChatSettingsInterface['chatFeatures']>(
    CometChatSettings.chatFeatures
  );
  const [callFeatures, setCallFeatures] = useState<CometChatSettingsInterface['callFeatures']>(
    CometChatSettings.callFeatures
  );
  const [styleFeatures, setStyleFeatures] = useState<CometChatSettingsInterface['style']>(CometChatSettings.style);
  const [layoutFeatures, setLayoutFeatures] = useState<CometChatSettingsInterface['layout']>(CometChatSettings.layout);
  useEffect(() => {
    if (authBuilderSetting) {
      const { chatFeatures, callFeatures, layout, style } = authBuilderSetting;
      setChatFeatures(chatFeatures);
      setCallFeatures(callFeatures);
      setStyleFeatures(style);
      setLayoutFeatures(layout);
    } else if (CometChatSettings) {
      const { chatFeatures, callFeatures, layout, style } = CometChatSettings;
      setChatFeatures(chatFeatures);
      setCallFeatures(callFeatures);
      setStyleFeatures(style);
      setLayoutFeatures(layout);
    }
  }, [authBuilderSetting]);

  return (
    <CometChatContext.Provider
      value={{
        chatFeatures,
        callFeatures,
        styleFeatures,
        layoutFeatures,
        setChatFeatures,
        setCallFeatures,
        setStyleFeatures,
        setLayoutFeatures,
      }}
    >
      {children}
    </CometChatContext.Provider>
  );
};

export const useCometChatContext = () => {
  const context = useContext(CometChatContext);
  if (!context) throw new Error('useCometChatContext must be used within a CometChatProvider');
  return context;
};

export interface CometChatSettingsInterface {
  chatFeatures: {
    coreMessagingExperience: {
      typingIndicator: boolean;
      threadConversationAndReplies: boolean;
      photosSharing: boolean;
      videoSharing: boolean;
      audioSharing: boolean;
      fileSharing: boolean;
      editMessage: boolean;
      deleteMessage: boolean;
      messageDeliveryAndReadReceipts: boolean;
      userAndFriendsPresence: boolean;
    };
    deeperUserEngagement: {
      mentions: boolean;
      reactions: boolean;
      messageTranslation: boolean;
      polls: boolean;
      collaborativeWhiteboard: boolean;
      collaborativeDocument: boolean;
      voiceNotes: boolean;
      emojis: boolean;
      stickers: boolean;
      userInfo: boolean;
      groupInfo: boolean;
    };
    aiUserCopilot: {
      conversationStarter: boolean;
      conversationSummary: boolean;
      smartReply: boolean;
    };

    groupManagement: {
      createGroup: boolean;
      addMembersToGroups: boolean;
      joinLeaveGroup: boolean;
      deleteGroup: boolean;
      viewGroupMembers: boolean;
    };
    moderatorControls: {
      kickUsers: boolean;
      banUsers: boolean;
      promoteDemoteMembers: boolean;
    };
    privateMessagingWithinGroups: {
      sendPrivateMessageToGroupMembers: boolean;
    };
  };
  callFeatures: {
    voiceAndVideoCalling: {
      oneOnOneVoiceCalling: boolean;
      oneOnOneVideoCalling: boolean;
      groupVideoConference: boolean;
      groupVoiceConference: boolean;
    };
  };
  layout: {
    withSideBar: boolean;
    tabs: string[];
    chatType: string;
  };
  style: {
    theme: string;
    color: {
      brandColor: string;
      primaryTextLight: string;
      primaryTextDark: string;
      secondaryTextLight: string;
      secondaryTextDark: string;
    };
    typography: {
      font: string;
      size: string;
    };
  };
}

// THIS IS FOR THE USER & PRODUCT IDENTIFICATION FOR RUNNABLE APP, DO NOT DELETE

interface CometChatVisualBuilderReact {
  name: string;
  version: string;
}

declare global {
  interface Window {
    CometChatVisualBuilderReact: CometChatVisualBuilderReact;
  }
}

if (typeof window !== 'undefined') {
  window.CometChatVisualBuilderReact = {
    name: 'cometchat-visual-builder-react',
    version: '1.0.4',
  };
}
