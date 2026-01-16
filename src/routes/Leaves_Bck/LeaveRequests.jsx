import React from 'react'
import Table from '../../components/Table'


function LeaveRequests() {{
  const headers = ["Column 1", "Column 2", "Column 3"]
  const rows = [
    ["Row1 Data1", "Row1 Data2", "Row1 Data3"],
    ["Row2 Data1", "Row2 Data2", "Row2 Data3"]
  ]
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Leave Requests</h2>
      <Table headers={headers} rows={rows} />
    </div>
  )
}}

export default LeaveRequests
