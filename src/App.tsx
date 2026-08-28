import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import LifeOS from "./pages/LifeOS";

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/life-os/*" element={<LifeOS />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
