// Grievance process flow. Edit in the app (open index.html#edit), export, and replace this file.
window.FLOW_DATA = {
  "title": "Grievance Redressal Process Guide",
  "updated": "2026-11-20",
  "startId": "start",
  "nodes": {
    "start": {
      "id": "start",
      "type": "start",
      "title": "Case received",
      "details": { "action": "A grievance case has been assigned to you." },
      "next": [{ "label": "", "to": "read" }]
    },
    "read": {
      "id": "read",
      "type": "action",
      "title": "Read the grievance comments",
      "details": { "action": "Read the comments logged on the case to understand what the customer has raised." },
      "next": [{ "label": "", "to": "history" }]
    },
    "history": {
      "id": "history",
      "type": "action",
      "title": "Check related history of the case",
      "details": { "action": "Look at earlier cases and interactions related to this one." },
      "next": [{ "label": "", "to": "c360" }]
    },
    "c360": {
      "id": "c360",
      "type": "action",
      "title": "Check case details in Customer 360",
      "details": {
        "action": "Open the case in Customer 360 and review the details.",
        "system": "Customer 360"
      },
      "next": [{ "label": "", "to": "call" }]
    },
    "call": {
      "id": "call",
      "type": "action",
      "title": "Call the customer and record VOC",
      "details": {
        "action": "Call the customer, listen, and record their Voice of Customer (VOC).",
        "notes": "Compare what the customer says with the grievance details on the case."
      },
      "next": [{ "label": "", "to": "match" }]
    },
    "match": {
      "id": "match",
      "type": "decision",
      "title": "Does the VOC match the grievance details?",
      "choiceStyle": "buttons",
      "details": { "action": "Compare the customer's VOC with the grievance details on the case." },
      "next": [
        { "label": "Yes, it matches", "to": "reason" },
        { "label": "No, it does not match", "to": "nomatch" }
      ]
    },
    "nomatch": {
      "id": "nomatch",
      "type": "action",
      "title": "VOC does not match: process to be added",
      "placeholder": true,
      "details": { "action": "Add the steps to follow when the VOC does not match the grievance details." },
      "next": []
    },
    "reason": {
      "id": "reason",
      "type": "decision",
      "title": "Select the case reason",
      "choiceStyle": "dropdown",
      "details": { "action": "Pick the case reason from the dropdown. Each reason has its own resolution path." },
      "next": [
        { "label": "Reason A", "to": "ra" },
        { "label": "Reason B", "to": "rb" },
        { "label": "Reason C", "to": "rc" }
      ]
    },
    "ra": {
      "id": "ra",
      "type": "action",
      "title": "Resolution for Reason A",
      "placeholder": true,
      "details": { "action": "Add the resolution steps for this reason." },
      "next": [{ "label": "", "to": "done" }]
    },
    "rb": {
      "id": "rb",
      "type": "action",
      "title": "Resolution for Reason B",
      "placeholder": true,
      "details": { "action": "Add the resolution steps for this reason." },
      "next": [{ "label": "", "to": "done" }]
    },
    "rc": {
      "id": "rc",
      "type": "action",
      "title": "Resolution for Reason C",
      "placeholder": true,
      "details": { "action": "Add the resolution steps for this reason." },
      "next": [{ "label": "", "to": "done" }]
    },
    "done": {
      "id": "done",
      "type": "closure",
      "title": "Case closed",
      "details": { "action": "Update the case with the resolution and close it." },
      "next": []
    }
  }
};
