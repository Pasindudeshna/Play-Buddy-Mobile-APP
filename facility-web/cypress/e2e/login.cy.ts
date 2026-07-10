describe("Login page", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("renders the sign-in form by default", () => {
    cy.contains("Play Buddy — Facility Portal").should("be.visible");
    cy.contains("h2", "Welcome back").should("be.visible");
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
    cy.get('button[type="submit"]').should("contain", "Sign in");
  });

  it("switches to the registration form", () => {
    cy.contains("button", "Register").click();
    cy.contains("h2", "Register your facility").should("be.visible");
    cy.contains("label", "Your name").should("be.visible");
    cy.contains("button", "Create account").should("be.visible");
  });

  it("switches back to sign-in from registration", () => {
    cy.contains("button", "Register").click();
    cy.contains("h2", "Register your facility").should("be.visible");
    cy.get(".segmented button").first().click();
    cy.contains("h2", "Welcome back").should("be.visible");
  });

  it("requires email and password to submit", () => {
    cy.get('button[type="submit"]').click();
    // Native HTML validation blocks submission of empty required fields
    cy.get('input[type="email"]:invalid').should("exist");
    cy.url().should("include", "/login");
  });

  it("rejects a malformed email", () => {
    cy.get('input[type="email"]').type("not-an-email");
    cy.get('input[type="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.get('input[type="email"]:invalid').should("exist");
    cy.url().should("include", "/login");
  });

  it("shows an error for invalid credentials", () => {
    cy.get('input[type="email"]').type("nonexistent-user@example.com");
    cy.get('input[type="password"]').type("wrong-password-123");
    cy.get('button[type="submit"]').click();
    cy.get(".error-text", { timeout: 15000 }).should("be.visible");
    cy.url().should("include", "/login");
  });

  it("enforces minimum password length on registration", () => {
    cy.contains("button", "Register").click();
    // Chrome only reports tooShort for "dirty" (user-typed) values, which
    // synthetic typing doesn't set — assert the constraint attribute instead.
    cy.get('input[type="password"]').should("have.attr", "minlength", "6");
    cy.get('button[type="submit"]').should("contain", "Create account");
  });
});
