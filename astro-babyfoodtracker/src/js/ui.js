// UI manipulation functions
import { getDb } from './auth.js'; // Assuming getDb is exported from auth.js
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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
    dotElement.classList.toggle('dot-filled');
    return;
  }

  const foodLiElement = dotElement.closest('li[data-food-id]');
  const foodId = foodLiElement.dataset.foodId;
  const dotsInItem = Array.from(foodLiElement.querySelectorAll('.dot'));
  const dotIndex = dotsInItem.indexOf(dotElement);

  if (dotElement.classList.contains('dot-filled')) {
    if (window.confirm("Would you like to add a comment?")) {
      const comment = window.prompt("Enter your comment:");
      if (comment) {
        saveComment(userId, babyName, foodId, dotIndex, comment);
      }
    } else {
      dotElement.classList.remove('dot-filled');
      saveDotState(dotElement, userId, babyName);
    }
  } else {
    dotElement.classList.add('dot-filled');
    saveDotState(dotElement, userId, babyName);
  }
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

export async function saveComment(userId, babyName, foodId, dotIndex, comment) {
  if (!userId || !babyName || !foodId || dotIndex === -1 || !comment) {
    console.error('saveComment: Missing required parameters.');
    return;
  }
  const db = getDb();
  if (!db) {
    console.error("Firestore not initialized in saveComment.");
    return;
  }

  const dotDocId = `${foodId}_${dotIndex}`;
  const commentsColRef = collection(db, USERS_COLLECTION, userId, PROFILES_COLLECTION, babyName, DOTS_SUBCOLLECTION, dotDocId, 'comments');

  try {
    await addDoc(commentsColRef, {
      text: comment,
      createdAt: new Date(),
    });
    console.log(`Saved comment for dot ${dotDocId}: ${comment}`);
  } catch (error) {
    console.error('Error saving comment to Firestore:', error);
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