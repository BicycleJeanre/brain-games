# Firebase production setup

WTrack's cloud path is optional for players but required for cross-device account synchronization. The intended production resource is a dedicated Firebase project named `wtrack-bicycle`; do not reuse an unrelated application project.

Creating the project may create a billable cloud resource, so provisioning requires explicit owner approval. No service-account key belongs in this repository.

## Provisioning checklist

1. Create the isolated `wtrack-bicycle` Firebase project.
2. Register a Web app for the GitHub Pages client.
3. Enable Email/Password in Firebase Authentication.
4. Create the Firestore database in the appropriate production region.
5. Deploy `firestore.rules` and `firestore.indexes.json` from this repository.
6. Add the Web app's public identifiers to GitHub Actions as `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`.
7. Run the manual GitHub Pages deployment workflow from `main`.
8. Create a production test account, save puzzle progress, sign in from a second clean browser context, and confirm the progress restores.

The deploy workflow deliberately fails when any of the four public identifiers are absent. This prevents a release that appears account-enabled while silently falling back to device-only storage.

## Security model

Cloud state is stored only at `users/{uid}/state/app`. Firestore rules permit reads and writes only when the authenticated user's UID matches the path UID. CI tests both owner access and cross-user denial against the emulator before deployment.

The Firebase Web configuration identifies the client application and is safe to expose in the built browser bundle. Administrative credentials and service-account keys are secret and must not be added to GitHub Actions or committed to the repository.
