'use client';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Privacy Policy (FairNotes)</h1>
          <p className="text-muted-foreground">Last updated: November 17, 2024</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Account details such as name, email, and contact information provided during sign-up.</li>
            <li>Purchase history, usage activity, and access logs across the platform.</li>
            <li>Uploaded study materials, content submissions, and related metadata.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Deliver and improve our services, including access to purchased resources and platform features.</li>
            <li>Communicate updates, support responses, and relevant promotional content.</li>
            <li>Prevent unauthorized access, abuse, or violations of our policies.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Data Storage &amp; Security</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Data is stored on secure servers with industry-standard encryption practices.</li>
            <li>Uploaded materials are reviewed for quality, compliance, and policy adherence.</li>
            <li>Access to personal data is restricted to authorized FairNotes personnel only.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Purchases &amp; Payments</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Payments are processed through secure third-party provider Razorpay.</li>
            <li>FairNotes does not store full payment details like card numbers or CVV code.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Content Contributions</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Submitted materials are reviewed for quality and compliance before publication.</li>
            <li>Approved content may be listed publicly on the FairNotes marketplace.</li>
            <li>Rejected submissions are removed from our systems without crediting the associated account.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. User Rights</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>You may request updates or deletion of your account information by contacting our support team.</li>
            <li>You can ask for removal of previously uploaded materials that you own.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Cookies &amp; Tracking</h2>
          <p className="text-muted-foreground">
            We use essential cookies to maintain user sessions, improve performance, and analyze usage trends. You can
            manage cookie preferences through your browser settings.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Third-Party Links</h2>
          <p className="text-muted-foreground">
            FairNotes may display links to external websites. We are not responsible for the content or practices of
            those third-party platforms. Please review their policies before sharing personal information.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Contact Us</h2>
          <p className="text-muted-foreground">
            For privacy-related questions or requests, email{' '}
            <a className="text-primary underline underline-offset-4" href="mailto:fairnotes.helpdesk@gmail.com">
              fairnotes.helpdesk@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
