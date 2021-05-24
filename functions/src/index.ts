import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {onFixturePlayerStatCreate as playerStat} from "./player_stat";

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript
admin.initializeApp();
admin.firestore().settings({
  ignoreUndefinedProperties: true,
});

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

export const onFixturePlayerStatCreate = playerStat;

