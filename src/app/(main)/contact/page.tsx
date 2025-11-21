export const metadata = {
    title: 'Contact Us - FairNotes',
    description: 'Get in touch with FairNotes support team',
};

export default function ContactPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <h1 className="text-4xl font-bold mb-8">Contact Us</h1>

            <div className="prose prose-gray max-w-none">
                <div className="bg-card rounded-lg border p-6 mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
                    <p className="text-muted-foreground mb-4">
                        Have questions, concerns, or feedback? We're here to help!
                    </p>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium mb-2">Email Support</h3>
                            <a
                                href="mailto:fairnotes.helpdesk@gmail.com"
                                className="text-primary hover:underline text-lg"
                            >
                                fairnotes.helpdesk@gmail.com
                            </a>
                        </div>

                        <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                We typically respond within 24-48 hours during business days.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-4">What We Can Help With</h3>
                    <ul className="space-y-2 text-muted-foreground">
                        <li>✓ Account and login issues</li>
                        <li>✓ Payment and refund queries</li>
                        <li>✓ Content access problems</li>
                        <li>✓ Technical support</li>
                        <li>✓ General inquiries</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
