// Shape of cypress.env.json — gives Cypress.env("...") typed lookups.
declare namespace Cypress {
  interface GroundDetails {
    name?: string;
    description?: string;
    sport?: string;
    address?: string;
    latitude?: string;
    longitude?: string;
    pricePerHour?: string;
    currency?: string;
    openingTime?: string;
    closingTime?: string;
    contactPhone?: string;
    contactEmail?: string;
  }

  interface Env {
    TEST_EMAIL?: string;
    TEST_PASSWORD?: string;
    GROUND?: GroundDetails;
    GROUND_EDIT?: Pick<GroundDetails, "name" | "description" | "pricePerHour">;
  }
}
