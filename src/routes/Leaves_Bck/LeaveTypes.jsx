// ===========================
// LeaveTypes.jsx
// ===========================
import React, { useState } from "react";
import Table from "../../components/Table";
import Modal from "../../components/Modal";

function LeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState([
    {
      id: 1,
      name: "Casual Leave",
      description: "Personal reasons",
      applicable_for: "ALL",
      max_days_per_year: 12,
    },
    {
      id: 2,
      name: "Sick Leave",
      description: "Health issues",
      applicable_for: "ALL",
      max_days_per_year: 10,
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    applicable_for: "ALL",
    max_days_per_year: "",
  });

  const headers = [
    "ID",
    "Name",
    "Description",
    "Applicable For",
    "Max Days",
    "Actions",
  ];
  const rows = leaveTypes.map((lt) => [
    lt.id,
    lt.name,
    lt.description,
    lt.applicable_for,
    lt.max_days_per_year,
    <>
      <button
        className="bg-blue-500 text-white px-2 py-1 mr-2 rounded"
        onClick={() => {
          setEditing(lt);
          setFormData(lt);
          setShowModal(true);
        }}
      >
        Edit
      </button>
      <button
        className="bg-red-500 text-white px-2 py-1 rounded"
        onClick={() => setLeaveTypes(leaveTypes.filter((x) => x.id !== lt.id))}
      >
        Delete
      </button>
    </>,
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      setLeaveTypes(
        leaveTypes.map((x) =>
          x.id === editing.id ? { ...formData, id: editing.id } : x
        )
      );
    } else {
      setLeaveTypes([
        ...leaveTypes,
        { ...formData, id: leaveTypes.length + 1 },
      ]);
    }
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Leave Types</h2>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={() => {
            setEditing(null);
            setFormData({
              name: "",
              description: "",
              applicable_for: "ALL",
              max_days_per_year: "",
            });
            setShowModal(true);
          }}
        >
          + Add Leave Type
        </button>
      </div>

      <Table headers={headers} rows={rows} />

      {showModal && (
        <Modal
          title={editing ? "Edit Leave Type" : "Add Leave Type"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="border p-2"
              required
            />
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="border p-2"
            />
            <select
              value={formData.applicable_for}
              onChange={(e) =>
                setFormData({ ...formData, applicable_for: e.target.value })
              }
              className="border p-2"
            >
              <option value="ALL">All</option>
              <option value="FULL_TIME">Full-Time</option>
              <option value="PART_TIME">Part-Time</option>
            </select>
            <input
              type="number"
              placeholder="Max Days per Year"
              value={formData.max_days_per_year}
              onChange={(e) =>
                setFormData({ ...formData, max_days_per_year: e.target.value })
              }
              className="border p-2"
            />
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

export default LeaveTypes;
