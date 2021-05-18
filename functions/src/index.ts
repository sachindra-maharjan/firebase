import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {QueryDocumentSnapshot}
  from "firebase-functions/lib/providers/firestore";

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript
admin.initializeApp();

export const getLeageInfo = functions.https.onRequest((request, response) => {
  admin.firestore()
      .doc("/football-leagues/premierleague")
      .get()
      .then((snapshot) =>{
        const data = snapshot.data();
        response.send(data);
      })
      .catch((error) =>{
        functions.logger.error(error);
        response.status(500).send(error);
      });
});

export const getAllPLInfo = functions.https.onRequest((request, response) =>{
  admin.firestore()
      .doc("/football-leagues/premierleague")
      .collection("/leagues").listDocuments()
      .then((snaphosts) => {
        const promises: Promise<FirebaseFirestore
              .DocumentSnapshot<FirebaseFirestore.DocumentData>>[] = [];
        snaphosts.forEach((snapshot) =>{
          const p = snapshot.get();
          promises.push(p);
        });
        return Promise.all(promises);
      })
      .then((leagues) =>{
        const result: FirebaseFirestore.DocumentData = [];
        leagues.forEach((league) =>{
          const data = league.data();
          result.push(data);
        });
        response.send(result);
      })
      .catch((error) =>{
        functions.logger.error(error);
        response.status(500).send(error);
      });
});

export const onFixturePlayerStatCreate = functions.firestore
    .document("/football-leagues/premierleague/leagues/{leagueId}" +
      "/fixtures/{fixtureId}/fixture_details/player_stat")
    .onCreate( async (snapshot, context) =>{
      const leagueId = context.params.leagueId;
      const fixtureId = context.params.fixtureId;
      functions.logger
          .info(`League id: ${leagueId} Fixuture Id: ${fixtureId}`);
      const data = snapshot.data();
      functions.logger.info(data);

      const homeTeam = data["home_team"];
      const awayTeam = data["away_team"];

      if (homeTeam != null) {
        const teamId: number = homeTeam.team_id;
        updatePlayer(teamId, homeTeam, snapshot);
      }

      if (awayTeam != null) {
        const teamId: number = homeTeam.team_id;
        updatePlayer(teamId, awayTeam, snapshot);
      }
      return;
    });

/**
 * Update player information in squad collection
 * @param {number} teamId ID of a team
 * @param {any} team Team data
 * @param {QueryDocumentSnapshot} snapshot Snapshot of trigger document
 * @return {void}
 */
async function updatePlayer(teamId: number,
    team: any,
    snapshot: QueryDocumentSnapshot) : Promise<void> {
  try {
    const ref = snapshot.ref.parent.parent?.parent.parent;

    if (ref == null || ref == undefined) {
      return;
    }

    const teamSnapshot = await ref.collection("/teams")
        .where("team_id", "==", teamId).get();
    if (teamSnapshot.empty) {
      functions.logger.info("No matching team documents.");
      return;
    }

    const players:string[] = team["statistics"];
    players.forEach(function(player) {
      functions.logger.info("Player: " + player);
    });
  } catch (err) {
    functions.logger.error(err);
  }
  return;
}

