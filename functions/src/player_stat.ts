import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {firestore} from "firebase-admin";

export const onFixturePlayerStatCreate = functions.firestore
    .document("/football-leagues/premierleague/leagues/{leagueId}" +
      "/fixtures/{fixtureId}/fixture_details/player_stat")
    .onCreate( async (snapshot, context) =>{
      const leagueId = context.params.leagueId;
      const fixtureId = context.params.fixtureId;
      functions.logger
          .info(`League id: ${leagueId} Fixuture Id: ${fixtureId}`);
      const data = snapshot.data();
      const homeTeam = data["home_team"];
      const awayTeam = data["away_team"];

      // teams collection
      const ref = snapshot.ref.parent.parent?.parent.parent;
      if (ref == null || ref == undefined) {
        return;
      }
      functions.logger.info("Path:" + ref.path);
      functions.logger.info(`Home Team ID: ${homeTeam.team_id}
         Away Team ID: ${awayTeam.team_id}`);

      if (homeTeam.team_id) {
        const teamSnapshot = await ref.collection("/teams")
            .where("team_id", "==", homeTeam.team_id).get();
        if (teamSnapshot.empty) {
          functions.logger.info("No matching team documents.");
        } else {
          functions.logger.debug("Home Team: " + homeTeam.team_id);
          const teamId: number = homeTeam.team_id;
          await updateAllPlayers(leagueId, teamId, homeTeam);
        }
      }

      if (awayTeam.team_id) {
        const teamSnapshot = await ref.collection("/teams")
            .where("team_id", "==", awayTeam.team_id).get();
        if (teamSnapshot.empty) {
          functions.logger.info("No matching team documents.");
        } else {
          functions.logger.debug("Home Team: " + homeTeam.team_id);
          const teamId: number = awayTeam.team_id;
          await updateAllPlayers(leagueId, teamId, awayTeam);
        }
      }
      return;
    });

/**
 * Update player information in squad collection
 * @param {number} leagueId ID of a league
 * @param {number} teamId ID of a team
 * @param {any} team Team data
 * @param {QueryDocumentSnapshot} snapshot Snapshot of trigger document
 */
async function updateAllPlayers(leagueId: number, teamId: number, team: any) {
  const players = team["statistics"];
  players.forEach(async function(player:any) {
    await updatePlayer(leagueId, teamId, player);
  });
}

/**
 * Create or update a player data
 * @param {number} leagueId
 * @param {number} teamId
 * @param {any} player
 */
async function updatePlayer(leagueId: number, teamId: number, player: any) {
  const playerId:string = player.player_id;
  functions.logger.info(`TeamID: ${teamId} PlayerID: ${playerId}`);
  const playerRef = admin.firestore()
      .collection("/football-leagues/premierleague/leagues/" +
          leagueId + "/teams/teamId_" + teamId + "/squad").doc(""+playerId);
  const transactionTask = async (transaction: firestore.Transaction) => {
    const playerDoc = await transaction.get(playerRef);
    if (!playerDoc.exists) {
      functions.logger.info(`Player does not exist in team ${teamId}.
        Creating a new document for playerId: ${playerId}`);
      return transaction.set(playerRef, getPlayer(teamId,
          player, undefined, true), {merge: true});
    } else {
      functions.logger.info(`Player exist with playerId: ${playerId}
         in team ${teamId}`);
      const data = playerDoc.data();
      if (data == undefined) {
        return Promise.reject(
            new Error(`Data not foundfor playerId ${playerId}`));
      } else {
        return transaction.update(playerRef,
            getPlayer(teamId, data, player, false));
      }
    }
  };

  // const wait = (ms: number) => {
  //   return new Promise((resolve) => setTimeout(resolve, ms));
  // };

  const wait = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  // const retrySlot = (retryCount: number) => {
  //   return retryCount * 500 % 10;
  // };

  const runTransaction = async (transactionTask: any, playerId: string,
      retryCount = 0): Promise<unknown> => {
    try {
      if (retryCount > 0) {
        functions.logger.info(`Retrying this transaction for ${retryCount}`);
      }
      const trans = await admin.firestore().runTransaction(transactionTask);
      functions.logger.info("Transaction success.", trans);
      return null;
    } catch (error) {
      functions.logger.warn(`Transaction failure. Retry count: ${retryCount}
          PlayerId: ${playerId}`, error);
      if (error.code === 10) {
        if (retryCount < 5) {
          retryCount++;
          functions.logger.error(`Transaction error occured. 
          Running it again after ${retryCount} retries.`);
          await wait(1000);
          return runTransaction(transactionTask, playerId, retryCount);
        }
      }
      return Promise.reject(new Error("Transaction could not be completed."));
    }
  };
  await runTransaction(transactionTask, playerId, 0);
}

/**
 * Get player for the team
 * @param {number} teamId The team ID
 * @param {any} currentData The current player data
 * @param {any} updateData The update player data
 * @param {boolean} isNew The flag to identify create or update
 * @return {FirebaseFirestore.DocumentData} Firestore document data
 */
function getPlayer(teamId: number, currentData: any,
    updateData: any, isNew: boolean): any {
  const data: FirebaseFirestore.DocumentData = {};
  let totalShots = defaultIfNotDefined(currentData.shots.total);
  let shotsOnTarget = defaultIfNotDefined(currentData.shots.on);
  let foulsCommitted = defaultIfNotDefined(currentData.fouls.committed);
  let foulsDrawn = defaultIfNotDefined(currentData.fouls.drawn);
  let goalsTotal = defaultIfNotDefined(currentData.goals.total);
  let goalsSaves = defaultIfNotDefined(currentData.goals.saves);
  let goalsAssists = defaultIfNotDefined(currentData.goals.assists);
  let goalsConceded = defaultIfNotDefined(currentData.goals.conceded);
  let passingAccuracy = defaultIfNotDefined(currentData.passes.accuracy);
  let passingTotal = defaultIfNotDefined(currentData.passes.total);
  let keyPasses = defaultIfNotDefined(currentData.passes.key);
  let tackles = defaultIfNotDefined(currentData.tackles.total);
  let blocks = defaultIfNotDefined(currentData.tackles.blocks);
  let interceptions = defaultIfNotDefined(currentData.tackles.interceptions);
  let duelsTotal = defaultIfNotDefined(currentData.duels.total);
  let duelsWon = defaultIfNotDefined(currentData.duels.won);
  let substitute = getSubstituteVal(currentData.substitute);
  let minutesPlayer = defaultIfNotDefined(currentData.minutes_played);
  let dribblesAttempts = defaultIfNotDefined(currentData.dribbles.attempts);
  let dribblesSuccess = defaultIfNotDefined(currentData.dribbles.success);
  let dribblesPast = defaultIfNotDefined(currentData.dribbles.past);
  let yellowCard = defaultIfNotDefined(currentData.cards.yellow);
  let redCard = defaultIfNotDefined(currentData.cards.red);
  let penaltyWon = defaultIfNotDefined(currentData.penalty.won);
  let penaltyCommitted = defaultIfNotDefined(currentData.penalty.committed);
  let penaltySaved = defaultIfNotDefined(currentData.penalty.saved);
  let penaltySuccess = defaultIfNotDefined(currentData.penalty.success);
  let penaltyMissed = defaultIfNotDefined(currentData.penalty.missed);

  if (isNew) {
    data.player_id = currentData.player_id;
    data.player_name = currentData.player_name;
    data.team_id = teamId;
    data.position = currentData.position;
    data.number = currentData.number;
    data.minutes_played = currentData.minutes_played;
  }
  if (updateData) {
    substitute += getSubstituteVal(updateData.substitue);
    minutesPlayer += defaultIfNotDefined(updateData.minutes_played);
    totalShots += defaultIfNotDefined(updateData.shots.total);
    shotsOnTarget += defaultIfNotDefined(updateData.shots.on);
    foulsCommitted += defaultIfNotDefined(updateData.fouls.committed);
    foulsDrawn += defaultIfNotDefined(updateData.fouls.drawn);
    goalsTotal += defaultIfNotDefined(updateData.goals.total);
    goalsSaves += defaultIfNotDefined(updateData.goals.saves);
    goalsAssists += defaultIfNotDefined(updateData.goals.assists);
    goalsConceded += defaultIfNotDefined(updateData.goals.conceded);
    passingAccuracy += defaultIfNotDefined(updateData.passes.accuracy);
    passingTotal += defaultIfNotDefined(updateData.passes.total);
    keyPasses += defaultIfNotDefined(updateData.passes.key);
    tackles += defaultIfNotDefined(updateData.tackles.total);
    blocks += defaultIfNotDefined(updateData.tackles.blocks);
    interceptions += defaultIfNotDefined(updateData.tackles.interceptions);
    duelsTotal += defaultIfNotDefined(updateData.duels.total);
    duelsWon += defaultIfNotDefined(updateData.duels.won);
    dribblesAttempts += defaultIfNotDefined(updateData.dribbles.attempts);
    dribblesSuccess += defaultIfNotDefined(updateData.dribbles.success);
    dribblesPast += defaultIfNotDefined(updateData.dribbles.past);
    yellowCard += defaultIfNotDefined(updateData.cards.yellow);
    redCard += defaultIfNotDefined(updateData.cards.red);
    penaltyWon += defaultIfNotDefined(updateData.penalty.won);
    penaltyCommitted += defaultIfNotDefined(updateData.penalty.committed);
    penaltySaved += defaultIfNotDefined(updateData.penalty.saved);
    penaltyMissed += defaultIfNotDefined(updateData.penalty.missed);
    penaltySuccess += defaultIfNotDefined(updateData.penalty.success);
  }

  data.substitue = substitute;
  data.minutes_played = minutesPlayer;
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
 * Get sum of two values
 * @param {any} currentPropertyValue Current property
 * @param {any} existingPropertyValue New Property
 * @return {number} Sum of two values
 */
// function getTotalValue(currentPropertyValue: any,
//     existingPropertyValue: any): number {
//   let sum = 0;
//   if (currentPropertyValue) {
//     sum += currentPropertyValue;
//   }
//   if (existingPropertyValue) {
//     sum += existingPropertyValue;
//   }
//   functions.logger.debug("Sum: " + sum);
//   return sum;
// }

/**
 * Return default value when undefined
 * @param {number|undefined} value The value
 * @return {number} The passed value or default value
 */
function defaultIfNotDefined(value: number | undefined): number {
  if (value) {
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
  if (value && value.toLocaleLowerCase() == "true") {
    return 1;
  }
  return 0;
}
