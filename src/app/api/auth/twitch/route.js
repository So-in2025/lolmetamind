import { NextResponse } from 'next/server';

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_REDIRECT_URI = process.env.TWITCH_REDIRECT_URI;

export async function GET() {
  const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${TWITCH_REDIRECT_URI}&response_type=code&scope=openid`;
  return NextResponse.redirect(twitchAuthUrl);
}
