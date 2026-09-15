// /* ============================================================
//    FOUNDLY — EmailJS configuration
//    ------------------------------------------------------------
//    EmailJS runs entirely client-side — no server or secret key
//    needed, which fits this project's "no backend infra" setup.

//    Five templates are used now (see README.md "Email setup" for
//    the exact variables each one needs):

//    1. EMAILJS_LOST_REPORT_TEMPLATE_ID  — sent the moment someone
//       reports a lost item. Include {{edit_link}} in this template
//       so the reporter has their private edit/resolve/delete link.
//    2. EMAILJS_TEMPLATE_ID              — sent to the report owner
//       when their item is marked Resolved.
//    3. EMAILJS_IDENTIFY_TEMPLATE_ID     — sent by an admin, inviting
//       the reporter to come to the office to identify their item.
//    4. EMAILJS_FINDER_TEMPLATE_ID       — sent to whoever found the
//       item (if their contact was recorded) once the handover is
//       confirmed and the report is resolved.

//    The first two already have real values filled in below (carried
//    over from the previous version of this project). The two new
//    ones are placeholders — create them in your EmailJS dashboard
//    and paste the template IDs in.

//    Setup (free):
//    1. Create an account at https://www.emailjs.com
//    2. Add an Email Service (e.g. connect your Gmail) — copy its Service ID
//    3. Create each Email Template listed above — copy each Template ID
//    4. Account > General > copy your Public Key
//    5. Paste all values below
//    ============================================================ */

// export const EMAILJS_SERVICE_ID = "service_fdwnpcs";
// export const EMAILJS_PUBLIC_KEY = "GGsoD7lxOOzLXdB5c";

// // Sent right after a lost report is created — include {{edit_link}}.
// export const EMAILJS_LOST_REPORT_TEMPLATE_ID = "template_t7f8jnf";

// // Sent to the report owner when an admin marks their report Resolved.
// export const EMAILJS_TEMPLATE_ID = "template_1bdw16b";

// // NEW — sent by an admin: "please come identify your item".
// export const EMAILJS_IDENTIFY_TEMPLATE_ID = "YOUR_IDENTIFY_TEMPLATE_ID";

// // NEW — sent to the finder (if we have their contact) once the
// // handover is confirmed and the report is resolved.
// export const EMAILJS_FINDER_TEMPLATE_ID = "YOUR_FINDER_TEMPLATE_ID";



/* ============================================================
   FOUNDLY — EmailJS configuration
   ------------------------------------------------------------
   EmailJS's free plan caps out at 2 templates, and this project
   needs 4 different emails. The fix: keep the two real EmailJS
   template slots, but make the SECOND one generic and reusable
   instead of creating 2 more dedicated ones. No domain, server,
   or third-party email provider (e.g. Resend) required — EmailJS
   just sends through an email account you already own (Gmail,
   Outlook, etc.), the same as before.

   1. EMAILJS_LOST_REPORT_TEMPLATE_ID — DEDICATED, unchanged.
      Sent the moment someone reports a lost item.
      Variables: {{to_email}} {{item_title}} {{item_type}}
                 {{item_category}} {{item_location}} {{edit_link}}

   2. EMAILJS_TEMPLATE_ID — GENERIC, reused for THREE emails:
        - resolution notice (a report was marked Resolved)
        - "come identify your item" invite
        - finder thank-you
      Variables: {{to_email}} {{subject}} {{heading}} {{message}}
      js/foundly-data.js builds a different subject/heading/message
      for each of the three cases and sends them all through this
      one template — that's what makes it "generic."

   ── One-time setup step for template #2 ──
   If your EmailJS template #2 currently expects the old fields
   (item_title, item_type, item_category, item_location), open it in
   the EmailJS dashboard (Email Templates → your template → Content)
   and replace its body with something like:

     Subject field:  {{subject}}
     "To Email" field: {{to_email}}   (should already be set this way)
     Content (HTML):
       <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;
                    margin:0 auto;padding:24px;color:#1a1a2e">
         <h2 style="color:#0007ff;margin-bottom:12px">{{heading}}</h2>
         <div style="white-space:pre-line;line-height:1.6;font-size:15px">
           {{message}}
         </div>
         <p style="margin-top:32px;color:#6c757d;font-size:13px">
           — The Foundly Team
         </p>
       </div>

   That's it — one template, three different messages, zero new
   infrastructure. (`white-space:pre-line` is what makes the blank
   lines in {{message}} show up as actual paragraph breaks.)

   Setup (free):
   1. Create an account at https://www.emailjs.com
   2. Add an Email Service (e.g. connect your Gmail) — copy its Service ID
   3. Create/edit the two Email Templates described above — copy each Template ID
   4. Account > General > copy your Public Key
   5. Paste all values below
   ============================================================ */

export const EMAILJS_SERVICE_ID = "service_fdwnpcs";
export const EMAILJS_PUBLIC_KEY = "GGsoD7lxOOzLXdB5c";

// Dedicated — sent right after a lost report is created — include {{edit_link}}.
export const EMAILJS_LOST_REPORT_TEMPLATE_ID = "template_t7f8jnf";

// Generic — reused for resolution notices, identify invites, and finder thank-yous.
export const EMAILJS_TEMPLATE_ID = "template_1bdw16b";