'use client';

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Terms &amp; Conditions (FairNotes)</h1>
          <p className="text-muted-foreground">Last updated: November 17, 2024</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Account Usage</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Students, professionals, and learners may access the platform to purchase or download resources.</li>
            <li>Users are responsible for maintaining the confidentiality of their login credentials.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Content Ownership</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>All materials remain the property of FairNotes or the respective content creators.</li>
            <li>You may not redistribute, resell, or republish content without authorization.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Purchase &amp; Access</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Purchased study materials provide time-limited access, with duration defined at purchase.</li>
            <li>Refunds are not provided for digital downloads.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. User Contributions</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>By submitting materials, you confirm that you own or have the rights to share the content.</li>
            <li>We may review, modify, or reject submissions that violate our guidelines.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Credits System</h2>
          <p className="text-muted-foreground">
            Uploaded submissions (if approved) earn credits redeemable for limited-time access to materials.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Restrictions</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Content must not infringe copyrights or contain inappropriate material.</li>
            <li>Accounts involved in abuse, fraud, or policy violations may be suspended without notice.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Updates</h2>
          <p className="text-muted-foreground">
            We may update these terms; continued use of FairNotes indicates acceptance of the latest version.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Contact</h2>
          <p className="text-muted-foreground">
            For support or questions, email{' '}
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
