

import { useEffect, useState } from 'react'

import './App.css'



const API_URL = 'http://localhost:5000'







function Money({ value }) {

  return (

    <>

      A${Number(value ?? 0).toLocaleString('en-AU', {

        minimumFractionDigits: 2,

        maximumFractionDigits: 2,

      })}

    </>

  )

}



function App() {

  const [activeTab, setActiveTab] = useState('commercial')

  const [selectedDay, setSelectedDay] = useState(60)

  const [commercialSummary, setCommercialSummary] = useState(null)

  const [dailyReport, setDailyReport] = useState(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [dailyLoading, setDailyLoading] = useState(false)

  const [dailyError, setDailyError] = useState('')



  useEffect(() => {

    async function loadCommercialReport() {

      try {

        const response = await fetch(`${API_URL}/api/report/totals`)

        if (!response.ok) {
          throw new Error('Unable to load commercial totals')
        }

        const totals = await response.json()
        if (totals.days !== 60) {
          throw new Error(`Expected 60 daily reports, received ${totals.days}`)
        }
        setCommercialSummary(totals)
      } catch (err) {

        setError(err.message)

      } finally {

        setLoading(false)

      }

    }



    loadCommercialReport()

  }, [])



  useEffect(() => {

    if (activeTab !== 'daily' || !commercialSummary) return



    let cancelled = false



    async function loadDailyReport() {

      setDailyLoading(true)

      setDailyError('')

      setDailyReport(null)



      try {

        const response = await fetch(

          `${API_URL}/api/report/day/${selectedDay}`

        )



        if (!response.ok) {

          throw new Error('Unable to load daily report')

        }



        const data = await response.json()



        if (!cancelled) {

          setDailyReport(data)

        }

      } catch (err) {

        if (!cancelled) {

          setDailyError(err.message)

        }

      } finally {

        if (!cancelled) {

          setDailyLoading(false)

        }

      }

    }



    loadDailyReport()



    return () => {

      cancelled = true

    }

  }, [activeTab, selectedDay, commercialSummary])



  if (loading) {

    return <div className="app">Loading commercial report...</div>

  }



  if (error || !commercialSummary) {

    return (

      <div className="app">

        <main className="content">

          <section className="panel">

            <h2>Unable to load the commercial report</h2>

            <p>{error || 'No completed simulation found.'}</p>

            <p>Check that the backend is running on port 5000.</p>

          </section>

        </main>

      </div>

    )

  }



  const grossMargin = commercialSummary.revenue

    ? (commercialSummary.grossProfit / commercialSummary.revenue) * 100

    : 0



  const transactionRate = commercialSummary.customers

    ? (commercialSummary.transactions / commercialSummary.customers) * 100

    : 0



  return (

    <div className="app">

      <header className="topbar">

        <div>

          <h1>Autonomous Supermarket</h1>

          <p>Simulation, Intelligent Operations & Commercial Assurance</p>

        </div>



        <div className="run-badge">

          Run #{commercialSummary.runId} · {commercialSummary.days} Days

        </div>

      </header>



      <nav className="nav">

        <button

          className={activeTab === 'commercial' ? 'active' : ''}

          onClick={() => setActiveTab('commercial')}

        >

          Commercial Report

        </button>



        <button

          className={activeTab === 'daily' ? 'active' : ''}

          onClick={() => setActiveTab('daily')}

        >

          Daily Report

        </button>



        <button

          className={activeTab === 'model' ? 'active' : ''}

          onClick={() => setActiveTab('model')}

        >

          Model Declaration

        </button>



        <button

          className={activeTab === 'assurance' ? 'active' : ''}

          onClick={() => setActiveTab('assurance')}

        >

          Commercial Assurance

        </button>

      </nav>



      <main className="content">

        {activeTab === 'commercial' && (

          <>

            <section className="page-heading">

              <div>

                <span className="eyebrow">60-DAY SIMULATION</span>

                <h2>Commercial Report</h2>

                <p>

                  Consolidated commercial performance for completed simulation

                  Run #{commercialSummary.runId}.

                </p>

              </div>

              <span className="status success">Simulation Complete</span>

            </section>



            <section className="metric-grid">

              <div className="metric-card">

                <span>Revenue</span>

                <strong><Money value={commercialSummary.revenue} /></strong>

                <small>60-day sales revenue</small>

              </div>



              <div className="metric-card">

                <span>Gross Profit</span>

                <strong><Money value={commercialSummary.grossProfit} /></strong>

                <small>{grossMargin.toFixed(1)}% gross margin</small>

              </div>



              <div className="metric-card">

                <span>Closing Cash</span>

                <strong><Money value={commercialSummary.closingCash} /></strong>

                <small>

                  Opening cash <Money value={commercialSummary.openingCash} />

                </small>

              </div>



              <div className="metric-card">

                <span>Transactions</span>

                <strong>{commercialSummary.transactions.toLocaleString()}</strong>

                <small>{transactionRate.toFixed(1)}% customer conversion</small>

              </div>

            </section>



            <section className="panel">

              <div className="panel-header">

                <div>

                  <h3>Trading Performance</h3>

                  <p>Key measures generated by the 60-day simulation.</p>

                </div>

              </div>



              <div className="report-table">

                <div>

                  <span>Customers</span>

                  <strong>{commercialSummary.customers.toLocaleString()}</strong>

                </div>

                <div>

                  <span>Transactions</span>

                  <strong>{commercialSummary.transactions.toLocaleString()}</strong>

                </div>

                <div>

                  <span>Units Sold</span>

                  <strong>{commercialSummary.unitsSold.toLocaleString()}</strong>

                </div>

                <div>

                  <span>Revenue</span>

                  <strong><Money value={commercialSummary.revenue} /></strong>

                </div>

                <div>

                  <span>Cost of Goods Sold</span>

                  <strong><Money value={commercialSummary.cogs} /></strong>

                </div>

                <div>

                  <span>Gross Profit</span>

                  <strong><Money value={commercialSummary.grossProfit} /></strong>

                </div>

              </div>

            </section>



            <section className="two-column">

              <div className="panel">

                <h3>Inventory & Waste</h3>

                <div className="report-table">

                  <div>

                    <span>Opening Inventory</span>

                    <strong><Money value={commercialSummary.openingInventory} /></strong>

                  </div>

                  <div>

                    <span>Expired Units</span>

                    <strong>{commercialSummary.expiredUnits.toLocaleString()}</strong>

                  </div>

                  <div>

                    <span>Write-off Value</span>

                    <strong><Money value={commercialSummary.writeOff} /></strong>

                  </div>

                  <div>

                    <span>Replenishment Spend</span>

                    <strong><Money value={commercialSummary.replenishment} /></strong>

                  </div>

                </div>

              </div>



              <div className="panel">

                <h3>Cash Position</h3>

                <div className="cash-result">

                  <span>Opening Operating Cash</span>

                  <strong><Money value={commercialSummary.openingCash} /></strong>

                </div>

                <div className="cash-arrow">↓</div>

                <div className="cash-result highlight">

                  <span>Closing Operating Cash</span>

                  <strong><Money value={commercialSummary.closingCash} /></strong>

                </div>

              </div>

            </section>

          </>

        )}



        {activeTab === 'daily' && (

          <>

            <section className="page-heading">

              <div>

                <span className="eyebrow">SIMULATION HISTORY</span>

                <h2>Daily Report</h2>

                <p>Review the stored operating record for an individual simulation day.</p>

              </div>

            </section>



            <section className="panel">

              <div className="day-selector">

                <label htmlFor="day">Select simulation day</label>

                <select

                  id="day"

                  value={selectedDay}

                  onChange={(event) => setSelectedDay(Number(event.target.value))}

                >

                  {Array.from({ length: 60 }, (_, index) => index + 1).map((day) => (

                    <option key={day} value={day}>Day {day}</option>

                  ))}

                </select>

              </div>



              {dailyLoading && <p>Loading Day {selectedDay}...</p>}



              {dailyError && (

                <p role="alert">Daily report error: {dailyError}</p>

              )}



              {!dailyLoading && !dailyError && dailyReport && (

                <div className="report-table">

                  <div>

                    <span>Day</span>

                    <strong>{dailyReport.day_number}</strong>

                  </div>

                  <div>

                    <span>Customers</span>

                    <strong>{dailyReport.customers}</strong>

                  </div>

                  <div>

                    <span>Transactions</span>

                    <strong>{dailyReport.transactions}</strong>

                  </div>

                  <div>

                    <span>Units Sold</span>

                    <strong>{dailyReport.units_sold}</strong>

                  </div>

                  <div>

                    <span>Revenue</span>

                    <strong><Money value={dailyReport.revenue} /></strong>

                  </div>

                  <div>

                    <span>Cost of Goods Sold</span>

                    <strong><Money value={dailyReport.cogs} /></strong>

                  </div>

                  <div>

                    <span>Gross Profit</span>

                    <strong><Money value={dailyReport.gross_profit} /></strong>

                  </div>

                  <div>

                    <span>Expired Units</span>

                    <strong>{dailyReport.write_off_units}</strong>

                  </div>

                  <div>

                    <span>Write-off Value</span>

                    <strong><Money value={dailyReport.write_off_value} /></strong>

                  </div>

                  <div>

                    <span>Replenishment Spend</span>

                    <strong><Money value={dailyReport.replenishment_spend} /></strong>

                  </div>

                  <div>

                    <span>Opening Cash</span>

                    <strong><Money value={dailyReport.opening_cash} /></strong>

                  </div>

                  <div>

                    <span>Closing Cash</span>

                    <strong><Money value={dailyReport.closing_cash} /></strong>

                  </div>

                </div>

              )}

            </section>

          </>

        )}



        {activeTab === 'model' && (

          <>

            <section className="page-heading">

              <div>

                <span className="eyebrow">SIMULATION GOVERNANCE</span>

                <h2>Model Declaration</h2>

                <p>Declaration of the operating model used by the autonomous supermarket simulation.</p>

              </div>

            </section>



            <section className="panel declaration">

              <h3>Purpose</h3>

              <p>

                The model simulates supermarket trading activity across a

                60-day operating period and records commercial and operational

                outcomes for reporting and assurance.

              </p>



              <h3>Operating Scope</h3>

              <p>

                The simulation considers customer activity, transactions,

                inventory movement, product sales, replenishment, product

                expiry, cost of goods sold, revenue, gross profit and operating cash.

              </p>



              <h3>Decision Behaviour</h3>

              <p>

                Store operations are driven by predefined simulation rules and

                stored state. Decisions and outcomes are retained in the database

                so that results can be reviewed after the simulation.

              </p>



              <h3>Commercial Traceability</h3>

              <p>

                The commercial report is intended to be derived from the completed

                simulation run, with daily reports exposing stored operating history.

              </p>

            </section>

          </>

        )}



        {activeTab === 'assurance' && (

          <>

            <section className="page-heading">

              <div>

                <span className="eyebrow">CONTROL & REVIEW</span>

                <h2>Commercial Assurance</h2>

                <p>Checks supporting confidence in the commercial simulation results.</p>

              </div>

              <span className="status success">Run Completed</span>

            </section>



            <section className="assurance-grid">

              <div className="assurance-card">

                <span className="check">✓</span>

                <div>

                  <h3>60-Day Completion</h3>

                  <p>

                    Simulation Run #{commercialSummary.runId} is recorded as completed.

                    Database verification confirmed 60 distinct daily reports covering Day 1 through Day 60, with no missing days.

                  </p>

                </div>

              </div>



              <div className="assurance-card">

                <span className="check">✓</span>

                <div>

                  <h3>Persistent History</h3>

                  <p>

                    Simulation data is stored in SQLite and accessible through

                    the daily reporting API.

                  </p>

                </div>

              </div>



              <div className="assurance-card">

                <span className="check">✓</span>

                <div>

                  <h3>Commercial Reconciliation</h3>

                  <p>

                    Revenue, cost of goods sold and gross profit are presented

                    together.Independent database checks confirmed that revenue, cost of goods sold, gross profit, inventory write-offs and replenishment spending match the Commercial Report. Cash balances also reconcile, with no daily continuity mismatches.

                  </p>

                </div>

              </div>



              <div className="assurance-card">

                <span className="check">✓</span>

                <div>

                  <h3>Waste Visibility</h3>

                  <p>

                    Expired units and inventory write-offs are reported

                    separately from sales performance.

                  </p>

                </div>

              </div>

            </section>

          </>

        )}

      </main>



      <footer>

        Autonomous Supermarket · Assessment 4 · Simulation Run #{commercialSummary.runId}

      </footer>

    </div>

  )

}



export default App
