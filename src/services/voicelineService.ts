import { HeroLookupTableEntry, VoicelineEmitMessage, PlusTiers, CasterLookupTableEntry } from "../types";
import heroesLookupTable from "../../public/data/heroesLookupTable.json";

const findLongestHeroAliasInCommand = (command: string): string => {
  return heroesLookupTable
      .flatMap((hero) => hero.name)
      .filter(alias => new RegExp(`\\b${alias}\\b`, "i").test(command))  // match 'alias' as a whole word in the command
      .reduce((a,b) => a.length > b.length ? a : b);  // take the longest hero alias string (if multiple matches)
};

const getCasterEntry = () => {
  const casterEntry = heroesLookupTable.find(entry => entry.entryType === 'Caster');
  if (!casterEntry){
    console.error("ERROR: EntryType 'Caster' not found in heroesLookupTable");
    return undefined;
  }

  return casterEntry;
};

export const getHeroEntryFromCommand = (command: string): HeroLookupTableEntry | undefined => {
  // Find longest hero alias that exists inside command
  // Then find hero entry that contains that hero alias

  if (command.includes('caster')) {
    console.log("ERROR: Command includes 'caster' when it should be a standard command");
    return undefined;
  }

  const matchedHeroAlias = findLongestHeroAliasInCommand(command);
  const matchedHero = heroesLookupTable
    .find(hero =>
      hero.name.includes(matchedHeroAlias) && hero.entryType === "Hero"
    ) as HeroLookupTableEntry | undefined;

  return matchedHero;
};

export const removeHeroAliasFromCommand = (command: string): string => {
  // Find longest hero alias that exists inside command
  // Then remove hero alias from command

  const matchedHeroAlias = findLongestHeroAliasInCommand(command);
  console.log(`Replacing '${matchedHeroAlias}' in '${command}'`);
  return command.replace(matchedHeroAlias + ' ', '');
};

export const getPlusTierFromCommand = (command: string): PlusTiers | '?' => {
  const plusTierMatcher = new RegExp(`${Object.values(PlusTiers).join('|')}`).exec(command);
  if (!plusTierMatcher) {
    return '?';
  }
  return plusTierMatcher[0] as PlusTiers | '?';
};

export const parseVoicelineRequest = (command: string): Omit<VoicelineEmitMessage, 'username'>[] => {
  const commandCategories = {
    allRandom: /^\?$/,  // !chatwheel ?
    caster: /^\bcaster\b /i, // !chatwheel caster 3
    standard: /^((\b[a-zA-Z]+\b ?)+?)(\?|\d+)?$/i,   // !chatwheel mars bronze 3
  };

  const parsedVoicelines = new Array<Omit<VoicelineEmitMessage, 'username'>>;

  /* Parse voiceline based on category */
  if (commandCategories.allRandom.test(command)) {
    // Random

    /* -----
    * RANDOM VOICELINE
    * ----- */

    console.log(`'${command}' is a Random voiceline`);
    const heroAliasList = heroesLookupTable
      .filter((hero) => hero.entryType === "Hero")
      .flatMap((hero) => hero.name);
    const plusTierList = Object.values(PlusTiers);

    const multicastChanceList = [
      { chance: 0.25, rolls: 1 },
      { chance: 0.45, rolls: 2 },
      { chance: 0.3, rolls: 3 },
    ];

    const multicastChanceRoll = Math.random();
    // Based on chance boundaries, get num of rolls
    const multicastRolls = multicastChanceList.reduce(
      (acc, current) => {
        acc.cumulativeChance += current.chance;
        if (
          acc.cumulativeChance >= multicastChanceRoll &&
          acc.numOfMulticastRolls === 0
        )
          acc.numOfMulticastRolls = current.rolls;
        return acc;
      },
      { cumulativeChance: 0, numOfMulticastRolls: 0 }
    );

    // Generate a random voiceline for each Multicast Roll and add it to parsedVoicelines
    [...Array(multicastRolls.numOfMulticastRolls).keys()].forEach(
      (_currentRoll) => {
        const heroEntryIndex = Math.floor(Math.random() * heroAliasList.length);
        const plusTierIndex = Math.floor(Math.random() * plusTierList.length);
        const randomHeroEntry = heroesLookupTable.find((hero) =>
          hero.name.includes(heroAliasList[heroEntryIndex])
        ) as HeroLookupTableEntry;

        if (!randomHeroEntry) {
          console.log(
            `Random Hero Entry could not be found for '${heroAliasList[heroEntryIndex]}'`
          );
          return parsedVoicelines;
        }

        const randomVoiceline = randomHeroEntry.plusVoicelines[
          plusTierList[plusTierIndex]
        ].at(
          Math.floor(
            Math.random() *
              randomHeroEntry.plusVoicelines[plusTierList[plusTierIndex]].length
          )
        );

        if (!randomVoiceline) {
          console.log(
            `Random Hero Entry voiceline could not be selected for '${heroAliasList[heroEntryIndex]} ${plusTierList[plusTierIndex]}'`
          );
          return parsedVoicelines;
        }

        parsedVoicelines.push({
          hero: {
            name: randomHeroEntry.name.at(-1) as string,
            avatar: randomHeroEntry.avatar,
          },
          plusTier: plusTierList[plusTierIndex],
          voiceline: {
            text: randomVoiceline.text,
            url: randomVoiceline.url,
          },
        });
        return;
      }
    );

    return parsedVoicelines;
  } else if (commandCategories.caster.test(command)) {

    /* -----
    * CASTER VOICELINE
    * ----- */

    console.log(`'${command}' is a Caster voiceline`);
    command = command.replace('caster ', '');

    let voicelineUrl, voicelineText;
    const castersEntry = heroesLookupTable.find(hero => hero.entryType === "Caster") as CasterLookupTableEntry;
    if (command === '?' || command === ''){
      // use random caster voiceline
      const randomCasterVoicelineIndex = Math.floor(Math.random() * castersEntry.casterVoicelines.length);
      if (!castersEntry.casterVoicelines[randomCasterVoicelineIndex]) {
        console.log(`ERROR: Caster entry ${randomCasterVoicelineIndex} is undefined`);
        return parsedVoicelines;
      }

      voicelineUrl = castersEntry.casterVoicelines[randomCasterVoicelineIndex].url;
      voicelineText = castersEntry.casterVoicelines[randomCasterVoicelineIndex].text;
    } else {
      // caster voiceline index is provided in command
      const voicelineIndex = Number(command);
      if (!voicelineIndex) {
        console.log(`ERROR: Can't convert ${command} to a voiceline index (number)`);
        return parsedVoicelines;
      }
      if (!castersEntry.casterVoicelines[voicelineIndex]) {
        console.log(`ERROR: Caster entry ${voicelineIndex} is undefined`);
        return parsedVoicelines;
      }
      voicelineUrl = castersEntry.casterVoicelines[voicelineIndex].url;
      voicelineText = castersEntry.casterVoicelines[voicelineIndex].text;
    }

    const casterEntry = getCasterEntry();
    if (!casterEntry) {
      console.error("ERROR: EntryType 'Caster' has 'avatar' attribute undefined");
      return parsedVoicelines;
    }

    parsedVoicelines.push({
      hero: {
        name: 'caster',
        avatar: casterEntry.avatar,
      },
      plusTier: 'caster',
      voiceline: {
        url: voicelineUrl,
        text: voicelineText
      }
    });
  } else if (commandCategories.standard.test(command)) {

    /* -----
    * STANDARD VOICELINE
    * ----- */

    console.log(`'${command}' is a Standard voiceline`);
    const matchedHero = getHeroEntryFromCommand(command);
    if (!matchedHero) {
      console.log(`getHeroEntryFromCommand('${command}') returned undefined`);
      return parsedVoicelines;
    }

    // Remove heroAlias from the command
    // plusTier and voicelineIndex remain within the command
    // eg. "dk bronze 2" -> "bronze 2"
    command = removeHeroAliasFromCommand(command);

    let matchedPlusTier = getPlusTierFromCommand(command);
    // if only "?" remains in the command, then command used to look like: "heroAlias ?"
    // eg. "dragonknight ?"
    if (command === '?' || matchedPlusTier === '?') {
      // plusTier was '?' in command
      matchedPlusTier = Object.values(PlusTiers)[(Math.floor(Math.random() * Object.values(PlusTiers).length))] as PlusTiers;
    }
    
    // Exec regex to get the voicelineIndex from the shortened command
    // eg. "bronze 2" will exec to regex group voicelineIndex with value "2"
    const standardMatcher = new RegExp(/^(\b[a-zA-Z]+\b)( (?<voicelineIndex>\d+|\?))?|(\?)$/, "i").exec(command);
    if (!standardMatcher) {
      console.log("standardMatcher RegExp returned null");
      return parsedVoicelines;
    }

    // if voicelineIndex is "?" or is omitted then use a random voicelineIndex
    // eg. "bronze ?" or "bronze"
    let matchedVoicelineIndex;
    if (standardMatcher.groups?.voicelineIndex === '?' || standardMatcher.groups?.voicelineIndex === undefined) { // voicelineIndex is undefined if plusTier was "?" eg: command -> "dk ?"
      const numOfVoicelinesAvailable = matchedHero.plusVoicelines[matchedPlusTier].length;
      matchedVoicelineIndex = Math.floor(Math.random() * numOfVoicelinesAvailable);
    } else {
      matchedVoicelineIndex = Number(standardMatcher.groups?.voicelineIndex);
    }
    
    if (!matchedHero.plusVoicelines[matchedPlusTier][matchedVoicelineIndex]) {
      console.log(`ERROR: hero ${matchedHero.name.at(-1)} voicelines at '${matchedPlusTier} ${matchedVoicelineIndex}' are undefined`);
      return parsedVoicelines;
    }

    parsedVoicelines.push({
      hero: {
        name: matchedHero.name.at(-1) as string,
        avatar: matchedHero.avatar,
      },
      plusTier: matchedPlusTier,
      voiceline: {
        text: matchedHero.plusVoicelines[matchedPlusTier][matchedVoicelineIndex].text,
        url: matchedHero.plusVoicelines[matchedPlusTier][matchedVoicelineIndex].url
      }
    });
  }

  return parsedVoicelines;
};
