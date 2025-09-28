## Baby Food Tracker 👶🍌

[ ] Feature to enable adding new foods
[ ] Add ability to add comments to food types with date captured in comment
[ ] add ability to "coparent" ie share 'admin' control with another user
@ - GCP config - restrict APIs for browser key in FoodTracker
[x] refactor to use .env to store creds for apps.js so we're not committing any secrets to the repo
[ ] add abilty to share a read-only link to child's food journey (without ability to view comments). Default share action should only give read access for 1 day however options for 1 week, 1 month or no time limit should be selectable.

[x] configure firestore in Firebase:
  The Firebase Firestore integration for data storage is now complete.
  Key changes include:
  *   **Firestore Initialization**: Firestore is now initialized alongside Firebase Authentication in [`src/js/auth.js`](src/js/auth.js:1).
  *   **Profile Management**: Baby profiles and the active baby's name are now stored and retrieved from Firestore. Functions like [`getBabyProfiles`](src/js/app.js:24), [`getActiveBabyName`](src/js/app.js:49), [`setActiveBabyName`](src/js/app.js:59), and [`addProfile`](src/js/app.js:70) in [`src/js/app.js`](src/js/app.js:1) have been updated to use Firestore collections (`users/{userId}/profiles/{babyName}`).
  *   **Food Chart Dot States**: The state of the tracking dots (filled or not) for each food item is now saved to and loaded from Firestore. The [`saveDotState`](src/js/ui.js:40) and [`loadAllDotStates`](src/js/ui.js:80) functions in [`src/js/ui.js`](src/js/ui.js:1) now interact with a subcollection in Firestore (`users/{userId}/profiles/{babyName}/dots/{foodId_dotIndex}`).
  *   **User-Specific Data**: All data (profiles, active baby, dot states) is now scoped to the authenticated user's ID.

  The application should now persist data using Firebase Firestore instead of `localStorage`. You will need to ensure your Firebase project (`foodtracker-70cf8` or your own) has Firestore enabled and appropriate security rules configured (for development, you might start with open rules and then secure them). The placeholder `firebaseConfig` in [`src/js/app.js`](src/js/app.js:6-13) should be updated with your actual Firebase project configuration details.
