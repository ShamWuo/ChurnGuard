import { useEffect, useState } from "react";
import Head from 'next/head';

export default function Home() {
	const [customerId, setCustomerId] = useState("");
	const [loading, setLoading] = useState(false);
	const [buyLoading, setBuyLoading] = useState(false);
	const [priceDisplay, setPriceDisplay] = useState<string | null>(null);

	useEffect(() => {
		// fetch public config (price display) so UI reflects environment
		fetch("/api/config")
			.then((r) => r.json())
			.then((j) => setPriceDisplay(j.priceDisplay || null))
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

	return (
			<>
				<Head>
					<title>Stripe Churn Deflection</title>
					<meta name="description" content="Reduce involuntary churn with billing portal and automated dunning." />
				</Head>
				<main className="container container--narrow">
			<h1>Stripe Churn Deflection</h1>
			<p>
				Reduce involuntary churn by offering an easy billing portal and automated dunning
				notifications.
			</p>

			<div className="mb-20">
				<button className="btn" onClick={buyNow}>
					{buyLoading ? "Redirecting..." : priceDisplay ? `Buy Subscription (${priceDisplay})` : "Buy Subscription"}
				</button>
			</div>

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
