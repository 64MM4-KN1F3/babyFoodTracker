import { toggleDot, updateBabyName, loadAllDotStates, showBabyNameForm, hideBabyNameFormAndShowChart } from './ui.js';

const BABY_NAME_STORAGE_KEY = 'babyfoodtracker_babyName';

document.addEventListener('DOMContentLoaded', () => {
  const storedBabyName = localStorage.getItem(BABY_NAME_STORAGE_KEY);

  if (storedBabyName) {
    updateBabyName(storedBabyName);
    loadAllDotStates(storedBabyName);
    hideBabyNameFormAndShowChart();
    initializeDotEventListeners(storedBabyName);
  } else {
    showBabyNameForm();
    updateBabyName(''); // Clear any default name
  }

  // Event listener for the baby name form
  const babyNameForm = document.getElementById('baby-name-form');
  if (babyNameForm) {
    babyNameForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const babyNameInput = document.getElementById('baby-name-input');
      const newBabyName = babyNameInput.value.trim();
      if (newBabyName) {
        localStorage.setItem(BABY_NAME_STORAGE_KEY, newBabyName);
        updateBabyName(newBabyName);
        loadAllDotStates(newBabyName); // Load dots for the new/updated name
        hideBabyNameFormAndShowChart();
        initializeDotEventListeners(newBabyName); // Re-initialize if needed, or ensure they are general enough
      }
    });
  }

  // Add event listeners for footer menu items (no changes needed here for this task)
  const addChildLink = document.querySelector('a[title="add child"]');
  if (addChildLink) {
    addChildLink.addEventListener('click', (event) => {
      event.preventDefault();
      console.log("Add Child clicked");
      // Potentially clear localStorage or ask for a new name to switch profiles
      // For now, this is out of scope for the current task.
    });
  }

  const statsLink = document.querySelector('a[title="first food stats"]');
  if (statsLink) {
    statsLink.addEventListener('click', (event) => {
      event.preventDefault();
      console.log("Stats clicked");
    });
  }
});

function initializeDotEventListeners(babyName) {
  const dots = document.querySelectorAll('.dot');
  dots.forEach(dot => {
    // Remove existing listener to prevent duplicates if this function is called multiple times
    const newDot = dot.cloneNode(true);
    dot.parentNode.replaceChild(newDot, dot);

    newDot.addEventListener('click', () => {
      toggleDot(newDot); // ui.js will handle saving with the current babyName
    });
  });
}