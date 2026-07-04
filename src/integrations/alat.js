const liveMode = import.meta.env.VITE_ALAT_MODE === 'live';

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function makeVirtualAccount() {
  const block = () => Math.floor(100 + Math.random() * 899);
  return `945-${block()}-${Math.floor(1000 + Math.random() * 8999)}`;
}

export async function createEscrowAccount({ artisan }) {
  if (liveMode) {
    throw new Error('Live ALAT mode needs server-side credentials and endpoints.');
  }

  await wait(900);
  return {
    provider: 'ALAT sandbox mock',
    virtualAccount: makeVirtualAccount(),
    wallet: `ALAT Wallet - ${artisan.split(' ')[0] || 'Artisan'}`,
  };
}

export async function transferFunds({ amount, wallet }) {
  if (liveMode) {
    throw new Error('Live ALAT transfer needs a server-side API route.');
  }

  await wait(500);
  return {
    provider: 'ALAT funds transfer mock',
    amount,
    destination: wallet,
    reference: `TRF-${Math.floor(100000 + Math.random() * 899999)}`,
  };
}
