import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import WelcomeScreen from "@/screens/WelcomeScreen";
import ItineraryScreen from "@/screens/ItineraryScreen";
import ExpensesScreen from "@/screens/ExpensesScreen";
import DocumentsScreen from "@/screens/DocumentsScreen";
import LocationScreen from "@/screens/LocationScreen";
import ChecklistScreen from "@/screens/ChecklistScreen";
import GalleryScreen from "@/screens/GalleryScreen";
import PollsScreen from "@/screens/PollsScreen";

export default function App() {
  const { user } = useAuthStore();

  if (!user) {
    return <WelcomeScreen />;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<ItineraryScreen />} />
        <Route path="/expenses" element={<ExpensesScreen />} />
        <Route path="/documents" element={<DocumentsScreen />} />
        <Route path="/location" element={<LocationScreen />} />
        <Route path="/checklist" element={<ChecklistScreen />} />
        <Route path="/gallery" element={<GalleryScreen />} />
        <Route path="/polls" element={<PollsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
