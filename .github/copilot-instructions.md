# Copilot Instructions for fast-lease

## Project Overview
This is an interactive ERP portal prototype for car leasing, built as a single-page application in `index.html` using HTML, Tailwind CSS, and JavaScript. The UI and logic are contained in one file, with mock data and templates for different user roles (Client, Investor, Manager, Admin).

## Architecture & Data Flow
- **Single-file SPA:** All logic, data, and templates are in `index.html`. No build system or backend integration is present.
- **Role-based Navigation:** The UI adapts based on the selected role (Client, Investor, Manager, Admin) using the `navConfig` and `pageTemplates` JS objects.
- **Mock Data:** All data (cars, deals, users, invoices, etc.) is hardcoded in the `mockData` JS object. No external API calls.
- **Dynamic Rendering:** Page content and navigation are injected into the DOM via JavaScript based on user actions and role selection.
- **External Libraries:** Uses CDN links for Tailwind CSS, Chart.js, Lucide Icons, and SortableJS. No local dependencies or package management.

## Developer Workflows
- **No build/test commands:** Directly edit `index.html` and refresh in browser to see changes. No npm, no bundler, no test runner.
- **Debugging:** Use browser DevTools for JS/DOM inspection. All logic is client-side.
- **Adding Features:** Extend `mockData`, `navConfig`, or `pageTemplates` in `index.html`. Add new UI sections by updating templates and event handlers.
- **Styling:** Use Tailwind CSS utility classes. Custom styles are defined in a `<style>` block in the `<head>`.

## Project-Specific Patterns
- **Page Templates:** Each logical page is a string template in `pageTemplates`. Rendered via JS when navigation changes.
- **Role Switcher:** UI element at bottom-right lets users switch roles, updating navigation and visible pages.
- **Kanban & Registry:** Manager role includes Kanban board and registries for clients, fleet, and investors, all using mock data.
- **Localization:** UI text is in Russian. Data and templates should match this language.
- **No Routing:** Navigation is handled by toggling `.active` classes and injecting HTML, not by changing URLs.

## Key Files & Directories
- `index.html`: Main application file. All code, data, and templates are here.
- `docs/`: Contains HTML documentation snapshots, not used by the app logic.

## Example Patterns
- To add a new car to the catalog, update the `mockData.cars` array.
- To add a new page, extend `pageTemplates` and update `navConfig` for relevant roles.
- To change navigation, modify the `navConfig` object and related JS logic.

## Integration Points
- All external libraries are loaded via CDN in `<head>`. No local installation required.
- No backend, API, or persistent storage integration.

---
For questions or unclear conventions, review `index.html` for examples or ask for clarification.
