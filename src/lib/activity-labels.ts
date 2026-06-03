const ACTION_LABELS: Record<string, string> = {
  sale: "Sale",
  optin: "Opt-in",
  call: "Call booked",
  membership: "Membership",
  triage: "Triage",
  lead: "New lead",
};

export function activityActionLabel(actionType: string): string {
  return ACTION_LABELS[actionType] ?? actionType;
}
