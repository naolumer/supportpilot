export type InboxTicket = {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  subject: string;
  preview: string;
  time: string;
  status: "Open" | "Pending" | "Resolved";
  priority: "Urgent" | "High" | "Normal" | "Low";
  category?: string | null;
  sentiment?: string | null;
  channel: "Email" | "Chat" | "Web";
  assignee: string;
  messages: { author: string; role: string; time: string; body: string; internal?: boolean }[];
};
export const initialTickets: InboxTicket[] = [
  { id: "SP-2048", name: "Maya Chen", email: "maya.chen@email.com", initials: "MC", color: "lilac", subject: "Charged twice for my subscription", preview: "I noticed two charges on my card this morning...", time: "8 min", status: "Open", priority: "Urgent", channel: "Email", assignee: "Unassigned", messages: [{ author: "Maya Chen", role: "Customer", time: "Today, 10:42 AM", body: "Hi there — I noticed two charges for my monthly plan on my card this morning. I only meant to subscribe once. Could you check what happened and help me get one of them refunded?" }, { author: "Maya Chen", role: "Customer", time: "Today, 10:44 AM", body: "The two charges are both for $24.00. I can send a screenshot if that helps." }] },
  { id: "SP-2047", name: "Jordan Lee", email: "jordan.lee@email.com", initials: "JL", color: "peach", subject: "Can’t connect my calendar", preview: "The Google Calendar integration keeps disconnecting...", time: "23 min", status: "Open", priority: "High", channel: "Chat", assignee: "Ava Patel", messages: [{ author: "Jordan Lee", role: "Customer", time: "Today, 10:27 AM", body: "The Google Calendar integration keeps disconnecting every few hours. I have already tried reconnecting it, but it still drops. Is there a known issue?" }] },
  { id: "SP-2046", name: "Sofia Ramirez", email: "sofia.r@email.com", initials: "SR", color: "mint", subject: "Where can I download my invoices?", preview: "I need copies of the last three months for accounting...", time: "41 min", status: "Open", priority: "Normal", channel: "Email", assignee: "Noah Kim", messages: [{ author: "Sofia Ramirez", role: "Customer", time: "Today, 10:09 AM", body: "Hi! I need copies of my invoices from the last three months for accounting. I looked under settings but couldn't find them. Where should I go?" }] },
  { id: "SP-2045", name: "Ethan Brooks", email: "ethan.b@email.com", initials: "EB", color: "blue", subject: "Feature request: custom fields", preview: "It would be great if we could add our own fields...", time: "1 hr", status: "Pending", priority: "Low", channel: "Web", assignee: "Ava Patel", messages: [{ author: "Ethan Brooks", role: "Customer", time: "Today, 9:34 AM", body: "It would be great if teams could add custom fields to a workspace. We track a couple of details that don't fit the current setup. Is that something you're considering?" }] },
  { id: "SP-2044", name: "Amara Okafor", email: "amara.o@email.com", initials: "AO", color: "yellow", subject: "Password reset link expired", preview: "I tried the reset link but it says it has expired...", time: "2 hr", status: "Open", priority: "High", channel: "Email", assignee: "Unassigned", messages: [{ author: "Amara Okafor", role: "Customer", time: "Today, 8:56 AM", body: "I tried to reset my password, but the link says it has expired. Could you send me a new one?" }] },
  { id: "SP-2043", name: "Oliver Smith", email: "oliver.s@email.com", initials: "OS", color: "rose", subject: "Team member invite not received", preview: "I invited a teammate yesterday, but they never got...", time: "3 hr", status: "Pending", priority: "Normal", channel: "Chat", assignee: "Noah Kim", messages: [{ author: "Oliver Smith", role: "Customer", time: "Today, 7:51 AM", body: "I invited a teammate yesterday, but they never got the email. I checked the address and it looks right. Can you help?" }] },
  { id: "SP-2042", name: "Priya Nair", email: "priya.n@email.com", initials: "PN", color: "mint", subject: "How do I export a report?", preview: "Looking for a CSV export of our monthly activity...", time: "Yesterday", status: "Resolved", priority: "Normal", channel: "Email", assignee: "You", messages: [{ author: "Priya Nair", role: "Customer", time: "Yesterday, 4:18 PM", body: "I'm looking for a CSV export of our monthly activity report. Is there a way to download one?" }, { author: "You", role: "Agent", time: "Yesterday, 4:32 PM", body: "You can export a report from Analytics. Open the date range you need, then use the Download CSV button in the top right." }] },
];
