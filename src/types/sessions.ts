import type { PlatformName } from './events';

export type SessionStatus = 'live' | 'grace_period' | 'ended';

export interface StreamSession {
  id: string;
  title?: string;
  startedAt: string; // ISO String
  endedAt?: string | null;
  peakViewers: number;
  averageViewers: number;
  totalEvents: number;
  activePlatforms: PlatformName[];
  status: SessionStatus;
}

export interface PlatformLiveStatus {
  platform: PlatformName;
  isLive: boolean;
  viewers?: number | null; // null if unlinked/unconfigured
  title?: string;
}

export interface ViewerSnapshot {
  id?: number;
  sessionId?: string | null;
  twitchViewers?: number | null;
  kickViewers?: number | null;
  youtubeViewers?: number | null;
  tiktokViewers?: number | null;
  facebookViewers?: number | null;
  totalViewers: number;
  recordedAt: string; // ISO String
}
