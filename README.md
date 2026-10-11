# Autonomous Supermarket — Assessment 4

## Project Overview

Autonomous Supermarket is a cloud-deployed web application developed for Assessment 4 in Cloud-Based Web Applications at La Trobe University.

The application simulates supermarket operations over a 60-day period and provides operational and commercial reports to evaluate business performance, inventory management, replenishment, product expiry and financial outcomes.

## Technologies Used

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js
- SQLite database

**Cloud Deployment**
- Render Web Service for the backend
- Render Static Site for the frontend
- GitHub for version control

## Live Application

Frontend:

https://autonomous-supermarket-frontend.onrender.com

Backend:

https://autonomous-supermarket.onrender.com

Health Check:

https://autonomous-supermarket.onrender.com/api/health

Commercial Report API:

https://autonomous-supermarket.onrender.com/api/report/totals

## Main Features

### 1. Autonomous Supermarket Simulation

The backend executes a 60-day supermarket simulation using predefined operating rules and stored data.

The simulation models customer activity, transactions, product sales, inventory movements, replenishment, product expiry, revenue, cost of goods sold, gross profit and operating cash.

### 2. Commercial Report

The application presents consolidated results from the completed simulation, including:

- Total revenue
- Cost of goods sold
- Gross profit and gross margin
- Customer and transaction counts
- Units sold
- Expired inventory and write-offs
- Replenishment expenditure
- Opening and closing operating cash

### 3. Daily Report

Users can select an individual simulation day to review its stored operational and financial results.

### 4. Model Declaration

The application documents the simulation's purpose, operating scope, decision behaviour and commercial traceability.

### 5. Commercial Assurance

The application includes an assurance section covering:

- 60-day simulation completion
- Persistent simulation history
- Commercial reconciliation
- Inventory waste visibility

## Simulation Results

The deployed simulation completed 60 days and generated the following consolidated results:

| Metric | Result |
|---|---|
| Simulation duration | 60 days |
| Customers | 4,933 |
| Transactions | 4,926 |
| Units sold | 16,737 |
| Revenue | A$94,240.90 |
| Cost of goods sold | A$46,053.30 |
| Gross profit | A$48,187.60 |
| Gross margin | 51.13% |
| Expired units | 1,029 |
| Inventory write-offs | A$3,663.80 |
| Replenishment spend | A$47,335.60 |
| Opening operating cash | A$15,000.00 |
| Closing operating cash | A$61,905.30 |

These results represent one completed simulation run and are not actual supermarket trading figures.

## Running the Application Locally

### Backend

From the project root:

```bash
cd server
npm install
node seed.js
node simulation.js
node index.js
```

The backend runs locally on port 5000.

### Frontend

Open a separate terminal:

```bash
cd client
npm install
npm run dev
```

The frontend runs using the Vite development server.

The frontend must be configured to communicate with the appropriate backend URL.

## Testing and Verification

The following functionality was checked during development:

- Backend health endpoint returns a successful status.
- The 60-day simulation completes.
- Simulation totals are accessible through the reporting API.
- Commercial Report displays consolidated simulation results.
- Daily Report displays individual-day records.
- Model Declaration is accessible.
- Commercial Assurance displays completion and reconciliation information.
- Frontend and backend are deployed successfully on Render.

## Limitations

- The application uses simulated supermarket activity rather than real-world transactions.
- Operational decisions are based on predefined simulation rules rather than live machine-learning predictions.
- Results depend on the simulation assumptions and initial data.
- The application does not integrate with real payment systems, suppliers or physical inventory sensors.
- The deployed SQLite database may not provide durable storage across service restarts unless persistent storage is configured.

## AI-Assisted Development Acknowledgement

AI assistance was used during project planning, development, debugging, deployment troubleshooting and documentation preparation.

AI-generated suggestions were reviewed and incorporated into the implementation. The application was tested through local development, cloud deployment and inspection of simulation reports.

## Repository Structure

```text
Autonomous-Supermarket/
├── client/          # React frontend
├── server/          # Express backend and SQLite simulation
├── .gitignore       # Git exclusion rules
└── README.md        # Project documentation
```

## Conclusion

The Autonomous Supermarket application demonstrates a cloud-deployed supermarket simulation with persistent reporting, commercial performance visibility and operational assurance across a completed 60-day simulation.
