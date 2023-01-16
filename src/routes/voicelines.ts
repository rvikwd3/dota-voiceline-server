import express, { NextFunction, Request, Response } from "express";
import { findUserByApiKey } from "../services/userService";
import { parseVoicelineRequest } from "../services/voicelineService";
import { User } from "../types";
import { ParamsDictionary } from "express-serve-static-core";
import { decrementVoiceline } from "../utils";
const router = express.Router();

/* Types */
type QueueVoicelineRequest = Request<ParamsDictionary, never, { username: string; voiceline: string; }>;
type VoicelineRouterRequest = Request<Record<string, never>, Record<string, never>, Record<string, never>, { API_KEY: string }>;

interface Locals {
  user: User;
}
interface VoicelineRouterResponse extends Response {
  locals: Locals;
}

/* Middleware */
router.use( async (req: VoicelineRouterRequest, res: VoicelineRouterResponse, next: NextFunction) => {
  // API_KEY query parameter check middleware
  const {API_KEY} = req.query;
  if (!API_KEY) {
    res.status(401).json({ error: 'Unauthorized. No API_KEY provided.'});
    next('router');
  }

  const user = await findUserByApiKey(API_KEY);
  if (!user) {
    console.error(`Unauthorized. No user with API_KEY '${API_KEY}' found.`);
    res.status(401).json({ error: `Unauthorized. No user with API_KEY '${API_KEY}' found.`});
    next('router');
  } else {
    // All okay. Set user in Response object.
    res.locals.user = user;
  }

  next();
});

router.post("/queueVoiceline", (req: QueueVoicelineRequest, res: VoicelineRouterResponse) => {
  // Retrieve user from API_KEY check middleware
  const user = res.locals.user;

  // Retrieve '!chatwheel' callee twitch username
  const { username } = req.query;

  // Check if user-checking middleware returned 'undefined' for user
  if (!user) {
    console.log(`User provided to /queueVoiceline route was undefined. Aborting parsing voiceline.`);
    return;
  }

  const decrementedVoiceline = decrementVoiceline(req.body.voiceline.toString().toLowerCase());
  console.log("DECREMENTED: ",decrementedVoiceline);
  // Send voicelineAudio url, voiceline text, plusTier, heroName, username to obsBrowserSource
  const parsedVoicelines = parseVoicelineRequest(decrementedVoiceline);
  if (parsedVoicelines.length === 0) console.log(`No voiceline parsed from given POST body: ${decrementedVoiceline}`);
  console.log(`API Request twitch_name: ${user.twitchLogin}\n`, "Parsed voiceline: ", parsedVoicelines);

  const queueVoicelineMessage = parsedVoicelines.map(voiceline => ({ ...voiceline, username: username }));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  req.app.get('io').to(user.browserSourceId).emit("queueVoiceline", queueVoicelineMessage); // Emit message to room specified by browserSourceId
  return res.json({ queuedVoicelines: queueVoicelineMessage });
});

router.get("/queueVoiceline", (req: QueueVoicelineRequest, res: VoicelineRouterResponse) => {
  // Retrieve user from API_KEY check middleware
  const user = res.locals.user;

  // Retrieve '!chatwheel' callee twitch username
  const { username, voiceline } = req.query;

  // Check if user-checking middleware returned 'undefined' for user
  if (!user) {
    console.log(`User provided to /queueVoiceline route was undefined. Aborting parsing voiceline.`);
    return;
  }

  // Check if query parameters were defined in GET request
  if (!username || !voiceline) {
    console.error('Either a username or voiceline was not provided in the GET /queueVoiceline request');
    return;
  }

  const decrementedVoiceline = decrementVoiceline(voiceline.toString().toLowerCase());
  console.log("DECREMENTED: ",decrementedVoiceline);
  // Send voicelineAudio url, voiceline text, plusTier, heroName, username to obsBrowserSource
  const parsedVoicelines = parseVoicelineRequest(decrementedVoiceline);
  if (parsedVoicelines.length === 0) console.log(`No voiceline parsed from given POST body: ${decrementedVoiceline}`);
  console.log(`API Request twitch_name: ${user.twitchLogin}\n`, "Parsed voiceline: ", parsedVoicelines);

  const queueVoicelineMessage = parsedVoicelines.map(vl => ({ ...vl, username: username }));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  req.app.get('io').to(user.browserSourceId).emit("queueVoiceline", queueVoicelineMessage); // Emit message to room specified by browserSourceId
  return res.json({ queuedVoicelines: queueVoicelineMessage });
});

export default router;
