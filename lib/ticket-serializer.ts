import type { InboxTicket } from "@/lib/demo-data";

const statusLabel: Record<string, InboxTicket["status"]> = { OPEN: "Open", PENDING: "Pending", RESOLVED: "Resolved" };
const priorityLabel: Record<string, InboxTicket["priority"]> = { URGENT: "Urgent", HIGH: "High", NORMAL: "Normal", LOW: "Low" };
const roleLabel: Record<string, string> = { CUSTOMER: "Customer", AGENT: "Agent", INTERNAL: "Internal note" };

type TicketRecord = {
  reference: string;
  subject: string;
  preview: string;
  status: string;
  priority: string;
  category: string | null;
  sentiment: string | null;
  channel: string;
  createdAt: Date;
  updatedAt: Date;
  customer: { name: string; email: string };
  assignee: { name: string } | null;
  messages: { senderName: string; role: string; body: string; createdAt: Date }[];
};

function relativeTime(date: Date) {
  const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  if (hours < 48) return "Yesterday";
  return `${Math.floor(hours / 24)} days`;
}

function messageTime(date: Date) {
  const day = new Intl.DateTimeFormat("en", { weekday: "long" }).format(date);
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return `${sameDay ? "Today" : day}, ${time}`;
}

export function toInboxTicket(ticket: TicketRecord): InboxTicket {
  const name = ticket.customer.name;
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const colorNames = ["lilac", "peach", "mint", "blue", "yellow", "rose"];
  const color = colorNames[(Number(ticket.reference.replace(/\D/g, "")) || 0) % colorNames.length];
  return {
    id: ticket.reference,
    name,
    email: ticket.customer.email,
    initials,
    color,
    subject: ticket.subject,
    preview: ticket.preview,
    time: relativeTime(ticket.updatedAt),
    status: statusLabel[ticket.status],
    priority: priorityLabel[ticket.priority],
    category: ticket.category,
    sentiment: ticket.sentiment,
    channel: ticket.channel === "EMAIL" ? "Email" : ticket.channel === "CHAT" ? "Chat" : "Web",
    assignee: ticket.assignee?.name === "Naol Umer" ? "You" : ticket.assignee?.name ?? "Unassigned",
    messages: ticket.messages.map((message) => ({
      author: message.senderName,
      role: roleLabel[message.role] ?? message.role,
      time: messageTime(message.createdAt),
      body: message.body,
      internal: message.role === "INTERNAL",
    })),
  };
}
