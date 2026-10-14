import { Navigate, Route, Routes } from "react-router-dom";
import FormPage from "./pages/FormPage";
import Login from "./admin/Login";
import AdminGate from "./admin/AdminGate";
import SubmissionsList from "./admin/SubmissionsList";
import SubmissionDetail from "./admin/SubmissionDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FormPage />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminGate />}>
        <Route index element={<SubmissionsList />} />
        <Route path="respostas/:id" element={<SubmissionDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
