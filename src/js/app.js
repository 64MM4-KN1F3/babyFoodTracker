import { toggleDot, updateBabyName, loadAllDotStates, showBabyNameForm, hideBabyNameFormAndShowChart, showAppContent, hideAppContent, updateUserEmailDisplay, showLoginButton, hideLoginButton, showLogoutButton, hideLogoutButton, showFooterControls, hideFooterControls, renderChildSelector, clearChildSelector } from './ui.js';
import { initializeFirebaseApp, signInWithGoogle, signOutUser, onAuthStateChangedHandler, getDb, auth } from './auth.js';
import { collection, doc, getDoc, setDoc, addDoc, query, where, getDocs, updateDoc, arrayUnion, writeBatch, deleteDoc } from "firebase/firestore";

// Firebase configuration will be loaded from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
console.log("app.js: Firebase config prepared:", firebaseConfig);
initializeFirebaseApp(firebaseConfig);
console.log("app.js: Firebase initialization called.");
const db = getDb(); // Get Firestore instance
console.log("app.js: Firestore instance (db) obtained:", db);

// Firestore collection names
const USERS_COLLECTION = 'users';
const PROFILES_COLLECTION = 'profiles'; // This will be a subcollection under each user

// Helper functions for managing baby profiles with Firestore
async function getBabyProfiles(userId) {
  console.log(`app.js: getBabyProfiles called for userId: ${userId}`);
  if (!userId) {
    console.warn("app.js: getBabyProfiles - userId is null or undefined. Returning empty array.");
    return [];
  }
  try {
    console.log(`app.js: getBabyProfiles - Attempting to get profiles for user: ${userId}. DB object:`, db);
    const profilesRef = collection(db, USERS_COLLECTION, userId, PROFILES_COLLECTION);
    // const q = query(profilesRef, orderBy("createdAt", "asc")); // Optional: order by creation or name
    const q = query(profilesRef);
    console.log("app.js: getBabyProfiles - Query created:", q);
    const querySnapshot = await getDocs(q);
    console.log("app.js: getBabyProfiles - querySnapshot received:", querySnapshot);
    const profiles = [];
    querySnapshot.forEach((doc) => {
      profiles.push({ id: doc.id, ...doc.data() });
    });
    return profiles;
  } catch (error) {
    console.error("Error fetching baby profiles:", error);
    return [];
  }
}

// No direct saveBabyProfiles needed as we add/update individual profiles.

async function getActiveBabyName(userId) {
  console.log(`app.js: getActiveBabyName called for userId: ${userId}`);
  if (!userId) {
    console.warn("app.js: getActiveBabyName - userId is null or undefined. Returning null.");
    return null;
  }
  try {
    console.log(`app.js: getActiveBabyName - Attempting to get active baby name for user: ${userId}. DB object:`, db);
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);
    console.log("app.js: getActiveBabyName - userDocSnap received:", userDocSnap);
    if (userDocSnap.exists() && userDocSnap.data().activeBabyName) {
      return userDocSnap.data().activeBabyName;
    }
    return null;
  } catch (error) {
    console.error("Error fetching active baby name:", error);
    return null;
  }
}

async function setActiveBabyName(userId, name) {
  console.log(`app.js: setActiveBabyName called for userId: ${userId}, name: ${name}`);
  if (!userId) {
    console.warn("app.js: setActiveBabyName - userId is null or undefined. Aborting.");
    return;
  }
  try {
    console.log(`app.js: setActiveBabyName - Attempting to set active baby name for user: ${userId} to ${name}. DB object:`, db);
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    // Ensure the user document exists or create it if it doesn't, then set activeBabyName
    await setDoc(userDocRef, { activeBabyName: name }, { merge: true });
    console.log(`app.js: setActiveBabyName - Successfully set activeBabyName for ${userId} to ${name}.`);
  } catch (error) {
    console.error("Error setting active baby name:", error);
  }
}

async function addProfile(userId, name) {
  console.log(`app.js: addProfile called for userId: ${userId}, name: ${name}`);
  if (!userId || !name) {
    console.warn(`app.js: addProfile - userId (${userId}) or name (${name}) is missing. Returning null.`);
    return null;
  }
  try {
    console.log(`app.js: addProfile - Attempting to add profile for user: ${userId}, name: ${name}. DB object:`, db);
    const profilesRef = collection(db, USERS_COLLECTION, userId, PROFILES_COLLECTION);
    const q = query(profilesRef, where("name", "==", name));
    console.log("app.js: addProfile - Query for existing profile created:", q);
    const querySnapshot = await getDocs(q);
    console.log("app.js: addProfile - querySnapshot for existing profile:", querySnapshot);

    if (!querySnapshot.empty) {
      console.log(`Profile with name "${name}" already exists for user ${userId}.`);
      // Return the ID of the existing profile
      return querySnapshot.docs[0].id;
    }

    const newProfileRef = await addDoc(profilesRef, {
      name: name,
      createdAt: new Date() // Timestamp for ordering or reference
    });
    console.log("Profile added with ID: ", newProfileRef.id, "for user:", userId);
    return newProfileRef.id;
  } catch (error) {
    console.error("Error adding profile:", error);
    return null;
  }
}

async function loadProfile(userId, babyName) {
  console.log(`app.js: loadProfile called for userId: ${userId}, babyName: ${babyName}`);
  if (!userId || !babyName) {
    console.warn(`app.js: loadProfile called with missing userId (${userId}) or babyName (${babyName}). Active baby might not be set.`);
    updateBabyName('');
    loadAllDotStates(null, null); // Clear dots, will be updated for Firestore
    // Decide if we show form or just clear chart
    // showBabyNameForm(); // Or hide chart
    const foodChart = document.getElementById('food-chart-section');
    if(foodChart) foodChart.classList.add('hidden');
    return;
  }
  updateBabyName(babyName);
  // loadAllDotStates and initializeDotEventListeners will be updated to use Firestore
  // They will need userId and babyName (or a profileId if we decide to use that more directly)
  loadAllDotStates(userId, babyName);
  hideBabyNameFormAndShowChart();
  initializeDotEventListeners(userId, babyName);

  const profiles = await getBabyProfiles(userId);
  renderChildSelector(profiles, babyName, (selectedName) => handleChildSelection(userId, selectedName));
}

async function handleChildSelection(userId, selectedBabyName) {
  console.log(`app.js: handleChildSelection called for userId: ${userId}, selectedBabyName: ${selectedBabyName}`);
  await setActiveBabyName(userId, selectedBabyName);
  console.log("app.js: handleChildSelection - setActiveBabyName completed.");
  await loadProfile(userId, selectedBabyName);
  console.log("app.js: handleChildSelection - loadProfile completed.");
}

document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');

  if (loginButton) {
    loginButton.addEventListener('click', async () => {
      console.log("app.js: Login button clicked.");
      await signInWithGoogle();
      console.log("app.js: signInWithGoogle call completed.");
      // Auth state change will handle UI updates
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      console.log("app.js: Logout button clicked.");
      await signOutUser();
      console.log("app.js: signOutUser call completed.");
      // Auth state change will handle UI updates
    });
  }

  console.log("app.js: Setting up onAuthStateChangedHandler listener.");
  onAuthStateChangedHandler(async user => { // Make callback async
    console.log("app.js: onAuthStateChangedHandler callback triggered. User object:", user);
    if (user) {
      // User is signed in
      const userId = user.uid;
      console.log("app.js: User is signed in. Name:", user.displayName, "Email:", user.email, "ID:", userId);
      updateUserEmailDisplay(user.email);
      showLogoutButton();
      hideLoginButton();
      showAppContent();
      showFooterControls();

      // Fetch profiles and active baby name from Firestore
      let babyProfiles = await getBabyProfiles(userId);
      console.log("app.js: Fetching baby profiles and active baby name...");
      let activeBabyName = await getActiveBabyName(userId);
      console.log(`app.js: Fetched activeBabyName: ${activeBabyName}`);

      if (activeBabyName && profilesContainName(babyProfiles, activeBabyName)) {
        await loadProfile(userId, activeBabyName);
      } else if (babyProfiles.length > 0) {
        // Default to first profile if active one isn't set or valid
        activeBabyName = babyProfiles[0].name;
        await setActiveBabyName(userId, activeBabyName);
        await loadProfile(userId, activeBabyName);
      } else {
        // No profiles exist for this user yet
        showBabyNameForm();
        updateBabyName(''); // Clear any default name
        const foodChart = document.getElementById('food-chart-section');
        if(foodChart) foodChart.classList.add('hidden');
        // Ensure child selector is cleared if no profiles
        renderChildSelector([], null, (selectedName) => handleChildSelection(userId, selectedName));
      }
      // Initial render of child selector, potentially after loading/setting activeBabyName
      // loadProfile will call renderChildSelector, but if no profiles, call it here too.
      if (babyProfiles.length === 0) {
         renderChildSelector(babyProfiles, activeBabyName, (selectedName) => handleChildSelection(userId, selectedName));
      }


    } else {
      // User is signed out
      const userId = null; // Clear userId
      console.log("app.js: User is signed out.");
      updateUserEmailDisplay('');
      showLoginButton();
      hideLogoutButton();
      hideAppContent();
      hideFooterControls();
      clearChildSelector(); // Clear child selector on logout
      updateBabyName(''); // Clear baby name display
      // Note: localStorage for profiles is currently global.
      // If you want to clear it on logout, uncomment below.
      // localStorage.removeItem(PROFILES_STORAGE_KEY);
      // localStorage.removeItem(ACTIVE_BABY_STORAGE_KEY);
    }
  });

  // Event listener for the baby name form (for the first baby for the logged-in user)
  const babyNameForm = document.getElementById('baby-name-form');
  if (babyNameForm) {
    babyNameForm.addEventListener('submit', async (event) => { // Make async
      console.log("app.js: Baby name form submitted.");
      event.preventDefault();
      const babyNameInput = document.getElementById('baby-name-input');
      const newBabyName = babyNameInput.value.trim();
      console.log(`app.js: New baby name from form: '${newBabyName}'`);
      const user = auth.currentUser; // Get current user from auth directly
      console.log("app.js: Current user from auth.currentUser:", user);

      if (newBabyName && user) {
        const userId = user.uid;
        const profileId = await addProfile(userId, newBabyName);
        if (profileId) { // Check if profile was added or found
          await setActiveBabyName(userId, newBabyName);
          await loadProfile(userId, newBabyName);
          babyNameInput.value = ''; // Clear input
        } else {
          alert("Failed to add profile. It might already exist or an error occurred.");
        }
      } else if (!user) {
        alert("You must be logged in to add a baby.");
      }
    });
  }

  // Event listener for the "Add Child" link
  const addChildLink = document.getElementById('add-child-link');
  if (addChildLink) {
    addChildLink.addEventListener('click', async (event) => { // Make async
      console.log("app.js: Add child link clicked.");
      event.preventDefault();
      const user = auth.currentUser;
      console.log("app.js: Current user from auth.currentUser (add child):", user);
      if (!user) {
        console.warn("app.js: Add child - User not logged in.");
        alert("Please log in to add a child.");
        return;
      }
      const userId = user.uid;
      console.log(`app.js: Add child - Fetching profiles for userId: ${userId}`);
      const profiles = await getBabyProfiles(userId);
      console.log("app.js: Add child - Fetched profiles:", profiles);
      const existingNames = profiles.map(p => p.name).join(', ');
      const promptMessage = existingNames ? `Enter baby's name (existing: ${existingNames}):` : "Enter baby's name:";
      const newBabyName = window.prompt(promptMessage);

      if (newBabyName && newBabyName.trim() !== "") {
        const trimmedName = newBabyName.trim();
        // addProfile now handles checking for existing names and returns id
        const profileId = await addProfile(userId, trimmedName);

        if (profileId) {
          await setActiveBabyName(userId, trimmedName);
          await loadProfile(userId, trimmedName);
        } else {
          // This case should ideally be handled by addProfile showing a log
          // or if it returns null due to an error other than "already exists"
          alert("Failed to add or select profile. Please try again.");
        }
      }
    });
  }

  // Add event listeners for other footer menu items
  const statsLink = document.getElementById('stats-link');
  if (statsLink) {
    statsLink.addEventListener('click', (event) => {
      event.preventDefault();
      console.log("Stats clicked");
      // Future implementation for stats
    });
  }
});

function initializeDotEventListeners(userId, babyName) { // Add userId and babyName
  console.log(`app.js: initializeDotEventListeners called for userId: ${userId}, babyName: ${babyName}`);
  const dots = document.querySelectorAll('.dot');
  console.log(`app.js: Found ${dots.length} dots to attach listeners to.`);
  dots.forEach(dot => {
    const newDot = dot.cloneNode(true); // Clone to remove old listeners
    dot.parentNode.replaceChild(newDot, dot);
    newDot.addEventListener('click', () => {
      console.log(`app.js: Dot clicked for food: ${newDot.closest('li').dataset.foodId}, userId: ${userId}, babyName: ${babyName}`);
      // Pass userId and babyName (or profileId) to toggleDot eventually
      // For now, toggleDot in ui.js still uses localStorage for activeBabyName
      // This will be the next step to update.
      toggleDot(newDot, userId, babyName); // Modify toggleDot to accept these
    });
  });
  console.log("app.js: Dot event listeners initialized.");
}

function profilesContainName(profiles, name) {
    if (!profiles || !name) return false;
    return profiles.some(p => p.name === name);
}

// Expose auth for direct use if needed (e.g. in babyNameForm submit)
// const auth = getAuth(); // Removed as auth is now imported