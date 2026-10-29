export type PlatformName = 
  | 'twitch' 
  | 'kick' 
  | 'youtube' 
  | 'tiktok' 
  | 'facebook' 
  | 'streamlabs';

export type EventType = 
  | 'chat_message'
  | 'follow'
  | 'subscription'
  | 'cheer'
  | 'donation'
  | 'raid'
  | 'gift';

export interface EventActor {
  id?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  badges?: string[];
}

export interface EventPayload {
  message?: string;
  emotes?: Record<string, string[]>;
  amount?: number;
  currency?: string;
  tier?: string;
  months?: number;
  viewersCount?: number;
  giftName?: string;
  giftCount?: number;
  rawPayload?: Record<string, any>;
}

export interface NormalizedEvent {
  id: string;
  sessionId?: string | null;
  platform: PlatformName;
  type: EventType;
  actor: EventActor;
  payload: EventPayload;
  timestamp: number;
}
