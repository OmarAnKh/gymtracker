import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RoutineProvider } from "./context/RoutineContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import TrainPage from "./pages/TrainPage";
import HistoryPage from "./pages/HistoryPage";
import ProgressPage from "./pages/ProgressPage";
import RoutinePage from "./pages/RoutinePage";

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={
        <ProtectedRoute><Layout><TrainPage /></Layout></ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute><Layout><HistoryPage /></Layout></ProtectedRoute>
      } />
      <Route path="/progress" element={
        <ProtectedRoute><Layout><ProgressPage /></Layout></ProtectedRoute>
      } />
      <Route path="/routine" element={
        <ProtectedRoute><Layout><RoutinePage /></Layout></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RoutineProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </RoutineProvider>
    </AuthProvider>
  );
}
