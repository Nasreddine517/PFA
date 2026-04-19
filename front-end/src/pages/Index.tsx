import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import EliteBackground from "@/components/EliteBackground";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <EliteBackground />
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <Footer />
    </div>
  );
};

export default Index;
