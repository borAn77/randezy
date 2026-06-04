import { Hero } from "./components/Hero";
import { CalendarShowcase } from "./components/CalendarShowcase";
import { Stats } from "./components/Stats";
import { Features } from "./components/Features";
import { Industries } from "./components/Industries";
import { Pricing } from "./components/Pricing";
import { Navbar } from "./components/Navbar";

export default function App() {
  return (
    <div className="size-full overflow-auto bg-white">
      <Navbar />
      <Hero />
      <CalendarShowcase />
      <Stats />
      <Features />
      <Industries />
      <Pricing />
    </div>
  );
}