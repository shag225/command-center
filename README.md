# BulletJournal

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Firebase setup (Firestore persistence)

This app now stores journal data in **Firebase Firestore** instead of `localStorage`.

### 1) Install dependencies

```bash
npm install
```

### 2) Add your Firebase project config

Edit:

- `src/environments/environment.ts`

and replace placeholder values with your Firebase web app config from:

Firebase Console → Project Settings → Your apps → Web app config.

### 3) Firestore document used by the app

The app writes to:

- Collection: `bulletJournal`
- Document: `default`

Data is stored under the `journal` field.

### 4) One-time localStorage migration

On first load, if Firestore document `bulletJournal/default` does not exist and legacy local data exists under key:

- `bullet-journal-data-angular`

the app uploads that data to Firestore and removes the localStorage key.

If Firestore is unavailable, the app falls back to local/in-memory data for that session and logs warnings in the console.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
