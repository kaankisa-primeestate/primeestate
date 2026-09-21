import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

async function loadAuthz() {
  const source = await fs.readFile(new URL("../../src/lib/authz.ts", import.meta.url), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: "authz.ts",
  }).outputText;

  return import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
}

const authz = await loadAuthz();

const baseContext = {
  userId: "agent-1",
  organizationId: "org-1",
  officeId: "office-1",
  teamId: "team-1",
  role: "AGENT",
};

test("role capabilities enforce read/write boundaries", () => {
  assert.equal(authz.can("AGENT", "customers", "read"), true);
  assert.equal(authz.can("AGENT", "customers", "create"), true);
  assert.equal(authz.can("AGENT", "customers", "delete"), false);
  assert.equal(authz.can("VIEWER", "customers", "read"), true);
  assert.equal(authz.can("VIEWER", "customers", "create"), false);
  assert.equal(authz.can("AUDITOR", "sales", "update"), false);
  assert.equal(authz.can("OFFICE_ADMIN", "sales", "manage"), true);
});

test("customer ownership scope is role-aware", () => {
  assert.deepEqual(authz.customerOwnershipScope(baseContext), { ownerUserId: "agent-1" });
  assert.deepEqual(
    authz.customerOwnershipScope({ ...baseContext, role: "TEAM_LEADER" }),
    { owner: { teamId: "team-1" } },
  );
  assert.deepEqual(
    authz.customerOwnershipScope({ ...baseContext, role: "OFFICE_ADMIN" }),
    {},
  );
});

test("office listing scope stays tenant and office bound", () => {
  assert.deepEqual(authz.officeListingScope(baseContext), {
    organizationId: "org-1",
    officeId: "office-1",
  });
});

test("customer owner assignment cannot cross team scope", () => {
  assert.equal(authz.canAssignCustomerOwner(baseContext, "team-1"), false);
  assert.equal(
    authz.canAssignCustomerOwner({ ...baseContext, role: "TEAM_LEADER" }, "team-1"),
    true,
  );
  assert.equal(
    authz.canAssignCustomerOwner({ ...baseContext, role: "TEAM_LEADER" }, "team-2"),
    false,
  );
  assert.equal(
    authz.canAssignCustomerOwner({ ...baseContext, role: "OFFICE_ADMIN" }, "team-2"),
    true,
  );
});

test("assertCan throws the centralized authorization error", () => {
  assert.doesNotThrow(() =>
    authz.assertCan(baseContext, "customers", "update"),
  );
  assert.throws(
    () => authz.assertCan(baseContext, "customers", "delete"),
    (error) => error?.name === "AuthorizationDeniedError",
  );
});
