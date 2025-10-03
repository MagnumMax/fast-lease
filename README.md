# Fast Lease - Automated Leasing Platform

## 🚀 Quick Start

### Local Server (Recommended)

For correct operation of ES6 modules, use a local HTTP server:

```bash
# Python 3
python3 server.py

# Alternatively, if Python 3 is not installed:
python -m http.server 8000

# Or Node.js (if installed)
npx http-server -p 8000 -c-1
```

Then open http://localhost:8000 in the browser.

### Available Sections

- **Main Page**: http://localhost:8000/index.html
- **Operations Dashboard**: http://localhost:8000/ops/dashboard/index.html
- **Client Dashboard**: http://localhost:8000/client/dashboard/index.html
- **Investor Dashboard**: http://localhost:8000/investor/dashboard/index.html
- **Admin Panel**: http://localhost:8000/admin/bpm/index.html

## 📁 Project Structure

```
assets/
├── shared.js      # Unified ES6 module with utilities and navigation
└── style.css      # Global styles

admin/             # Administrative pages
client/            # Client pages
investor/          # Investor pages
ops/              # Operational pages
cars/             # Car catalog
```

## 🔧 Architecture

### Simplified Modular System

The project uses a modern ES6 modular approach:

```javascript
// Import utilities
import { formatCurrency, mountSidebar, clientNav } from '../assets/shared.js';

// Usage
const shared = await import('../assets/shared.js');
const { mountHeader, applyIcons } = shared;
```

### Advantages of the New Architecture

- ✅ Simplified structure (1 file instead of 3)
- ✅ Reduced bundle size
- ✅ Easier to maintain
- ✅ Modern ES6 approach
- ✅ Removed redundancy of fallback code

## 🛠 Development

### Adding New Utilities

Add functions to `assets/shared.js`:

```javascript
export function newUtility() {
  // Your function
}
```

### Adding Navigation

Navigation configurations are defined in `assets/shared.js`:

```javascript
export const newRoleNav = [
  { label: 'New Page', href: '/new/index.html', icon: 'icon-name' }
];
```

## 📦 Production Build

For production, it is recommended to configure a bundler (webpack/rollup) for:

- Code minification
- Tree shaking (removing unused functions)
- Code splitting
- Source maps

## 🔒 Security

- CORS configured for local development
- HTTPS recommended in production
- Check dependencies for vulnerabilities