// Register ground → edit ground → sign out, as a real owner account.
// All ground details come from cypress.env.json (GROUND / GROUND_EDIT).
// Requires TEST_EMAIL / TEST_PASSWORD; the suite skips without them.
//
// NOTE: this writes real documents to Firestore (status "pending"), so use
// a dedicated test account. Each run creates one new ground with a unique
// name suffix so the edit test can find the ground it just created.

const hasCreds = Boolean(
  Cypress.env("TEST_EMAIL") && Cypress.env("TEST_PASSWORD")
);

const ground = Cypress.env("GROUND") ?? {};
const groundEdit = Cypress.env("GROUND_EDIT") ?? {};

// Unique per run so "edit" targets exactly the card "register" created
const runId = Date.now().toString(36);
const groundName = `${ground.name ?? "Cypress Test Ground"} ${runId}`;
const editedName = `${groundEdit.name ?? "Cypress Edited Ground"} ${runId}`;

/** Type into the input/textarea inside the .field whose label matches. */
function fillField(label: string, value: string) {
  cy.contains(".field label", label)
    .parent()
    .find("input, textarea")
    .first()
    .clear()
    .type(value);
}

(hasCreds ? describe : describe.skip)("Ground flow (authenticated)", () => {
  beforeEach(() => {
    cy.login();
  });

  it("registers a new ground", () => {
    cy.contains(".nav-links a", "My Grounds").click();
    cy.contains("a", "+ Register a ground").click();
    cy.url().should("include", "/dashboard/new");
    cy.contains("h2", "Register a ground").should("be.visible");

    fillField("Ground name", groundName);
    fillField("Description", ground.description ?? "Created by Cypress e2e");
    cy.contains(".sport-chip", ground.sport ?? "Football").click();
    cy.contains(".sport-chip", ground.sport ?? "Football").should(
      "have.class",
      "selected"
    );
    fillField("Address", ground.address ?? "123 Test Lane, Colombo");
    cy.get('input[placeholder="Latitude"]').clear().type(ground.latitude ?? "6.9271");
    cy.get('input[placeholder="Longitude"]').clear().type(ground.longitude ?? "79.8612");
    cy.get('input[placeholder="Price per hour"]')
      .clear()
      .type(ground.pricePerHour ?? "2500");
    if (ground.currency) {
      cy.contains(".field label", "Standard charge")
        .parent()
        .find("select")
        .select(ground.currency);
    }
    if (ground.openingTime) {
      cy.get('input[type="time"]').first().type(ground.openingTime);
    }
    if (ground.closingTime) {
      cy.get('input[type="time"]').last().type(ground.closingTime);
    }
    fillField("Contact phone", ground.contactPhone ?? "0771234567");
    fillField("Contact email", ground.contactEmail ?? "owner@example.com");

    cy.get('button[type="submit"]').click();

    // Successful save navigates back to the dashboard, where the new
    // ground appears with a pending status badge.
    cy.url({ timeout: 15000 }).should("include", "/dashboard");
    cy.contains(".card-title", groundName, { timeout: 15000 })
      .closest(".card")
      .within(() => {
        cy.contains("Pending").should("be.visible");
        cy.contains("a", "Edit").should("be.visible");
      });
  });

  it("edits the ground and resubmits it for review", () => {
    cy.contains(".nav-links a", "My Grounds").click();
    cy.contains(".card-title", groundName, { timeout: 15000 })
      .closest(".card")
      .contains("a", "Edit")
      .click();

    cy.url().should("include", "/dashboard/edit/");
    cy.contains("h2", "Edit ground").should("be.visible");

    // Form is pre-filled from Firestore with what we registered
    cy.contains(".field label", "Ground name")
      .parent()
      .find("input")
      .should("have.value", groundName);

    fillField("Ground name", editedName);
    if (groundEdit.pricePerHour) {
      cy.get('input[placeholder="Price per hour"]')
        .clear()
        .type(groundEdit.pricePerHour);
    }
    if (groundEdit.description) {
      fillField("Description", groundEdit.description);
    }

    cy.contains("button", "Save & resubmit for review").click();

    cy.url({ timeout: 15000 }).should("include", "/dashboard");
    cy.contains(".card-title", editedName, { timeout: 15000 })
      .closest(".card")
      .contains("Pending")
      .should("be.visible");
  });

  it("signs out from the dashboard", () => {
    cy.contains("button", "Sign out").click();
    cy.url({ timeout: 10000 }).should("include", "/login");
    cy.get(".topnav").should("not.exist");

    // Session is really gone: protected routes bounce back to /login
    cy.visit("/dashboard");
    cy.url().should("include", "/login");
  });
});

export {};
