const API = 'http://localhost:5000'; // backend URL

/* Signup */
if (document.getElementById('signupBtn')) {
  document.getElementById('signupBtn').addEventListener('click', async () => {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const res = await fetch(API + '/auth/signup', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, password })
    });
    const j = await res.json();
    alert(j.message || j.error || 'Done');
    if (res.ok) window.location = 'login.html';
  });
}

/* Login */
if (document.getElementById('loginBtn')) {
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const res = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    const j = await res.json();
    if (res.ok && j.accessToken) {
      // store access token in localStorage for Authorization header (httpOnly cookie has refresh token)
      localStorage.setItem('accessToken', j.accessToken);
      window.location = 'dashboard.html';
    } else {
      alert(j.error || j.message || 'Login failed');
    }
  });
}

/* Dashboard - fetch user */
async function loadDashboard() {
  const token = localStorage.getItem('accessToken');
  if (!token) return;
  const res = await fetch(API + '/user/me', { headers: { Authorization: 'Bearer ' + token }});
  if (!res.ok) {
    // try refresh flow (omitted) or redirect to login
    return;
  }
  const { user } = await res.json();
  if (user) {
    document.getElementById('balance').textContent = (user.balanceCents/100).toFixed(2);
    document.getElementById('demo-balance')?.replaceWith(document.createTextNode((user.balanceCents/100).toFixed(2)));
  }
  // load transactions
  const txRes = await fetch(API + '/user/transactions', { headers: { Authorization: 'Bearer ' + token }});
  if (txRes.ok) {
    const { txs } = await txRes.json();
    const list = document.getElementById('txList');
    if (!txs || txs.length === 0) { list.textContent = 'No transactions yet — make a deposit.'; return; }
    list.innerHTML = '';
    txs.forEach(tx => {
      const el = document.createElement('div');
      el.style.padding = '8px 0';
      el.innerHTML = `<div style="display:flex;justify-content:space-between"><div>${tx.type} • ${tx.provider}</div><div>GH₵ ${(tx.amountCents/100).toFixed(2)}</div></div>
                      <div class="muted" style="font-size:12px">${new Date(tx.createdAt).toLocaleString()}</div>`;
      list.appendChild(el);
    });
  }
}
if (document.location.pathname.endsWith('dashboard.html')) loadDashboard();

/* Deposit flow */
if (document.getElementById('payBtn')) {
  document.getElementById('payBtn').addEventListener('click', async () => {
    const amountStr = document.getElementById('amount').value.trim();
    const method = document.getElementById('method').value;
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) return alert('Enter valid amount');
    const token = localStorage.getItem('accessToken');

    if (method === 'stripe') {
      // convert to cents & call backend to create PaymentIntent
      const res = await fetch(API + '/pay/deposit/stripe', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ amountCents: Math.round(amount*100), currency: 'usd' })
      });
      const j = await res.json();
      if (!res.ok) return alert(j.error || 'Failed to create payment');
      // Here you'd normally call Stripe.js to confirm card using clientSecret.
      alert('Stripe PaymentIntent created. clientSecret (dev): ' + (j.clientSecret || '...'));
      window.location = 'dashboard.html';
    } else if (method === 'paypal') {
      const res = await fetch(API + '/pay/deposit/paypal', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ amountCents: Math.round(amount*100) })
      });
      const j = await res.json();
      alert(j.message || JSON.stringify(j));
    } else if (method === 'hubtel') {
      const res = await fetch(API + '/pay/deposit/hubtel', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ amountCents: Math.round(amount*100) })
      });
      const j = await res.json();
      alert(j.message || JSON.stringify(j));
    }
  });
}

/* Logout */
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.addEventListener('click', async () => {
  await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' });
  localStorage.removeItem('accessToken');
  window.location = 'index.html';
});