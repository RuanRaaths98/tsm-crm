"use client";

import { FormEvent, useMemo, useState } from "react";
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
  Flame,
  LayoutDashboard,
  ListFilter,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { addDays, format, isAfter, isBefore, isSameDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  activities,
  clients as initialClients,
  currency,
  leadSources,
  leads as initialLeads,
  pipelineStatuses,
  services,
  tasks as initialTasks,
  users,
  type Client,
  type Lead,
  type LeadStatus,
  type LeadTemperature,
  type Task,
} from "@/lib/crm-data";

const today = parseISO("2026-06-30");

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
  Qualified: "border-emerald-200 bg-emerald-50 text-emerald-700",
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

const temperatureStyles: Record<LeadTemperature, string> = {
  Cold: "border-zinc-200 bg-zinc-50 text-zinc-600",
  Warm: "border-amber-200 bg-amber-50 text-amber-800",
  Hot: "border-rose-200 bg-rose-50 text-rose-700",
};

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
  const [tasks] = useState<Task[]>(initialTasks);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [temperatureFilter, setTemperatureFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [clientStatusFilter, setClientStatusFilter] = useState("All");

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

  function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
      assignedTo: String(form.get("assignedTo") || "Mara Venter"),
      nextFollowUpDate: String(form.get("nextFollowUpDate") || format(today, "yyyy-MM-dd")),
      internalNotes: String(form.get("internalNotes") || ""),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLeads((current) => [newLead, ...current]);
    event.currentTarget.reset();
  }

  function updateLeadStatus(leadId: string, status: LeadStatus) {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, status, updatedAt: new Date().toISOString() } : lead,
      ),
    );
  }

  function deleteLead(leadId: string) {
    setLeads((current) => current.filter((lead) => lead.id !== leadId));
  }

  function convertLead(lead: Lead) {
    if (clients.some((client) => client.originalLeadId === lead.id)) return;
    setClients((current) => [
      {
        id: `client-${Date.now()}`,
        clientName: `${lead.companyName} Growth`,
        contactPerson: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        company: lead.companyName,
        website: "",
        services: [lead.serviceInterested],
        monthlyRetainerValue: lead.budget,
        startDate: format(today, "yyyy-MM-dd"),
        status: "Active",
        notes: lead.internalNotes,
        originalLeadId: lead.id,
        assignedTo: lead.assignedTo,
      },
      ...current,
    ]);
    updateLeadStatus(lead.id, "Won");
  }

  const visibleClients = clients.filter((client) => {
    const matchesQuery = `${client.clientName} ${client.company} ${client.contactPerson} ${client.services.join(" ")}`.
      toLowerCase()
      .includes(query.toLowerCase());
    return matchesQuery && (clientStatusFilter === "All" || client.status === clientStatusFilter);
  });

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
                <QuickLeadDialog addLead={addLead} />
              </div>
            </div>
          </header>

          <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 md:px-8">
            {section === "dashboard" && <DashboardView dashboard={dashboard} tasks={tasks} leads={leads} />}
            {section === "leads" && (
              <LeadsView
                leads={filteredLeads}
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
                clientStatusFilter={clientStatusFilter}
                setClientStatusFilter={setClientStatusFilter}
              />
            )}
            {section === "tasks" && <TasksView tasks={tasks} />}
            {section === "settings" && <SettingsView />}
          </div>
        </section>
      </div>
    </main>
  );
}

function QuickLeadDialog({ addLead }: { addLead: (event: FormEvent<HTMLFormElement>) => void }) {
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
          <SelectBlock name="assignedTo" label="Assigned team member" values={users.map((user) => user.name)} />
          <Field name="nextFollowUpDate" label="Next follow-up" type="date" />
          <div className="md:col-span-2">
            <Label className="text-sm">Message / notes</Label>
            <Textarea name="message" className="mt-2 min-h-24 rounded-md" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-sm">Internal notes</Label>
            <Textarea name="internalNotes" className="mt-2 min-h-20 rounded-md" />
          </div>
          <Button className="md:col-span-2 rounded-md bg-[#f70805] hover:bg-[#d80f0c]">Create lead</Button>
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

function DashboardView({
  dashboard,
  tasks,
  leads,
}: {
  dashboard: Record<string, number>;
  tasks: Task[];
  leads: Lead[];
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
            <CardTitle className="flex items-center gap-2 text-base text-rose-950">
              <CalendarClock className="size-4" />
              Needs attention today
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dueToday.map((task) => (
              <div key={task.id} className="rounded-md border border-rose-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{task.title}</p>
                  <Badge className="rounded-md bg-rose-700">{task.priority}</Badge>
                </div>
                <p className="mt-2 text-xs text-zinc-500">{task.relatedName} assigned to {task.assignedUser}</p>
              </div>
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
            {["All", ...users.map((user) => user.name)].map((value) => <option key={value}>{value}</option>)}
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
                  <SelectField value={lead.status} onChange={(value) => props.updateLeadStatus(lead.id, value as LeadStatus)} className="h-8">
                    {pipelineStatuses.map((status) => <option key={status}>{status}</option>)}
                  </SelectField>
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
                    <Button variant="ghost" size="sm" className="rounded-md text-rose-700" onClick={() => props.deleteLead(lead.id)}>
                      Delete
                    </Button>
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
          <Card key={status} className="min-w-72 rounded-md border-zinc-200 bg-white shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{status}</CardTitle>
                <Badge variant="outline" className="rounded-md">{columnLeads.length}</Badge>
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
  clientStatusFilter,
  setClientStatusFilter,
}: {
  clients: Client[];
  clientStatusFilter: string;
  setClientStatusFilter: (value: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <ListFilter className="size-4" />
          Filter clients
        </div>
        <SelectField value={clientStatusFilter} onChange={setClientStatusFilter}>
          {["All", "Active", "Paused", "Cancelled"].map((value) => <option key={value}>{value}</option>)}
        </SelectField>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {clients.map((client) => (
          <Card key={client.id} className="rounded-md border-zinc-200 bg-white shadow-none">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{client.clientName}</CardTitle>
                  <p className="mt-1 text-sm text-zinc-500">{client.contactPerson} · {client.company}</p>
                </div>
                <StatusBadge value={client.status} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Retainer" value={currency(client.monthlyRetainerValue)} />
                <Info label="Started" value={format(parseISO(client.startDate), "MMM d, yyyy")} />
                <Info label="Owner" value={client.assignedTo} />
                <Info label="Website" value={client.website.replace("https://", "") || "Not set"} />
              </div>
              <div className="flex flex-wrap gap-2">
                {client.services.map((service) => <Badge key={service} variant="outline" className="rounded-md">{service}</Badge>)}
              </div>
              <p className="rounded-md bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">{client.notes}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
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

function TasksView({ tasks }: { tasks: Task[] }) {
  const overdue = tasks.filter((task) => isBefore(parseISO(task.dueDate), today) && task.status !== "Done");
  const dueToday = tasks.filter((task) => isSameDay(parseISO(task.dueDate), today) && task.status !== "Done");
  const upcoming = tasks.filter((task) => isAfter(parseISO(task.dueDate), today) && isBefore(parseISO(task.dueDate), addDays(today, 10)));

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <TaskColumn title="Overdue" tone="rose" tasks={overdue} />
      <TaskColumn title="Due today" tone="amber" tasks={dueToday} />
      <TaskColumn title="Upcoming" tone="zinc" tasks={upcoming} />
    </div>
  );
}

function TaskColumn({ title, tasks, tone }: { title: string; tasks: Task[]; tone: "rose" | "amber" | "zinc" }) {
  const color = tone === "rose" ? "border-rose-200 bg-rose-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white";
  return (
    <Card className={`rounded-md shadow-none ${color}`}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-md border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{task.title}</p>
              <Badge variant="outline" className="rounded-md">{task.priority}</Badge>
            </div>
            <p className="mt-2 text-sm text-zinc-600">{task.description}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>{task.relatedName}</span>
              <StatusBadge value={task.status} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SettingsView() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="rounded-md border-zinc-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Team users</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {users.map((user) => (
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
