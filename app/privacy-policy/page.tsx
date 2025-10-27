import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | OverTrain",
  description: "Understand how OverTrain collects, uses, and protects your personal data.",
}

const lastUpdated = "October 28, 2025"

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-16 lg:py-24">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Last updated: {lastUpdated}</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground">
            OverTrain by LiftLog Technologies LLC (&quot;OverTrain,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;) powers adaptive strength training experiences. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your information when you use the OverTrain mobile or web
            applications, our website, and related services (collectively, the &quot;Services&quot;).
          </p>
          <p className="text-muted-foreground">
            By accessing or using the Services you agree to this Privacy Policy. If you do not agree, please do not use
            the Services.
          </p>
        </header>

        <div className="mt-12 space-y-12 text-base leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Information We Collect</h2>
            <p>
              We collect information that you provide directly, data that is generated when you use the Services, and
              information from third parties you connect with OverTrain.
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Account and Profile Data:</strong> name, email address, gender, training goals, time zone, and
                authentication identifiers.
              </li>
              <li>
                <strong>Workout Activity:</strong> exercise selections, sets, reps, weights, perceived exertion, notes,
                program selections, and check-in responses.
              </li>
              <li>
                <strong>Device &amp; Usage Data:</strong> device type, operating system, app version, diagnostic logs,
                and interaction events that help us improve performance and stability.
              </li>
              <li>
                <strong>Purchase Data:</strong> subscription status, transaction identifiers, and billing history
                provided by Apple, Google, or Stripe when you activate premium features. We do not store full payment
                card numbers.
              </li>
              <li>
                <strong>Connected Services:</strong> if you link third-party health or fitness platforms, we may receive
                summary metrics (e.g., bodyweight, readiness scores) according to your permissions within those
                services.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">How We Use Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Deliver personalized programming, recommendations, and recovery insights</li>
              <li>Maintain, analyze, and improve the stability and performance of the Services</li>
              <li>Process transactions, provide subscription management, and detect fraudulent activity</li>
              <li>Send critical updates, training tips, and support communications</li>
              <li>Comply with legal obligations and enforce our Terms and Community Guidelines</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Sharing Your Information</h2>
            <p>We may share personal information in the following circumstances:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Service Providers:</strong> with trusted vendors who help us operate the Services (cloud hosting,
                analytics, customer support). These parties only access data to perform contracted work.
              </li>
              <li>
                <strong>Compliance &amp; Safety:</strong> with law enforcement or regulators when required by law or to
                protect the rights, property, or safety of OverTrain, our users, or others.
              </li>
              <li>
                <strong>Business Transfers:</strong> in connection with any merger, sale of assets, or acquisition. You
                will be notified if your information becomes subject to a different privacy policy.
              </li>
              <li>
                <strong>With Your Consent:</strong> when you authorize us to share specific data with third parties or
                social platforms.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide the Services. If
              you delete your account, we remove or anonymize personal data within 30 days unless we are required by law
              to keep it longer (for example, transaction records).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Your Rights &amp; Choices</h2>
            <p>You can manage your data in several ways:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Update account details and training preferences in the Profile tab</li>
              <li>Export workout history and analytics from Settings &gt; Data Controls</li>
              <li>Request deletion by contacting support@overtrain.app</li>
              <li>Manage notification preferences in Settings &gt; Notifications</li>
              <li>
                Revoke third-party integrations from Settings &gt; Connected Apps or through the provider&apos;s privacy
                dashboard
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Children&apos;s Privacy</h2>
            <p>
              OverTrain is not directed toward children under the age of 16, and we do not knowingly collect personal
              information from anyone under 16. If we learn that we have collected such data, we will delete it
              promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">International Data Transfers</h2>
            <p>
              OverTrain operates primarily in the United States. If you access the Services from outside the United
              States, you consent to the transfer and processing of your information in the United States and other
              countries where our service providers are located.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Security</h2>
            <p>
              We implement technical and organizational measures designed to protect your information, including
              encryption in transit, role-based access controls, automatic session timeouts, and continuous monitoring
              for suspicious activity. However, no system is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy to reflect changes in technology, legal requirements, or our practices.
              When we make changes, we will revise the &quot;Last updated&quot; date and notify you via in-app message
              or email when appropriate.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices, contact us at:
              <br />
              <strong>Email:</strong> support@overtrain.app
              <br />
              <strong>Mail:</strong> LiftLog Technologies LLC, 100 Market Street, Suite 200, San Francisco, CA 94105
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
