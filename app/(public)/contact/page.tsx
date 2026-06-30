"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <div className="page-shell section-pad grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <span className="eyebrow">Contact Control Hub</span>
        <h1 className="display-title">How can we help?</h1>
        <p className="body-copy mt-5">For safety issues use the SOS button during an active trip. For account, verification or booking questions, send a message here.</p>
        <div className="mt-8 rounded-3xl bg-ink p-6 text-white">
          <strong>Backhaul MVP support</strong>
          <p className="mt-2 text-sm text-slate-300">support@backhaul.local<br />Mon–Sat · 9:00–18:00 IST</p>
        </div>
      </div>
      <form onSubmit={submit} className="card grid gap-4">
        {sent ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-eco-50 text-eco-600">✓</div>
              <h2 className="text-2xl font-black">Message received</h2>
              <p className="mt-2 text-slate-500">This MVP stores no contact messages yet; connect your preferred email provider in production.</p>
            </div>
          </div>
        ) : (
          <>
            <label><span className="label">Full name</span><input required className="field" /></label>
            <label><span className="label">Email</span><input required type="email" className="field" /></label>
            <label>
              <span className="label">Topic</span>
              <select className="field">
                <option>Booking help</option>
                <option>Captain verification</option>
                <option>Safety or complaint</option>
                <option>Business partnership</option>
              </select>
            </label>
            <label><span className="label">Message</span><textarea required rows={6} className="field" /></label>
            <button className="btn-primary">Send message</button>
          </>
        )}
      </form>
    </div>
  );
}
