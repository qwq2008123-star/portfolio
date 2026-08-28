import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import LoadingScreen from "../components/LoadingScreen";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Works from "../components/Works";
import Journal from "../components/Journal";
import Explorations from "../components/Explorations";
import Stats from "../components/Stats";
import Contact from "../components/Contact";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>

      <div className="min-h-screen bg-bg font-body text-text-primary">
        <Navbar />
        <main>
          <Hero />
          <Works />
          <Journal />
          <Explorations />
          <Stats />
        </main>
        <Contact />
      </div>
    </>
  );
}
