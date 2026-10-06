/**
 * Inbox auto clean-up (template)
 *
 * HOW TO USE
 *   1. script.google.com > New project > paste this file > save.
 *   2. Services > + > Gmail API > Add.
 *   3. Edit the lists below (protected labels, marketing senders, bank senders).
 *   4. Run preview() and approve access. It only counts; it changes nothing.
 *   5. Run cleanInbox(), then setup() for the nightly run.
 *
 * Runs every night and moves expired automated mail to Trash.
 * Gmail empties Trash by itself 30 days later, so anything removed
 * here can still be rescued for a month.
 *
 * Functions you can run from the editor:
 *   preview()    - only counts what each rule would remove; changes nothing
 *   cleanInbox() - applies the rules now
 *   setup()      - installs the nightly run (2 am in TIMEZONE below)
 *   uninstall()  - removes the nightly run
 *
 * Needs the "Gmail API" advanced service (Services > + > Gmail API).
 */

// Set to true to make cleanInbox() count only, without moving anything.
const DRY_RUN = false;

// Your time zone, for the nightly run. See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
const TIMEZONE = 'Asia/Kolkata';

// To change a shelf life, edit the older_than value in rules_() below:
// 1d = one day, 7d = a week, 30d = a month, 1y = a year.

// Threads carrying any of these labels are never touched.
const PROTECTED_LABELS = [
  // Use your own label names, exactly as Gmail shows them.
  // A nested label is written with a slash, for example 'Finance/Tax'.
  'Tax',
  'Insurance',
  'Home Loan',
  'Family',
];

// Senders treated as promotions even when Gmail files them under Updates.
const MARKETING_SENDERS = [
  // Add the senders that flood your inbox: a full address or just the domain.
  'offers@example-travel.com',
  'newsletter.example-shop.com',
  '"Example Daily Digest"',
];

// Bank and trading transaction alerts (kept for one year).
const BANK_ALERT_SENDERS = [
  // The addresses or domains your bank and broker send alerts from.
  'alerts.example-bank.com',
  'example-broker.com',
];
const BANK_ALERT_LABELS = [];   // optional: labels that hold bank alerts, e.g. ['Banking/Alerts']

// Subject-based rules skip mail sent from personal mailboxes.
const PERSONAL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.co.in', 'hotmail.com',
  'outlook.com', 'rediffmail.com', 'icloud.com',
];

const CODE_SUBJECTS = [
  'OTP', '"verification code"', '"verify your"', '"security alert"',
  '"new device"', '"new sign-in"', '"password reset"', '"reset your password"',
  '"password assistance"', '"one time password"', '"login alert"', '"sign-in"',
  '"confirm your email"', '"email verification"', '"security code"',
  '"password has been"', '"password change"',
];

const SHIPPING_SUBJECTS = [
  '"has been delivered"', '"was delivered"', '"is delivered"', '"have delivered"',
  '"has been shipped"', '"out for delivery"', '"has been packed"',
  '"has been picked"', '"has been dispatched"', '"order shipped"',
  '"order delivered"', '"is arriving"', '"on the way"', '"order tracking"',
  '"your package"', '"your shipment"', '"Delivered: Your"', '"Shipped: Your"',
];

// Applied to every rule: starred mail, attachments and your own mail are kept.
const KEEP = '-is:starred -has:attachment -in:sent -in:drafts -in:chats -from:me';
const NOT_PERSONAL = '-from:(' + PERSONAL_DOMAINS.join(' OR ') + ')';

function rules_() {
  const rules = [
    {
      name: 'Promotions (1 day)',
      parts: [{ q: '(category:promotions OR from:(' + MARKETING_SENDERS.join(' OR ') + ')) older_than:1d' }],
    },
    {
      name: 'Codes and login alerts (7 days)',
      parts: [{ q: 'subject:(' + CODE_SUBJECTS.join(' OR ') + ') older_than:7d ' + NOT_PERSONAL }],
    },
    {
      name: 'Shipping updates (30 days)',
      parts: [{ q: '(from:shiprocket.in OR subject:(' + SHIPPING_SUBJECTS.join(' OR ') + ')) older_than:30d ' + NOT_PERSONAL }],
    },
    {
      name: 'Social and forums (30 days)',
      parts: [{ q: '(category:social OR category:forums) older_than:30d ' + NOT_PERSONAL }],
    },
    {
      name: 'Bank transaction alerts (1 year)',
      parts: [{ q: 'from:(' + BANK_ALERT_SENDERS.join(' OR ') + ') older_than:1y' }]
        .concat(BANK_ALERT_LABELS.map(function (l) { return { q: 'older_than:1y', label: l }; })),
    },
    {
      name: 'Other notifications (2 years)',
      parts: [{ q: 'category:updates older_than:2y' }],
    },
  ];
  return rules;
}

function preview() { return run_(true, true); }

function cleanInbox() { return run_(DRY_RUN, false); }

function setup() {
  uninstall();
  ScriptApp.newTrigger('cleanInbox')
    .timeBased().everyDays(1).atHour(2).inTimezone(TIMEZONE).create();
  console.log('Nightly clean-up installed (about 2 am, ' + TIMEZONE + ').');
}

function uninstall() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'cleanInbox') ScriptApp.deleteTrigger(t);
  });
}

function run_(dry, withSamples) {
  const labelMap = labelMap_();
  const keepThreads = protectedThreads_(labelMap);
  const seen = new Set();
  const lines = [];
  let total = 0;

  rules_().forEach(function (rule) {
    const ids = [];
    rule.parts.forEach(function (p) {
      let labelIds = null;
      if (p.label) {
        if (!labelMap[p.label]) return;          // label does not exist: skip
        labelIds = [labelMap[p.label]];
      }
      listMessages_(p.q + ' ' + KEEP, labelIds).forEach(function (m) {
        if (keepThreads.has(m.threadId) || seen.has(m.id)) return;
        seen.add(m.id);
        ids.push(m.id);
      });
    });

    if (!dry) {
      for (let i = 0; i < ids.length; i += 1000) {
        Gmail.Users.Messages.batchModify(
          { ids: ids.slice(i, i + 1000), addLabelIds: ['TRASH'], removeLabelIds: ['INBOX'] }, 'me');
      }
    }

    total += ids.length;
    let line = rule.name + ': ' + ids.length;
    if (withSamples && ids.length) {
      const picks = [ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1]];
      line += '\n' + picks.map(function (id) { return '    e.g. ' + describe_(id); }).join('\n');
    }
    lines.push(line);
  });

  const summary = (dry ? 'PREVIEW (nothing changed)' : 'MOVED TO TRASH') +
    ' - total ' + total + ' messages; ' + keepThreads.size + ' protected conversations skipped over\n' +
    lines.join('\n');
  console.log(summary);
  return summary;
}

function labelMap_() {
  const map = {};
  (Gmail.Users.Labels.list('me').labels || []).forEach(function (l) { map[l.name] = l.id; });
  return map;
}

// Conversations you replied to, starred, or filed under a protected label.
function protectedThreads_(labelMap) {
  const set = new Set();
  const add = function (params) {
    let token = null;
    do {
      if (token) params.pageToken = token;
      const res = Gmail.Users.Threads.list('me', params);
      (res.threads || []).forEach(function (t) { set.add(t.id); });
      token = res.nextPageToken;
    } while (token);
  };
  add({ q: 'in:sent', maxResults: 500 });
  add({ q: 'is:starred', maxResults: 500 });
  PROTECTED_LABELS.forEach(function (name) {
    if (labelMap[name]) add({ labelIds: [labelMap[name]], maxResults: 500 });
  });
  return set;
}

function listMessages_(q, labelIds) {
  const out = [];
  let token = null;
  do {
    const params = { q: q, maxResults: 500 };
    if (labelIds) params.labelIds = labelIds;
    if (token) params.pageToken = token;
    const res = Gmail.Users.Messages.list('me', params);
    (res.messages || []).forEach(function (m) { out.push(m); });
    token = res.nextPageToken;
  } while (token);
  return out;
}

function describe_(id) {
  const m = Gmail.Users.Messages.get('me', id, { format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
  const h = {};
  (m.payload.headers || []).forEach(function (x) { h[x.name] = x.value; });
  const from = (h.From || '').replace(/<.*>/, '').replace(/"/g, '').trim();
  return (h.Date || '').slice(5, 16) + ' | ' + from.slice(0, 28) + ' | ' + (h.Subject || '').slice(0, 50);
}
