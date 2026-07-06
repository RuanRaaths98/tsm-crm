export type Role = "Admin" | "Team Member";
export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal Sent"
  | "Won"
  | "Lost";
export type LeadTemperature = "Cold" | "Warm" | "Hot";
export type ClientStatus = "Active" | "Paused" | "Cancelled";
export type TaskStatus = "To Do" | "In Progress" | "Done";
export type Priority = "Low" | "Medium" | "High";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
};

export type Activity = {
  id: string;
  entityId: string;
  entityType: "lead" | "client";
  type: string;
  message: string;
  actor: string;
  createdAt: string;
};

export type Note = {
  id: string;
  entityId: string;
  entityType: "lead" | "client";
  author: string;
  content: string;
  createdAt: string;
};

export type Lead = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  source: string;
  serviceInterested: string;
  budget: number;
  message: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  assignedTo: string;
  nextFollowUpDate: string;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  clientName: string;
  contactPerson: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  services: string[];
  monthlyRetainerValue: number;
  startDate: string;
  status: ClientStatus;
  notes: string;
  originalLeadId?: string;
  assignedTo: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  assignedUser: string;
  relatedType: "lead" | "client";
  relatedId: string;
  relatedName: string;
};

export const users: UserProfile[] = [
  {
    id: "usr-01",
    name: "Mara Venter",
    email: "mara@tsmcrm.co",
    role: "Admin",
    avatar: "MV",
  },
  {
    id: "usr-02",
    name: "Theo Mokoena",
    email: "theo@tsmcrm.co",
    role: "Team Member",
    avatar: "TM",
  },
  {
    id: "usr-03",
    name: "Lina Brooks",
    email: "lina@tsmcrm.co",
    role: "Team Member",
    avatar: "LB",
  },
];

export const leadSources = [
  "Formspree",
  "Google Ads",
  "LinkedIn",
  "Referral",
  "Website",
  "Cold Email",
];

export const services = [
  "Paid Media Management",
  "AI Sales Automation",
  "CRM Implementation",
  "Landing Page Build",
  "Email Nurture System",
  "Analytics Dashboard",
];

export const pipelineStatuses: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Won",
  "Lost",
];

export const leads: Lead[] = [
  {
    id: "lead-1048",
    fullName: "Amelia Brandt",
    email: "amelia@sereniteclinic.com",
    phone: "+27 82 614 9038",
    companyName: "Serenite Skin Clinic",
    source: "Formspree",
    serviceInterested: "Google Ads",
    budget: 18500,
    message: "Needs a patient booking funnel and lead tracking before their winter campaign.",
    status: "New",
    temperature: "Hot",
    assignedTo: "Mara Venter",
    nextFollowUpDate: "2026-06-30",
    internalNotes: "Asked for a fast proposal and WhatsApp follow-up.",
    createdAt: "2026-06-30T08:24:00+02:00",
    updatedAt: "2026-06-30T09:10:00+02:00",
  },
  {
    id: "lead-1042",
    fullName: "Sipho Dlamini",
    email: "sipho@kimbangologistics.co.za",
    phone: "+27 71 205 4481",
    companyName: "Kimbango Logistics",
    source: "LinkedIn",
    serviceInterested: "AI Sales Automation",
    budget: 42000,
    message: "Wants inbound lead routing, quote reminders, and a reporting dashboard.",
    status: "Qualified",
    temperature: "Hot",
    assignedTo: "Theo Mokoena",
    nextFollowUpDate: "2026-07-01",
    internalNotes: "Decision maker. Has HubSpot but team does not use it consistently.",
    createdAt: "2026-06-27T14:12:00+02:00",
    updatedAt: "2026-06-29T16:40:00+02:00",
  },
  {
    id: "lead-1035",
    fullName: "Noor Jacobs",
    email: "noor@velvetforge.studio",
    phone: "+27 64 882 1190",
    companyName: "Velvet Forge Studio",
    source: "Referral",
    serviceInterested: "Landing Page Build",
    budget: 26000,
    message: "Boutique interior studio launching a B2B design package.",
    status: "Proposal Sent",
    temperature: "Warm",
    assignedTo: "Lina Brooks",
    nextFollowUpDate: "2026-06-29",
    internalNotes: "Proposal sent. Needs case study proof before signing.",
    createdAt: "2026-06-21T10:40:00+02:00",
    updatedAt: "2026-06-28T11:02:00+02:00",
  },
  {
    id: "lead-1019",
    fullName: "Ethan Kruger",
    email: "ethan@fieldstonegear.com",
    phone: "+27 79 330 6642",
    companyName: "Fieldstone Gear",
    source: "Google Ads",
    serviceInterested: "Paid Media Management",
    budget: 32000,
    message: "Ecommerce account wants ROAS recovery and cleaner remarketing.",
    status: "Contacted",
    temperature: "Warm",
    assignedTo: "Mara Venter",
    nextFollowUpDate: "2026-07-02",
    internalNotes: "Send audit Loom after access is granted.",
    createdAt: "2026-06-18T13:08:00+02:00",
    updatedAt: "2026-06-26T17:22:00+02:00",
  },
  {
    id: "lead-1007",
    fullName: "Priya Govender",
    email: "priya@marketdock.co",
    phone: "+27 73 908 5127",
    companyName: "MarketDock",
    source: "Website",
    serviceInterested: "Email Nurture System",
    budget: 14500,
    message: "Early stage SaaS. Needs lifecycle emails and trial conversion tracking.",
    status: "Lost",
    temperature: "Cold",
    assignedTo: "Theo Mokoena",
    nextFollowUpDate: "2026-07-12",
    internalNotes: "Budget delayed until Q4. Keep in nurture.",
    createdAt: "2026-06-10T15:42:00+02:00",
    updatedAt: "2026-06-24T12:30:00+02:00",
  },
  {
    id: "lead-0988",
    fullName: "Luca Mendes",
    email: "luca@atlasdentistry.co.za",
    phone: "+27 83 471 7822",
    companyName: "Atlas Dentistry",
    source: "Cold Email",
    serviceInterested: "CRM Implementation",
    budget: 38000,
    message: "Practice group needs lead intake, missed-call workflow, and admin reporting.",
    status: "Won",
    temperature: "Hot",
    assignedTo: "Lina Brooks",
    nextFollowUpDate: "2026-07-03",
    internalNotes: "Convert into onboarding client and create implementation tasks.",
    createdAt: "2026-06-06T09:18:00+02:00",
    updatedAt: "2026-06-25T15:05:00+02:00",
  },
];

export const clients: Client[] = [
  {
    id: "client-240",
    clientName: "Atlas Dentistry Growth",
    contactPerson: "Luca Mendes",
    email: "luca@atlasdentistry.co.za",
    phone: "+27 83 471 7822",
    company: "Atlas Dentistry",
    website: "https://atlasdentistry.co.za",
    services: ["CRM Implementation", "AI Sales Automation"],
    monthlyRetainerValue: 38500,
    startDate: "2026-06-26",
    status: "Active",
    notes: "Kickoff booked. Needs patient journey map and Supabase workspace setup.",
    originalLeadId: "lead-0988",
    assignedTo: "Lina Brooks",
  },
  {
    id: "client-217",
    clientName: "Orchard Finance Ads",
    contactPerson: "Mina Patel",
    email: "mina@orchardfinance.co",
    phone: "+27 66 902 3348",
    company: "Orchard Finance",
    website: "https://orchardfinance.co",
    services: ["Paid Media Management", "Analytics Dashboard"],
    monthlyRetainerValue: 52000,
    startDate: "2026-04-04",
    status: "Active",
    notes: "Weekly reporting every Thursday. CFO cares about lead quality by region.",
    assignedTo: "Mara Venter",
  },
  {
    id: "client-203",
    clientName: "Copper Finch Studio",
    contactPerson: "Jonas Richter",
    email: "jonas@copperfinch.studio",
    phone: "+27 81 730 9984",
    company: "Copper Finch Studio",
    website: "https://copperfinch.studio",
    services: ["Landing Page Build", "Email Nurture System"],
    monthlyRetainerValue: 22500,
    startDate: "2026-02-17",
    status: "Paused",
    notes: "Paused while brand refresh is completed. Review on July 15.",
    assignedTo: "Theo Mokoena",
  },
];

export const tasks: Task[] = [
  {
    id: "task-908",
    title: "Call Amelia and qualify launch date",
    description: "Confirm ad spend, preferred booking system, and approval process.",
    dueDate: "2026-06-30",
    priority: "High",
    status: "To Do",
    assignedUser: "Mara Venter",
    relatedType: "lead",
    relatedId: "lead-1048",
    relatedName: "Serenite Skin Clinic",
  },
  {
    id: "task-904",
    title: "Send proposal follow-up",
    description: "Share the aesthetics case study and clarify implementation timing.",
    dueDate: "2026-06-29",
    priority: "High",
    status: "In Progress",
    assignedUser: "Lina Brooks",
    relatedType: "lead",
    relatedId: "lead-1035",
    relatedName: "Velvet Forge Studio",
  },
  {
    id: "task-899",
    title: "Build Atlas onboarding checklist",
    description: "Create tasks for domains, CRM fields, call tracking, and automations.",
    dueDate: "2026-07-01",
    priority: "Medium",
    status: "To Do",
    assignedUser: "Lina Brooks",
    relatedType: "client",
    relatedId: "client-240",
    relatedName: "Atlas Dentistry Growth",
  },
  {
    id: "task-887",
    title: "Review Orchard regional spend",
    description: "Prepare a 90-day trend view before the weekly client meeting.",
    dueDate: "2026-07-03",
    priority: "Medium",
    status: "To Do",
    assignedUser: "Mara Venter",
    relatedType: "client",
    relatedId: "client-217",
    relatedName: "Orchard Finance Ads",
  },
];

export const notes: Note[] = [
  {
    id: "note-1",
    entityId: "lead-1048",
    entityType: "lead",
    author: "Mara Venter",
    content: "Lead asked whether WhatsApp follow-up can be automated after form submission.",
    createdAt: "2026-06-30T09:10:00+02:00",
  },
  {
    id: "note-2",
    entityId: "client-217",
    entityType: "client",
    author: "Theo Mokoena",
    content: "Client wants next report to split pipeline value by province and source.",
    createdAt: "2026-06-28T13:45:00+02:00",
  },
];

export const activities: Activity[] = [
  {
    id: "activity-01",
    entityId: "lead-1048",
    entityType: "lead",
    type: "Formspree submission received",
    message: "New submission created a hot Google Ads lead from Serenite Skin Clinic.",
    actor: "Formspree",
    createdAt: "2026-06-30T08:24:00+02:00",
  },
  {
    id: "activity-02",
    entityId: "lead-1035",
    entityType: "lead",
    type: "Follow-up date changed",
    message: "Next follow-up moved to June 29 after proposal review.",
    actor: "Lina Brooks",
    createdAt: "2026-06-28T11:02:00+02:00",
  },
  {
    id: "activity-03",
    entityId: "lead-0988",
    entityType: "lead",
    type: "Lead converted to client",
    message: "Atlas Dentistry was converted after CRM implementation approval.",
    actor: "Lina Brooks",
    createdAt: "2026-06-26T10:18:00+02:00",
  },
  {
    id: "activity-04",
    entityId: "client-217",
    entityType: "client",
    type: "Client updated",
    message: "Monthly retainer and regional reporting requirements confirmed.",
    actor: "Mara Venter",
    createdAt: "2026-06-27T14:20:00+02:00",
  },
];

export function currency(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}
