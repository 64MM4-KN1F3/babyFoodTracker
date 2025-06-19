import { toggleDot, updateBabyName, loadAllDotStates, showBabyNameForm, hideBabyNameFormAndShowChart } from './ui.js';

const PROFILES_STORAGE_KEY = 'babyfoodtracker_babyProfiles';
const ACTIVE_BABY_STORAGE_KEY = 'babyfoodtracker_activeBabyName';

// Helper functions for managing baby profiles
function getBabyProfiles() {
  const profiles = localStorage.getItem(PROFILES_STORAGE_KEY);
  return profiles ? JSON.parse(profiles) : [];
}

function saveBabyProfiles(profiles) {
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

function getActiveBabyName() {
  return localStorage.getItem(ACTIVE_BABY_STORAGE_KEY);
}

function setActiveBabyName(name) {
  localStorage.setItem(ACTIVE_BABY_STORAGE_KEY, name);
}

function addProfile(name) {
  const profiles = getBabyProfiles();
  if (!profiles.find(p => p.name === name)) {
    profiles.push({ name });
    saveBabyProfiles(profiles);
    return true;
  }
  return false; // Profile already exists
}

function loadProfile(babyName) {
  updateBabyName(babyName);
  loadAllDotStates(babyName);
  hideBabyNameFormAndShowChart();
  initializeDotEventListeners(babyName);
}

document.addEventListener('DOMContentLoaded', () => {
  let babyProfiles = getBabyProfiles();
  let activeBabyName = getActiveBabyName();

  if (activeBabyName) {
    loadProfile(activeBabyName);
  } else if (babyProfiles.length > 0) {
    activeBabyName = babyProfiles[0].name;
    setActiveBabyName(activeBabyName);
    loadProfile(activeBabyName);
  } else {
    showBabyNameForm();
    updateBabyName(''); // Clear any default name
  }

  // Event listener for the baby name form (for the first baby)
  const babyNameForm = document.getElementById('baby-name-form');
  if (babyNameForm) {
    babyNameForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const babyNameInput = document.getElementById('baby-name-input');
      const newBabyName = babyNameInput.value.trim();
      if (newBabyName) {
        addProfile(newBabyName); // Add as the first profile
        setActiveBabyName(newBabyName);
        loadProfile(newBabyName);
      }
    });
  }

  // Event listener for the "Add Child" link
  const addChildLink = document.querySelector('a[title="add child"]');
  if (addChildLink) {
    addChildLink.addEventListener('click', (event) => {
      event.preventDefault();
      const profiles = getBabyProfiles();
      const existingNames = profiles.map(p => p.name).join(', ');
      const promptMessage = existingNames ? `Enter baby's name (existing: ${existingNames}):` : "Enter baby's name:";
      const newBabyName = window.prompt(promptMessage);

      if (newBabyName && newBabyName.trim() !== "") {
        const trimmedName = newBabyName.trim();
        const profileExists = profiles.some(p => p.name === trimmedName);

        if (!profileExists) {
          addProfile(trimmedName);
        }
        // Whether new or existing, set as active
        setActiveBabyName(trimmedName);
        loadProfile(trimmedName); // This will update UI and load dots
      }
    });
  }

  // Add event listeners for other footer menu items (no changes needed here for this task)
  const statsLink = document.querySelector('a[title="first food stats"]');
  if (statsLink) {
    statsLink.addEventListener('click', (event) => {
      event.preventDefault();
      console.log("Stats clicked");
      // Future implementation for stats
    });
  }
});

function initializeDotEventListeners(babyName) { // babyName might not be strictly needed if ui.js always gets active
  const dots = document.querySelectorAll('.dot');
  dots.forEach(dot => {
    // Remove existing listener to prevent duplicates
    const newDot = dot.cloneNode(true);
    dot.parentNode.replaceChild(newDot, dot);

    newDot.addEventListener('click', () => {
      toggleDot(newDot); // ui.js will handle saving with the current activeBabyName
    });
  });
}