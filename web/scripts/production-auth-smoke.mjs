const baseUrl = (process.env.AUTH_SMOKE_BASE_URL ?? "").replace(/\/$/, "");
const email = process.env.AUTH_SMOKE_EMAIL?.trim().toLowerCase();
const password = process.env.AUTH_SMOKE_PASSWORD;

if (!baseUrl) throw new Error("AUTH_SMOKE_BASE_URL is required.");
if (!email) throw new Error("AUTH_SMOKE_EMAIL is required.");
if (!password) throw new Error("AUTH_SMOKE_PASSWORD is required.");

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const combined = headers.get("set-cookie");
  return combined ? [combined] : [];
}

function cookieHeader(setCookies) {
  return setCookies
    .map((value) => value.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function readJson(response) {
  return response.json().catch(() => null);
}

async function main() {
  const result = {
    baseUrl,
    signIn: {
      status: null,
      ok: false,
      setCookieCount: 0,
    },
    session: {
      status: null,
      ok: false,
      present: false,
    },
    health: {
      status: null,
      ok: false,
      database: null,
      healthy: false,
    },
    customers: {
      status: null,
      ok: false,
      authenticated: false,
    },
    dashboardPage: {
      status: null,
      ok: false,
      no500: false,
    },
    financeDashboardPage: {
      status: null,
      ok: false,
      no500: false,
    },
    sales: {
      status: null,
      ok: false,
    },
    payments: {
      status: null,
      ok: false,
    },
    paymentPlans: {
      status: null,
      ok: false,
    },
  };

  const commonHeaders = {
    "Content-Type": "application/json",
    Origin: baseUrl,
    Referer: `${baseUrl}/login`,
  };

  const signInResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({
      email,
      password,
      rememberMe: true,
    }),
  });

  result.signIn.status = signInResponse.status;
  result.signIn.ok = signInResponse.ok;

  const setCookies = getSetCookies(signInResponse.headers);
  result.signIn.setCookieCount = setCookies.length;

  if (!signInResponse.ok) {
    const body = await readJson(signInResponse);
    result.signIn.errorCode = body?.code ?? null;
    result.signIn.errorMessagePresent = Boolean(body?.message);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 2;
    return;
  }

  const cookies = cookieHeader(setCookies);
  if (!cookies) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 3;
    return;
  }

  const sessionResponse = await fetch(`${baseUrl}/api/auth/get-session`, {
    method: "GET",
    headers: {
      Cookie: cookies,
      Origin: baseUrl,
      Referer: `${baseUrl}/dashboard`,
    },
  });

  result.session.status = sessionResponse.status;
  result.session.ok = sessionResponse.ok;

  const sessionBody = await readJson(sessionResponse);
  result.session.present = Boolean(sessionBody?.session?.id && sessionBody?.user?.id);

  const healthResponse = await fetch(`${baseUrl}/api/health`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Origin: baseUrl,
      Referer: `${baseUrl}/dashboard`,
    },
  });
  const healthBody = await readJson(healthResponse);

  result.health.status = healthResponse.status;
  result.health.ok = healthResponse.ok;
  result.health.database = healthBody?.database ?? null;
  result.health.healthy =
    healthResponse.ok &&
    healthBody?.status === "ok" &&
    healthBody?.database === "connected";

  const customersResponse = await fetch(`${baseUrl}/api/customers?limit=1`, {
    method: "GET",
    headers: {
      Cookie: cookies,
      Origin: baseUrl,
      Referer: `${baseUrl}/clients`,
    },
  });

  result.customers.status = customersResponse.status;
  result.customers.ok = customersResponse.ok;
  result.customers.authenticated = customersResponse.status !== 401;

  const [dashboardResponse, financePageResponse] = await Promise.all([
    fetch(`${baseUrl}/dashboard`, {
      headers: {
        Cookie: cookies,
        Origin: baseUrl,
        Referer: `${baseUrl}/dashboard`,
      },
    }),
    fetch(`${baseUrl}/finance/dashboard`, {
      headers: {
        Cookie: cookies,
        Origin: baseUrl,
        Referer: `${baseUrl}/finance/dashboard`,
      },
    }),
  ]);

  result.dashboardPage.status = dashboardResponse.status;
  result.dashboardPage.ok = dashboardResponse.ok;
  result.dashboardPage.no500 = dashboardResponse.status !== 500;

  result.financeDashboardPage.status = financePageResponse.status;
  result.financeDashboardPage.ok = financePageResponse.ok;
  result.financeDashboardPage.no500 = financePageResponse.status !== 500;

  const [salesResponse, paymentsResponse, paymentPlansResponse] = await Promise.all([
    fetch(`${baseUrl}/api/sales`, {
      headers: {
        Cookie: cookies,
        Origin: baseUrl,
        Referer: `${baseUrl}/dashboard`,
      },
    }),
    fetch(`${baseUrl}/api/payments`, {
      headers: {
        Cookie: cookies,
        Origin: baseUrl,
        Referer: `${baseUrl}/finance`,
      },
    }),
    fetch(`${baseUrl}/api/payment-plans`, {
      headers: {
        Cookie: cookies,
        Origin: baseUrl,
        Referer: `${baseUrl}/finance/dashboard`,
      },
    }),
  ]);

  result.sales.status = salesResponse.status;
  result.sales.ok = salesResponse.ok;
  result.payments.status = paymentsResponse.status;
  result.payments.ok = paymentsResponse.ok;
  result.paymentPlans.status = paymentPlansResponse.status;
  result.paymentPlans.ok = paymentPlansResponse.ok;

  console.log(JSON.stringify(result, null, 2));

  if (!result.session.present) {
    process.exitCode = 4;
    return;
  }

  if (!result.health.healthy) {
    process.exitCode = 5;
    return;
  }

  if (!result.customers.authenticated) {
    process.exitCode = 6;
    return;
  }

  if (
    !result.dashboardPage.ok ||
    !result.dashboardPage.no500 ||
    !result.financeDashboardPage.ok ||
    !result.financeDashboardPage.no500
  ) {
    process.exitCode = 7;
    return;
  }

  if (!result.sales.ok || !result.payments.ok || !result.paymentPlans.ok) {
    process.exitCode = 8;
  }
}

main().catch((error) => {
  console.error("AUTH_SMOKE_FAILED");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
