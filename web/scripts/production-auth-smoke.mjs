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
    customers: {
      status: null,
      ok: false,
      authenticated: false,
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

  console.log(JSON.stringify(result, null, 2));

  if (!result.session.present) {
    process.exitCode = 4;
    return;
  }

  if (!result.customers.authenticated) {
    process.exitCode = 5;
  }
}

main().catch((error) => {
  console.error("AUTH_SMOKE_FAILED");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
