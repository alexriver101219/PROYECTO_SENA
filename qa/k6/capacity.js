import http from "k6/http";
import { check, fail } from "k6";
import { Rate } from "k6/metrics";
import { Counter } from "k6/metrics";
import execution from "k6/execution";

const state = JSON.parse(open(__ENV.QA_SESSION_FILE));
const base = state.api;
const kind = __ENV.QA_KIND || "mixed";
const rate = Number(__ENV.QA_RATE || 5);
const duration = __ENV.QA_DURATION || "25s";
if (base !== "http://127.0.0.1:8101") throw new Error("Solo se permite la API local aislada 8101");
const failures = new Rate("business_failures");
const requests = new Counter("workload_requests");
const mix = Object.fromEntries(["dashboard", "employees", "requests", "documents", "certificate"].map(name => [name, new Counter("requests_" + name)]));
export const options = {
  scenarios: { measured: { executor: "constant-arrival-rate", rate, timeUnit: "1s", duration,
    preAllocatedVUs: 50, maxVUs: 100, gracefulStop: "15s" } },
  thresholds: {
    "http_req_duration{kind:workload}": [`p(95)<${kind === "login" ? 1000 : 500}`],
    "http_req_failed{kind:workload}": ["rate<0.01"],
    business_failures: ["rate<0.01"],
    dropped_iterations: ["count==0"],
    ...(kind === "mixed" ? { "http_req_duration{endpoint:/api/documentos/certificado}": ["p(95)<1500"] } : {}),
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};
export function setup() {
  const response = http.get(base + "/__qa/identity", { tags: { kind: "guard" } });
  if (response.status !== 200 || response.json("isolated") !== true || response.json("runId") !== state.runId || response.json("limits") !== false)
    fail("El servidor no corresponde al entorno de capacidad aislado");
  return { token: state.adminToken };
}
export default function (data) {
  let response, valid;
  if (kind === "login") {
    response = http.post(base + "/api/auth/login", JSON.stringify({ email: "admin@sesha.com", password: "test-only-fixture-0-credentials" }), {
      headers: { "Content-Type": "application/json" }, tags: { kind: "workload", endpoint: "login" }, timeout: "10s",
    });
    valid = response.status === 200 && response.json("user.role") === "admin";
  } else {
    const step = execution.scenario.iterationInTest % 20;
    const name = step < 8 ? "dashboard" : step < 12 ? "employees" : step < 16 ? "requests" : step < 19 ? "documents" : "certificate";
    mix[name].add(1);
    const endpoint = step < 8 ? "/api/dashboard" : step < 12 ? "/api/empleados?limit=10&page=1" : step < 16 ? "/api/solicitudes" : step < 19 ? "/api/documentos" : "/api/documentos/certificado";
    const pdf = endpoint.endsWith("certificado");
    response = http.get(base + endpoint, {
      headers: { Authorization: "Bearer " + data.token }, tags: { kind: "workload", endpoint: endpoint.split("?")[0] },
      timeout: "10s", responseType: pdf ? "binary" : "text",
    });
    valid = response.status === 200;
    if (valid) valid = pdf ? new Uint8Array(response.body).slice(0, 5).join(",") === "37,80,68,70,45" : endpoint.endsWith("dashboard") ? typeof response.json("documentos") === "number" : Array.isArray(response.json("items"));
  }
  requests.add(1); check(response, { "respuesta y contenido de negocio válidos": () => valid }); failures.add(!valid);
}
export function handleSummary(data) { return { [__ENV.QA_RESULT]: JSON.stringify(data, null, 2) }; }
