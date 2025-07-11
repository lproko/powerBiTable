# Power BI Custom Table Visual

A powerful and feature-rich custom table visual for Power BI, built with React and TanStack Table.

## Features

### 1. Advanced Table Functionality

- **Pagination**: Navigate through large datasets with customizable page sizes
- **Column Resizing**: Drag to resize columns for better data visibility
- **Text Truncation**: Long text is automatically truncated with ellipsis and tooltip
- **Row Grouping**: Group and collapse rows based on column values

### 2. Filtering Capabilities

- **Type-Aware Filtering**: Different filter types for numbers and text
- **Number Filters**:
  - Equals
  - Greater than
  - Less than
- **Text Filters**: Case-insensitive contains search

### 3. Modern UI/UX

- Clean, modern design
- Responsive layout
- Interactive controls
- Visual feedback for user actions

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

4. Import the visual into Power BI Desktop

## Usage

### Basic Usage

1. Drag your data fields into the visual's fields pane
2. The table will automatically display your data with all features enabled

### Filtering

1. Use the filter inputs below each column header
2. For numeric columns, select an operator and enter a value
3. For text columns, type to filter by content

### Column Resizing

1. Hover over the right edge of any column header
2. Click and drag to adjust the width
3. Release to set the new width

### Row Grouping

1. Select a column to group by from the "Group by" dropdown
2. Click the arrow (▶/▼) to expand/collapse groups
3. Select "No grouping" to return to the normal view

### Pagination

1. Use the navigation buttons to move between pages
2. Select the number of rows to display per page
3. View current page and total pages information

## Development

### Prerequisites

- Node.js
- npm
- Power BI Custom Visuals SDK

### Project Structure

```
customTable/
├── src/
│   ├── components/
│   │   └── Table.tsx
│   ├── visual.tsx
│   └── settings.ts
├── package.json
└── README.md
```

### Building

```bash
npm run package
```

## Dependencies

- React
- TanStack Table
- Power BI Visuals API
- TypeScript

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
