import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const seedScript = path.join(projectRoot, "scripts", "seed-dev-db.mjs");

const port = 3010;
const baseUrl = `http://127.0.0.1:${port}`;

const publicRoutes = [
  "/",
  "/explore",
  "/login",
  "/register",
  "/reset-password",
  "/business/atlas-barber-club",
  "/book/atlas-barber-club",
  "/manage-booking",
  "/partner",
];

const protectedRoutes = [
  { path: "/account", location: "/login?next=%2Faccount" },
  { path: "/dashboard", location: "/login?next=%2Fdashboard" },
  { path: "/admin", location: "/login?next=%2Fadmin" },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCookieHeader(response) {
  const cookie = response.headers.get("set-cookie");
  return cookie?.split(";")[0] ?? "";
}

function jsonHeaders(cookie = "") {
  return {
    "Content-Type": "application/json",
    Origin: baseUrl,
    Referer: `${baseUrl}/smoke`,
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

async function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}

    await sleep(500);
  }

  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

async function fetchJson(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  return { response, payload };
}

async function fetchHtml(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    ...init,
  });
  const body = await response.text();
  return { response, body };
}

async function postJson(pathname, body, cookie = "") {
  return fetchJson(pathname, {
    method: "POST",
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  });
}

async function patchJson(pathname, body, cookie = "") {
  return fetchJson(pathname, {
    method: "PATCH",
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  });
}

async function completeLogin({ identifier, password, deliveryChannel }) {
  const challenge = await postJson("/api/auth/login", {
    identifier,
    password,
    deliveryChannel,
  });

  if (!challenge.response.ok || !challenge.payload?.challenge?.challengeId) {
    return {
      ok: false,
      challenge,
      verify: null,
      cookie: "",
      session: null,
    };
  }

  const verify = await postJson("/api/auth/login/verify", {
    challengeId: challenge.payload.challenge.challengeId,
    code: challenge.payload.challenge.developmentCodePreview,
  });

  return {
    ok: Boolean(verify.response.ok && verify.payload?.session),
    challenge,
    verify,
    cookie: getCookieHeader(verify.response),
    session: verify.payload?.session ?? null,
  };
}

async function runSeed() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [seedScript], {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Dev database seed failed with exit code ${code}`));
    });
  });
}

function startServer() {
  const child = spawn(process.execPath, [nextBin, "start", "--port", String(port)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      VERIFICATION_CODE_DEV_PREVIEW: "true",
      BOOKING_OTP_DEV_PREVIEW: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  child.on("error", (error) => {
    console.error(error);
  });

  return child;
}

function formatResult(ok, label, details = "") {
  console.log(`${ok ? "PASS" : "FAIL"}\t${label}${details ? `\t${details}` : ""}`);
  return ok;
}

function getOutsideHoursIso(slotIso) {
  const slot = new Date(slotIso);
  const year = slot.getUTCFullYear();
  const month = String(slot.getUTCMonth() + 1).padStart(2, "0");
  const day = String(slot.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}T03:00:00.000Z`;
}

async function run() {
  await runSeed();
  const server = startServer();

  try {
    await waitForServer(baseUrl);
    let hasFailure = false;

    for (const route of publicRoutes) {
      const { response } = await fetchHtml(route);
      hasFailure ||= !formatResult(response.ok, `public route ${route}`, String(response.status));
    }

    for (const route of protectedRoutes) {
      const { response } = await fetchHtml(route);
      const ok =
        response.status >= 300 &&
        response.status < 400 &&
        (response.headers.get("location") ?? "").includes(route.location);
      hasFailure ||= !formatResult(
        ok,
        `protected redirect ${route.path}`,
        `${response.status} -> ${response.headers.get("location") ?? ""}`,
      );
    }

    const customerLogin = await completeLogin({
      identifier: "customer@reservee.tn",
      password: "Customer12345!",
      deliveryChannel: "email",
    });
    hasFailure ||= !formatResult(customerLogin.ok, "customer login with OTP");

    const ownerLogin = await completeLogin({
      identifier: "atlas@reservee.tn",
      password: "Owner12345!",
      deliveryChannel: "email",
    });
    hasFailure ||= !formatResult(ownerLogin.ok, "owner login with OTP");

    const adminLogin = await completeLogin({
      identifier: "admin@reservee.tn",
      password: "Admin12345!",
      deliveryChannel: "email",
    });
    hasFailure ||= !formatResult(adminLogin.ok, "admin login with OTP");

    const customerSession = await fetchJson("/api/auth/session", {
      headers: {
        Cookie: customerLogin.cookie,
      },
    });
    hasFailure ||= !formatResult(
      customerSession.response.ok && customerSession.payload?.session?.user?.role === "customer",
      "session lookup after login",
    );

    const ownerAdminAttempt = await fetchJson("/api/admin/businesses?limit=5", {
      headers: {
        Cookie: ownerLogin.cookie,
      },
    });
    hasFailure ||= !formatResult(ownerAdminAttempt.response.status === 403, "owner blocked from admin endpoint");

    const adminBusinesses = await fetchJson("/api/admin/businesses?limit=5", {
      headers: {
        Cookie: adminLogin.cookie,
      },
    });
    hasFailure ||= !formatResult(adminBusinesses.response.ok, "admin can access moderation endpoint");

    const publicBusiness = await fetchJson("/api/businesses?slug=atlas-barber-club");
    const business = publicBusiness.payload?.data;
    const activeService = business?.services?.find((service) => service.active);
    hasFailure ||= !formatResult(Boolean(publicBusiness.response.ok && business?.id && activeService?.id), "load public business data");

    const nextSlotResponse = await fetchJson(
      `/api/availability?businessId=${encodeURIComponent(business.id)}&serviceId=${encodeURIComponent(activeService.id)}&type=next`,
    );
    const nextSlot = nextSlotResponse.payload?.data;
    hasFailure ||= !formatResult(Boolean(nextSlotResponse.response.ok && nextSlot), "resolve next available slot");

    const bookingCreate = await postJson(
      "/api/bookings",
      {
        businessId: business.id,
        serviceId: activeService.id,
        customerName: customerLogin.session.user.name,
        customerPhone: customerLogin.session.user.phone,
        customerNote: "Smoke test booking",
        startAt: nextSlot,
      },
      customerLogin.cookie,
    );
    const booking = bookingCreate.payload?.data;
    hasFailure ||= !formatResult(
      bookingCreate.response.status === 201 && Boolean(booking?.id && booking?.referenceCode),
      "customer can create a real booking",
    );

    const ownerBookings = await fetchJson("/api/bookings", {
      headers: {
        Cookie: ownerLogin.cookie,
      },
    });
    const ownerSeesBooking = ownerBookings.payload?.data?.some(
      (item) => item.referenceCode === booking.referenceCode,
    );
    hasFailure ||= !formatResult(Boolean(ownerBookings.response.ok && ownerSeesBooking), "owner dashboard sees new booking");

    const duplicateBooking = await postJson("/api/bookings", {
      businessId: business.id,
      serviceId: activeService.id,
      customerName: "Duplicate Attempt",
      customerPhone: "+216 22 909 909",
      startAt: nextSlot,
    });
    hasFailure ||= !formatResult(
      duplicateBooking.response.status === 409 &&
        duplicateBooking.payload?.error === "This time slot is no longer available.",
      "double booking returns 409 conflict",
    );

    const pastBooking = await postJson(
      "/api/bookings",
      {
        businessId: business.id,
        serviceId: activeService.id,
        customerName: customerLogin.session.user.name,
        customerPhone: customerLogin.session.user.phone,
        startAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      customerLogin.cookie,
    );
    hasFailure ||= !formatResult(pastBooking.response.status === 400, "booking in the past is rejected");

    const outsideHoursBooking = await postJson(
      "/api/bookings",
      {
        businessId: business.id,
        serviceId: activeService.id,
        customerName: customerLogin.session.user.name,
        customerPhone: customerLogin.session.user.phone,
        startAt: getOutsideHoursIso(nextSlot),
      },
      customerLogin.cookie,
    );
    hasFailure ||= !formatResult(outsideHoursBooking.response.status === 409, "booking outside opening hours is rejected");

    const cancelledBooking = await patchJson(
      `/api/bookings/${booking.id}`,
      {
        action: "updateStatus",
        status: "cancelled",
      },
      customerLogin.cookie,
    );
    hasFailure ||= !formatResult(cancelledBooking.response.ok, "customer can cancel booking");

    const rebookAfterCancel = await postJson(
      "/api/bookings",
      {
        businessId: business.id,
        serviceId: activeService.id,
        customerName: customerLogin.session.user.name,
        customerPhone: customerLogin.session.user.phone,
        customerNote: "Rebook after cancellation",
        startAt: nextSlot,
      },
      customerLogin.cookie,
    );
    hasFailure ||= !formatResult(rebookAfterCancel.response.status === 201, "cancellation frees the slot");

    const referenceCode = rebookAfterCancel.payload?.data?.referenceCode;
    const bookingChallenge = await postJson(
      `/api/bookings/reference/${referenceCode}/challenge`,
      {
        customerPhone: customerLogin.session.user.phone,
      },
    );
    const bookingVerify = await postJson(
      `/api/bookings/reference/${referenceCode}/verify`,
      {
        challengeId: bookingChallenge.payload?.data?.challengeId,
        code: bookingChallenge.payload?.data?.developmentCodePreview,
      },
    );
    const publicBookingLookup = await fetchJson(
      `/api/bookings/reference/${referenceCode}?token=${encodeURIComponent(
        bookingVerify.payload?.data?.token ?? "",
      )}`,
    );
    hasFailure ||= !formatResult(
      bookingChallenge.response.ok &&
        bookingVerify.response.ok &&
        publicBookingLookup.response.ok &&
        publicBookingLookup.payload?.data?.referenceCode === referenceCode,
      "public booking verification flow works",
    );

    const logout = await fetchJson("/api/auth/logout", {
      method: "POST",
      headers: jsonHeaders(customerLogin.cookie),
    });
    const sessionAfterLogout = await fetchJson("/api/auth/session", {
      headers: {
        Cookie: customerLogin.cookie,
      },
    });
    hasFailure ||= !formatResult(
      logout.response.ok && !sessionAfterLogout.payload?.session,
      "logout revokes the session",
    );

    if (hasFailure) {
      process.exitCode = 1;
    }
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
