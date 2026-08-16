"use client";

import { useEffect, useState } from "react";
import { api, type Repo } from "@/lib/api";

export function RepoPicker({
  selectedRepoId,
  onChange,
}: {
  selectedRepoId: string | null;
  onChange: (repoId: string) => void;
}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listRepos()
      .then((data) => {
        setRepos(data);
        if (!selectedRepoId && data.length > 0) onChange(data[0].id);
      })
      .catch(() => setError("Couldn't reach the API — is it running on NEXT_PUBLIC_API_BASE_URL?"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (repos.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No repos connected yet. Install the GitHub App to get started.
      </p>
    );
  }

  return (
    <select
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
      value={selectedRepoId ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {repos.map((repo) => (
        <option key={repo.id} value={repo.id}>
          {repo.full_name}
        </option>
      ))}
    </select>
  );
}
