# Sheet Shaper - Google Sheets Add-on

## Project Overview

Sheet Shaper is a Google Sheets add-on that provides powerful data transformation tools directly within the Google Sheets interface. Users can perform various data structuring operations without leaving their spreadsheet environment.

## Architecture

### File Structure
```
sheet-shaper-addon/
├── Code.gs                 # Main Apps Script file with core functions
├── Menu.gs                 # Menu creation and UI management
├── DataTransforms.gs       # Data transformation functions
├── Utils.gs                # Utility functions and helpers
├── Sidebar.html            # HTML for sidebar interface
├── Dialog.html             # HTML for dialog boxes
├── Styles.html             # CSS styles for UI components
├── ClientScript.html       # Client-side JavaScript
├── appsscript.json         # Manifest file
└── README.md               # Documentation
```

## Core Features

### 1. Smart Trim
- Removes leading/trailing whitespace
- Collapses multiple spaces into single spaces
- Works on entire sheets or selected ranges

### 2. Remove Duplicates
- Removes duplicate rows based on all columns
- Option to remove duplicates based on specific columns
- Preserves header rows

### 3. Change Case
- Convert text to UPPERCASE, lowercase, Title Case, or Sentence case
- Apply to entire sheets, columns, or selected ranges

### 4. Split Text
- Split text in columns by delimiters
- Create new columns for split data
- Handle various delimiter types

### 5. Remove Empty Rows/Columns
- Clean up sheets by removing empty rows
- Remove empty columns
- Option to remove rows/columns with only whitespace

### 6. Data Validation
- Check for common data issues
- Highlight problematic cells
- Suggest corrections

## User Interface

### Custom Menu
- "Sheet Shaper" menu in Google Sheets menu bar
- Quick access to common functions
- Submenu organization for related functions

### Sidebar
- Column selection interface
- Advanced options for transformations
- Real-time preview of changes

### Dialog Boxes
- Configuration for complex operations
- Batch operation settings
- Progress indicators

## Technical Implementation

### Google Apps Script Services Used
- SpreadsheetApp: Core spreadsheet manipulation
- HtmlService: Custom UI components
- Utilities: Data processing and validation
- Base: Error handling and logging

### Key Functions
- onOpen(): Initialize custom menu
- onInstall(): Setup add-on permissions
- Data transformation functions for each feature
- UI management functions
- Error handling and user feedback

## Deployment

The add-on can be deployed in multiple ways:
1. Personal use: Direct from Apps Script editor
2. Organization: G Suite domain deployment
3. Public: Google Workspace Marketplace (requires review)

## Security & Permissions

Required permissions:
- Read and modify spreadsheets
- Display custom UI elements
- Access to current spreadsheet data

All data processing happens within Google's infrastructure, ensuring security and privacy.

