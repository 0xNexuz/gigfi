import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  BanknoteArrowUp,
  BadgeCheck,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleDollarSign,
  Clock3,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Network,
  RadioTower,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Split,
  WalletCards,
} from 'lucide-react';
import { createEscrowAccount, transferFunds } from './integrations/alat';
import './styles.css';

const seedJobs = [
  {
    id: 'GFI-2401',
    artisan: 'Musa Danladi',
    phone: '0803 118 4402',
    job: 'Fix leaking kitchen sink',
    amount: 45000,
    status: 'Accepted',
    virtualAccount: '945-203-7710',
    wallet: 'ALAT Wallet - Musa',
  },
  {
    id: 'GFI-2402',
    artisan: 'Amina Yusuf',
    phone: '0816 472 1099',
    job: 'Deliver fabric from Balogun market',
    amount: 28000,
    status: 'Completed',
    virtualAccount: '945-310-8846',
    wallet: 'ALAT Wallet - Amina',
  },
  {
    id: 'GFI-2403',
    artisan: 'Chinedu Okafor',
    phone: '0705 902 5518',
    job: 'Repair wardrobe hinges',
    amount: 62000,
    status: 'Pending',
    virtualAccount: '945-760-1293',
    wallet: 'Pending wallet link',
  },
];

const storage = {
  get(key, fallback) {
    try {
      const saved = window.localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Local persistence is best-effort for the browser prototype.
    }
  },
};

const statusStyles = {
  Pending: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  Accepted: 'border-sky-300/20 bg-sky-300/10 text-sky-100',
  Completed: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
  Disputed: 'border-orange-300/25 bg-orange-400/15 text-orange-100',
  Paid: 'border-teal-300/25 bg-teal-400/15 text-teal-100',
};

function currency(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function makeJobId() {
  return `GFI-${Math.floor(2400 + Math.random() * 700)}`;
}

function App() {
  const isDocsPage = window.location.pathname === '/docs';
  const [jobs, setJobs] = useState(() => storage.get('gigfi.jobs', seedJobs));
  const [user, setUser] = useState(() =>
    storage.get('gigfi.user', {
      name: 'Demo Client',
      phone: '0800 945 0000',
      kyc: 'Pending',
      wallet: 'Demo wallet not verified',
    }),
  );
  const [disputes, setDisputes] = useState(() => storage.get('gigfi.disputes', []));
  const [selectedJobId, setSelectedJobId] = useState(seedJobs[2].id);
  const [apiState, setApiState] = useState('idle');
  const [lastEscrow, setLastEscrow] = useState(null);
  const [payoutBurst, setPayoutBurst] = useState(null);
  const [editingJob, setEditingJob] = useState(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0],
    [jobs, selectedJobId],
  );

  React.useEffect(() => storage.set('gigfi.jobs', jobs), [jobs]);
  React.useEffect(() => storage.set('gigfi.user', user), [user]);
  React.useEffect(() => storage.set('gigfi.disputes', disputes), [disputes]);

  async function createEscrow(form) {
    setApiState('loading');
    try {
      const escrow = await createEscrowAccount(form);
      const newJob = {
        id: makeJobId(),
        artisan: form.artisan,
        phone: form.phone,
        job: form.description,
        amount: Number(form.amount),
        status: 'Pending',
        virtualAccount: escrow.virtualAccount,
        wallet: escrow.wallet,
      };

      setJobs((current) => [newJob, ...current]);
      setSelectedJobId(newJob.id);
      setLastEscrow(newJob);
      setApiState('success');
      window.setTimeout(() => setApiState('idle'), 3600);
    } catch {
      setApiState('error');
      window.setTimeout(() => setApiState('idle'), 3600);
    }
  }

  function updateEscrow(form) {
    if (!editingJob) return;
    setJobs((current) =>
      current.map((job) =>
        job.id === editingJob.id
          ? {
              ...job,
              artisan: form.artisan,
              phone: form.phone,
              job: form.description,
              amount: Number(form.amount),
              wallet: `ALAT Wallet - ${form.artisan.split(' ')[0] || 'Artisan'}`,
            }
          : job,
      ),
    );
    setSelectedJobId(editingJob.id);
    setLastEscrow(null);
    setEditingJob(null);
    setApiState('updated');
    window.setTimeout(() => setApiState('idle'), 2600);
  }

  function verifyDemoUser() {
    setUser({
      name: 'Demo Client',
      phone: '0800 945 0000',
      kyc: 'Verified',
      wallet: 'GigFi Client Wallet - Verified',
    });
  }

  function acceptJob(jobId, reply) {
    if (reply.trim() !== '1' || !jobId) return false;
    setJobs((current) => {
      const selectedPending = current.find((job) => job.id === jobId && job.status === 'Pending');
      const targetId = selectedPending?.id ?? current.find((job) => job.status === 'Pending')?.id;

      return current.map((job) =>
        job.id === targetId ? { ...job, status: 'Accepted' } : job,
      );
    });
    return true;
  }

  function markCompleted(jobId) {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId && job.status === 'Accepted'
          ? { ...job, status: 'Completed' }
          : job,
      ),
    );
  }

  async function releaseFunds(jobId) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) return;
    await transferFunds({ amount: job.amount, wallet: job.wallet });
    setJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, status: 'Paid' } : job)),
    );
    setPayoutBurst(jobId);
    window.setTimeout(() => setPayoutBurst(null), 1600);
  }

  function openDispute(jobId) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job || job.status === 'Paid') return;
    const exists = disputes.some((dispute) => dispute.jobId === jobId && dispute.status === 'Open');
    if (exists) return;

    setDisputes((current) => [
      {
        id: `DSP-${Math.floor(1000 + Math.random() * 8999)}`,
        jobId,
        artisan: job.artisan,
        amount: job.amount,
        reason: 'Client says the milestone needs review before payout.',
        status: 'Open',
      },
      ...current,
    ]);
    setJobs((current) =>
      current.map((item) => (item.id === jobId ? { ...item, status: 'Disputed' } : item)),
    );
  }

  function resolveDispute(disputeId) {
    const dispute = disputes.find((item) => item.id === disputeId);
    if (!dispute) return;

    setDisputes((current) =>
      current.map((item) =>
        item.id === disputeId
          ? { ...item, status: 'Resolved', resolution: 'Milestone approved after review' }
          : item,
      ),
    );
    setJobs((current) =>
      current.map((item) => (item.id === dispute.jobId ? { ...item, status: 'Completed' } : item)),
    );
  }

  const lockedValue = jobs
    .filter((job) => job.status !== 'Paid')
    .reduce((sum, job) => sum + job.amount, 0);
  const paidValue = jobs
    .filter((job) => job.status === 'Paid')
    .reduce((sum, job) => sum + job.amount, 0);

  if (isDocsPage) {
    return (
      <main className="min-h-screen overflow-hidden bg-white text-[#263238]">
        <AmbientBackground />
        <div className="relative mx-auto w-full max-w-[1520px]">
          <SiteNav />
          <DocsPage />
          <SiteFooter />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#263238]">
      <AmbientBackground />
      <div className="relative mx-auto w-full max-w-[1520px]">
        <SiteNav />
        <Hero lockedValue={lockedValue} paidValue={paidValue} />
        <ProofStrip />
        <ReferenceFeatureSections />

        <section id="demo" className="site-section">
          <div className="section-heading">
            <span className="eyebrow"><Sparkles size={16} /> Live product demo</span>
            <h2>One shared ledger, two familiar interfaces.</h2>
            <p>
              Clients get a premium web console. Artisans get a job prompt that works with SMS, WhatsApp, or USSD.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_.82fr]">
            <ClientDashboard
              apiState={apiState}
              lastEscrow={lastEscrow}
              editingJob={editingJob}
              onCreateEscrow={createEscrow}
              onUpdateEscrow={updateEscrow}
              onCancelEdit={() => setEditingJob(null)}
            />
            <ArtisanSimulator
              job={selectedJob}
              jobs={jobs}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
              onAcceptJob={acceptJob}
            />
          </div>

          <EscrowLedger
            jobs={jobs}
            payoutBurst={payoutBurst}
            onEditJob={setEditingJob}
            onOpenDispute={openDispute}
            onMarkCompleted={markCompleted}
            onReleaseFunds={releaseFunds}
          />
          <DisputeCenter disputes={disputes} onResolveDispute={resolveDispute} />
        </section>

        <AuthKycPanel user={user} onVerify={verifyDemoUser} />
        <WorkflowSection />
        <IntegrationSection />
        <UseCaseSection />
        <MarketSection />
        <ClosingCta />
        <SiteFooter />
      </div>
    </main>
  );
}

function AmbientBackground() {
  return (
    <div className="ambient-light" />
  );
}

function SiteNav() {
  return (
    <nav className="site-nav">
      <a className="brand-lockup" href="/" aria-label="GigFi home">
        <Logo />
      </a>
      <div className="nav-links" aria-label="Primary navigation">
        <a href="/#trust">Trust</a>
        <a href="/#demo">Demo</a>
        <a href="/#workflow">How it works</a>
        <a href="/docs">Docs</a>
      </div>
      <a className="nav-cta" href="/#demo">
        Try flow <ArrowRight size={15} />
      </a>
    </nav>
  );
}

function Logo() {
  return (
    <span className="logo-lockup" aria-label="GigFi">
      <span className="logo-mark" aria-hidden="true">
        <span className="logo-orbit" />
        <span className="logo-cut" />
      </span>
      <span className="logo-word">GigFi</span>
    </span>
  );
}

function Hero({ lockedValue, paidValue }) {
  return (
    <header id="top" className="hero-shell">
      <div className="vertical-note">POWERING POSSIBILITIES</div>
      <div className="hero-copy">
        <div className="hero-badge">
            <span className="grid size-8 place-items-center rounded-full border border-teal-300/25 bg-teal-400/15">
              <ShieldCheck size={16} />
            </span>
            Smart escrow for everyday service work
          </div>
          <h1 className="text-5xl font-semibold leading-[.98] tracking-normal text-white sm:text-7xl lg:text-8xl">
            Protected payouts for informal work.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            GigFi gives clients smart invoices and milestone escrow while artisans accept jobs on phones they already own.
          </p>
          <div className="hero-action-row">
            <label className="hero-email" aria-label="Demo email">
              <input placeholder="Enter your email" defaultValue="" />
            </label>
            <a className="premium-link" href="#demo">
              Launch Demo <ArrowRight size={18} />
            </a>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a className="ghost-link" href="#workflow">See how it works</a>
          </div>
        </div>

        <div className="hero-visual" aria-label="GigFi product preview">
          <div className="preview-stack preview-stack-back">
            <div className="preview-line w-3/4" />
            <div className="preview-line w-1/2" />
            <div className="preview-mini-grid">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="preview-stack preview-stack-front">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[.18em] text-slate-400">Escrow vault</span>
              <LockKeyhole size={18} className="text-amber-200" />
            </div>
            <div className="mt-8 text-4xl font-semibold text-white">{currency(lockedValue)}</div>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-full w-[68%] rounded-full bg-teal-400" />
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Metric icon={<LockKeyhole size={18} />} label="Locked in escrow" value={currency(lockedValue)} />
          <Metric icon={<BanknoteArrowUp size={18} />} label="Released via ALAT" value={currency(paidValue)} />
            </div>
          </div>
          <div className="hero-card-prop">
            <Logo />
            <span>ESCROW CARD</span>
          </div>
        </div>
    </header>
  );
}

function ProofStrip() {
  const items = [
    ['Offline-first', 'SMS, WhatsApp, and USSD acceptance'],
    ['Escrow-native', 'Virtual account for every job'],
    ['Bank-ready', 'ALAT wallet and transfer mock'],
    ['Built for Africa', 'Designed around informal labor realities'],
  ];

  return (
    <section className="proof-strip" aria-label="GigFi proof points">
      {items.map(([title, copy]) => (
        <div className="proof-item" key={title}>
          <span>{title}</span>
          <p>{copy}</p>
        </div>
      ))}
    </section>
  );
}

function ReferenceFeatureSections() {
  return (
    <section className="reference-story" aria-label="GigFi product benefits">
      <FeatureBand
        title="Escrow fee-free for everyday gigs"
        copy="Create protected job payments for carpenters, plumbers, and market runners with a virtual escrow record for every job."
        link="Learn about GigFi Escrow"
        visual={<EscrowCardVisual />}
      />
      <FeatureBand
        flip
        title="Artisans get paid when the work is accepted"
        copy="A worker can reply 1 by SMS, WhatsApp, or USSD. No smartphone onboarding, no app-store friction."
        link="Learn about offline acceptance"
        visual={<NotificationVisual />}
      />
      <FeatureBand
        title="Say goodbye to hidden disputes"
        copy="A job can be held, reviewed, and approved before payout. Every milestone keeps the terms visible."
        link="Learn about dispute holds"
        visual={<FeesVisual />}
      />
      <FeatureBand
        flip
        title="A new way to build trust"
        copy="KYC status, wallet readiness, job history, and payout state sit in one clean trust layer."
        link="Learn about trust scoring"
        visual={<TrustCardVisual />}
      />
      <FeatureBand
        title="Pay anyone the fast, protected way"
        copy="Release completed milestones from the ledger and simulate an instant transfer into the artisan wallet."
        link="Learn about payout rails"
        visual={<PhonePayVisual />}
      />
      <FeatureBand
        flip
        title="Make job records work harder"
        copy="Every job creates a reusable receipt trail for repeat hiring, dispute review, and future financing signals."
        link="Learn about job records"
        visual={<ApyVisual />}
      />
      <FeatureBand
        title="Stay in control with alerts"
        copy="Clients can track accepted, completed, disputed, and paid jobs from one lightweight ledger."
        link="Learn about job alerts"
        visual={<AlertVisual />}
      />
      <FeatureBand
        flip
        title="Security & support you can trust"
        copy="The prototype separates mocked bank calls into an adapter layer, so real credentials can move server-side later."
        link="Read the docs"
        visual={<SecurityVisual />}
      />
    </section>
  );
}

function FeatureBand({ title, copy, link, visual, flip = false }) {
  return (
    <article className={`feature-band ${flip ? 'feature-band-flip' : ''}`}>
      <div className="feature-copy">
        <h2>{title}</h2>
        <p>{copy}</p>
        <a href={link === 'Read the docs' ? '/docs' : '/#demo'}>{link} <ArrowRight size={13} /></a>
      </div>
      <div className="feature-visual">{visual}</div>
    </article>
  );
}

function EscrowCardVisual() {
  return (
    <div className="mini-bank-card white-card">
      <Logo />
      <span>VIRTUAL ESCROW</span>
      <b>NGN 150,000</b>
      <small>Locked until milestone approval</small>
    </div>
  );
}

function NotificationVisual() {
  return (
    <div className="notification-card">
      <span>GIGFI</span>
      <p>Your ₦45,000 job with Musa was accepted by SMS.</p>
    </div>
  );
}

function FeesVisual() {
  return <div className="fees-script">Disputes</div>;
}

function TrustCardVisual() {
  return (
    <div className="mini-bank-card green-card">
      <Logo />
      <span>TRUST CARD</span>
      <b>KYC ready</b>
      <small>Wallet linked • Jobs recorded</small>
    </div>
  );
}

function PhonePayVisual() {
  return (
    <div className="phone-pay-visual">
      <div className="pay-phone">
        <span>Paid</span>
        <b>THANKS</b>
        <small>Transfer successful</small>
      </div>
      <div className="pay-note">₦</div>
    </div>
  );
}

function ApyVisual() {
  return <div className="apy-visual">1<span> Job ID</span></div>;
}

function AlertVisual() {
  return (
    <div className="alert-stack">
      <div><span>Acceptance alerts</span><b /></div>
      <div><span>Dispute alerts</span><b /></div>
    </div>
  );
}

function SecurityVisual() {
  return (
    <div className="security-visual">
      <div className="lock-body" />
      <div className="lock-loop" />
    </div>
  );
}

function AuthKycPanel({ user, onVerify }) {
  const verified = user.kyc === 'Verified';

  return (
    <section id="trust" className="auth-panel">
      <div>
        <span className="eyebrow"><ShieldCheck size={16} /> Trust and identity layer</span>
        <h2>Client session, wallet readiness, and KYC status are visible before payout.</h2>
        <p>
          The prototype simulates authentication and verification so judges can see where customer onboarding fits before live bank credentials are connected.
        </p>
      </div>
      <div className="auth-card">
        <div className="auth-row">
          <span>Signed in as</span>
          <b>{user.name}</b>
        </div>
        <div className="auth-row">
          <span>Phone</span>
          <b>{user.phone}</b>
        </div>
        <div className="auth-row">
          <span>KYC</span>
          <b className={verified ? 'text-teal-200' : 'text-amber-200'}>{user.kyc}</b>
        </div>
        <div className="auth-row">
          <span>Wallet</span>
          <b>{user.wallet}</b>
        </div>
        <button className="premium-button w-full" onClick={onVerify} type="button" disabled={verified}>
          {verified ? 'Identity Verified' : 'Verify Demo Identity'}
        </button>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[.055] p-4 shadow-2xl shadow-black/20">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[.16em] text-slate-400">
        <span className="text-amber-200">{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function ClientDashboard({ apiState, lastEscrow, editingJob, onCreateEscrow, onUpdateEscrow, onCancelEdit }) {
  const [form, setForm] = useState({
    artisan: 'Tunde Adewale',
    phone: '0802 945 1020',
    description: 'Build and install wooden shop counter',
    amount: '150000',
  });

  React.useEffect(() => {
    if (!editingJob) return;
    setForm({
      artisan: editingJob.artisan,
      phone: editingJob.phone,
      description: editingJob.job,
      amount: String(editingJob.amount),
    });
  }, [editingJob]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!form.artisan || !form.phone || !form.description || !form.amount) return;
    if (editingJob) {
      onUpdateEscrow(form);
      return;
    }
    onCreateEscrow(form);
  }

  return (
    <section className="glass-panel relative overflow-hidden p-5 sm:p-6">
      <PanelTitle
        icon={<BriefcaseBusiness size={18} />}
        kicker="Client dashboard"
        title={editingJob ? `Edit ${editingJob.id}` : 'Create a new gig'}
        copy={editingJob ? 'Update the escrow details before payout. Paid jobs stay locked for audit history.' : 'Mock wallet creation and virtual escrow account provisioning through ALAT sandbox services.'}
      />

      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Artisan name" value={form.artisan} onChange={(value) => updateField('artisan', value)} />
          <Field label="Artisan phone number" value={form.phone} onChange={(value) => updateField('phone', value)} />
        </div>
        <Field
          label="Job description"
          value={form.description}
          onChange={(value) => updateField('description', value)}
          multiline
        />
        <Field
          label="Payment amount (NGN)"
          value={form.amount}
          onChange={(value) => updateField('amount', value.replace(/\D/g, ''))}
          prefix="₦"
        />

        <button className="premium-button mt-2" type="submit" disabled={apiState === 'loading'}>
          {apiState === 'loading' ? <Loader2 className="animate-spin" size={18} /> : <WalletCards size={18} />}
          {editingJob ? 'Save Escrow Changes' : 'Generate Escrow & Notify Artisan'}
        </button>
        {editingJob ? (
          <button className="ghost-button" type="button" onClick={onCancelEdit}>
            Cancel edit
          </button>
        ) : null}
      </form>

      <div className="mt-5 min-h-[122px] rounded-lg border border-white/10 bg-[#041211]/80 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
          <RadioTower className="text-amber-200" size={17} />
          ALAT API Sandbox Trace
        </div>
        {apiState === 'error' ? (
          <div className="text-sm leading-6 text-amber-100">
            Banking adapter could not complete the request. In live mode, add server-side ALAT credentials and API routes.
          </div>
        ) : apiState === 'updated' ? (
          <div className="text-sm leading-6 text-teal-100">
            Escrow details updated. The ledger and artisan simulator are now using the latest job terms.
          </div>
        ) : apiState === 'success' && lastEscrow ? (
          <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <Trace label="Virtual account" value={lastEscrow.virtualAccount} />
            <Trace label="Escrow wallet" value={lastEscrow.wallet} />
            <Trace label="Job ID" value={lastEscrow.id} />
            <Trace label="Status" value="SMS/USSD notification queued" />
          </div>
        ) : (
          <div className="text-sm leading-6 text-slate-400">
            Waiting for escrow request. The demo will provision a GigFi escrow virtual account, lock the job value, and
            push an offline acceptance message.
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, value, onChange, multiline = false, prefix }) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className="text-xs font-medium uppercase tracking-[.14em] text-slate-400">{label}</span>
      <span className="flex rounded-lg border border-white/10 bg-white/[.045] px-3 py-3 text-white transition focus-within:border-teal-300/50 focus-within:bg-white/[.07]">
        {prefix ? <span className="pr-2 text-slate-400">{prefix}</span> : null}
        {multiline ? (
          <textarea
            id={id}
            className="min-h-24 flex-1 resize-none bg-transparent outline-none placeholder:text-slate-600"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            id={id}
            className="w-full bg-transparent outline-none placeholder:text-slate-600"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </span>
    </label>
  );
}

function ArtisanSimulator({ job, jobs, selectedJobId, onSelectJob, onAcceptJob }) {
  const [reply, setReply] = useState('');
  const [accepted, setAccepted] = useState(false);

  function submitReply(event) {
    event.preventDefault();
    const ok = onAcceptJob(job?.id, reply);
    setAccepted(ok);
    if (ok) setReply('');
    window.setTimeout(() => setAccepted(false), 1800);
  }

  return (
    <section className="glass-panel p-5 sm:p-6">
      <PanelTitle
        icon={<MessageSquareText size={18} />}
        kicker="Offline-first artisan simulator"
        title="No app required"
        copy="A feature-phone style acceptance flow for workers using SMS, WhatsApp, or USSD."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[.78fr_1fr]">
        <div className="space-y-2">
          {jobs.slice(0, 5).map((item) => (
            <button
              key={item.id}
              className={`job-select ${item.id === selectedJobId ? 'job-select-active' : ''}`}
              onClick={() => onSelectJob(item.id)}
              type="button"
            >
              <span className="truncate font-medium">{item.artisan}</span>
              <span className="text-xs text-slate-400">{item.id}</span>
            </button>
          ))}
        </div>

        <div className="phone-shell mx-auto w-full max-w-[340px]">
          <div className="phone-speaker" />
          <div className="phone-screen">
            <div className="mb-3 flex items-center justify-between border-b border-black/10 pb-2 text-[11px] font-semibold text-[#1b2938]">
              <span>GIGFI ESCROW</span>
              <span>*945#</span>
            </div>
            <div className="chat-bubble">
              You have been hired for <b>{job?.job}</b> for <b>{currency(job?.amount ?? 0)}</b>. The client has
              locked the funds in a GigFi Escrow. Reply <b>1</b> or dial <b>*945*X#</b> to accept.
            </div>
            {job?.status !== 'Pending' ? (
              <div className="chat-bubble chat-bubble-out">1</div>
            ) : null}
            {accepted ? (
              <div className="mt-3 rounded-md bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-800">
                Accepted. Ledger updated.
              </div>
            ) : null}
          </div>

          <form className="mt-4 flex gap-2" onSubmit={submitReply}>
            <input
              aria-label="Artisan reply"
              className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-center text-lg font-semibold text-white outline-none focus:border-teal-300/50"
              maxLength={1}
              placeholder="1"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
            />
            <button className="keypad-send" type="submit">
              <Check size={17} />
            </button>
          </form>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
              <button className="keypad-key" key={key} onClick={() => setReply(key)} type="button">
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EscrowLedger({ jobs, payoutBurst, onEditJob, onOpenDispute, onMarkCompleted, onReleaseFunds }) {
  return (
    <section className="glass-panel relative overflow-hidden p-5 sm:p-6">
      {payoutBurst ? (
        <div className="payout-burst">
          <Sparkles size={18} />
          ALAT transfer successful
        </div>
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PanelTitle
          icon={<ReceiptText size={18} />}
          kicker="Escrow ledger"
          title="Milestone payout console"
          copy="Completed jobs can release funds through a mocked ALAT Funds Transfer API call."
        />
        <div className="rounded-lg border border-teal-300/20 bg-teal-400/10 px-4 py-3 text-sm text-teal-50">
          Settlement rail: <b>ALAT Instant Transfer Sandbox</b>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
        <div className="ledger-grid ledger-head">
          <span>Job ID</span>
          <span>Artisan</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {jobs.map((job) => (
          <div className="ledger-grid ledger-row" key={job.id}>
            <span className="font-semibold text-white">{job.id}</span>
            <span>
              <span className="block font-medium text-slate-100">{job.artisan}</span>
              <span className="text-xs text-slate-500">{job.phone}</span>
            </span>
            <span className="font-semibold text-slate-100">{currency(job.amount)}</span>
            <span>
              <span className={`status-pill ${statusStyles[job.status]}`}>{job.status}</span>
            </span>
            <span className="flex flex-wrap gap-2">
              {job.status === 'Accepted' ? (
                <button className="table-action" onClick={() => onMarkCompleted(job.id)} type="button">
                  Mark complete
                </button>
              ) : null}
              {job.status !== 'Paid' ? (
                <button className="table-action" onClick={() => onEditJob(job)} type="button">
                  Edit
                </button>
              ) : null}
              {job.status === 'Completed' ? (
                <button className="table-action table-action-primary" onClick={() => onReleaseFunds(job.id)} type="button">
                  <CircleDollarSign size={15} />
                  Release Funds
                </button>
              ) : null}
              {job.status !== 'Paid' && job.status !== 'Disputed' ? (
                <button className="table-action" onClick={() => onOpenDispute(job.id)} type="button">
                  Dispute
                </button>
              ) : null}
              {job.status === 'Disputed' ? <span className="text-xs text-orange-200">In review</span> : null}
              {job.status === 'Paid' ? <span className="paid-mark">Paid to {job.wallet}</span> : null}
              {job.status === 'Pending' ? <span className="text-xs text-slate-500">Awaiting artisan reply</span> : null}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DisputeCenter({ disputes, onResolveDispute }) {
  return (
    <section className="glass-panel dispute-center">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PanelTitle
          icon={<ReceiptText size={18} />}
          kicker="Dispute resolution"
          title="Hold, review, resolve"
          copy="A short mediation loop shows how disputed milestones can pause payout until both sides have clarity."
        />
        <span className="status-pill border-orange-300/25 bg-orange-400/15 text-orange-100">
          {disputes.filter((item) => item.status === 'Open').length} open
        </span>
      </div>

      <div className="dispute-grid">
        {disputes.length ? (
          disputes.map((dispute) => (
            <article className="dispute-card" key={dispute.id}>
              <div className="flex items-center justify-between gap-3">
                <b>{dispute.id}</b>
                <span className={`status-pill ${dispute.status === 'Open' ? 'border-orange-300/25 bg-orange-400/15 text-orange-100' : 'border-teal-300/25 bg-teal-400/15 text-teal-100'}`}>
                  {dispute.status}
                </span>
              </div>
              <p>{dispute.reason}</p>
              <div className="dispute-meta">
                <span>{dispute.jobId}</span>
                <span>{dispute.artisan}</span>
                <span>{currency(dispute.amount)}</span>
              </div>
              {dispute.status === 'Open' ? (
                <button className="table-action table-action-primary" onClick={() => onResolveDispute(dispute.id)} type="button">
                  Resolve and approve
                </button>
              ) : (
                <span className="paid-mark">{dispute.resolution}</span>
              )}
            </article>
          ))
        ) : (
          <article className="dispute-empty">
            No disputes yet. Use the ledger Dispute action to pause a job and review the milestone before payout.
          </article>
        )}
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    {
      icon: <BriefcaseBusiness size={19} />,
      title: 'Client creates gig',
      copy: 'Job terms, artisan phone number, and milestone amount become a locked escrow instruction.',
    },
    {
      icon: <MessageSquareText size={19} />,
      title: 'Artisan accepts offline',
      copy: 'The worker replies 1 or dials a USSD code. No smartphone onboarding is required.',
    },
    {
      icon: <BanknoteArrowUp size={19} />,
      title: 'Milestone releases',
      copy: 'Completion triggers a mocked ALAT transfer into the linked artisan wallet.',
    },
  ];

  return (
    <section id="workflow" className="site-section workflow-section">
      <div className="section-heading section-heading-narrow">
        <span className="eyebrow"><Split size={16} /> Operating model</span>
        <h2>Built for jobs that start with trust, then need receipts.</h2>
      </div>
      <div className="workflow-grid">
        {steps.map((step, index) => (
          <article className="workflow-card" key={step.title}>
            <div className="workflow-number">0{index + 1}</div>
            <div className="workflow-icon">{step.icon}</div>
            <h3>{step.title}</h3>
            <p>{step.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function IntegrationSection() {
  return (
    <section id="integration" className="site-section integration-section">
      <div className="integration-copy">
        <span className="eyebrow"><Network size={16} /> Banking API integration mock</span>
        <h2>Three banking rails, one demo narrative.</h2>
        <p>
          The prototype visualizes wallet creation, escrow virtual accounts, and instant funds transfer with sandbox-style traces.
        </p>
      </div>
      <div className="integration-grid">
        <IntegrationTile icon={<WalletCards size={20} />} title="Wallet creation" copy="Create or link a lightweight artisan wallet from the phone number." />
        <IntegrationTile icon={<LockKeyhole size={20} />} title="Virtual escrow" copy="Provision a job-specific account so funds are visibly locked." />
        <IntegrationTile icon={<RadioTower size={20} />} title="Offline notify" copy="Send SMS, WhatsApp, or USSD prompts to the artisan." />
        <IntegrationTile icon={<BanknoteArrowUp size={20} />} title="Instant payout" copy="Release completed milestones through the ALAT transfer rail." />
      </div>
    </section>
  );
}

function IntegrationTile({ icon, title, copy }) {
  return (
    <article className="integration-tile">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function UseCaseSection() {
  const cases = [
    ['Carpenters', 'Counter builds, wardrobes, shop fittings'],
    ['Plumbers', 'Repairs, installations, emergency calls'],
    ['Market runners', 'Errands, procurement, last-mile movement'],
  ];

  return (
    <section className="site-section usecase-section">
      <div className="usecase-visual">
        <div className="receipt-card">
          <div className="receipt-top">
            <BadgeCheck size={18} />
            Verified milestone
          </div>
          <div className="receipt-amount">NGN 150,000</div>
          <div className="receipt-row"><span>Escrow</span><b>Locked</b></div>
          <div className="receipt-row"><span>Artisan</span><b>Accepted by SMS</b></div>
          <div className="receipt-row"><span>Payout</span><b>ALAT ready</b></div>
        </div>
      </div>
      <div className="usecase-copy">
        <span className="eyebrow"><Building2 size={16} /> Target users</span>
        <h2>A fintech layer for work that usually happens off-platform.</h2>
        <p>
          GigFi is intentionally narrow for the MVP: informal, high-trust jobs where disputes often come from unclear terms or late payment.
        </p>
        <div className="case-list">
          {cases.map(([title, copy]) => (
            <div className="case-row" key={title}>
              <span>{title}</span>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketSection() {
  return (
    <section className="site-section market-section">
      <div className="market-copy">
        <span className="eyebrow"><Building2 size={16} /> Market story</span>
        <h2>A large offline workforce needs payment trust, not another complicated app.</h2>
        <p>
          GigFi focuses on informal service work where jobs are frequent, records are thin, and payment trust is the bottleneck. The first wedge is artisan services and market errands, then expansion into repeat SME procurement and field-service payouts.
        </p>
      </div>
      <div className="market-grid">
        <Metric icon={<ShieldCheck size={18} />} label="Primary wedge" value="Artisans" />
        <Metric icon={<MessageSquareText size={18} />} label="Access channel" value="SMS/USSD" />
        <Metric icon={<LockKeyhole size={18} />} label="Trust product" value="Escrow" />
        <Metric icon={<BanknoteArrowUp size={18} />} label="Revenue path" value="Payout fee" />
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section id="cta" className="closing-cta">
      <span className="eyebrow"><Clock3 size={16} /> Product demo ready</span>
      <h2>Turn the demo into a story judges can click through.</h2>
      <p>
        Start at the client dashboard, create a gig, reply 1 as the artisan, mark the job complete, then release funds.
      </p>
      <a className="premium-link" href="#demo">
        Run the escrow flow <ArrowRight size={18} />
      </a>
    </section>
  );
}

function DocsPage() {
  const liveItems = [
    ['Demo persistence', 'Jobs, KYC state, and disputes persist in browser storage.'],
    ['KYC simulation', 'Client verification and wallet readiness are shown in the trust panel.'],
    ['Client gig creation', 'Create a gig, amount, job description, and artisan contact.'],
    ['Escrow account mock', 'Generates a virtual account and sandbox trace for each new job.'],
    ['Offline acceptance', 'Artisan simulator accepts reply 1 through a feature-phone style flow.'],
    ['Ledger updates', 'Pending, Accepted, Completed, and Paid states update in real time.'],
    ['Dispute flow', 'Open a dispute, hold the job, resolve the review, then release payout.'],
    ['Payout mock', 'Release Funds simulates a bank transfer and triggers a success animation.'],
    ['ALAT adapter layer', 'Banking behavior is isolated in an integration module for future live routes.'],
  ];

  const notYetItems = [
    ['Real ALAT credentials', 'Current banking calls use the adapter mock until live credentials and server-side routes are supplied.'],
    ['Managed backend database', 'Browser storage is live; Supabase, Neon, or Firebase credentials are needed for a shared backend.'],
    ['Real identity checks', 'BVN/NIN, KYC, and wallet ownership are simulated, not connected to verification providers.'],
    ['SMS/USSD gateway', 'Messages are simulated in-browser, not sent through a telecom provider.'],
    ['Admin operations', 'Role-based dashboards and audit exports are planned after real backend setup.'],
  ];

  return (
    <section className="docs-shell">
      <div className="docs-hero">
        <span className="eyebrow"><BookOpenText size={16} /> Product docs</span>
        <h1>How GigFi works, what is live, and what comes next.</h1>
        <p>
          This page explains the prototype flow clearly for reviewers, partners, and technical judges.
        </p>
        <a className="premium-link" href="/#demo">
          Open live demo <ArrowRight size={18} />
        </a>
      </div>

      <div className="docs-grid">
        <DocPanel
          title="How the app works"
          copy="GigFi converts informal service jobs into simple escrow-backed records."
          items={[
            'Client enters artisan details, job description, and payment amount.',
            'GigFi mocks a banking API call to create a virtual escrow account.',
            'The artisan receives a simple acceptance prompt that works like SMS or USSD.',
            'A disputed milestone can be held, reviewed, and approved before payout.',
            'The ledger tracks job status until the client releases the completed payout.',
          ]}
        />
        <DocPanel
          title="Demo script"
          copy="Use this path for a quick product walkthrough."
          items={[
            'Click Launch prototype or Try flow.',
            'Create a gig from the client dashboard.',
            'Type 1 in the phone simulator and submit.',
            'Mark the job complete, then release funds from the ledger.',
          ]}
        />
      </div>

      <div className="status-columns">
        <StatusList title="Live in this prototype" items={liveItems} tone="live" />
        <StatusList title="Not live yet" items={notYetItems} tone="planned" />
      </div>
    </section>
  );
}

function DocPanel({ title, copy, items }) {
  return (
    <article className="doc-panel">
      <h2>{title}</h2>
      <p>{copy}</p>
      <ol>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </article>
  );
}

function StatusList({ title, items, tone }) {
  return (
    <article className={`status-list status-list-${tone}`}>
      <h2>{title}</h2>
      <div className="status-items">
        {items.map(([label, copy]) => (
          <div className="status-item" key={label}>
            <span>{label}</span>
            <p>{copy}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Logo />
          <p>Smart escrow, offline acceptance, and milestone payouts for informal service work.</p>
        </div>
        <div className="footer-store-buttons" aria-label="Prototype channels">
          <span>Web Demo</span>
          <span>USSD Ready</span>
        </div>
      </div>
      <div className="footer-columns">
        <div>
          <h3>Product</h3>
          <a href="/#demo">Create escrow</a>
          <a href="/#trust">KYC simulation</a>
          <a href="/#workflow">How it works</a>
          <a href="/docs">Docs</a>
        </div>
        <div>
          <h3>Platform</h3>
          <a href="/#integration">ALAT adapter</a>
          <a href="/#demo">Ledger</a>
          <a href="/#demo">Disputes</a>
          <a href="/#demo">Offline acceptance</a>
        </div>
        <div>
          <h3>Company</h3>
          <a href="/#cta">Pitch</a>
          <a href="/#trust">Security model</a>
          <a href="/#demo">Prototype</a>
          <a href="https://github.com/0xNexuz/gigfi" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <div>
          <h3>Contact</h3>
          <a href="https://github.com/0xNexuz/gigfi" target="_blank" rel="noreferrer">github.com/0xNexuz/gigfi</a>
          <a href="https://gigfi.vercel.app">gigfi.vercel.app</a>
        </div>
      </div>
      <div className="footer-legal">
        <p>
          GigFi is a functional prototype. Escrow creation, wallet creation, transfers, identity checks, and SMS/USSD delivery are simulated unless real provider credentials are connected. The demo uses browser storage for persistence and an adapter module for future banking API routes.
        </p>
        <p>© 2026 GigFi. Built for informal service work, milestone protection, and offline-first payment trust.</p>
      </div>
    </footer>
  );
}

function PanelTitle({ icon, kicker, title, copy }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-teal-100/80">
        <span className="text-amber-200">{icon}</span>
        {kicker}
      </div>
      <h2 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{copy}</p>
    </div>
  );
}

function Trace({ label, value }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[.035] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-100">{value}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
