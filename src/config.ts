export const config = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://stream_user:stream_pass@localhost:5432/stream_db',
  
  // Twitch EventSub Secret for HMAC-SHA256 signature verification
  TWITCH_EVENTSUB_SECRET: process.env.TWITCH_EVENTSUB_SECRET || 'dev_twitch_secret',
  
  // Facebook Meta Graph API Webhook App Secret & Verify Token
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || 'dev_fb_secret',
  FACEBOOK_VERIFY_TOKEN: process.env.FACEBOOK_VERIFY_TOKEN || 'dev_fb_verify_token',

  // Streamlabs Webhook Secret Token
  STREAMLABS_SECRET_TOKEN: process.env.STREAMLABS_SECRET_TOKEN || 'dev_streamlabs_token',

  // Grace period before ending stream session when 0 platforms are active (in ms)
  SESSION_GRACE_PERIOD_MS: Number(process.env.SESSION_GRACE_PERIOD_MS) || 3 * 60 * 1000, // 3 minutes
};
