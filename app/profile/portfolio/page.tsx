"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import apiCall from "../../../lib/api";

type Portfolio = {
  id: string | null;
  name: string;
  role: string;
  avatar: string;
  headline: string;
  summary: string;
  skills: string[];
  projects: Array<{
    title: string;
    description: string;
    link: string;
    tags: string[];
  }>;
  socials: {
    website: string;
    linkedin: string;
    github: string;
  };
};

export default function PortfolioPage() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiCall("/api/portfolio/me");
        setData(response);
      } catch (err: any) {
        setError(err?.message || "Failed to load portfolio");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "No portfolio data found."}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-orange-400 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-semibold">
                {data.avatar ? (
                  <img
                    src={data.avatar}
                    alt={data.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  data.name?.[0] || "U"
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{data.name}</h1>
                <p className="text-sm text-white/80">{data.role}</p>
                {data.headline && (
                  <p className="text-sm text-white/90 mt-1">{data.headline}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {data.socials.website && (
                <a
                  className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25 transition"
                  href={data.socials.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  Website
                </a>
              )}
              {data.socials.linkedin && (
                <a
                  className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25 transition"
                  href={data.socials.linkedin}
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn
                </a>
              )}
              {data.socials.github && (
                <a
                  className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25 transition"
                  href={data.socials.github}
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                {data.summary || "No summary added yet."}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {data.projects.length === 0 && (
                  <p className="text-sm text-gray-500">No projects added yet.</p>
                )}
                {data.projects.map((project, index) => (
                  <div
                    key={`${project.title}-${index}`}
                    className="rounded-lg border border-gray-100 p-4 hover:shadow-sm transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {project.title || "Untitled project"}
                      </h3>
                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Visit
                        </a>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {project.description || "No description provided."}
                    </p>
                    {project.tags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Skills</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.skills.length === 0 && (
                  <p className="text-sm text-gray-500">No skills added yet.</p>
                )}
                {data.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>Website: {data.socials.website || "-"}</p>
                <p>LinkedIn: {data.socials.linkedin || "-"}</p>
                <p>GitHub: {data.socials.github || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
