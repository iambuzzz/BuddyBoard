# TaskFlipper: A Next.js and Firebase Project

This is a web application built with Next.js, React, Tailwind CSS, and Firebase. It's designed for task management, user pairing, and group collaboration.

## Getting Started (For Local Development)

Follow these steps to get the project running on your local machine.

### 1. Prerequisites

- Make sure you have [Node.js](https://nodejs.org/) (v18 or later) installed.
- You will need your own Firebase project and a Gemini API Key.

### 2. Clone the Repository

First, clone the project from GitHub to your local machine:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <project-folder-name>
```

### 3. Install Dependencies

Install all the required npm packages:

```bash
npm install
```

### 4. Environment Setup

You need to set up your own Firebase and Gemini API credentials.

1.  **Create a `.env.local` file** in the root directory of the project.
2.  **Add your Gemini API Key** to this file:
    ```
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    ```
3.  **Set up a new Firebase project** in the [Firebase Console](https://console.firebase.google.com/).
    - Enable **Authentication** (with Email/Password provider).
    - Enable **Firestore Database**.
    - Deploy the rules from the `firestore.rules` file to this new project.
4.  **Get your Firebase configuration:**
    - In your Firebase project settings, create a new "Web App".
    - Copy the `firebaseConfig` object provided.
5.  **Update the Firebase config in the code:**
    - Open `src/firebase/index.ts`.
    - Replace the existing `firebaseConfig` object with the one you copied from your new Firebase project.

### 5. Run the Development Server

Now, you can run the app locally:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser to see the application running.

---

### Key Project Structure

- `src/app/`: Main application pages (using Next.js App Router).
- `src/components/`: Reusable React components.
- `src/firebase/`: Firebase configuration and custom hooks.
- `src/lib/`: Shared utilities and type definitions.
- `docs/backend.json`: Defines the data models for the app.
- `firestore.rules`: Security rules for the Firestore database.
- `package.json`: Lists all project dependencies.
