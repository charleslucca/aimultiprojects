import React from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from "@/components/layout/AppLayout";
import { GitHubBoard } from "@/components/github/GitHubBoard";

export default function GitHubCockpitProject() {
  const { projectId } = useParams();

  if (!projectId) {
    return <div>Projeto não encontrado</div>;
  }

  return (
    <AppLayout>
      <GitHubBoard projectId={projectId} />
    </AppLayout>
  );
}