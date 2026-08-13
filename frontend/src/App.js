import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/lib/AuthContext";
import ErrorBoundary from "@/components/nirog/ErrorBoundary";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import BookingFlow from "@/pages/BookingFlow";
import PatientDashboard from "@/pages/PatientDashboard";
import BookingHistory from "@/pages/BookingHistory";
import Medicines from "@/pages/Medicines";
import DoctorDashboard from "@/pages/DoctorDashboard";
import ReceptionDashboard from "@/pages/ReceptionDashboard";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import PatientSettings from "@/pages/PatientSettings";
import DoctorSettings from "@/pages/DoctorSettings";
import SearchPage from "@/pages/SearchPage";
import CityLandingPage from "@/pages/CityLandingPage";
import DoctorPublicProfile from "@/pages/DoctorPublicProfile";
import HospitalPublicDetail from "@/pages/HospitalPublicDetail";
import PrintPrescription from "@/pages/PrintPrescription";
import FamilyProfiles from "@/pages/FamilyProfiles";
import DoctorQuestionsPage from "@/pages/DoctorQuestionsPage";
import WalletPage from "@/pages/WalletPage";
import LiveQueueStatus from "@/pages/LiveQueueStatus";
import NotFound from "@/pages/NotFound";

import AdminHospitalsDashboard from "@/pages/AdminHospitalsDashboard";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/city/:city" element={<CityLandingPage />} />
              <Route path="/doctors/:id" element={<DoctorPublicProfile />} />
              <Route path="/hospitals/:id" element={<HospitalPublicDetail />} />
              <Route path="/print/:prescriptionId" element={<PrintPrescription />} />
              <Route path="/app/patient" element={<PatientDashboard />} />
              <Route path="/app/patient/book" element={<BookingFlow />} />
              <Route path="/app/patient/queue" element={<LiveQueueStatus />} />
              <Route path="/app/patient/history" element={<BookingHistory />} />
              <Route path="/app/patient/medicines" element={<Medicines />} />
              <Route path="/app/patient/family" element={<FamilyProfiles />} />
              <Route path="/app/patient/settings" element={<PatientSettings />} />
              <Route path="/app/patient/wallet" element={<WalletPage />} />
              <Route path="/app/doctor" element={<DoctorDashboard />} />
              <Route path="/app/doctor/settings" element={<DoctorSettings />} />
              <Route path="/app/doctor/questions" element={<DoctorQuestionsPage />} />
              <Route path="/app/reception" element={<ReceptionDashboard />} />
              <Route path="/app/reception/analytics" element={<AnalyticsDashboard />} />
              <Route path="/app/admin/hospitals" element={<AdminHospitalsDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
