'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { FeaturedProductsSection } from '@/components/home/featured-products-section';

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
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
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
                <Button size="lg" asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
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

          <div className="grid gap-8 md:grid-cols-3">
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
    </div>
  );
}
