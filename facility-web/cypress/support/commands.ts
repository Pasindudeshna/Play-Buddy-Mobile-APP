/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Sign in through the login form with real Firebase credentials.
       * Reads CYPRESS_TEST_EMAIL / CYPRESS_TEST_PASSWORD unless overridden.
       */
      login(email?: string, password?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", (email?: string, password?: string) => {
  const testEmail = email ?? Cypress.env("TEST_EMAIL");
  const testPassword = password ?? Cypress.env("TEST_PASSWORD");

  expect(testEmail, "CYPRESS_TEST_EMAIL env var").to.be.a("string").and.not.be.empty;
  expect(testPassword, "CYPRESS_TEST_PASSWORD env var").to.be.a("string").and.not.be.empty;

  // Firebase keeps the auth session in IndexedDB, which Cypress does NOT
  // clear between tests — wipe it so /login doesn't instantly redirect.
  cy.window().then((win) => {
    return new Cypress.Promise((resolve) => {
      const req = win.indexedDB.deleteDatabase("firebaseLocalStorageDb");
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  });

  cy.visit("/login");
  cy.get('input[type="email"]').type(testEmail);
  cy.get('input[type="password"]').type(testPassword, { log: false });
  cy.get('button[type="submit"]').click();
  cy.url({ timeout: 15000 }).should("match", /\/(home|admin)/);
});

export { };
