// ===========================
// LeaveRecords.jsx
// ===========================
import React, { useState } from "react";
import Table from "../../components/Table";
import Modal from "../../components/Modal";
import Field from "../../components/Field";

function LeaveRecords() {
  const [employees] = useState([
    { id: 1, name: "Amit Kumar" },
    { id: 2, name: "Rohit Singh" },
  ]);

  const [leaveTypes] = useState([
    { id: 1, name: "Casual Leave" },
    { id: 2, name: "Sick Leave" },
    { id: 3, name: "Paid Leave" },
    { id: 4, name: "Unpaid Leave" },
  ]);

  const [leaveRecords, setLeaveRecords] = useState([
    {
      id: 1,
      emp_id: 1,
      emp_name: "Amit Kumar",
      leave_type: "Casual Leave",
      start_date: "2025-08-10",
      end_date: "2025-08-12",
      total_days: 3,
      status: "APPROVED",
    },
    {
      id: 2,
      emp_id: 2,
      emp_name: "Rohit Singh",
      leave_type: "Sick Leave",
      start_date: "2025-08-15",
      end_date: "2025-08-16",
      total_days: 2,
      status: "PENDING",
    },
    {
      id: 3,
      emp_id: 1,
      emp_name: "Amit Kumar",
      leave_type: "Paid Leave",
      start_date: "2025-09-05",
      end_date: "2025-09-09",
      total_days: 5,
      status: "APPROVED",
    },
    {
      id: 4,
      emp_id: 2,
      emp_name: "Rohit Singh",
      leave_type: "Unpaid Leave",
      start_date: "2025-09-20",
      end_date: "2025-09-20",
      total_days: 1,
      status: "REJECTED",
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    emp_id: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    total_days: 0,
    status: "PENDING",
  });

  const calculateDays = (start, end) => {
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 0;
    }
    return 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === parseInt(formData.emp_id));
    const lt = leaveTypes.find(
      (x) => x.id === parseInt(formData.leave_type_id)
    );

    if (editing) {
      setLeaveRecords(
        leaveRecords.map((r) =>
          r.id === editing.id
            ? {
                ...formData,
                id: editing.id,
                emp_name: emp.name,
                leave_type: lt.name,
              }
            : r
        )
      );
    } else {
      setLeaveRecords([
        ...leaveRecords,
        {
          ...formData,
          id: leaveRecords.length + 1,
          emp_name: emp.name,
          leave_type: lt.name,
        },
      ]);
    }
    setShowModal(false);
  };

  const headers = [
    "ID",
    "Employee",
    "Leave Type",
    "Start Date",
    "End Date",
    "Total Days",
    "Status",
    "Actions",
  ];

  const rows = leaveRecords.map((r) => [
    r.id,
    r.emp_name,
    r.leave_type,
    r.start_date,
    r.end_date,
    r.total_days,
    r.status,
    <>
      <button
        className="bg-blue-500 text-white px-2 py-1 mr-2 rounded"
        onClick={() => {
          setEditing(r);
          setFormData(r);
          setShowModal(true);
        }}
      >
        Edit
      </button>
      <button
        className="bg-red-500 text-white px-2 py-1 rounded"
        onClick={() =>
          setLeaveRecords(leaveRecords.filter((x) => x.id !== r.id))
        }
      >
        Delete
      </button>
    </>,
  ]);

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Leave Records</h2>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={() => {
            setEditing(null);
            setFormData({
              emp_id: "",
              leave_type_id: "",
              start_date: "",
              end_date: "",
              total_days: 0,
              status: "PENDING",
            });
            setShowModal(true);
          }}
        >
          + Add Leave
        </button>
      </div>

      <Table headers={headers} rows={rows} />

      {showModal && (
        <Modal
          title={editing ? "Edit Leave" : "Add Leave"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <select
              value={formData.emp_id}
              onChange={(e) =>
                setFormData({ ...formData, emp_id: e.target.value })
              }
              className="border p-2"
              required
            >
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>

            <select
              value={formData.leave_type_id}
              onChange={(e) =>
                setFormData({ ...formData, leave_type_id: e.target.value })
              }
              className="border p-2"
              required
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  start_date: e.target.value,
                  total_days: calculateDays(e.target.value, formData.end_date),
                })
              }
              className="border p-2"
              required
            />

            <input
              type="date"
              value={formData.end_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  end_date: e.target.value,
                  total_days: calculateDays(
                    formData.start_date,
                    e.target.value
                  ),
                })
              }
              className="border p-2"
              required
            />

            <input
              type="number"
              value={formData.total_days}
              className="border p-2"
              readOnly
            />

            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="border p-2"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
            >
              Save
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default LeaveRecords;
