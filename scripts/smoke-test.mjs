import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const port = 3010;
const baseUrl = `http://127.0.0.1:${port}`;
const nextBin = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);
const seedScript = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "seed-dev-db.mjs",
);

const routes = [
  { path: "/", expect: "Book your next beauty appointment in minutes" },
  { path: "/explore", expect: "Discover and compare beauty businesses" },
  { path: "/login", expect: "Sign in to the right space" },
  { path: "/register", expect: "Create a customer or shop account" },
  { path: "/business/atlas-barber-club", expect: "atlas-barber-club" },
  { path: "/book/atlas-barber-club", expect: "atlas-barber-club" },
  { path: "/manage-booking", expect: "Find your booking" },
  { path: "/manage-booking/TEST-0000", expect: "Verify your booking" },
  { path: "/partner", expect: "partner" },
];

const protectedRoutes = [
  { path: "/account", location: "/login?next=%2Faccount" },
  { path: "/dashboard", location: "/login?next=%2Fdashboard" },
  { path: "/admin", location: "/login?next=%2Fadmin" },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
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

function getCookieHeader(response) {
  const rawCookie = response.headers.get("set-cookie");
  return rawCookie?.split(";")[0] ?? "";
}

async function fetchHtml(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const html = await response.text();
  return { response, html };
}

async function postJson(pathname, body) {
  return fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
}

async function run() {
  await new Promise((resolve, reject) => {
    const seedChild = spawn(process.execPath, [seedScript], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    seedChild.stdout.on("data", (chunk) => process.stdout.write(chunk));
    seedChild.stderr.on("data", (chunk) => process.stderr.write(chunk));
    seedChild.on("error", reject);
    seedChild.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Dev database seed failed with exit code ${code}`));
    });
  });

  const child = spawn(process.execPath, [nextBin, "start", "--port", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BOOKING_OTP_DEV_PREVIEW: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.on("error", (error) => {
    console.error(error);
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  try {
    await waitForServer(baseUrl);

    let hasFailure = false;

    for (const route of routes) {
      try {
        const response = await fetch(`${baseUrl}${route.path}`);
        const html = await response.text();
        const ok = response.ok && html.includes(route.expect);
        console.log(`${response.status}\t${ok ? "PASS" : "MISS"}\t${route.path}`);
        if (!ok) {
          hasFailure = true;
        }
      } catch (error) {
        hasFailure = true;
        console.log(`ERR\tFAIL\t${route.path}\t${error instanceof Error ? error.message : String(error)}`);
      }
    }

    for (const route of protectedRoutes) {
      try {
        const response = await fetch(`${baseUrl}${route.path}`, {
          redirect: "manual",
        });
        const location = response.headers.get("location") ?? "";
        const ok =
          response.status >= 300 &&
          response.status < 400 &&
          location.includes(route.location);
        console.log(`${response.status}\t${ok ? "PASS" : "MISS"}\t${route.path} -> ${location}`);
        if (!ok) {
          hasFailure = true;
        }
      } catch (error) {
        hasFailure = true;
        console.log(`ERR\tFAIL\t${route.path}\t${error instanceof Error ? error.message : String(error)}`);
      }
    }

    try {
      const unique = Date.now();
      const customerEmail = `customer.${unique}@reservee.test`;
      const shopEmail = `shop.${unique}@reservee.test`;

      const customerRegister = await postJson("/api/auth/register", {
        role: "customer",
        name: "Customer Smoke",
        email: customerEmail,
        phone: "+216 20 000 111",
        password: "smoke12345",
      });
      const customerJson = await customerRegister.json();
      const customerCookie = getCookieHeader(customerRegister);
      const customerAccount = await fetchHtml("/account", {
        headers: {
          cookie: customerCookie,
        },
      });
      const customerOk =
        customerRegister.ok &&
        customerAccount.response.ok &&
        customerAccount.html.includes("Track your appointments without seeing business tools");
      console.log(`${customerRegister.status}\t${customerOk ? "PASS" : "MISS"}\t/register customer -> /account`);
      if (!customerOk) {
        hasFailure = true;
      }

      const shopRegister = await postJson("/api/auth/register", {
        role: "shop",
        name: "Shop Smoke",
        email: shopEmail,
        phone: "+216 20 000 222",
        password: "smoke12345",
        businessName: "Smoke Barber Lab",
        categorySlug: "barbers",
        citySlug: "tunis",
        area: "Lac 2",
      });
      const shopJson = await shopRegister.json();
      const shopCookie = getCookieHeader(shopRegister);
      const shopDashboard = await fetchHtml("/dashboard", {
        headers: {
          cookie: shopCookie,
        },
      });
      const shopOk =
        shopRegister.ok &&
        shopDashboard.response.ok &&
        shopDashboard.html.includes("business dashboard");
      console.log(`${shopRegister.status}\t${shopOk ? "PASS" : "MISS"}\t/register shop -> /dashboard`);
      if (!shopOk) {
        hasFailure = true;
      }

      const adminLogin = await postJson("/api/auth/login", {
        email: "admin@reservee.tn",
        password: "admin12345",
      });
      const adminJson = await adminLogin.json();
      const adminCookie = getCookieHeader(adminLogin);
      const adminPanel = await fetchHtml("/admin", {
        headers: {
          cookie: adminCookie,
        },
      });
      const adminOk =
        adminLogin.ok &&
        adminPanel.response.ok &&
        adminPanel.html.includes("Review pending businesses");
      console.log(`${adminLogin.status}\t${adminOk ? "PASS" : "MISS"}\t/login admin -> /admin`);
      if (!adminOk) {
        hasFailure = true;
      }

      const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          cookie: customerCookie,
        },
      });
      const logoutCheck = await fetch(`${baseUrl}/account`, {
        redirect: "manual",
      });
      const logoutOk =
        logoutResponse.ok &&
        (logoutCheck.headers.get("location") ?? "").includes("/login?next=%2Faccount");
      console.log(`${logoutResponse.status}\t${logoutOk ? "PASS" : "MISS"}\t/logout customer`);
      if (!logoutOk) {
        hasFailure = true;
      }

      const serviceResponse = await fetch(`${baseUrl}/api/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: shopCookie,
        },
        body: JSON.stringify({
          businessId: shopJson.session.user.businessProfileId,
          title: "Free consultation",
          description: "Zero-cost intro slot",
          price: 0,
          durationMinutes: 30,
          genderTarget: "unisex",
        }),
      });
      const serviceJson = await serviceResponse.json();
      const startAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      const wrongEndAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
      const bookingResponse = await postJson("/api/bookings", {
        businessId: shopJson.session.user.businessProfileId,
        serviceId: serviceJson.data.id,
        customerName: "Public Booking Smoke",
        customerPhone: "+216 20 100 333",
        startAt,
        endAt: wrongEndAt,
      });
      const bookingJson = await bookingResponse.json();
      const challengeResponse = await postJson(
        `/api/bookings/reference/${bookingJson.data.referenceCode}/challenge`,
        {
          customerPhone: "+216 20 100 333",
        },
      );
      const challengeJson = await challengeResponse.json();
      const verifyResponse = await postJson(
        `/api/bookings/reference/${bookingJson.data.referenceCode}/verify`,
        {
          challengeId: challengeJson.data.challengeId,
          code: challengeJson.data.developmentCodePreview,
        },
      );
      const verifyJson = await verifyResponse.json();
      const unauthorizedReferenceGet = await fetch(
        `${baseUrl}/api/bookings/reference/${bookingJson.data.referenceCode}`,
      );
      const authorizedReferenceGet = await fetch(
        `${baseUrl}/api/bookings/reference/${bookingJson.data.referenceCode}?token=${encodeURIComponent(
          verifyJson.data.token,
        )}`,
      );
      const authorizedReferenceJson = await authorizedReferenceGet.json();
      const bookingAccessOk =
        serviceResponse.status === 201 &&
        bookingResponse.status === 201 &&
        challengeResponse.status === 200 &&
        verifyResponse.status === 200 &&
        unauthorizedReferenceGet.status === 401 &&
        authorizedReferenceGet.status === 200 &&
        bookingJson.data.endAt !== wrongEndAt &&
        authorizedReferenceJson.data.customerPhone === "+216 20 100 333";
      console.log(`${authorizedReferenceGet.status}\t${bookingAccessOk ? "PASS" : "MISS"}\t/public booking otp flow`);
      if (!bookingAccessOk) {
        hasFailure = true;
      }

      void customerJson;
      void shopJson;
      void adminJson;
      void serviceJson;
      void bookingJson;
      void challengeJson;
      void verifyJson;
    } catch (error) {
      hasFailure = true;
      console.log(`ERR\tFAIL\tauth-flow\t${error instanceof Error ? error.message : String(error)}`);
    }

    if (hasFailure) {
      process.exitCode = 1;
    }
  } finally {
    child.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
