# Benedict Refrigeration Payroll Automation

A React-based web application that automates payroll report corrections by applying business rules to PDF payroll documents.

## 🎯 Overview

This application processes PDF payroll reports from Benedict Refrigeration and automatically applies 5 business rules to correct common payroll errors. The system provides a user-friendly interface for uploading, reviewing, and downloading corrected reports.

## ✨ Features

- **PDF Upload**: Drag-and-drop interface for payroll PDF files
- **Rule Engine**: Automatically applies 5 payroll correction rules
- **Review Interface**: Table view with sorting and filtering of changes
- **Statistics Dashboard**: Summary of changes and affected employees
- **Download Options**: Export corrected reports as PDF or Excel
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🔧 Business Rules Implemented

1. **TechUnapplied Rule**: If Cost Category = TechUnapplied → Pay Type = Unapplied
2. **Service/Install Rule**: Valid labor rates for Service and Install cost codes
3. **PM/PMF/FTPM Rule**: Valid labor rates for PM-related cost codes
4. **Sunday Premium Rule**: Sunday work → Double Time + PREM labor rate
5. **Call Overtime Rule**: Call pay type → TechOT labor rate

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern React with functional components and hooks
- **Axios** - HTTP client for API communication
- **React Dropzone** - File upload with drag-and-drop
- **CSS3** - Custom responsive styling with modern design

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Multer** - File upload handling
- **PDF-Parse** - PDF text extraction
- **jsPDF** - PDF generation
- **Moment.js** - Date manipulation

## 📁 Project Structure

```
benedict-payroll-automation/
├── backend/                 # Node.js Express API
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   │   ├── ruleEngine.js   # Payroll rule implementations
│   │   ├── pdfParser.js    # PDF processing
│   │   └── pdfGenerator.js # Report generation
│   ├── utils/              # Utility functions
│   └── server.js           # Express server setup
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API service layer
│   │   ├── App.js          # Main application
│   │   ├── App.css         # Styling
│   │   └── index.js        # React entry point
│   └── public/             # Static assets
└── shared/                 # Shared types and utilities
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd benedict-payroll-automation
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend && npm install
   
   # Install frontend dependencies
   cd ../frontend && npm install
   ```

3. **Start the development servers**
   
   **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 💻 Usage

1. **Upload Payroll PDF**
   - Drag and drop a PDF file or click to browse
   - File validation ensures only PDF files under 10MB

2. **Review Changes**
   - View all proposed changes in a sortable table
   - Filter by employee name or rule type
   - See summary statistics of corrections

3. **Download Report**
   - Choose PDF or Excel format
   - File includes all corrections applied
   - Maintains original formatting with corrections highlighted

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run all tests
npm run test:all
```

## 🚢 Deployment

### Development
The application is configured for Railway deployment with automatic environment detection.

### Production Environment Variables
```bash
# Backend
NODE_ENV=production
PORT=5000
TRUST_PROXY_HOPS=1
MAX_REQUEST_BODY_SIZE=15mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend
REACT_APP_API_URL=https://your-api-domain.com/api
```

### Build for Production
```bash
# Install dependencies once during build
npm run install-all

# Build frontend bundle
npm run build

# Start production server (no runtime install)
npm run start
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payroll/process` | Upload and process PDF |
| POST | `/api/payroll/download/pdf` | Download corrected PDF |
| POST | `/api/payroll/download/excel` | Download Excel report |

## 🔒 Security Features

- File type validation (PDF only)
- File size limits (10MB max)
- CORS protection
- Rate limiting
- Input sanitization
- Error handling without sensitive data exposure

## 📈 Performance

- Optimized PDF parsing with streaming
- Lazy loading of components
- Responsive design for all devices
- Client-side validation to reduce server load
- Efficient state management with React hooks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software owned by Benedict Refrigeration Service, Inc.

## 👥 Author

**Tyler LaFleur**  
Senior Software Developer  
Email: tyler@benedictrefrigeration.com

## 🆘 Support

For technical support or questions about the application:
- Create an issue in the repository
- Contact the development team
- Refer to the troubleshooting guide in the docs/

## 📅 Version History

- **v1.0.0** (August 2025) - Initial release with all 5 payroll rules implemented
