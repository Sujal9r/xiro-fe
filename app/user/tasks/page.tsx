"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import apiCall from "../../../lib/api";
import { useAlert } from "../../../components/AlertProvider";

interface Ticket {
  _id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

export default function MyTasks() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const data = await apiCall("/api/tickets/my");
      setTickets(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (ticketId: string, newStatus: string) => {
    try {
      await apiCall(`/api/tickets/my/${ticketId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTickets();
    } catch (error) {
      showAlert("Failed to update status");
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
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>

        {tickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No tasks assigned to you yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <div
                key={ticket._id}
                className="bg-white rounded-lg shadow p-6 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {ticket.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{ticket.description}</p>
                    {ticket.createdBy && (
                      <p className="text-sm text-gray-500">
                        Created by: {ticket.createdBy.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Created: {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      ticket.status
                    )}`}
                  >
                    {ticket.status}
                  </span>
                </div>

                <div className="flex gap-2">
                  {ticket.status === "pending" && (
                    <button
                      onClick={() => updateStatus(ticket._id, "started")}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Start Task
                    </button>
                  )}
                  {ticket.status === "started" && (
                    <button
                      onClick={() => updateStatus(ticket._id, "completed")}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
