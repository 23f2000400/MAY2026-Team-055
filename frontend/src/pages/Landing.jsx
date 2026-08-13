import React from "react";
import Nav from "@/components/nirog/Nav";
import Hero from "@/components/nirog/Hero";
import HospitalsSection from "@/components/nirog/HospitalsSection";
import ProblemSolution from "@/components/nirog/ProblemSolution";
import Features from "@/components/nirog/Features";
import QueueDemo from "@/components/nirog/QueueDemo";
import Journey from "@/components/nirog/Journey";
import Audience from "@/components/nirog/Audience";
import Stats from "@/components/nirog/Stats";
import Testimonials from "@/components/nirog/Testimonials";
import FAQ from "@/components/nirog/FAQ";
import CTAFooter from "@/components/nirog/CTAFooter";
import OfflineBanner from "@/components/nirog/OfflineBanner";

export default function Landing() {
  return (
    <div className="relative overflow-x-hidden" data-testid="home-page">
      <Nav />
      <main>
        <Hero />
        <HospitalsSection />
        <ProblemSolution />
        <Features />
        <QueueDemo />
        <Journey />
        <Audience />
        <Stats />
        <Testimonials />
        <FAQ />
        <CTAFooter />
      </main>
      <OfflineBanner />
    </div>
  );
}
