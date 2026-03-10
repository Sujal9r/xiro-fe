"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import Modal from "../../../components/Modal";
import apiCall from "../../../lib/api";
import { PERMISSIONS } from "../../../lib/permissions";
import { useAlert } from "../../../components/AlertProvider";

interface Ticket {
  _id: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
  customRole?: { permissions?: string[] };
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [assignModal, setAssignModal] = useState<Ticket | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [selectedUserId, setSelectedUserId] = useState("");
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ticketsData, usersData] = await Promise.all([
        apiCall("/api/tickets/all"),
        apiCall("/api/admin/users"),
      ]);
      setTickets(ticketsData);
      setUsers(
        usersData.filter((u: User) =>
          u.customRole?.permissions?.includes(PERMISSIONS.VIEW_USER_TASKS),
        ),
      );
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall("/api/tickets/create", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      setFormData({ title: "", description: "" });
      fetchData();
    } catch (error: any) {
      showAlert(error.message || "Failed to create ticket");
    }
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedUserId) return;
    try {
      await apiCall(`/api/tickets/assign/${assignModal._id}`, {
        method: "PUT",
        body: JSON.stringify({ userId: selectedUserId }),
      });
      setAssignModal(null);
      setSelectedUserId("");
      fetchData();
    } catch (error: any) {
      showAlert(error.message || "Failed to assign ticket");
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      await apiCall(`/api/tickets/status/${ticketId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (error: any) {
      showAlert(error.message || "Failed to update status");
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await apiCall(`/api/tickets/${ticketId}`, {
        method: "DELETE",
      });
      fetchData();
    } catch (error: any) {
      showAlert(error.message || "Failed to delete ticket");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "started":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Ticket Management</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Ticket
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket._id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {ticket.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {ticket.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.assignedTo?.name || "Unassigned"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          ticket.status
                        )}`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setAssignModal(ticket)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Assign
                      </button>
                      <select
                        value={ticket.status}
                        onChange={(e) => handleUpdateStatus(ticket._id, e.target.value)}
                        className="text-sm border-gray-300 rounded"
                      >
                        <option value="pending">Pending</option>
                        <option value="started">Started</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button
                        onClick={() => handleDelete(ticket._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Modal */}
        <Modal
          open={showModal}
          title="Create Ticket"
          onClose={() => setShowModal(false)}
          size="md"
        >
          <form onSubmit={handleCreateTicket}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block text-black p-2 w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="mt-1 block text-black w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* Assign Modal */}
        <Modal
          open={!!assignModal}
          title="Assign Ticket"
          description={assignModal?.title}
          onClose={() => {
            setAssignModal(null);
            setSelectedUserId("");
          }}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign To</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              >
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <button
              onClick={handleAssign}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Assign
            </button>
            <button
              onClick={() => {
                setAssignModal(null);
                setSelectedUserId("");
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
