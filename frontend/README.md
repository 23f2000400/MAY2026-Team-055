# NirogPath — Frontend Client

The frontend client for NirogPath is built with React 19, CRACO, Tailwind CSS, Radix UI primitives, and Lucide icons.

---

## 🛠️ Available Scripts

In the `frontend` directory, you can run:

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000).  
API calls made to `/api/*` are automatically proxied to the backend at `http://127.0.0.1:8000`.

### `npm run build`
Builds the app for production to the `build` folder using CRACO and Tailwind CSS optimizations.

### `npm test`
Launches the test runner in interactive watch mode.

---

## 📁 Key Directories

- `src/components/nirog/`: Modular healthcare domain components (Queue monitors, Slot booking modals, AI Doctor Recommender, Multilingual Prescription Q&A, Hospital maps).
- `src/components/ui/`: Reusable Radix UI & Tailwind design system primitives.
- `src/pages/`: Role-specific application views (Patient, Doctor, Receptionist, Admin/Hospital management, Public profiles).
- `src/lib/`: Authentication context (`AuthContext.jsx`), Axios API client (`api.js`), and i18n translation configuration (`i18n.js`).

