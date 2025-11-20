'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { FeaturedProductsSection } from '@/components/home/featured-products-section';
import { Award, Upload, Gift } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-b from-primary/10 to-background">
        <div className="container px-4 mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Premium Study Materials at Your Fingertips
            </h1>
            <p className="mb-10 text-lg text-muted-foreground md:text-xl">
              Access high-quality PDFs and video courses to boost your learning journey.
              Study at your own pace, anytime, anywhere.
            </p>
            <div className="flex flex-col justify-center space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              {!session ? (
                <>
                  <Button size="lg" asChild>
                    <Link href="/auth/signin">Get Started</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/#features">Learn More</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/browse">Browse All Materials</Link>
                  </Button>
                  <Button size="lg" asChild>
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Why Choose StudyMart?</h2>
            <p className="text-muted-foreground">
              We provide the best learning experience with our premium content and features.
            </p>
          </div>

          {/* Marketing Highlights */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-12 max-w-6xl mx-auto">
            {[
              { icon: '🎯', text: 'Ace Your Exams & Interviews — The Smart Way!' },
              { icon: '📘', text: 'B.Tech Notes for Semester Prep' },
              { icon: '💼', text: 'Interview-Ready Notes for Every Topic' },
              { icon: '🎓', text: 'Entrance Exam Preparation Made Simple' },
              { icon: '💰', text: 'All at a price lower than 1 GB of data!' },
              { icon: '⚡', text: 'Perfect for Quick Revision & Fast Lookup' },
              { icon: '📄', text: 'Get Ready-Made Written Notes & E-PDFs' },
              { icon: '⏰', text: 'Use your time wisely — focus on what truly matters' },
              { icon: '🏆', text: 'Result-Oriented. Time-Saving. Success-Driven.' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-sm font-medium text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-8 md:grid-cols-3 mt-12">
            {[
              {
                title: 'High-Quality Content',
                description: 'Access professionally curated study materials designed by experts in their fields.',
                icon: '📚',
              },
              {
                title: 'Flexible Learning',
                description: 'Study at your own pace with our easy-to-access digital materials.',
                icon: '⏱️',
              },
              {
                title: 'Secure Access',
                description: 'Your purchased content is protected and accessible only to you.',
                icon: '🔒',
              },
            ].map((feature, index) => (
              <div key={index} className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container px-4 mx-auto text-center">
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">Ready to Start Learning?</h2>
          <p className="max-w-2xl mx-auto mb-8 text-muted-foreground">
            Join thousands of students who are already advancing their knowledge with our premium study materials.
          </p>
          <Button size="lg" asChild>
            <Link href={session ? '/dashboard' : '/auth/signin'}>
              {session ? 'View My Library' : 'Get Started for Free'}
            </Link>
          </Button>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">Featured Study Materials</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Explore our handpicked selection of high-quality study materials to boost your learning journey.
              </p>
            </div>
            <FeaturedProductsSection />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to boost your learning?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already accelerating their learning with StudyMart.
          </p>
          <Button size="lg" asChild>
            <Link href={session ? '/browse' : '/auth/signin'}>
              {session ? 'Browse All Materials' : 'Get Started for Free'}
            </Link>
          </Button>
        </div>
      </section>

      {/* Contribute & Earn Credits Widget */}
      <section className="py-12">
        <div className="container px-4 mx-auto">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl border border-purple-500/40 bg-purple-500/10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(124,58,237,0.25)] overflow-hidden">
              <div className="md:flex">
                {/* Left side - Icon and Main Message */}
                <div className="md:w-2/5 bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 p-8 text-white flex flex-col justify-center items-center text-center">
                  <div className="bg-white/15 p-6 rounded-full mb-4 backdrop-blur-sm">
                    <Award className="w-16 h-16" />
                  </div>
                  <h3 className="text-3xl font-bold mb-2">Earn Credits!</h3>
                  <p className="text-purple-100 text-lg">Share & Get Rewarded</p>
                </div>

                {/* Right side - Details */}
                <div className="md:w-3/5 p-8 bg-gradient-to-br from-slate-900/20 via-slate-900/10 to-transparent lg:p-10">
                  <h4 className="text-2xl font-bold text-white mb-4">
                    Contribute & Access Premium Content Free
                  </h4>
                  <p className="text-white/70 mb-6">
                    Share your quality study materials with the community and earn credits to unlock any product for 60 days!
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="bg-white/10 p-2 rounded-lg backdrop-blur">
                        <Upload className="w-5 h-5 text-purple-200" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-white">Upload Your PDF</h5>
                        <p className="text-sm text-white/70">Submit high-quality study materials</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-white/10 p-2 rounded-lg backdrop-blur">
                        <Award className="w-5 h-5 text-blue-200" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-white">Get Approved</h5>
                        <p className="text-sm text-white/70">Our team reviews and approves quality content</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-white/10 p-2 rounded-lg backdrop-blur">
                        <Gift className="w-5 h-5 text-green-200" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-white">Earn 1 Credit</h5>
                        <p className="text-sm text-white/70">Use it to access any product for 60 days</p>
                      </div>
                    </div>
                  </div>

                  <Button size="lg" variant="secondary" className="w-full md:w-auto bg-white/10 text-white hover:bg-white/20" asChild>
                    <Link href={session ? '/contribute' : '/auth/signin?callbackUrl=/contribute'}>
                      Start Contributing Now
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer className="border-t bg-background">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8 text-center text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p className="font-medium text-foreground">Need help? Email us at{' '}
            <a className="text-primary underline underline-offset-4" href="mailto:fairnotes.helpdesk@gmail.com">
              fairnotes.helpdesk@gmail.com
            </a>
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link className="hover:text-primary underline underline-offset-4" href="/terms">
              Terms &amp; Conditions
            </Link>
            <Link className="hover:text-primary underline underline-offset-4" href="/privacy">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
