// UI manipulation functions
import { getDb } from './auth.js'; // Assuming getDb is exported from auth.js
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, collectionGroup } from "firebase/firestore";

// const ACTIVE_BABY_STORAGE_KEY = 'babyfoodtracker_activeBabyName'; // No longer needed here for active baby
// const DOT_STORAGE_PREFIX = 'babyfoodtracker_dots'; // No longer needed for localStorage

const USERS_COLLECTION = 'users';
const PROFILES_COLLECTION = 'profiles';
const DOTS_SUBCOLLECTION = 'dots'; // Subcollection for dot states within a profile

/**
 * Toggles the 'dot-filled' class on a clicked dot element and saves its state to Firestore.
 * @param {HTMLElement} dotElement - The dot element that was clicked.
 * @param {string} userId - The ID of the current user.
 * @param {string} babyName - The name of the current baby profile.
 */
export function toggleDot(dotElement, userId, babyName) {
  if (!userId || !babyName) {
    console.error("toggleDot called without userId or babyName. Cannot save state.");
    // Optionally, provide user feedback here (e.g., an alert)
    // For now, we'll still toggle the class visually but log an error.
    dotElement.classList.toggle('dot-filled'); // Visual toggle only
    return;
  }
  dotElement.classList.toggle('dot-filled');
  saveDotState(dotElement, userId, babyName);
}

/**
 * Updates the baby's name displayed on the page.
 * @param {string} name - The new name for the baby.
 */
export function updateBabyName(name) {
  const babyNameDisplay = document.getElementById('baby-name-display');
  if (babyNameDisplay) {
    babyNameDisplay.textContent = name ? `${name}'s Food Chart` : 'Baby Food Tracker'; // Default if no name
  }
}

/**
 * Saves the state of a single dot to Firestore.
 * @param {HTMLElement} dotElement - The dot element whose state needs to be saved.
 * @param {string} userId - The ID of the current user.
 * @param {string} babyName - The name of the current baby profile.
 */
export async function saveDotState(dotElement, userId, babyName) {
  if (!userId || !babyName) {
    console.error('saveDotState: Missing userId or babyName.');
    return;
  }
  const db = getDb();
  if (!db) {
    console.error("Firestore not initialized in saveDotState.");
    return;
  }

  const foodLiElement = dotElement.closest('li[data-food-id]');
  if (!foodLiElement) {
    console.error('Could not find parent food item for dot:', dotElement);
    return;
  }
  const foodId = foodLiElement.dataset.foodId;
  const dotsInItem = Array.from(foodLiElement.querySelectorAll('.dot'));
  const dotIndex = dotsInItem.indexOf(dotElement);

  if (foodId && dotIndex !== -1) {
    const isFilled = dotElement.classList.contains('dot-filled');
    // Path: users/{userId}/profiles/{babyName}/dots/{foodId}_{dotIndex}
    // We use babyName as the document ID for the profile subcollection for simplicity here.
    // A more robust approach might use a unique profile ID if names can change or are not unique.
    // For now, assuming babyName is unique per user as handled in app.js.
    const dotDocId = `${foodId}_${dotIndex}`;
    const dotDocRef = doc(db, USERS_COLLECTION, userId, PROFILES_COLLECTION, babyName, DOTS_SUBCOLLECTION, dotDocId);

    try {
      await setDoc(dotDocRef, { filled: isFilled }, { merge: true }); // merge:true in case other fields exist
      console.log(`Saved dot state to Firestore for user ${userId}, profile ${babyName}, dot ${dotDocId}: ${isFilled}`);
    } catch (error) {
      console.error('Error saving dot state to Firestore:', error);
    }
  } else {
    console.error('Could not save dot state. Missing foodId or dotIndex.', { foodId, dotIndex, userId, babyName });
  }
}

/**
 * Loads the state of all dots for a given baby name of a specific user from Firestore and applies it.
 * @param {string} userId - The ID of the current user.
 * @param {string} babyName - The current baby's name.
 */
export async function loadAllDotStates(userId, babyName) {
  const allDots = document.querySelectorAll('.dot');
  // Clear all dots visually first
  allDots.forEach(dot => dot.classList.remove('dot-filled'));

  if (!userId || !babyName) {
    console.warn('loadAllDotStates called without userId or babyName. Dots will remain cleared.');
    return;
  }

  const db = getDb();
  if (!db) {
    console.error("Firestore not initialized in loadAllDotStates.");
    return;
  }

  console.log(`Loading dot states from Firestore for user ${userId}, profile ${babyName}`);
  try {
    const dotsColRef = collection(db, USERS_COLLECTION, userId, PROFILES_COLLECTION, babyName, DOTS_SUBCOLLECTION);
    const querySnapshot = await getDocs(dotsColRef);

    const foodItemsMap = new Map();
    document.querySelectorAll('li[data-food-id]').forEach(li => {
        foodItemsMap.set(li.dataset.foodId, li);
    });

    querySnapshot.forEach((docSnap) => {
      const dotData = docSnap.data();
      const [foodId, dotIndexStr] = docSnap.id.split('_');
      const dotIndex = parseInt(dotIndexStr, 10);

      const foodLiElement = foodItemsMap.get(foodId);
      if (foodLiElement) {
        const dotsInItem = foodLiElement.querySelectorAll('.dot');
        if (dotIndex >= 0 && dotIndex < dotsInItem.length) {
          const dotElement = dotsInItem[dotIndex];
          if (dotData.filled) {
            dotElement.classList.add('dot-filled');
          } else {
            dotElement.classList.remove('dot-filled'); // Ensure it's removed if false
          }
        } else {
          console.warn(`Dot index ${dotIndex} out of bounds for foodId ${foodId}`);
        }
      } else {
        console.warn(`Food item with ID ${foodId} not found in DOM for dot ${docSnap.id}`);
      }
    });
    console.log(`Finished loading dot states for ${babyName}`);
  } catch (error) {
    console.error('Error loading dot states from Firestore:', error);
    // Ensure dots are cleared on error to avoid inconsistent state
    allDots.forEach(dot => dot.classList.remove('dot-filled'));
  }
}

/**
 * Shows the baby name form and hides the food chart.
 */
export function showBabyNameForm() {
    const formSection = document.getElementById('baby-name-form-section');
    const chartSection = document.getElementById('food-chart-section');
    if (formSection) formSection.classList.remove('hidden');
    if (chartSection) chartSection.classList.add('hidden');
    // Ensure baby name display is cleared or set to a default when form is shown
    const babyNameDisplay = document.getElementById('baby-name-display');
    if (babyNameDisplay) babyNameDisplay.textContent = 'Add First Baby';
}

/**
 * Hides the baby name form and shows the food chart.
 */
export function hideBabyNameFormAndShowChart() {
    const formSection = document.getElementById('baby-name-form-section');
    const chartSection = document.getElementById('food-chart-section');
    if (formSection) formSection.classList.add('hidden');
    if (chartSection) chartSection.classList.remove('hidden');
}

// --- Auth Related UI Functions ---

export function showAppContent() {
    const appContent = document.getElementById('app-content');
    if (appContent) appContent.classList.remove('hidden');
}

export function hideAppContent() {
    const appContent = document.getElementById('app-content');
    if (appContent) appContent.classList.add('hidden');
     // Also hide specific parts within app-content if they were shown
    const babyNameForm = document.getElementById('baby-name-form-section');
    const foodChart = document.getElementById('food-chart-section');
    if (babyNameForm) babyNameForm.classList.add('hidden');
    if (foodChart) foodChart.classList.add('hidden');
}

export function updateUserEmailDisplay(email) {
    const emailDisplay = document.getElementById('user-email-display');
    if (emailDisplay) {
        emailDisplay.textContent = email || '';
        email ? emailDisplay.classList.remove('hidden') : emailDisplay.classList.add('hidden');
    }
}

export function showLoginButton() {
    const loginButton = document.getElementById('login-button');
    if (loginButton) loginButton.classList.remove('hidden');
}

export function hideLoginButton() {
    const loginButton = document.getElementById('login-button');
    if (loginButton) loginButton.classList.add('hidden');
}

export function showLogoutButton() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) logoutButton.classList.remove('hidden');
}

export function hideLogoutButton() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) logoutButton.classList.add('hidden');
}

export function showFooterControls() {
    const addChildLink = document.getElementById('add-child-link');
    const statsLink = document.getElementById('stats-link');
    if(addChildLink) addChildLink.classList.remove('hidden');
    if(statsLink) statsLink.classList.remove('hidden');
}

export function hideFooterControls() {
    const addChildLink = document.getElementById('add-child-link');
    const statsLink = document.getElementById('stats-link');
    if(addChildLink) addChildLink.classList.add('hidden');
    if(statsLink) statsLink.classList.add('hidden');
}
export function showCoParentDropdown() {
    const coParentDropdown = document.getElementById('co-parent-dropdown');
    if (coParentDropdown) coParentDropdown.style.display = 'block';
}

export function hideCoParentDropdown() {
    const coParentDropdown = document.getElementById('co-parent-dropdown');
    if (coParentDropdown) coParentDropdown.style.display = 'none';
}

// --- Child Selector UI Functions ---

/**
 * Renders the child selector dropdown in the UI.
 * @param {Array<object>} profiles - Array of baby profile objects (e.g., [{name: 'Alice'}, {name: 'Bob'}]).
 * @param {string} activeProfileName - The name of the currently active baby.
 * @param {function} selectionCallback - Function to call when a child is selected.
 */
export function renderChildSelector(profiles, activeProfileName, selectionCallback) {
    const container = document.getElementById('child-selector-container');
    if (!container) {
        console.error('Child selector container not found.');
        return;
    }
    container.innerHTML = ''; // Clear previous selector

    if (!profiles || profiles.length <= 1) {
        container.classList.add('hidden'); // Hide if not needed
        return;
    }

    container.classList.remove('hidden'); // Show if needed

    const select = document.createElement('select');
    select.id = 'child-selector-dropdown';

    profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.name;
        option.textContent = profile.name;
        if (profile.name === activeProfileName) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    select.addEventListener('change', (event) => {
        selectionCallback(event.target.value);
    });

    container.appendChild(select);
}

/**
 * Clears the child selector from the UI.
 */
export function clearChildSelector() {
    const container = document.getElementById('child-selector-container');
    if (container) {
        container.innerHTML = '';
        container.classList.add('hidden');
    }
}

export async function getChildId(userId, babyName) {
  if (!userId || !babyName) {
    console.error('getChildId: Missing userId or babyName.');
    return null;
  }
  const db = getDb();
  if (!db) {
    console.error("Firestore not initialized in getChildId.");
    return null;
  }

  try {
    // The profile document ID is random, so we must query by name.
    const profilesRef = collection(db, USERS_COLLECTION, userId, PROFILES_COLLECTION);
    const q = query(profilesRef, where("name", "==", babyName));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Assuming name is unique per user, return the first match.
      return querySnapshot.docs[0].data().childId || null;
    } else {
      console.warn(`No profile found for ${babyName} under user ${userId}`);
      return null;
    }
  } catch (error) {
    console.error('Error getting child ID:', error);
    return null;
  }
}

/**
 * Sets up the event listener for the 'Add Child by ID' button.
 * @param {function} getAuth - A function that returns the auth instance.
 */
export function setupAddChildByIdListener(getAuth) {
  const addChildButton = document.getElementById('add-child-by-id-button');
  if (addChildButton) {
    addChildButton.addEventListener('click', async (e) => {
      e.preventDefault();
      const auth = getAuth();
      if (!auth || !auth.currentUser) {
        alert("You must be logged in to add a child.");
        return;
      }
      
      const childId = prompt("Please enter the Child ID to add:");
      if (childId) {
        await shareChildWithCurrentUser(childId, auth.currentUser.uid);
      }
    });
  }
}

/**
 * Finds a child by their ID and shares them with the current user.
 * @param {string} childId - The ID of the child to share.
 * @param {string} currentUserId - The UID of the current user.
 */
async function shareChildWithCurrentUser(childId, currentUserId) {
  const db = getDb();
  if (!db) {
    console.error("Firestore not initialized.");
    alert("An error occurred. Please try again later.");
    return;
  }

  // Use a collectionGroup query to find the child's profile across all users.
  const profilesRef = collectionGroup(db, PROFILES_COLLECTION);
  const q = query(profilesRef, where("childId", "==", childId));

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      alert("Child ID is invalid.");
      return;
    }

    // Assuming childId is unique, so we take the first result.
    const childDoc = querySnapshot.docs[0];
    // We get a reference to the specific document found by the collectionGroup query
    const childDocRef = doc(db, childDoc.ref.path);

    await updateDoc(childDocRef, {
      sharedWith: arrayUnion(currentUserId)
    });

    alert("Child added successfully!");
    // Optionally, refresh the list of children in the UI
    // This might involve calling a function from app.js
  } catch (error) {
    console.error("Error adding child:", error);
    alert("An error occurred while adding the child.");
  }
}

export function setupShowChildIdListener(auth, getActiveBabyName) {
  const showChildIdMenuItem = document.getElementById('show-child-id-menu-item');
  if (showChildIdMenuItem) {
    showChildIdMenuItem.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (user) {
        const babyName = await getActiveBabyName(); // Await the promise
        if (babyName) {
          const childId = await getChildId(user.uid, babyName);
          if (childId) {
            alert(`Child ID: ${childId}`);
          } else {
            alert('Could not retrieve Child ID.');
          }
        } else {
          alert('Please select a baby first.');
        }
      } else {
        alert('You must be logged in to see the Child ID.');
      }
    });
  }
}