import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms & Conditions | OverTrain",
  description: "Review the terms that govern your use of the OverTrain application and services.",
}

const lastUpdated = "October 28, 2025"

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-16 lg:py-24">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Last updated: {lastUpdated}</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Terms &amp; Conditions</h1>
          <p className="text-lg text-muted-foreground">
            These Terms &amp; Conditions (&quot;Terms&quot;) form a legally binding agreement between you and LiftLog
            Technologies LLC (&quot;OverTrain,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) that governs
            your access to and use of the OverTrain mobile and web applications, website, and related services (the
            &quot;Services&quot;). By accessing or using the Services, you agree to be bound by these Terms.
          </p>
        </header>

        <div className="mt-12 space-y-12 text-base leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">1. Eligibility &amp; Account Registration</h2>
            <p>
              You must be at least 16 years old to use OverTrain. When you create an account, you agree to provide
              accurate, complete information and to keep it up to date. You are responsible for maintaining the
              confidentiality of your login credentials and for all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">2. Subscription &amp; Billing</h2>
            <p>
              OverTrain offers both free and premium tiers. If you purchase a subscription through the Apple App Store,
              Google Play Store, or our web checkout, the applicable store&apos;s terms and payment policies govern your
              transaction. Subscription fees are billed in advance on a recurring basis. You may cancel at any time in
              your store account settings; cancellations take effect at the end of the current billing period.
            </p>
            <p>
              We may change pricing or plan features with prior notice. If we change prices for existing subscribers, we
              will notify you at least 30 days in advance and give you the option to cancel before the change takes
              effect.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">3. Use of the Services</h2>
            <p>You agree to use OverTrain only for lawful purposes and in accordance with these Terms.</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Do not attempt to copy, reverse engineer, or resell the Services.</li>
              <li>Do not interfere with our systems or attempt to gain unauthorized access to any part of the Services.</li>
              <li>Do not upload content that is defamatory, infringing, or violates the rights of others.</li>
              <li>
                Do not use OverTrain in a manner that could harm yourself or others, including pushing beyond medically
                advised limits.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">4. Training &amp; Health Disclaimer</h2>
            <p>
              OverTrain provides training recommendations, analytics, and educational content. We do not provide medical
              advice. Consult your physician or a qualified health professional before starting any fitness program. You
              assume full responsibility for your training decisions. Stop using the Services immediately if you
              experience pain, dizziness, or shortness of breath and seek medical attention if needed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">5. User Content</h2>
            <p>
              You retain ownership of the data you log in OverTrain. By submitting content to the Services, you grant us
              a worldwide, non-exclusive, royalty-free license to host, store, and process that content solely for the
              purpose of operating and improving the Services. You represent that you have all rights necessary to
              submit the content and that it does not infringe any third-party rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">6. Intellectual Property</h2>
            <p>
              The Services, including all software, design elements, trademarks, and content produced by OverTrain, are
              owned by LiftLog Technologies LLC or our licensors. You receive a limited, non-transferable license to use
              the Services for personal, non-commercial purposes. All rights not explicitly granted are reserved.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">7. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Services if you violate these Terms or use
              the Services in a manner that could harm other users or OverTrain. You may delete your account at any time
              from Settings &gt; Data Controls or by contacting support@overtrain.app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">8. Disclaimers &amp; Limitation of Liability</h2>
            <p>
              The Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of
              any kind, express or implied. To the fullest extent permitted by law, OverTrain disclaims all warranties,
              including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
            <p>
              To the extent permitted by law, OverTrain will not be liable for any indirect, incidental, special,
              consequential, or punitive damages, or for any loss of profits or revenues, arising out of or related to
              your use of the Services. Our total liability for direct damages will not exceed the greater of fifty (50)
              U.S. dollars or the amounts you paid to us in the 12 months preceding the claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">9. Governing Law &amp; Dispute Resolution</h2>
            <p>
              These Terms are governed by the laws of the State of California, without regard to its conflict of laws
              principles. Any disputes arising under these Terms will be resolved through binding arbitration in San
              Francisco County, California, in accordance with the rules of the American Arbitration Association. You
              and OverTrain waive the right to participate in class actions or class-wide arbitration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">10. Changes to These Terms</h2>
            <p>
              We may revise these Terms to reflect updates to the Services or legal requirements. If we make material
              changes, we will notify you by email or through the Services. Continued use after changes become effective
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">11. Contact</h2>
            <p>
              If you have questions about these Terms, contact us at support@overtrain.app or by mail at LiftLog
              Technologies LLC, Attn: Legal, 100 Market Street, Suite 200, San Francisco, CA 94105.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
