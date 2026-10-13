# Flat Expense Splitter 🏠💰

A mobile-responsive web application for bachelor students sharing a flat to manage and split expenses automatically.

## Features

✨ **Individual Accounts** - Each flatmate has their own account showing all expenses
💵 **Fixed Costs Manager** - Set monthly costs (Rent, WiFi, Gas, Electricity) once
🍽️ **Meal Tracking** - Track daily meals and split grocery costs based on actual consumption
📊 **Visual Analytics** - Charts and graphs for meal distribution
💰 **Meal Fund Tracker** - Manage who deposits money for groceries
🔄 **Undo/Redo** - Revert mistaken inputs easily
➕ **Manual Adjustments** - Add or subtract amounts for specific people
📱 **100% Mobile Responsive** - Works perfectly on Android and iOS

## How It Works

1. **Add Flatmates** - Start by adding all people sharing the flat
2. **Set Fixed Costs** - Enter monthly costs like Rent ($11,200), WiFi ($840), etc.
3. **Track Meals Daily** - Log who ate how many meals each day
4. **Add Expenses** - Record who paid for what (Grocery, Rent, Bills, etc.)
5. **View Balances** - See automatically calculated balances for each person

### Expense Splitting Logic

- **Grocery/Meal Costs**: Split based on actual meal consumption (fair distribution)
- **Fixed Costs**: Split equally among all flatmates (Rent, WiFi, Gas, Electricity, etc.)
- **Individual Accounts**: Shows what each person owes or is owed

## Quick Start

### Install Dependencies
```bash
pnpm install
```

### Run Development Server
```bash
pnpm run dev
```

### Build for Production
```bash
pnpm build
```

## Deploy to Netlify

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy:**
1. Build: `pnpm build`
2. Deploy the `dist` folder to Netlify

## Mobile Optimization

- ✅ Touch-optimized buttons and inputs
- ✅ Responsive layout for all screen sizes
- ✅ Sticky header for easy navigation
- ✅ Scrollable tables for meal tracking
- ✅ Mobile-first design approach
- ✅ Works on iOS and Android browsers

## Versions
- 1.0
- 2.0
- 3.0

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Vite** - Build tool

## Browser Support

- Chrome (Android & Desktop)
- Safari (iOS & macOS)
- Firefox
- Edge
- Samsung Internet

## License

MIT

---

Made with ❤️ for bachelor students managing shared expenses
