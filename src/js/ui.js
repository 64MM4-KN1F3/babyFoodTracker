// UI manipulation functions

const BABY_NAME_STORAGE_KEY = 'babyfoodtracker_babyName';
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
    babyNameDisplay.textContent = name ? `${name}'s Food Chart` : '';
  }
}

/**
 * Saves the state of a single dot to localStorage.
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
  const babyName = localStorage.getItem(BABY_NAME_STORAGE_KEY) || 'default'; // Use default if no name set

  if (foodId && dotIndex !== -1) {
    const key = `${DOT_STORAGE_PREFIX}_${babyName}_${foodId}_${dotIndex}`;
    const isFilled = dotElement.classList.contains('dot-filled');
    localStorage.setItem(key, isFilled);
  }
}

/**
 * Loads the state of all dots for a given baby name from localStorage and applies it.
 * @param {string} babyName - The current baby's name.
 */
export function loadAllDotStates(babyName) {
  const foodItems = document.querySelectorAll('li[data-food-id]');
  foodItems.forEach(foodLiElement => {
    const foodId = foodLiElement.dataset.foodId;
    const dotsInItem = foodLiElement.querySelectorAll('.dot');
    dotsInItem.forEach((dotElement, dotIndex) => {
      const key = `${DOT_STORAGE_PREFIX}_${babyName}_${foodId}_${dotIndex}`;
      const isFilled = localStorage.getItem(key);
      if (isFilled === 'true') {
        dotElement.classList.add('dot-filled');
      } else {
        dotElement.classList.remove('dot-filled');
      }
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