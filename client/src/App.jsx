import { Navigate, Route, Routes } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import KanbanPage from "./pages/KanbanPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import PortefeuillesPage from "./pages/PortefeuillesPage.jsx";
import RapportsPage from "./pages/RapportsPage.jsx";
import ReferentielsPage from "./pages/ReferentielsPage.jsx";
import DevisPage from "./pages/DevisPage.jsx";
import ClientsPage from "./pages/ClientsPage.jsx";
import ProspectionPage from "./pages/ProspectionPage.jsx";
import RecherchePage from "./pages/RecherchePage.jsx";
import CartePage from "./pages/CartePage.jsx";
import PipelineTemplatesPage from "./pages/PipelineTemplatesPage.jsx";
import ReunionsPage from "./pages/ReunionsPage.jsx";
import MaJourneePage from "./pages/MaJourneePage.jsx";
import ProfilPage from "./pages/ProfilPage.jsx";

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
    </div>
  );
}

function AccessDenied({ role }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-500/15">
        <ShieldAlert size={26} className="text-rose-500" />
      </div>
      <h2 className="text-lg font-bold">Accès non autorisé</h2>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Cette section ne fait pas partie de votre rôle « {role || "utilisateur"}{" "}
        ». Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.
      </p>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/contact/:id/:token" element={<ContactPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            user.role === "admin" ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <KanbanPage />
            )
          }
        />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/prospection"
          element={
            user.role === "admin" ? (
              <AccessDenied role={user.role} />
            ) : (
              <ProspectionPage />
            )
          }
        />
        <Route
          path="/recherche"
          element={
            user.role === "admin" ? (
              <AccessDenied role={user.role} />
            ) : (
              <RecherchePage />
            )
          }
        />
        <Route
          path="/carte"
          element={
            user.role === "admin" ? (
              <AccessDenied role={user.role} />
            ) : (
              <CartePage />
            )
          }
        />
        <Route
          path="/devis"
          element={
            user.role === "admin" ? (
              <AccessDenied role={user.role} />
            ) : (
              <DevisPage />
            )
          }
        />
        <Route
          path="/clients"
          element={
            user.role === "admin" ? (
              <AccessDenied role={user.role} />
            ) : (
              <ClientsPage />
            )
          }
        />
        <Route
          path="/team"
          element={
            user.role === "admin" ? (
              <TeamPage />
            ) : (
              <AccessDenied role={user.role} />
            )
          }
        />
        <Route
          path="/portefeuilles"
          element={
            user.role === "manager" ? (
              <PortefeuillesPage />
            ) : (
              <AccessDenied role={user.role} />
            )
          }
        />
        <Route
          path="/rapports"
          element={
            user.role === "admin" ? (
              <AccessDenied role={user.role} />
            ) : (
              <RapportsPage />
            )
          }
        />
        <Route
          path="/reunions"
          element={
            user.role === "admin" ? (
              <AccessDenied role={user.role} />
            ) : (
              <ReunionsPage />
            )
          }
        />
        <Route
          path="/journee"
          element={
            user.role === "admin" ? (
              <AccessDenied role={user.role} />
            ) : (
              <MaJourneePage />
            )
          }
        />
        <Route
          path="/referentiels"
          element={
            user.role === "admin" ? (
              <ReferentielsPage />
            ) : (
              <AccessDenied role={user.role} />
            )
          }
        />
        <Route
          path="/pipeline-templates"
          element={
            user.role === "admin" ? (
              <PipelineTemplatesPage />
            ) : (
              <AccessDenied role={user.role} />
            )
          }
        />
        <Route path="/profil" element={<ProfilPage />} />
        <Route
          path="*"
          element={
            <Navigate to={user.role === "admin" ? "/dashboard" : "/"} replace />
          }
        />
      </Routes>
    </Layout>
  );
}
