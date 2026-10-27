// Design tokens (colours, focus ring, radius) that every shared component reads.
import "./shared/tokens.css";
import { BrowserRouter } from "react-router";
import AppRoutes from "./routes/AppRoutes";
// useToast() works anywhere below this provider (e.g. "You're booked" on the Event detail page).
import { ToastProvider } from "./shared/ui/toast";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ToastProvider>
  );
}
