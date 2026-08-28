import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { ToastProvider } from "./components/Toast";
import { SubmitPage } from "./pages/SubmitPage";
import { AdminPage } from "./pages/AdminPage";
import { MySubmissionsPage } from "./pages/MySubmissionsPage";

export function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-dot-grid">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<SubmitPage />} />
            <Route path="/mine" element={<MySubmissionsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
