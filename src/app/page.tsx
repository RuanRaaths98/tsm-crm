"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Flame,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  X,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { addDays, format, isAfter, isBefore, isSameDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  activities as initialActivities,
  clients as initialClients,
  currency,
  leadSources,
  leads as initialLeads,
  pipelineStatuses,
  services,
  tasks as initialTasks,
  users,
  type Activity as CrmActivity,
  type Client,
  type Lead,
  type LeadStatus,
  type LeadTemperature,
  type Task,
  type UserProfile,
} from "@/lib/crm-data";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const today = new Date();

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: UsersRound },
  { id: "pipeline", label: "Pipeline", icon: BriefcaseBusiness },
  { id: "clients", label: "Clients", icon: BadgeCheck },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type SectionId = (typeof navItems)[number]["id"];

const statusStyles: Record<string, string> = {
  New: "border-sky-200 bg-sky-50 text-sky-700",
  Contacted: "border-cyan-200 bg-cyan-50 text-cyan-700",
  Qualified: "border-green-300 bg-green-50 text-green-800",
  "Proposal Sent": "border-amber-200 bg-amber-50 text-amber-800",
  Won: "border-emerald-300 bg-emerald-100 text-emerald-800",
  Lost: "border-zinc-200 bg-zinc-100 text-zinc-600",
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Paused: "border-amber-200 bg-amber-50 text-amber-800",
  Cancelled: "border-zinc-200 bg-zinc-100 text-zinc-600",
  "To Do": "border-zinc-200 bg-zinc-50 text-zinc-700",
  "In Progress": "border-sky-200 bg-sky-50 text-sky-700",
  Done: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const pipelineColumnStyles: Record<LeadStatus, string> = {
  New: "border-sky-200 bg-sky-50/70",
  Contacted: "border-cyan-200 bg-cyan-50/70",
  Qualified: "border-green-300 bg-green-50/80",
  "Proposal Sent": "border-amber-200 bg-amber-50/75",
  Won: "border-emerald-300 bg-emerald-50/80",
  Lost: "border-zinc-200 bg-zinc-50",
};

const temperatureStyles: Record<LeadTemperature, string> = {
  Cold: "border-zinc-200 bg-zinc-50 text-zinc-600",
  Warm: "border-amber-200 bg-amber-50 text-amber-800",
  Hot: "border-rose-200 bg-rose-50 text-rose-700",
};

type OnboardingChecklistItem = {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  details?: {
    title: string;
    body: string;
    nextSteps: string[];
  };
};

const onboardingChecklist: OnboardingChecklistItem[] = [
  {
    id: "welcome-call",
    title: "Welcome call booked",
    description: "Confirm contact details, goals, timelines, and success metrics.",
    checked: true,
    details: {
      title: "Welcome call agenda",
      body: "Use this call to align the client, sales notes, and delivery team before any production work starts.",
      nextSteps: ["Confirm decision makers", "Capture campaign goals", "Agree on kickoff date"],
    },
  },
  {
    id: "access",
    title: "Account access requested",
    description: "Collect logins, ad account access, analytics access, and website permissions.",
    checked: false,
    details: {
      title: "Access checklist",
      body: "Request access early so delivery is not blocked after the kickoff call.",
      nextSteps: ["Meta Business Manager", "Google Analytics/Search Console", "Website CMS or hosting"],
    },
  },
  {
    id: "invoice",
    title: "First invoice sent",
    description: "Send setup fees, retainer, and payment instructions.",
    checked: true,
  },
  {
    id: "assets",
    title: "Brand assets received",
    description: "Logo, colors, fonts, photography, offers, and current marketing materials.",
    checked: false,
    details: {
      title: "Brand asset handover",
      body: "A complete asset pack keeps creative work consistent and avoids delays during campaign setup.",
      nextSteps: ["Logo files", "Brand guidelines", "Approved product or team images"],
    },
  },
  {
    id: "kickoff",
    title: "Kickoff task created",
    description: "Create the first internal delivery task and assign the owner.",
    checked: false,
  },
];

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: "Admin" | "Team Member";
};

type LeadRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  source: string | null;
  service_interested: string | null;
  budget: number | string | null;
  message: string | null;
  status: LeadStatus;
  temperature: LeadTemperature;
  assigned_to: string | null;
  next_follow_up_date: string | null;
  internal_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ClientRow = {
  id: string;
  client_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  services: string[] | null;
  monthly_retainer_value: number | string | null;
  start_date: string | null;
  status: "Active" | "Paused" | "Cancelled";
  notes: string | null;
  original_lead_id: string | null;
  assigned_to: string | null;
};

type ActivityRow = {
  id: string;
  entity_type: "lead" | "client";
  entity_id: string;
  type: string;
  message: string;
  actor: string;
  created_at: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: "Low" | "Medium" | "High";
  status: "To Do" | "In Progress" | "Done";
  assigned_user: string | null;
  related_type: "lead" | "client";
  related_id: string;
};

type RelatedItem = {
  value: string;
  label: string;
  type: "lead" | "client";
  id: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mapLeadRow(row: LeadRow, profileNames: Map<string, string>): Lead {
  const now = new Date().toISOString();

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    companyName: row.company_name ?? "",
    source: row.source ?? "Manual",
    serviceInterested: row.service_interested ?? "",
    budget: Number(row.budget ?? 0),
    message: row.message ?? "",
    status: row.status,
    temperature: row.temperature,
    assignedTo: row.assigned_to ? profileNames.get(row.assigned_to) ?? "Assigned" : "Unassigned",
    nextFollowUpDate: row.next_follow_up_date ?? format(new Date(), "yyyy-MM-dd"),
    internalNotes: row.internal_notes ?? "",
    createdAt: row.created_at ?? now,
    updatedAt: row.updated_at ?? now,
  };
}

function mapClientRow(row: ClientRow, profileNames: Map<string, string>): Client {
  return {
    id: row.id,
    clientName: row.client_name,
    contactPerson: row.contact_person ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    company: row.company ?? "",
    website: row.website ?? "",
    services: row.services ?? [],
    monthlyRetainerValue: Number(row.monthly_retainer_value ?? 0),
    startDate: row.start_date ?? format(new Date(), "yyyy-MM-dd"),
    status: row.status,
    notes: row.notes ?? "",
    originalLeadId: row.original_lead_id ?? undefined,
    assignedTo: row.assigned_to ? profileNames.get(row.assigned_to) ?? "Assigned" : "Unassigned",
  };
}

function mapActivityRow(row: ActivityRow): CrmActivity {
  return {
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    type: row.type,
    message: row.message,
    actor: row.actor,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function mapTaskRow(
  row: TaskRow,
  profileNames: Map<string, string>,
  relatedNames: Map<string, string>,
): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    assignedUser: row.assigned_user ? profileNames.get(row.assigned_user) ?? "Assigned" : "Unassigned",
    relatedType: row.related_type,
    relatedId: row.related_id,
    relatedName: relatedNames.get(`${row.related_type}:${row.related_id}`) ?? "Linked record",
  };
}

function SelectField({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 ${className}`}
    >
      {children}
    </select>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: LeadStatus;
  onChange: (value: LeadStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as LeadStatus)}
      className={`h-8 rounded-md border px-3 text-sm font-medium outline-none transition focus:ring-4 ${statusStyles[value]}`}
    >
      {pipelineStatuses.map((status) => (
        <option key={status}>{status}</option>
      ))}
    </select>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className={`rounded-md ${statusStyles[value] ?? ""}`}>
      {value}
    </Badge>
  );
}

function TemperatureBadge({ value }: { value: LeadTemperature }) {
  return (
    <Badge variant="outline" className={`rounded-md ${temperatureStyles[value]}`}>
      {value === "Hot" && <Flame className="size-3" />}
      {value}
    </Badge>
  );
}

export default function Home() {
  const [section, setSection] = useState<SectionId>("dashboard");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activityLog, setActivityLog] = useState<CrmActivity[]>(initialActivities);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>(users);
  const [crmNotice, setCrmNotice] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClients[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [temperatureFilter, setTemperatureFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [clientStatusFilter, setClientStatusFilter] = useState("All");

  useEffect(() => {
    async function loadLiveData() {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        return;
      }

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .order("full_name");
      const typedProfiles = (profileRows ?? []) as ProfileRow[];
      const fallbackProfiles = users.filter(
        (user) => !typedProfiles.some((profile) => profile.full_name === user.name),
      );
      const liveMembers = [
        ...typedProfiles.map((profile) => ({
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          role: profile.role,
          avatar: initials(profile.full_name),
        })),
        ...fallbackProfiles,
      ];
      const profileNames = new Map(typedProfiles.map((profile) => [profile.id, profile.full_name]));

      setProfiles(typedProfiles);
      setTeamMembers(liveMembers.length ? liveMembers : users);

      const { data: leadRows, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setCrmNotice(`Could not load Supabase leads: ${error.message}`);
        return;
      }

      const liveLeads = ((leadRows ?? []) as LeadRow[]).map((lead) => mapLeadRow(lead, profileNames));
      setLeads(liveLeads);
      const { data: clientRows, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientError) {
        setCrmNotice(`Could not load Supabase clients: ${clientError.message}`);
        return;
      }

      const liveClients = ((clientRows ?? []) as ClientRow[]).map((client) =>
        mapClientRow(client, profileNames),
      );

      setClients(liveClients);
      setSelectedClientId((current) => current || liveClients[0]?.id || "");

      const relatedNames = new Map<string, string>([
        ...liveLeads.map((lead) => [`lead:${lead.id}`, lead.companyName || lead.fullName] as const),
        ...liveClients.map((client) => [`client:${client.id}`, client.clientName] as const),
      ]);

      const { data: taskRows, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true });

      if (taskError) {
        setCrmNotice(`Could not load Supabase tasks: ${taskError.message}`);
        return;
      }

      setTasks(((taskRows ?? []) as TaskRow[]).map((task) => mapTaskRow(task, profileNames, relatedNames)));

      const { data: activityRows, error: activityError } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (activityError) {
        setCrmNotice(`Could not load recent activity: ${activityError.message}`);
        return;
      }

      setActivityLog(((activityRows ?? []) as ActivityRow[]).map(mapActivityRow));
      setCrmNotice("");
    }

    loadLiveData();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const searchText = `${lead.fullName} ${lead.email} ${lead.companyName} ${lead.serviceInterested}`.toLowerCase();
      return (
        searchText.includes(query.toLowerCase()) &&
        (statusFilter === "All" || lead.status === statusFilter) &&
        (sourceFilter === "All" || lead.source === sourceFilter) &&
        (temperatureFilter === "All" || lead.temperature === temperatureFilter) &&
        (assigneeFilter === "All" || lead.assignedTo === assigneeFilter)
      );
    });
  }, [assigneeFilter, leads, query, sourceFilter, statusFilter, temperatureFilter]);

  const dashboard = useMemo(() => {
    const activeClients = clients.filter((client) => client.status === "Active");
    const wonLeads = leads.filter((lead) => lead.status === "Won");
    const lostLeads = leads.filter((lead) => lead.status === "Lost");
    const dueToday = tasks.filter((task) => isSameDay(parseISO(task.dueDate), today) && task.status !== "Done");
    const pipelineValue = leads
      .filter((lead) => !["Won", "Lost"].includes(lead.status))
      .reduce((sum, lead) => sum + lead.budget, 0);

    return {
      totalLeads: leads.length,
      newLeads: leads.filter((lead) => lead.status === "New").length,
      hotLeads: leads.filter((lead) => lead.temperature === "Hot").length,
      followUpsDue: dueToday.length,
      activeClients: activeClients.length,
      dealsWon: wonLeads.length,
      dealsLost: lostLeads.length,
      pipelineValue,
    };
  }, [clients, leads, tasks]);

  const relatedItems = useMemo<RelatedItem[]>(() => {
    return [
      ...leads.map((lead) => ({
        value: `lead:${lead.id}`,
        label: `Lead · ${lead.companyName || lead.fullName}`,
        type: "lead" as const,
        id: lead.id,
      })),
      ...clients.map((client) => ({
        value: `client:${client.id}`,
        label: `Client · ${client.clientName}`,
        type: "client" as const,
        id: client.id,
      })),
    ];
  }, [clients, leads]);

  async function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const assignedTo = String(form.get("assignedTo") || "Ruan");
    const assignedProfile = profiles.find((profile) => profile.full_name === assignedTo);
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      fullName: String(form.get("fullName") || "New lead"),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      companyName: String(form.get("companyName") || ""),
      source: String(form.get("source") || "Manual"),
      serviceInterested: String(form.get("serviceInterested") || ""),
      budget: Number(form.get("budget") || 0),
      message: String(form.get("message") || ""),
      status: "New",
      temperature: String(form.get("temperature") || "Warm") as LeadTemperature,
      assignedTo,
      nextFollowUpDate: String(form.get("nextFollowUpDate") || format(today, "yyyy-MM-dd")),
      internalNotes: String(form.get("internalNotes") || ""),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          full_name: newLead.fullName,
          email: newLead.email || null,
          phone: newLead.phone || null,
          company_name: newLead.companyName,
          source: newLead.source,
          service_interested: newLead.serviceInterested,
          budget: newLead.budget,
          message: newLead.message,
          status: newLead.status,
          temperature: newLead.temperature,
          assigned_to: assignedProfile?.id ?? null,
          next_follow_up_date: newLead.nextFollowUpDate,
          internal_notes: newLead.internalNotes,
        })
        .select("*")
        .single();

      if (error) {
        setCrmNotice(`Could not save lead to Supabase: ${error.message}`);
        return;
      }

      const profileNames = new Map(profiles.map((profile) => [profile.id, profile.full_name]));
      setLeads((current) => [mapLeadRow(data as LeadRow, profileNames), ...current]);
      setCrmNotice("Lead saved.");
      formElement.reset();
      return;
    }

    setLeads((current) => [newLead, ...current]);
    formElement.reset();
  }

  async function updateLeadStatus(leadId: string, status: LeadStatus) {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, status, updatedAt: new Date().toISOString() } : lead,
      ),
    );

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const { error } = await supabase
        .from("leads")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", leadId);

      if (error) {
        setCrmNotice(`Could not update lead status: ${error.message}`);
      }
    }
  }

  async function deleteLead(leadId: string) {
    setLeads((current) => current.filter((lead) => lead.id !== leadId));
    setTasks((current) =>
      current.filter((task) => !(task.relatedType === "lead" && task.relatedId === leadId)),
    );

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const [{ error: taskError }, { error }] = await Promise.all([
        supabase.from("tasks").delete().eq("related_type", "lead").eq("related_id", leadId),
        supabase.from("leads").delete().eq("id", leadId),
      ]);

      if (taskError) {
        setCrmNotice(`Could not remove lead tasks: ${taskError.message}`);
        return;
      }
      if (error) {
        setCrmNotice(`Could not delete lead: ${error.message}`);
      }
    }
  }

  async function convertLead(lead: Lead) {
    if (clients.some((client) => client.originalLeadId === lead.id)) return;
    const newClient: Client = {
      id: `client-${Date.now()}`,
      clientName: `${lead.companyName || lead.fullName} Growth`,
      contactPerson: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      company: lead.companyName,
      website: "",
      services: [lead.serviceInterested].filter(Boolean),
      monthlyRetainerValue: lead.budget,
      startDate: format(new Date(), "yyyy-MM-dd"),
      status: "Active",
      notes: lead.internalNotes,
      originalLeadId: lead.id,
      assignedTo: lead.assignedTo,
    };
    const assignedProfile = profiles.find((profile) => profile.full_name === lead.assignedTo);
    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          client_name: newClient.clientName,
          contact_person: newClient.contactPerson,
          email: newClient.email || null,
          phone: newClient.phone || null,
          company: newClient.company,
          website: newClient.website,
          services: newClient.services,
          monthly_retainer_value: newClient.monthlyRetainerValue,
          start_date: newClient.startDate,
          status: newClient.status,
          notes: newClient.notes,
          original_lead_id: lead.id,
          assigned_to: assignedProfile?.id ?? null,
        })
        .select("*")
        .single();

      if (error) {
        setCrmNotice(`Could not convert lead to client: ${error.message}`);
        return;
      }

      const profileNames = new Map(profiles.map((profile) => [profile.id, profile.full_name]));
      const savedClient = mapClientRow(data as ClientRow, profileNames);
      setClients((current) => [savedClient, ...current]);
      setSelectedClientId(savedClient.id);
    } else {
      setClients((current) => [newClient, ...current]);
      setSelectedClientId(newClient.id);
    }
    updateLeadStatus(lead.id, "Won");
  }

  async function addClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const assignedTo = String(form.get("assignedTo") || "Ruan");
    const assignedProfile = profiles.find((profile) => profile.full_name === assignedTo);
    const service = String(form.get("service") || "");
    const client: Client = {
      id: `client-${Date.now()}`,
      clientName: String(form.get("clientName") || form.get("company") || "New client"),
      contactPerson: String(form.get("contactPerson") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      company: String(form.get("company") || ""),
      website: String(form.get("website") || ""),
      services: service ? [service] : [],
      monthlyRetainerValue: Number(form.get("monthlyRetainerValue") || 0),
      startDate: String(form.get("startDate") || format(new Date(), "yyyy-MM-dd")),
      status: String(form.get("status") || "Active") as Client["status"],
      notes: String(form.get("notes") || ""),
      assignedTo,
    };
    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          client_name: client.clientName,
          contact_person: client.contactPerson,
          email: client.email || null,
          phone: client.phone || null,
          company: client.company,
          website: client.website,
          services: client.services,
          monthly_retainer_value: client.monthlyRetainerValue,
          start_date: client.startDate,
          status: client.status,
          notes: client.notes,
          assigned_to: assignedProfile?.id ?? null,
        })
        .select("*")
        .single();

      if (error) {
        setCrmNotice(`Could not create client: ${error.message}`);
        return;
      }

      const profileNames = new Map(profiles.map((profile) => [profile.id, profile.full_name]));
      const savedClient = mapClientRow(data as ClientRow, profileNames);
      setClients((current) => [savedClient, ...current]);
      setSelectedClientId(savedClient.id);
      setCrmNotice("Client saved.");
      formElement.reset();
      return;
    }

    setClients((current) => [client, ...current]);
    setSelectedClientId(client.id);
    formElement.reset();
  }

  async function deleteClient(clientId: string) {
    const fallbackClientId = clients.find((client) => client.id !== clientId)?.id ?? "";

    setClients((current) => current.filter((client) => client.id !== clientId));
    setTasks((current) =>
      current.filter((task) => !(task.relatedType === "client" && task.relatedId === clientId)),
    );
    setSelectedClientId((current) => (current === clientId ? fallbackClientId : current));

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const [{ error: taskError }, { error }] = await Promise.all([
        supabase.from("tasks").delete().eq("related_type", "client").eq("related_id", clientId),
        supabase.from("clients").delete().eq("id", clientId),
      ]);

      if (taskError) {
        setCrmNotice(`Could not remove client tasks: ${taskError.message}`);
        return;
      }

      if (error) {
        setCrmNotice(`Could not delete client: ${error.message}`);
      }
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const relatedValue = String(form.get("related") || relatedItems[0]?.value || "");
    const [relatedTypeRaw, relatedId] = relatedValue.split(":");
    const relatedType = relatedTypeRaw === "client" ? "client" : "lead";

    if (!relatedId) {
      setCrmNotice("Create or select a lead or client before adding a task.");
      return;
    }

    const assignedTo = String(form.get("assignedTo") || "Ruan");
    const assignedProfile = profiles.find((profile) => profile.full_name === assignedTo);
    const dueDate = String(form.get("dueDate") || format(new Date(), "yyyy-MM-dd"));
    const relatedName =
      relatedType === "client"
        ? clients.find((client) => client.id === relatedId)?.clientName
        : leads.find((lead) => lead.id === relatedId)?.companyName ||
          leads.find((lead) => lead.id === relatedId)?.fullName;
    const task: Task = {
      id: `task-${Date.now()}`,
      title: String(form.get("title") || "Follow up"),
      description: String(form.get("description") || ""),
      dueDate,
      priority: String(form.get("priority") || "Medium") as Task["priority"],
      status: "To Do",
      assignedUser: assignedTo,
      relatedType,
      relatedId,
      relatedName: relatedName || "Linked record",
    };

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: task.title,
          description: task.description || null,
          due_date: task.dueDate,
          priority: task.priority,
          status: task.status,
          assigned_user: assignedProfile?.id ?? null,
          related_type: task.relatedType,
          related_id: task.relatedId,
        })
        .select("*")
        .single();

      if (error) {
        setCrmNotice(`Could not create task: ${error.message}`);
        return;
      }

      const profileNames = new Map(profiles.map((profile) => [profile.id, profile.full_name]));
      const relatedNames = new Map<string, string>([
        ...leads.map((lead) => [`lead:${lead.id}`, lead.companyName || lead.fullName] as const),
        ...clients.map((client) => [`client:${client.id}`, client.clientName] as const),
      ]);
      const savedTask = mapTaskRow(data as TaskRow, profileNames, relatedNames);
      setTasks((current) =>
        [savedTask, ...current].sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
      );
      setCrmNotice("Task added.");
      formElement.reset();
      return;
    }

    setTasks((current) => [task, ...current].sort((left, right) => left.dueDate.localeCompare(right.dueDate)));
    formElement.reset();
  }

  async function completeTask(taskId: string) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status: "Done" } : task)),
    );

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const { error } = await supabase.from("tasks").update({ status: "Done" }).eq("id", taskId);

      if (error) {
        setCrmNotice(`Could not mark task as done: ${error.message}`);
      }
    }
  }

  async function deleteTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) {
        setCrmNotice(`Could not delete task: ${error.message}`);
      }
    }
  }

  const visibleClients = clients.filter((client) => {
    const matchesQuery = `${client.clientName} ${client.company} ${client.contactPerson} ${client.services.join(" ")}`.
      toLowerCase()
      .includes(query.toLowerCase());
    return matchesQuery && (clientStatusFilter === "All" || client.status === clientStatusFilter);
  });
  const selectedClient =
    visibleClients.find((client) => client.id === selectedClientId) ?? visibleClients[0] ?? null;

  return (
    <main className="min-h-[100dvh] bg-[#f7f8f5] text-zinc-950">
      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-zinc-200 bg-white/85 px-4 py-4 backdrop-blur lg:sticky lg:top-0 lg:h-[100dvh] lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-12 w-28 items-center">
              <Image
                src="/tsm-logo.png"
                alt="TSM logo"
                width={1153}
                height={510}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-semibold">TSM CRM</p>
              <p className="text-xs text-zinc-500">Marketing and AI automation</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex h-11 items-center gap-3 rounded-md px-3 text-left text-sm transition active:translate-y-px ${
                    isActive ? "bg-[#f70805] text-white" : "text-zinc-600 hover:bg-red-50 hover:text-zinc-950"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <Separator className="my-6" />

          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <ShieldCheck className="size-4" />
              Role-aware MVP
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-800">
              Admins manage all records. Team members are scoped to assigned leads and clients through Supabase policies.
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-zinc-200 bg-[#f7f8f5]/90 px-4 py-4 backdrop-blur md:px-8">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#c91310]">TSM command center</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                  {navItems.find((item) => item.id === section)?.label}
                </h1>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search leads, clients, services"
                    className="h-10 w-full rounded-md border-zinc-200 bg-white pl-9 sm:w-72"
                  />
                </div>
                <QuickLeadDialog addLead={addLead} teamMembers={teamMembers} />
              </div>
            </div>
          </header>

          <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 md:px-8">
            {crmNotice && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {crmNotice}
              </div>
            )}
            {section === "dashboard" && (
              <DashboardView
                dashboard={dashboard}
                tasks={tasks}
                leads={leads}
                activities={activityLog}
                addTask={addTask}
                completeTask={completeTask}
                deleteTask={deleteTask}
                teamMembers={teamMembers}
                relatedItems={relatedItems}
              />
            )}
            {section === "leads" && (
              <LeadsView
                leads={filteredLeads}
                teamMembers={teamMembers}
                statusFilter={statusFilter}
                sourceFilter={sourceFilter}
                temperatureFilter={temperatureFilter}
                assigneeFilter={assigneeFilter}
                setStatusFilter={setStatusFilter}
                setSourceFilter={setSourceFilter}
                setTemperatureFilter={setTemperatureFilter}
                setAssigneeFilter={setAssigneeFilter}
                updateLeadStatus={updateLeadStatus}
                deleteLead={deleteLead}
                convertLead={convertLead}
              />
            )}
            {section === "pipeline" && (
              <PipelineView leads={leads} updateLeadStatus={updateLeadStatus} convertLead={convertLead} />
            )}
            {section === "clients" && (
              <ClientsView
                clients={visibleClients}
                selectedClient={selectedClient}
                selectedClientId={selectedClientId}
                setSelectedClientId={setSelectedClientId}
                addClient={addClient}
                deleteClient={deleteClient}
                teamMembers={teamMembers}
                clientStatusFilter={clientStatusFilter}
                setClientStatusFilter={setClientStatusFilter}
              />
            )}
            {section === "tasks" && (
              <TasksView
                tasks={tasks}
                addTask={addTask}
                completeTask={completeTask}
                deleteTask={deleteTask}
                teamMembers={teamMembers}
                relatedItems={relatedItems}
              />
            )}
            {section === "settings" && <SettingsView teamMembers={teamMembers} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function QuickLeadDialog({
  addLead,
  teamMembers,
}: {
  addLead: (event: FormEvent<HTMLFormElement>) => void;
  teamMembers: UserProfile[];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="h-10 rounded-md bg-[#f70805] text-white hover:bg-[#d80f0c]" />}>
        <Plus className="size-4" />
        New lead
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={addLead} className="grid gap-4 md:grid-cols-2">
          <Field name="fullName" label="Full name" placeholder="Lead name" />
          <Field name="email" label="Email" placeholder="lead@company.com" type="email" />
          <Field name="phone" label="Phone" placeholder="+27..." />
          <Field name="companyName" label="Company" placeholder="Company name" />
          <SelectBlock name="source" label="Source" values={leadSources} />
          <SelectBlock name="serviceInterested" label="Service interested in" values={services} />
          <Field name="budget" label="Budget" placeholder="25000" type="number" />
          <SelectBlock name="temperature" label="Temperature" values={["Cold", "Warm", "Hot"]} />
          <SelectBlock name="assignedTo" label="Assigned team member" values={teamMembers.map((user) => user.name)} />
          <Field name="nextFollowUpDate" label="Next follow-up" type="date" />
          <div className="md:col-span-2">
            <Label className="text-sm">Message / notes</Label>
            <Textarea name="message" className="mt-2 min-h-24 rounded-md" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-sm">Internal notes</Label>
            <Textarea name="internalNotes" className="mt-2 min-h-20 rounded-md" />
          </div>
          <Button
            type="submit"
            className="md:col-span-2 h-10 rounded-md bg-[#f70805] hover:bg-[#d80f0c]"
          >
            Create lead
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder?: string; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name} className="text-sm">
        {label}
      </Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} className="rounded-md" />
    </div>
  );
}

function SelectBlock({ name, label, values }: { name: string; label: string; values: string[] }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name} className="text-sm">
        {label}
      </Label>
      <select id={name} name={name} className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm">
        {values.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </div>
  );
}

function AddTaskDialog({
  addTask,
  teamMembers,
  relatedItems,
}: {
  addTask: (event: FormEvent<HTMLFormElement>) => void;
  teamMembers: UserProfile[];
  relatedItems: RelatedItem[];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" className="h-9 rounded-md bg-[#f70805] text-white hover:bg-[#d80f0c]" />}>
        <Plus className="size-4" />
        Task
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
        </DialogHeader>
        <form onSubmit={addTask} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field name="title" label="Task" placeholder="Follow up with lead" />
          </div>
          <Field name="dueDate" label="Due date" type="date" />
          <SelectBlock name="priority" label="Priority" values={["Low", "Medium", "High"]} />
          <SelectBlock name="assignedTo" label="Assigned team member" values={teamMembers.map((user) => user.name)} />
          <div className="grid gap-2">
            <Label htmlFor="related" className="text-sm">
              Related record
            </Label>
            <select
              id="related"
              name="related"
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
              disabled={relatedItems.length === 0}
            >
              {relatedItems.length ? (
                relatedItems.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))
              ) : (
                <option value="">Create a lead or client first</option>
              )}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-sm">Notes</Label>
            <Textarea name="description" className="mt-2 min-h-24 rounded-md" />
          </div>
          <Button
            type="submit"
            className="md:col-span-2 h-10 rounded-md bg-[#f70805] hover:bg-[#d80f0c]"
            disabled={relatedItems.length === 0}
          >
            Add task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DashboardView({
  dashboard,
  tasks,
  leads,
  activities,
  addTask,
  completeTask,
  deleteTask,
  teamMembers,
  relatedItems,
}: {
  dashboard: Record<string, number>;
  tasks: Task[];
  leads: Lead[];
  activities: CrmActivity[];
  addTask: (event: FormEvent<HTMLFormElement>) => void;
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  teamMembers: UserProfile[];
  relatedItems: RelatedItem[];
}) {
  const metrics: [string, string | number, LucideIcon][] = [
    ["Total leads", dashboard.totalLeads, UsersRound],
    ["New leads", dashboard.newLeads, Plus],
    ["Hot leads", dashboard.hotLeads, Flame],
    ["Follow-ups today", dashboard.followUpsDue, CalendarClock],
    ["Active clients", dashboard.activeClients, BadgeCheck],
    ["Deals won", dashboard.dealsWon, CheckCircle2],
    ["Deals lost", dashboard.dealsLost, AlertTriangle],
    ["Monthly pipeline", currency(dashboard.pipelineValue), CircleDollarSign],
  ];
  const dueToday = tasks.filter((task) => isSameDay(parseISO(task.dueDate), today) && task.status !== "Done");

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => (
          <Card key={String(label)} className="rounded-md border-zinc-200 bg-white shadow-none">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-zinc-500">{label as string}</p>
                <p className="mt-2 font-mono text-2xl font-semibold">{String(value)}</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="rounded-md border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Recent lead activity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {activities.length === 0 && (
              <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
                New leads and CRM updates will appear here once they start flowing in.
              </div>
            )}
            {activities.map((item) => (
              <div key={item.id} className="flex gap-3 border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                <div className="mt-1 flex size-8 items-center justify-center rounded-md bg-zinc-100">
                  <Activity className="size-4 text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.type}</p>
                  <p className="mt-1 text-sm text-zinc-600">{item.message}</p>
                  <p className="mt-2 text-xs text-zinc-400">{format(parseISO(item.createdAt), "MMM d, HH:mm")} by {item.actor}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-md border-rose-200 bg-rose-50 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base text-rose-950">
                <CalendarClock className="size-4" />
                Needs attention today
              </CardTitle>
              <AddTaskDialog addTask={addTask} teamMembers={teamMembers} relatedItems={relatedItems} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dueToday.length === 0 && leads.filter((lead) => lead.temperature === "Hot").length === 0 && (
              <div className="rounded-md border border-dashed border-rose-200 bg-white/70 p-4 text-sm text-rose-900">
                Nothing urgent yet. Add a task here when something needs attention today.
              </div>
            )}
            {dueToday.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                completeTask={completeTask}
                deleteTask={deleteTask}
                showCompleteAction
              />
            ))}
            {leads.filter((lead) => lead.temperature === "Hot").slice(0, 3).map((lead) => (
              <div key={lead.id} className="rounded-md border border-amber-200 bg-white p-3">
                <p className="text-sm font-medium">{lead.companyName}</p>
                <p className="mt-1 text-xs text-zinc-500">{currency(lead.budget)} pipeline value. Follow up {lead.nextFollowUpDate}.</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function LeadsView(props: {
  leads: Lead[];
  teamMembers: UserProfile[];
  statusFilter: string;
  sourceFilter: string;
  temperatureFilter: string;
  assigneeFilter: string;
  setStatusFilter: (value: string) => void;
  setSourceFilter: (value: string) => void;
  setTemperatureFilter: (value: string) => void;
  setAssigneeFilter: (value: string) => void;
  updateLeadStatus: (leadId: string, status: LeadStatus) => void;
  deleteLead: (leadId: string) => void;
  convertLead: (lead: Lead) => void;
}) {
  return (
    <Card className="rounded-md border-zinc-200 bg-white shadow-none">
      <CardHeader className="gap-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">Lead management</CardTitle>
          <Badge variant="outline" className="rounded-md">{props.leads.length} visible</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <SelectField value={props.statusFilter} onChange={props.setStatusFilter}>
            {["All", ...pipelineStatuses].map((value) => <option key={value}>{value}</option>)}
          </SelectField>
          <SelectField value={props.sourceFilter} onChange={props.setSourceFilter}>
            {["All", ...leadSources].map((value) => <option key={value}>{value}</option>)}
          </SelectField>
          <SelectField value={props.temperatureFilter} onChange={props.setTemperatureFilter}>
            {["All", "Cold", "Warm", "Hot"].map((value) => <option key={value}>{value}</option>)}
          </SelectField>
          <SelectField value={props.assigneeFilter} onChange={props.setAssigneeFilter}>
            {["All", ...props.teamMembers.map((user) => user.name)].map((value) => <option key={value}>{value}</option>)}
          </SelectField>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Temp</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <p className="font-medium">{lead.fullName}</p>
                  <p className="text-xs text-zinc-500">{lead.companyName} · {lead.email}</p>
                </TableCell>
                <TableCell>{lead.serviceInterested}</TableCell>
                <TableCell>
                  <StatusSelect
                    value={lead.status}
                    onChange={(value) => props.updateLeadStatus(lead.id, value)}
                  />
                </TableCell>
                <TableCell><TemperatureBadge value={lead.temperature} /></TableCell>
                <TableCell>
                  <span className={isBefore(parseISO(lead.nextFollowUpDate), today) ? "font-medium text-rose-700" : ""}>
                    {format(parseISO(lead.nextFollowUpDate), "MMM d")}
                  </span>
                </TableCell>
                <TableCell>{lead.assignedTo}</TableCell>
                <TableCell className="text-right font-mono">{currency(lead.budget)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-md" onClick={() => props.convertLead(lead)}>
                      Convert
                    </Button>
                    <DeleteIconButton
                      ariaLabel={`Delete lead ${lead.fullName}`}
                      onClick={() => props.deleteLead(lead.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PipelineView({
  leads,
  updateLeadStatus,
  convertLead,
}: {
  leads: Lead[];
  updateLeadStatus: (leadId: string, status: LeadStatus) => void;
  convertLead: (lead: Lead) => void;
}) {
  return (
    <div className="grid gap-3 overflow-x-auto lg:grid-cols-6">
      {pipelineStatuses.map((status) => {
        const columnLeads = leads.filter((lead) => lead.status === status);
        return (
          <Card key={status} className={`min-w-72 rounded-md shadow-none ${pipelineColumnStyles[status]}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{status}</CardTitle>
                <Badge variant="outline" className={`rounded-md ${statusStyles[status]}`}>{columnLeads.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {columnLeads.map((lead) => (
                <div key={lead.id} className="rounded-md border border-zinc-200 bg-[#fbfbf8] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{lead.companyName}</p>
                      <p className="mt-1 text-xs text-zinc-500">{lead.fullName}</p>
                    </div>
                    <TemperatureBadge value={lead.temperature} />
                  </div>
                  <p className="mt-3 text-xs text-zinc-600">{lead.serviceInterested}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-mono">{currency(lead.budget)}</span>
                    <span>{format(parseISO(lead.nextFollowUpDate), "MMM d")}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 rounded-md"
                      onClick={() => {
                        const index = pipelineStatuses.indexOf(status);
                        const next = pipelineStatuses[Math.min(index + 1, pipelineStatuses.length - 1)];
                        updateLeadStatus(lead.id, next);
                      }}
                    >
                      Move
                      <ArrowRight className="size-3" />
                    </Button>
                    {status === "Won" && (
                    <Button size="sm" className="h-8 rounded-md bg-[#f70805] hover:bg-[#d80f0c]" onClick={() => convertLead(lead)}>
                        Client
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ClientsView({
  clients,
  selectedClient,
  selectedClientId,
  setSelectedClientId,
  addClient,
  deleteClient,
  teamMembers,
  clientStatusFilter,
  setClientStatusFilter,
}: {
  clients: Client[];
  selectedClient: Client | null;
  selectedClientId: string;
  setSelectedClientId: (value: string) => void;
  addClient: (event: FormEvent<HTMLFormElement>) => void;
  deleteClient: (clientId: string) => void;
  teamMembers: UserProfile[];
  clientStatusFilter: string;
  setClientStatusFilter: (value: string) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-md border-zinc-200 bg-white shadow-none">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Clients</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">{clients.length} visible accounts</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SelectField value={clientStatusFilter} onChange={setClientStatusFilter} className="w-full sm:w-40">
                {["All", "Active", "Paused", "Cancelled"].map((value) => <option key={value}>{value}</option>)}
              </SelectField>
              <CreateClientDialog addClient={addClient} teamMembers={teamMembers} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          {clients.length === 0 && (
            <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
              <p className="text-sm font-medium">No clients yet</p>
              <p className="mt-2 text-sm text-zinc-500">Create a client manually or convert a won lead.</p>
            </div>
          )}
          {clients.map((client) => {
            const isSelected = client.id === selectedClientId || client.id === selectedClient?.id;

            return (
              <div key={client.id} className="flex gap-2">
                <button
                  onClick={() => setSelectedClientId(client.id)}
                  className={`grid flex-1 gap-3 rounded-md border p-4 text-left transition active:translate-y-px ${
                    isSelected
                      ? "border-[#f70805] bg-red-50/60"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{client.clientName}</p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {client.contactPerson || "No contact"} · {client.company || "No company"}
                      </p>
                    </div>
                    <StatusBadge value={client.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-zinc-500">
                    <span>{client.assignedTo}</span>
                    <span className="text-right font-mono">{currency(client.monthlyRetainerValue)}</span>
                  </div>
                </button>
                <DeleteIconButton
                  ariaLabel={`Delete client ${client.clientName}`}
                  onClick={() => deleteClient(client.id)}
                  className="self-start"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-md border-zinc-200 bg-white shadow-none">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{selectedClient?.clientName ?? "Select a client"}</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                {selectedClient
                  ? `${selectedClient.contactPerson || "No contact person"} · ${selectedClient.company || "No company"}`
                  : "Choose a client from the list to view details."}
              </p>
            </div>
            <div className="flex items-start gap-2">
              {selectedClient && <StatusBadge value={selectedClient.status} />}
              {selectedClient && (
                <DeleteIconButton
                  ariaLabel={`Delete client ${selectedClient.clientName}`}
                  onClick={() => deleteClient(selectedClient.id)}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedClient ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
              No client selected.
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Monthly retainer" value={currency(selectedClient.monthlyRetainerValue)} />
                <Info label="Start date" value={format(parseISO(selectedClient.startDate), "MMM d, yyyy")} />
                <Info label="Assigned to" value={selectedClient.assignedTo} />
                <Info label="Website" value={selectedClient.website.replace("https://", "") || "Not set"} />
                <Info label="Email" value={selectedClient.email || "Not set"} />
                <Info label="Phone" value={selectedClient.phone || "Not set"} />
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium">Services</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedClient.services.length ? (
                    selectedClient.services.map((service) => (
                      <Badge key={service} variant="outline" className="rounded-md">
                        {service}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-zinc-500">No services set</span>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Onboarding checklist</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Track the first steps needed to hand this client to delivery.
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 rounded-md">
                    {onboardingChecklist.filter((item) => item.checked).length}/{onboardingChecklist.length}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3">
                  {onboardingChecklist.map((item) => (
                    <OnboardingChecklistRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Notes</p>
                <p className="mt-3 rounded-md bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
                  {selectedClient.notes || "No notes yet."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DeleteIconButton({
  ariaLabel,
  onClick,
  className = "",
}: {
  ariaLabel: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`rounded-md text-rose-700 hover:bg-rose-50 hover:text-rose-900 ${className}`}
      onClick={onClick}
    >
      <X className="size-4" />
    </Button>
  );
}

function OnboardingChecklistRow({ item }: { item: OnboardingChecklistItem }) {
  return (
    <div className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50/70 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex gap-3">
        <Checkbox checked={item.checked} disabled aria-label={item.title} className="mt-1 bg-white" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-950">{item.title}</p>
          <p className="mt-1 text-sm leading-5 text-zinc-600">{item.description}</p>
        </div>
      </div>
      {item.details && (
        <Dialog>
          <DialogTrigger
            render={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 justify-self-start rounded-md border-zinc-300 bg-white sm:justify-self-end"
              />
            }
          >
            <FileText className="size-4" />
            Info
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{item.details.title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <p className="text-sm leading-6 text-zinc-600">{item.details.body}</p>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium">Next steps</p>
                <div className="mt-3 grid gap-2">
                  {item.details.nextSteps.map((step) => (
                    <div key={step} className="flex items-center gap-2 text-sm text-zinc-600">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CreateClientDialog({
  addClient,
  teamMembers,
}: {
  addClient: (event: FormEvent<HTMLFormElement>) => void;
  teamMembers: UserProfile[];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="h-10 rounded-md bg-[#f70805] text-white hover:bg-[#d80f0c]" />}>
        <Plus className="size-4" />
        New client
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create client</DialogTitle>
        </DialogHeader>
        <form onSubmit={addClient} className="grid gap-4 md:grid-cols-2">
          <Field name="clientName" label="Client name" placeholder="Atlas Dentistry Growth" />
          <Field name="contactPerson" label="Contact person" placeholder="Primary contact" />
          <Field name="email" label="Email" placeholder="client@company.com" type="email" />
          <Field name="phone" label="Phone" placeholder="+27..." />
          <Field name="company" label="Company" placeholder="Company name" />
          <Field name="website" label="Website" placeholder="https://company.com" />
          <SelectBlock name="service" label="Service" values={services} />
          <Field name="monthlyRetainerValue" label="Monthly retainer" placeholder="25000" type="number" />
          <Field name="startDate" label="Start date" type="date" />
          <SelectBlock name="status" label="Status" values={["Active", "Paused", "Cancelled"]} />
          <SelectBlock name="assignedTo" label="Assigned team member" values={teamMembers.map((user) => user.name)} />
          <div className="md:col-span-2">
            <Label className="text-sm">Notes</Label>
            <Textarea name="notes" className="mt-2 min-h-24 rounded-md" />
          </div>
          <Button
            type="submit"
            className="md:col-span-2 h-10 rounded-md bg-[#f70805] hover:bg-[#d80f0c]"
          >
            Create client
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function TaskCard({
  task,
  completeTask,
  deleteTask,
  showCompleteAction = false,
}: {
  task: Task;
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  showCompleteAction?: boolean;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{task.title}</p>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="rounded-md">
            {task.priority}
          </Badge>
          {showCompleteAction && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-md px-2 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              onClick={() => completeTask(task.id)}
            >
              <CheckCircle2 className="size-3.5" />
              Done
            </Button>
          )}
          <DeleteIconButton ariaLabel={`Delete task ${task.title}`} onClick={() => deleteTask(task.id)} />
        </div>
      </div>
      <p className="mt-2 text-sm text-zinc-600">{task.description}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>{task.relatedName}</span>
        <StatusBadge value={task.status} />
      </div>
    </div>
  );
}

function TasksView({
  tasks,
  addTask,
  completeTask,
  deleteTask,
  teamMembers,
  relatedItems,
}: {
  tasks: Task[];
  addTask: (event: FormEvent<HTMLFormElement>) => void;
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  teamMembers: UserProfile[];
  relatedItems: RelatedItem[];
}) {
  const overdue = tasks.filter((task) => isBefore(parseISO(task.dueDate), today) && task.status !== "Done");
  const dueToday = tasks.filter((task) => isSameDay(parseISO(task.dueDate), today) && task.status !== "Done");
  const upcoming = tasks.filter((task) => isAfter(parseISO(task.dueDate), today) && isBefore(parseISO(task.dueDate), addDays(today, 10)));

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <AddTaskDialog addTask={addTask} teamMembers={teamMembers} relatedItems={relatedItems} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <TaskColumn title="Overdue" tone="rose" tasks={overdue} completeTask={completeTask} deleteTask={deleteTask} />
        <TaskColumn title="Due today" tone="amber" tasks={dueToday} completeTask={completeTask} deleteTask={deleteTask} />
        <TaskColumn title="Upcoming" tone="zinc" tasks={upcoming} completeTask={completeTask} deleteTask={deleteTask} />
      </div>
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
  tone,
  completeTask,
  deleteTask,
}: {
  title: string;
  tasks: Task[];
  tone: "rose" | "amber" | "zinc";
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
}) {
  const color = tone === "rose" ? "border-rose-200 bg-rose-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white";
  return (
    <Card className={`rounded-md shadow-none ${color}`}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {tasks.length === 0 && (
          <div className="rounded-md border border-dashed border-zinc-300 bg-white/70 p-6 text-sm text-zinc-500">
            No tasks in this lane.
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            completeTask={completeTask}
            deleteTask={deleteTask}
            showCompleteAction
          />
        ))}
      </CardContent>
    </Card>
  );
}

function SettingsView({ teamMembers }: { teamMembers: UserProfile[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="rounded-md border-zinc-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Team users</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {teamMembers.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-md border border-zinc-200 p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold">{user.avatar}</div>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-md">{user.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-md border-zinc-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Formspree webhook instructions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm">
            POST /api/webhooks/formspree
          </div>
          <div className="grid gap-2 text-sm text-zinc-600">
            <p>Set Formspree to send JSON to your deployed URL plus the path above.</p>
            <p>Add header <span className="font-mono text-zinc-950">x-webhook-secret</span> with the same value as <span className="font-mono text-zinc-950">FORMSPREE_WEBHOOK_SECRET</span>.</p>
            <p>The endpoint validates email or phone, stores raw submission data, sets status to New, and updates duplicates by email or phone.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SettingsList title="Lead sources" values={leadSources} />
            <SettingsList title="Services offered" values={services} />
            <SettingsList title="Pipeline statuses" values={pipelineStatuses} />
            <SettingsList title="Admin controls" values={["Manage users", "Manage settings", "View all records"]} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsList({ title, values }: { title: string; values: readonly string[] }) {
  return (
    <div className="rounded-md border border-zinc-200 p-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant="outline" className="rounded-md">
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
}
