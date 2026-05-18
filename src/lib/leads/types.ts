export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

export type LeadRow = {
  id: string;
  workspace_id: string;
  assigned_agent_id: string | null;
  status: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};
