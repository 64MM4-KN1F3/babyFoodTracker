// Firebase App (the core Firebase SDK) is always required and must be listed first
import { initializeApp } from "firebase/app";
// Add the Firebase products that you want to use
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

let auth;

/**
 * Initializes the Firebase app and auth services.
 * @param {object} firebaseConfig - The Firebase configuration object.
 */
export function initializeFirebaseApp(firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log("Firebase initialized.");
}

/**
 * Signs in the user with Google using a popup.
 * @returns {Promise<UserCredential>}
 */
export async function signInWithGoogle() {
    if (!auth) {
        console.error("Firebase auth is not initialized.");
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        // This gives you a Google Access Token. You can use it to access the Google API.
        // const credential = GoogleAuthProvider.credentialFromResult(result);
        // const token = credential.accessToken;
        // The signed-in user info.
        // const user = result.user;
        console.log("Signed in user:", result.user.displayName);
        return result;
    } catch (error) {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        // const email = error.customData.email;
        // The AuthCredential type that was used.
        // const credential = GoogleAuthProvider.credentialFromError(error);
        console.error("Google Sign-In Error:", errorCode, errorMessage);
        alert(`Login failed: ${errorMessage}`);
    }
}

/**
 * Signs out the current user.
 * @returns {Promise<void>}
 */
export async function signOutUser() {
    if (!auth) {
        console.error("Firebase auth is not initialized.");
        return;
    }
    try {
        await signOut(auth);
        console.log("User signed out.");
    } catch (error) {
        console.error("Sign Out Error:", error);
        alert(`Logout failed: ${error.message}`);
    }
}

/**
 * Sets up a listener for authentication state changes.
 * @param {function} callback - Function to call when auth state changes.
 *                               It receives the user object (or null) as an argument.
 */
export function onAuthStateChangedHandler(callback) {
    if (!auth) {
        console.error("Firebase auth is not initialized. Cannot set auth state listener.");
        // Optionally, you could queue the callback or retry once auth is initialized.
        return () => {}; // Return a no-op unsubscriber
    }
    return onAuthStateChanged(auth, callback);
}