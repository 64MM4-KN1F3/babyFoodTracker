import { toggleDot, updateBabyName, loadAllDotStates, showBabyNameForm, hideBabyNameFormAndShowChart, showAppContent, hideAppContent, updateUserEmailDisplay, showLoginButton, hideLoginButton, showLogoutButton, hideLogoutButton, showFooterControls, hideFooterControls, renderChildSelector, clearChildSelector } from './ui.js';
import { initializeFirebaseApp, signInWithGoogle, signOutUser, onAuthStateChangedHandler, getDb } from './auth.js';
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
initializeFirebaseApp(firebaseConfig);
const db = getDb(); // Get Firestore instance

// Firestore collection names
const USERS_COLLECTION = 'users';
const PROFILES_COLLECTION = 'profiles'; // This will be a subcollection under each user

// Helper functions for managing baby profiles with Firestore
async function getBabyProfiles(userId) {
  if (!userId) return [];
  try {
    const profilesRef = collection(db, USERS_COLLECTION, userId, PROFILES_COLLECTION);
    // const q = query(profilesRef, orderBy("createdAt", "asc")); // Optional: order by creation or name
    const q = query(profilesRef);
    const querySnapshot = await getDocs(q);
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
  if (!userId) return null;
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDocSnap = await getDoc(userDocRef);
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
  if (!userId) return;
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    // Ensure the user document exists or create it if it doesn't, then set activeBabyName
    await setDoc(userDocRef, { activeBabyName: name }, { merge: true });
  } catch (error) {
    console.error("Error setting active baby name:", error);
  }
}

async function addProfile(userId, name) {
  if (!userId || !name) return null;
  try {
    const profilesRef = collection(db, USERS_COLLECTION, userId, PROFILES_COLLECTION);
    const q = query(profilesRef, where("name", "==", name));
    const querySnapshot = await getDocs(q);

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
  if (!userId || !babyName) {
    console.warn("loadProfile called with missing userId or babyName. Active baby might not be set.");
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
  await setActiveBabyName(userId, selectedBabyName);
  await loadProfile(userId, selectedBabyName);
}

document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');

  if (loginButton) {
    loginButton.addEventListener('click', async () => {
      await signInWithGoogle();
      // Auth state change will handle UI updates
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await signOutUser();
      // Auth state change will handle UI updates
    });
  }

  onAuthStateChangedHandler(async user => { // Make callback async
    if (user) {
      // User is signed in
      const userId = user.uid;
      console.log("User signed in:", user.displayName, user.email, "ID:", userId);
      updateUserEmailDisplay(user.email);
      showLogoutButton();
      hideLoginButton();
      showAppContent();
      showFooterControls();

      // Fetch profiles and active baby name from Firestore
      let babyProfiles = await getBabyProfiles(userId);
      let activeBabyName = await getActiveBabyName(userId);

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
      console.log("User signed out.");
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
      event.preventDefault();
      const babyNameInput = document.getElementById('baby-name-input');
      const newBabyName = babyNameInput.value.trim();
      const user = auth.currentUser; // Get current user from auth directly

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
      event.preventDefault();
      const user = auth.currentUser;
      if (!user) {
        alert("Please log in to add a child.");
        return;
      }
      const userId = user.uid;
      const profiles = await getBabyProfiles(userId);
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
  const dots = document.querySelectorAll('.dot');
  dots.forEach(dot => {
    const newDot = dot.cloneNode(true); // Clone to remove old listeners
    dot.parentNode.replaceChild(newDot, dot);
    newDot.addEventListener('click', () => {
      // Pass userId and babyName (or profileId) to toggleDot eventually
      // For now, toggleDot in ui.js still uses localStorage for activeBabyName
      // This will be the next step to update.
      toggleDot(newDot, userId, babyName); // Modify toggleDot to accept these
    });
  });
}

function profilesContainName(profiles, name) {
    if (!profiles || !name) return false;
    return profiles.some(p => p.name === name);
}

// Expose auth for direct use if needed (e.g. in babyNameForm submit)
const auth = getAuth();