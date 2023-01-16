import { ApplicationError, CasterLookupTableEntry, HeroLookupTableEntry, HttpCode } from "./types";
import Keygrip from "keygrip";
import crypto from 'crypto';

/*
* Removed requirement for checking staleness
* Unnecessarily annoying to renew APIKeys every period of time
*/
// export const isUserLastAuthStale = (lastAuth: Date) => {
//   const staleThreshold = 30 * 24 * 60 * 60 * 1000;   // 30 days
//   const timeDiff = new Date().getTime() - lastAuth.getTime();
//   console.log(`Stale time difference: ${timeDiff / (1000 * 60 * 60 * 24)} days`);
//   return timeDiff > staleThreshold;
// };

export const isCasterEntry = (entry: HeroLookupTableEntry | CasterLookupTableEntry): entry is CasterLookupTableEntry => {
  if (!('casterVoicelines' in entry)) {
    console.log(`ERROR: HeroesLookupTable 'casters' either doesn't exist or doesn't have property 'casterVoicelines'`);
    return false;
  }
  if ('plusVoicelines' in entry) {
    console.log(`ERROR: Caster hero entry contains 'plusVoicelines' when it should not`);
    return false;
  }
  return true;
};

export const generateTwitchAuthUrl = () => {
  if (!process.env.KEYLIST){
    throw new ApplicationError({
      httpCode: HttpCode.INTERNAL_SERVER_ERROR,
      description: 'KEYLIST is not defined in the .env file'
    });
  }
  const keys = Keygrip(process.env.KEYLIST.split('\n'));

  // Generate a random string through Crypto
  const generatedHash = keys.sign(crypto.getRandomValues(Buffer.alloc(8)).toString('base64'));

  return [
    "https://id.twitch.tv/oauth2/authorize" +
    "?client_id=" + process.env.TW_CLIENT_ID +
    "&redirect_uri=" + process.env.TW_REDIRECT_URI +
    "&response_type=code" +
    "&force_verify=true" +
    `&state=${generatedHash}`,
    generatedHash];
};

export const generateNewApiKey = () => {
  if (!process.env.KEYLIST_API){
    throw new ApplicationError({
      httpCode: HttpCode.INTERNAL_SERVER_ERROR,
      description: 'KEYLIST_API is not defined in the .env file'
    });
  }
  const keys = Keygrip(process.env.KEYLIST_API.split('\n'));
  return keys.sign(crypto.getRandomValues(Buffer.alloc(16)).toString('base64'));
};

export const generateNewBrowserSourceId = () => {
  if (!process.env.KEYLIST_BROWSER_SOURCE_ID){
    throw new ApplicationError({
      httpCode: HttpCode.INTERNAL_SERVER_ERROR,
      description: 'KEYLIST_BROWSER_SOURCE_ID is not defined in the .env file'
    });
  }
  const keys = Keygrip(process.env.KEYLIST_BROWSER_SOURCE_ID.split('\n'));
  return keys.sign(crypto.getRandomValues(Buffer.alloc(16)).toString('base64'));
};

export const decrementVoiceline = (voiceline: string) => {
  const indexMatcher = / ([0-9]*[1-9])$/;

  const index = indexMatcher.exec(voiceline)?.[1];
  if (!index){
    console.error(`ERROR: Decrementing index of - ${voiceline}`);
  }
  return voiceline.replace(indexMatcher, index ? `${" "}${Number(index) - 1}` : '...');
};