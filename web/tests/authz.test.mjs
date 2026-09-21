import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const sourcePath = new URL("../src/lib/authz.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const authz = await import(
  `data:text/javascript;charset=utf-8,${encodeURIComponent(compiled)}`
);

const roles = [
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "OFFICE_ADMIN",
  "TEAM_LEADER",
  "AGENT",
  "VIEWER",
  "AUDITOR",
];

const resources = [
  "customers",
  "demands",
  "listings",
  "showings",
  "offers",
  "sales",
  "payments",
  "paymentPlans",
  "installments",
  "tasks",
  "activities",
  "matching",
  "users",
];

test("authorization role matrix is explicit and stable", () => {
  assert.deepEqual(authz.ROLE_VALUES, roles);

  for (const role of roles) {
    assert.equal(authz.can(role, "customers", "read"), true);
  }

  for (const role of ["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]) {
    for (const resource of resources) {
      for (const action of ["read", "create", "update", "delete", "manage"]) {
        assert.equal(authz.can(role, resource, action), true);
      }
    }
  }

  for (const role of ["TEAM_LEADER", "AGENT"]) {
    for (const resource of resources) {
      assert.equal(authz.can(role, resource, "read"), true);
      assert.equal(authz.can(role, resource, "create"), true);
      assert.equal(authz.can(role, resource, "update"), true);
      assert.equal(authz.can(role, resource, "delete"), false);
      assert.equal(authz.can(role, resource, "manage"), false);
    }
  }

  for (const role of ["VIEWER", "AUDITOR"]) {
    for (const resource of resources) {
      assert.equal(authz.can(role, resource, "read"), true);
      for (const action of ["create", "update", "delete", "manage"]) {
        assert.equal(authz.can(role, resource, action), false);
      }
    }
  }
});

test("customer ownership scope isolates agents and preserves team-leader scope", () => {
  const agent = {
    userId: "agent-1",
    organizationId: "org-1",
    officeId: "office-1",
    teamId: "team-1",
    role: "AGENT",
  };
  const teamLeader = { ...agent, userId: "leader-1", role: "TEAM_LEADER" };
  const manager = { ...agent, userId: "admin-1", role: "OFFICE_ADMIN" };

  assert.deepEqual(authz.customerOwnershipScope(agent), { ownerUserId: "agent-1" });
  assert.deepEqual(authz.customerOwnershipScope(teamLeader), {
    owner: { teamId: "team-1" },
  });
  assert.deepEqual(authz.customerOwnershipScope(manager), {});

  assert.equal(authz.canAssignCustomerOwner(agent, "team-1"), false);
  assert.equal(authz.canAssignCustomerOwner(teamLeader, "team-1"), true);
  assert.equal(authz.canAssignCustomerOwner(teamLeader, "team-2"), false);
  assert.equal(authz.canAssignCustomerOwner(manager, "team-2"), true);
});

test("office listing scope always binds organization and office", () => {
  const context = {
    userId: "agent-1",
    organizationId: "org-1",
    officeId: "office-7",
    teamId: "team-3",
    role: "AGENT",
  };

  assert.deepEqual(authz.officeListingScope(context), {
    organizationId: "org-1",
    officeId: "office-7",
  });
});

test("assertCan denies read-only writes and allows agent writes", () => {
  const viewer = {
    userId: "viewer-1",
    organizationId: "org-1",
    officeId: "office-1",
    teamId: null,
    role: "VIEWER",
  };
  const agent = { ...viewer, userId: "agent-1", role: "AGENT" };

  assert.throws(
    () => authz.assertCan(viewer, "customers", "create"),
    (error) => error?.name === "AuthorizationDeniedError",
  );
  assert.doesNotThrow(() => authz.assertCan(agent, "customers", "create"));
});
