import { useEffect, useState } from "react";
import Head from 'next/head';
import { OnboardingChecklist } from '../components/OnboardingChecklist';

export default function Home() {
	const [customerId, setCustomerId] = useState("");
	const [loading, setLoading] = useState(false);
	const [buyLoading, setBuyLoading] = useState(false);
	const [priceDisplay, setPriceDisplay] = useState<string | null>(null);
	const [seedMsg, setSeedMsg] = useState<string | null>(null);
	const [cfg, setCfg] = useState<{ priceDisplay?: string | null; stripeConfigured?: boolean } | null>(null);

	useEffect(() => {
		
		fetch("/api/config")
			.then((r) => r.json())
			.then((j) => { setPriceDisplay(j.priceDisplay || null); setCfg(j); })
			.catch(() => {});
	}, []);

	async function openPortal(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			const res = await fetch("/api/stripe/portal", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ customerId }),
			});
			const data = await res.json();
			if (data.url) window.location.href = data.url;
		} finally {
			setLoading(false);
		}
	}

	async function buyNow() {
		setBuyLoading(true);
		try {
			const res = await fetch("/api/checkout/create-session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			const j = await res.json();
			if (j.url) window.location.href = j.url;
		} finally {
			setBuyLoading(false);
		}
	}

	async function seedDemoData() {
		setSeedMsg('Seeding...');
		try {
			const r = await fetch('/api/dev/seed-demo', { method: 'POST' });
			if (!r.ok) throw new Error('seed failed ' + r.status);
			setSeedMsg('Seeded demo data. Open Admin to view dunning cases.');
		} catch (e: any) { setSeedMsg(e.message || 'error'); }
	}

	return (
			<>
				<Head>
					<title>Stripe Churn Deflection</title>
					<meta name="description" content="Reduce involuntary churn with billing portal and automated dunning." />
				</Head>
				<main className="container container--narrow">
			<h1>Stripe Churn Deflection</h1>
			<p>
				Recover lost revenue from failed payments. This kit wires Stripe Checkout & Billing Portal,
				automates dunning, and gives you an admin console with audit, metrics, and safe-mode.
			</p>
			<p className="mt-8">
				<a className="btn small mr-8" href="/pricing">See Pricing</a>
				<a className="btn small" href="/admin-login">Admin Login</a>
			</p>

			<div className="mb-20">
				<button className="btn" onClick={buyNow} disabled={!!(cfg && cfg.stripeConfigured === false)}>
					{buyLoading ? "Redirecting..." : priceDisplay ? `Buy Subscription (${priceDisplay})` : "Buy Subscription"}
				</button>
			</div>

			{process.env.NODE_ENV !== 'production' && (
				<div className="panel mb-20">
					<h3>Demo data</h3>
					<p>Seed a couple of users, a dunning case, and a recovered payment attribution.</p>
					<button className="btn small" onClick={seedDemoData}>Seed demo</button>
					{seedMsg && <div className="mt-2 mono">{seedMsg}</div>}
				</div>
			)}

			<OnboardingChecklist compact />

			<form onSubmit={openPortal} className="grid">
				<input
					placeholder="Stripe Customer ID (cus_...)"
					value={customerId}
					onChange={(e) => setCustomerId(e.target.value)}
					className="input"
				/>
				<button className="btn" disabled={!customerId || loading} type="submit">
					{loading ? "Opening..." : "Open Billing Portal"}
				</button>
							</form>
							<div className="mt-24">
								<a className="mr-8" href="/terms">Terms</a>
								<a href="/privacy">Privacy</a>
							</div>
				</main>
				</>
	);
}
