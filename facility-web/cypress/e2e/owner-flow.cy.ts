// Requires real Firebase test credentials:
//   CYPRESS_TEST_EMAIL=owner@example.com CYPRESS_TEST_PASSWORD=... npm run cy:run
// The whole suite is skipped when credentials are not provided.

const hasCreds = Boolean(
  Cypress.env("TEST_EMAIL") && Cypress.env("TEST_PASSWORD")
);

(hasCreds ? describe : describe.skip)("Owner flow (authenticated)", () => {
  beforeEach(() => {
    cy.login();
  });

  it("shows the top navigation after signing in", () => {
    cy.get(".topnav").should("be.visible");
    cy.contains(".brand", "Play Buddy").should("be.visible");
  });

  it("navigates between Home and My Grounds", () => {
    cy.contains(".nav-links a", "My Grounds").click();
    cy.url().should("include", "/dashboard");
    cy.contains(".nav-links a", "Home").click();
    cy.url().should("include", "/home");
  });

  it("signs out and returns to the login page", () => {
    cy.contains("button", "Sign out").click();
    cy.url({ timeout: 10000 }).should("include", "/login");
    cy.get(".topnav").should("not.exist");
  });
});

export {};
