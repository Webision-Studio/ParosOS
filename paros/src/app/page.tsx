import { Ticker } from '@/components/landing/Ticker';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { InteractiveDemo } from '@/components/landing/InteractiveDemo';
import { SavingsCalculator } from '@/components/landing/SavingsCalculator';
import { Features } from '@/components/landing/Features';
import { Pricing } from '@/components/landing/Pricing';
import { Testimonials } from '@/components/landing/Testimonials';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      <Ticker />
      <Navbar />
      <main className="w-full">
        <Hero />
        <InteractiveDemo />
        <SavingsCalculator />
        <Features />
        <Pricing />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
