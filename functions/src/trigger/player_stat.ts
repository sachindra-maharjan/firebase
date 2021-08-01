import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const onFixturePlayerStatCreate = functions.firestore
  .document(
    "/football/premierleague/leagues/{leagueId}" +
      "/fixtures/{fixtureId}/fixtureDetails/playerStatistics"
  )
  .onCreate(async (snapshot, context) => {
    const leagueId = context.params.leagueId;
    const fixtureId = context.params.fixtureId;
    functions.logger.info(`League id: ${leagueId} Fixuture Id: ${fixtureId}`);
    const data = snapshot.data();
    const homeTeam = data["homeTeam"];
    const awayTeam = data["awayTeam"];
    const promises = [];
    // teams collection
    try {
      const ref = snapshot.ref.parent.parent?.parent.parent;
      if (ref == null || ref == undefined) {
        return;
      }
      if (homeTeam.team_id) {
        const teamSnapshot = await ref
          .collection("/teams")
          .where("team_id", "==", homeTeam.team_id)
          .get();
        if (teamSnapshot.empty) {
          functions.logger.info("No matching team documents.");
        } else {
          const teamId: number = homeTeam.team_id;
          const h = updateAllPlayers(leagueId, teamId, homeTeam);
          promises.push(h);
        }
      }

      if (awayTeam.team_id) {
        const teamSnapshot = await ref
          .collection("/teams")
          .where("teamId", "==", awayTeam.team_id)
          .get();
        if (teamSnapshot.empty) {
          functions.logger.info("No matching team documents.");
        } else {
          const teamId: number = awayTeam.team_id;
          const a = updateAllPlayers(leagueId, teamId, awayTeam);
          promises.push(a);
        }
      }
      return await Promise.all(promises);
    } catch (err) {
      return Promise.reject(err);
    }
  });

/**
 * The async/await for loop
 * @param {any} array The array of elements
 * @param {any} callback The callback function for each element
 */
const asyncForEach = async (array: any, callback: any) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

// const wait = (ms: number) => {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// };

/**
 * Update player information in squad collection
 * @param {number} leagueId ID of a league
 * @param {number} teamId ID of a team
 * @param {any} team Team data
 * @param {QueryDocumentSnapshot} snapshot Snapshot of trigger document
 */
async function updateAllPlayers(leagueId: number, teamId: number, team: any) {
  const players = team["statistics"];
  const teamName = team["teamName"];
  functions.logger.info(`Total players for 
      team ${teamId} is ${players.length}`);
  const promises: any[] = [];
  try {
    const start = async () => {
      asyncForEach(players, async (player: any) => {
        const p = updatePlayer(leagueId, teamId, teamName, player);
        promises.push(p);
      });
    };
    start();
    return await Promise.all(promises);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Create or update a player data
 * @param {number} leagueId
 * @param {number} teamId
 * @param {string} teamName
 * @param {any} player
 */
async function updatePlayer(leagueId: number, teamId: number,
    teamName: string, player: any) {
  const playerId: string = player.player_id;
  const playerName: string = player.player_name;
  const teamDocumentId: string = getDocumentID("" + teamId, teamName);
  const playerDocumentId: string = getDocumentID(playerId, playerName);
  functions.logger.debug(`TeamID: ${teamId} PlayerID: ${playerId}`);
  const playerRef = admin.firestore()
      .collection("/football/premierleague/leagues/" +
          leagueId + "/teams/" + teamDocumentId + "/squad")
      .doc(playerDocumentId);
  const playerDocument = await playerRef.get();
  try {
    if (!playerDocument.exists) {
      functions.logger.info(`Player does not exist in team ${teamId}.
        Creating a new document for playerId: ${playerId}`);
      console.log("Player: %j", player);
      try {
        return playerRef.create(getPlayer(teamId,
            player, true));
      } catch (err) {
        functions.logger.info(`Player ${playerId} exists.`, err);
        functions.logger.info(`Updating Player ${playerId}`);
        try {
          return playerRef.update(playerUpdatedata(player));
        } catch (err) {
          functions.logger.error(`Error while updating player 
              ${playerId} from team ${teamId}`, err);
          return Promise.reject(new Error("Player could not be updated."));
        }
      }
    } else {
      functions.logger.debug(`Player ${playerId} updated.`);
      return playerRef.update(playerUpdatedata(player));
    }
  } catch (err) {
    functions.logger.error(err);
    return Promise.reject(new Error("Player update failed."));
  }
}

/**
 * Prepares data to update player statistics
 * @param {any} player
 * @return {FirebaseFirestore.UpdateData}
 */
function playerUpdatedata(player: any): FirebaseFirestore.UpdateData {
  const data:FirebaseFirestore.UpdateData = {
    "gamesPlayed": increment(played(player.minutesPlayed)),
    "minutesPlayed": increment(defaultVal(player.minutesPlayed)),
    "substitute": increment(getSubstituteVal(player.substitute)),
    "offsides": increment(defaultVal(player.offsides)),
    "shots.total": increment(defaultVal(player.shots.total)),
    "shots.on": increment(defaultVal(player.shots.on)),
    "fouls.committed": increment(defaultVal(player.fouls.committed)),
    "fouls.drawn": increment(defaultVal(player.fouls.drawn)),
    "goals.assists": increment(defaultVal(player.goals.assists)),
    "goals.total": increment(defaultVal(player.goals.total)),
    "goals.saves": increment(defaultVal(player.goals.saves)),
    "goals.conceded": increment(defaultVal(player.goals.conceded)),
    "passes.accuracy": increment(defaultVal(player.passes.accuracy)),
    "passes.total": increment(defaultVal(player.passes.total)),
    "passes.key": increment(defaultVal(player.passes.key)),
    "tackles.total": increment(defaultVal(player.tackles.total)),
    "tackles.blocks": increment(defaultVal(player.tackles.blocks)),
    "tackles.interceptions":
      increment(defaultVal(player.tackles.interceptions)),
    "duels.total": increment(defaultVal(player.duels.total)),
    "duels.won": increment(defaultVal(player.duels.won)),
    "dribbles.attempts": increment(defaultVal(player.dribbles.attempts)),
    "dribbles.success": increment(defaultVal(player.dribbles.success)),
    "dribbles.past": increment(defaultVal(player.dribbles.past)),
    "cards.yellow": increment(defaultVal(player.cards.yellow)),
    "cards.red": increment(defaultVal(player.cards.red)),
    "penalty.won": increment(defaultVal(player.penalty.won)),
    "penalty.success": increment(defaultVal(player.penalty.success)),
    "penalty.missed": increment(defaultVal(player.penalty.missed)),
    "penalty.committed": increment(defaultVal(player.penalty.committed)),
    "penalty.saved": increment(defaultVal(player.penalty.saved)),
  };
  return data;
}

/**
 * Get player for the team
 * @param {number} teamId The team ID
 * @param {any} currentData The current player data
 * @param {boolean} isNew The flag to identify create or update
 * @return {FirebaseFirestore.DocumentData} Firestore document data
 */
function getPlayer(teamId: number, currentData: any, isNew: boolean): any {
  const totalShots = defaultVal(currentData.shots.total);
  const shotsOnTarget = defaultVal(currentData.shots.on);
  const foulsCommitted = defaultVal(currentData.fouls.committed);
  const foulsDrawn = defaultVal(currentData.fouls.drawn);
  const goalsTotal = defaultVal(currentData.goals.total);
  const goalsSaves = defaultVal(currentData.goals.saves);
  const goalsAssists = defaultVal(currentData.goals.assists);
  const goalsConceded = defaultVal(currentData.goals.conceded);
  const passingAccuracy = defaultVal(currentData.passes.accuracy);
  const passingTotal = defaultVal(currentData.passes.total);
  const keyPasses = defaultVal(currentData.passes.key);
  const tackles = defaultVal(currentData.tackles.total);
  const blocks = defaultVal(currentData.tackles.blocks);
  const interceptions =
      defaultVal(currentData.tackles.interceptions);
  const duelsTotal = defaultVal(currentData.duels.total);
  const duelsWon = defaultVal(currentData.duels.won);
  const substitute = getSubstituteVal(currentData.substitute);
  const minutesPlayer = defaultVal(currentData.minutesPlayed);
  const dribblesAttempts = defaultVal(currentData.dribbles.attempts);
  const dribblesSuccess = defaultVal(currentData.dribbles.success);
  const dribblesPast = defaultVal(currentData.dribbles.past);
  const yellowCard = defaultVal(currentData.cards.yellow);
  const redCard = defaultVal(currentData.cards.red);
  const penaltyWon = defaultVal(currentData.penalty.won);
  const penaltyCommitted = defaultVal(currentData.penalty.committed);
  const penaltySaved = defaultVal(currentData.penalty.saved);
  const penaltySuccess = defaultVal(currentData.penalty.success);
  const penaltyMissed = defaultVal(currentData.penalty.missed);
  const offsides = defaultVal(currentData.offsides);
  const data: FirebaseFirestore.UpdateData = {};
  if (isNew) {
    data.playerId = currentData.playerId;
    data.playerName = currentData.playerName;
    data.teamId = teamId;
    data.position = currentData.position;
    data.number = currentData.number;
    data.minutesPlayed = currentData.minutesPlayed;
  }

  data.gamesPlayed = played(minutesPlayer);
  data.substitute = substitute;
  data.minutesPlayed = minutesPlayer;
  data.offsides = offsides;
  data.shots = {
    total: totalShots,
    on: shotsOnTarget,
  };
  data.fouls = {
    committed: foulsCommitted,
    drawn: foulsDrawn,
  };
  data.goals = {
    total: goalsTotal,
    saves: goalsSaves,
    assists: goalsAssists,
    conceded: goalsConceded,
  };
  data.passes = {
    accuracy: passingAccuracy,
    total: passingTotal,
    key: keyPasses,
  };
  data.tackles = {
    total: tackles,
    blocks: blocks,
    interceptions: interceptions,
  };
  data.duels = {
    total: duelsTotal,
    won: duelsWon,
  };
  data.dribbles = {
    attempts: dribblesAttempts,
    success: dribblesSuccess,
    past: dribblesPast,
  };
  data.cards = {
    yellow: yellowCard,
    red: redCard,
  };
  data.penalty = {
    won: penaltyWon,
    success: penaltySuccess,
    missed: penaltyMissed,
    committed: penaltyCommitted,
    saved: penaltySaved,
  };
  return data;
}

/**
 * Return default value when undefined
 * @param {number|undefined} value The value
 * @return {number} The passed value or default value
 */
function defaultVal(value: number | undefined): number {
  if (typeof value != "undefined" && value) {
    return value;
  }
  return 0;
}

/**
 * Return substitue value
 * @param {string|undefined} value The value
 * @return {number} The passed value or default value
 */
function getSubstituteVal(value: string | undefined): number {
  if (typeof value != "undefined" && value &&
        value.toLocaleLowerCase() == "true") {
    return 1;
  }
  return 0;
}

/**
 * Return Firebase.FieldValue increment
 * @param {number} val The number
 * @return {FirebaseFirestore.FieldValue}
 */
function increment(val: number): FirebaseFirestore.FieldValue {
  if (typeof val != "number") {
    console.log("Not a number", val);
    val = 0;
  }
  return admin.firestore.FieldValue.increment(val);
}

/**
 * Gets Document ID
 * @param {string} id
 * @param {string} name
 * @return {string} ID concatenated with Name
 */
function getDocumentID(id: string, name: string): string {
  return id + "#" + name.toLocaleUpperCase();
}

/**
 * Check if player played the game
 * @param {number} val
 * @return {boolean} 1 when val > 0, otherwise 0
 */
function played(val: number): number {
  return defaultVal(val) > 0 ? 1 : 0;
}
