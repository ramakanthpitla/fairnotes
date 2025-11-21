export const metadata = {
    title: 'Cancellations and Refunds - FairNotes',
    description: 'FairNotes cancellation and refund policy',
};

export default function RefundPolicyPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <h1 className="text-4xl font-bold mb-8">Cancellations and Refunds</h1>

            <div className="prose prose-gray max-w-none">
                <div className="bg-card rounded-lg border p-6 space-y-6">
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Refund Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If a payment is initiated and the amount is debited from the customer's bank account,
                            but the transaction fails due to processing issues on the bank or payment gateway's side,
                            the order will not be considered successful. In such cases, the debited amount is
                            reversed/refunded.
                        </p>
                    </section>

                    <section className="pt-4 border-t">
                        <h2 className="text-2xl font-semibold mb-4">Refund Process</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Customers will receive the refunded amount back into their original payment method
                            as per their bank's standard processing timelines.
                        </p>
                    </section>

                    <section className="pt-4 border-t">
                        <h3 className="text-xl font-semibold mb-3">Important Notes</h3>
                        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                            <li>Refunds are processed automatically for failed transactions</li>
                            <li>The refund timeline depends on your bank's processing schedule</li>
                            <li>Typically, refunds are credited within 5-7 business days</li>
                            <li>For any refund-related queries, please contact our support team</li>
                        </ul>
                    </section>

                    <div className="pt-6 border-t bg-muted/30 rounded-md p-4">
                        <p className="text-sm text-muted-foreground">
                            <strong>Need Help?</strong> Contact us at{' '}
                            <a
                                href="mailto:fairnotes.helpdesk@gmail.com"
                                className="text-primary hover:underline"
                            >
                                fairnotes.helpdesk@gmail.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
