import { DatabaseUser, User } from "./types";

export const isDbUser = (dbUser: object): dbUser is DatabaseUser => {
  return ("api_key" in dbUser
    && "twitch_id" in dbUser
    && "twitch_login" in dbUser
    && "browser_source_id" in dbUser
    && "last_authenticated" in dbUser
  );
};

export const convertDbUserToUser = (dbUser: DatabaseUser): User => {
  return {
    apiKey: dbUser.api_key,
    twitchId: dbUser.twitch_id,
    twitchLogin: dbUser.twitch_login,
    browserSourceId: dbUser.browser_source_id,
    lastAuthenticated: dbUser.last_authenticated,
  };
};
