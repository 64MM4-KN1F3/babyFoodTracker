// UI manipulation functions

const ACTIVE_BABY_STORAGE_KEY = 'babyfoodtracker_activeBabyName'; // Changed from BABY_NAME_STORAGE_KEY
const DOT_STORAGE_PREFIX = 'babyfoodtracker_dots';

/**
 * Toggles the 'dot-filled' class on a clicked dot element and saves its state.
 * @param {HTMLElement} dotElement - The dot element that was clicked.
 */
export function toggleDot(dotElement) {
  dotElement.classList.toggle('dot-filled');
  saveDotState(dotElement);
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
 * Saves the state of a single dot to localStorage, using the active baby's name.
 * @param {HTMLElement} dotElement - The dot element whose state needs to be saved.
 */
export function saveDotState(dotElement) {
  const foodLiElement = dotElement.closest('li[data-food-id]');
  if (!foodLiElement) {
    console.error('Could not find parent food item for dot:', dotElement);
    return;
  }
  const foodId = foodLiElement.dataset.foodId;
  const dotsInItem = Array.from(foodLiElement.querySelectorAll('.dot'));
  const dotIndex = dotsInItem.indexOf(dotElement);
  
  // Get the currently active baby's name
  const activeBabyName = localStorage.getItem(ACTIVE_BABY_STORAGE_KEY);

  if (!activeBabyName) {
    console.error('No active baby name found. Cannot save dot state.');
    // Optionally, prompt user to select or add a baby
    return;
  }

  if (foodId && dotIndex !== -1) {
    const key = `${DOT_STORAGE_PREFIX}_${activeBabyName}_${foodId}_${dotIndex}`;
    const isFilled = dotElement.classList.contains('dot-filled');
    localStorage.setItem(key, isFilled.toString()); // Store as string 'true' or 'false'
    console.log(`Saved dot state for ${activeBabyName}, ${foodId}, dot ${dotIndex}: ${isFilled}`);
  } else {
    console.error('Could not save dot state. Missing foodId or dotIndex.', { foodId, dotIndex, activeBabyName });
  }
}

/**
 * Loads the state of all dots for a given baby name from localStorage and applies it.
 * @param {string} babyName - The current baby's name.
 */
export function loadAllDotStates(babyName) {
  if (!babyName) {
    console.warn('loadAllDotStates called without a babyName. Clearing dots.');
    // Clear all dots if no babyName is provided, or handle as an error
    const allDots = document.querySelectorAll('.dot');
    allDots.forEach(dot => dot.classList.remove('dot-filled'));
    return;
  }
  console.log(`Loading dot states for ${babyName}`);
  const foodItems = document.querySelectorAll('li[data-food-id]');
  foodItems.forEach(foodLiElement => {
    const foodId = foodLiElement.dataset.foodId;
    const dotsInItem = foodLiElement.querySelectorAll('.dot');
    dotsInItem.forEach((dotElement, dotIndex) => {
      const key = `${DOT_STORAGE_PREFIX}_${babyName}_${foodId}_${dotIndex}`;
      const isFilled = localStorage.getItem(key);
      // Clear previous state before applying new one
      dotElement.classList.remove('dot-filled'); 
      if (isFilled === 'true') {
        dotElement.classList.add('dot-filled');
      }
      // No 'else' needed as we removed 'dot-filled' above
    });
  });
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