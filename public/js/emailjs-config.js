/* ============================================================
   FOUNDLY — EmailJS configuration
   ------------------------------------------------------------
   EmailJS runs entirely client-side — no server or secret key
   needed, which fits this project's "no backend infra" setup.

   Five templates are used now (see README.md "Email setup" for
   the exact variables each one needs):

   1. EMAILJS_LOST_REPORT_TEMPLATE_ID  — sent the moment someone
      reports a lost item. Include {{edit_link}} in this template
      so the reporter has their private edit/resolve/delete link.
   2. EMAILJS_TEMPLATE_ID              — sent to the report owner
      when their item is marked Resolved.
   3. EMAILJS_IDENTIFY_TEMPLATE_ID     — sent by an admin, inviting
      the reporter to come to the office to identify their item.
   4. EMAILJS_FINDER_TEMPLATE_ID       — sent to whoever found the
      item (if their contact was recorded) once the handover is
      confirmed and the report is resolved.

   The first two already have real values filled in below (carried
   over from the previous version of this project). The two new
   ones are placeholders — create them in your EmailJS dashboard
   and paste the template IDs in.

   Setup (free):
   1. Create an account at https://www.emailjs.com
   2. Add an Email Service (e.g. connect your Gmail) — copy its Service ID
   3. Create each Email Template listed above — copy each Template ID
   4. Account > General > copy your Public Key
   5. Paste all values below
   ============================================================ */

export const EMAILJS_SERVICE_ID = "service_fdwnpcs";
export const EMAILJS_PUBLIC_KEY = "GGsoD7lxOOzLXdB5c";

// Sent right after a lost report is created — include {{edit_link}}.
export const EMAILJS_LOST_REPORT_TEMPLATE_ID = "template_t7f8jnf";

// Sent to the report owner when an admin marks their report Resolved.
export const EMAILJS_TEMPLATE_ID = "template_1bdw16b";

// NEW — sent by an admin: "please come identify your item".
export const EMAILJS_IDENTIFY_TEMPLATE_ID = "YOUR_IDENTIFY_TEMPLATE_ID";

// NEW — sent to the finder (if we have their contact) once the
// handover is confirmed and the report is resolved.
export const EMAILJS_FINDER_TEMPLATE_ID = "YOUR_FINDER_TEMPLATE_ID";
