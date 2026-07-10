describe("Route protection", () => {
  const protectedRoutes = [
    "/home",
    "/dashboard",
    "/dashboard/new",
    "/dashboard/manage/some-id",
    "/admin",
    "/admin/all",
  ];

  protectedRoutes.forEach((route) => {
    it(`redirects unauthenticated visitor away from ${route}`, () => {
      cy.visit(route);
      cy.url({ timeout: 10000 }).should("include", "/login");
      cy.contains("h2", "Welcome back").should("be.visible");
    });
  });

  it("redirects unknown paths to /login", () => {
    cy.visit("/this/route/does/not/exist");
    cy.url().should("include", "/login");
  });

  it("hides the top navigation when signed out", () => {
    cy.visit("/login");
    cy.get(".topnav").should("not.exist");
  });
});
