# Gmail Self-Cleaning Inbox

A small Google Apps Script that gives every kind of email a shelf life and moves expired mail to Trash every night. It runs inside your own Google account. It is free and there is nothing to install.

Gmail filters only act at the moment a message arrives, so they cannot say "delete this after 30 days". This script can.

Video walkthrough: [paste your YouTube link here]

## What it does

Each night the script checks your mail against a set of rules and moves anything past its shelf life to Trash. Gmail then empties Trash by itself after 30 days, so you have a month to rescue anything.

| Kind of mail | Default shelf life |
| --- | --- |
| Promotions, plus marketing senders you list | 1 day |
| Codes and login alerts (OTPs, password resets, new-device notices) | 7 days |
| Shipping updates (packed, shipped, delivered) | 30 days |
| Social and forums | 30 days |
| Bank and trading alerts from senders you list | 1 year |
| Everything else in the Updates category | 2 years |

The rules apply to all your mail, including archived mail, not only the inbox.

## What it never touches

- Starred messages
- Messages with attachments
- Any conversation you have replied to
- Any conversation under a label you list as protected
- Sent mail, drafts and chats

The code and shipping rules match on the subject line, so they also skip mail sent from personal addresses such as gmail.com and yahoo.com.

## Setup

1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Delete the sample code, paste in the contents of `inbox-cleanup-template.gs`, and save.
3. In the left sidebar click **Services**, then **+**, choose **Gmail API**, and click **Add**.
4. Edit the lists at the top of the file (see Configuration below).
5. Choose `preview` in the function dropdown and click **Run**. Approve access when asked. Google shows an "unverified app" warning because this is your own private script; choose **Advanced** and continue.
6. Open the execution log. `preview` only counts what each rule would remove and shows a few examples. It changes nothing.
7. When the numbers look right, run `cleanInbox` to apply the rules once.
8. Run `setup` to install the nightly run.

## Configuration

Everything you need to change is at the top of the file.

| Setting | What to put there |
| --- | --- |
| `TIMEZONE` | Your time zone, for example `Asia/Kolkata` or `Europe/London`. The nightly run happens at about 2 am in this zone. |
| `PROTECTED_LABELS` | Label names exactly as Gmail shows them. Write a nested label with a slash, for example `Finance/Tax`. |
| `MARKETING_SENDERS` | Addresses or domains that flood your inbox. Gmail files a lot of marketing under Updates, so list those senders here. |
| `BANK_ALERT_SENDERS` | The addresses or domains your bank and broker send alerts from. |
| `BANK_ALERT_LABELS` | Optional. Labels that hold bank alerts. |
| `DRY_RUN` | Set to `true` to make `cleanInbox` count only, without moving anything. |

To change a shelf life, edit the `older_than` value for that rule inside `rules_()`. Use `1d` for a day, `7d` for a week, `30d` for a month and `1y` for a year.

## Functions

| Function | What it does |
| --- | --- |
| `preview()` | Counts what each rule would remove and logs examples. Changes nothing. |
| `cleanInbox()` | Applies the rules now. |
| `setup()` | Installs the nightly run. |
| `uninstall()` | Removes the nightly run. |

## Good to know

- **Run `preview` after every change.** A typo in a sender or label name can widen or narrow a rule.
- **Renaming a protected label removes its protection** until you update `PROTECTED_LABELS` to match.
- **A very large mailbox may hit the Apps Script time limit** on the first run. Run `cleanInbox` again and it carries on with what is left.
- **This tidies your mailbox more than it frees storage.** Text emails are small. To free space, search Gmail for `larger:10M` and clear big attachments.

## Stopping it

Run `uninstall` in the script editor to remove the nightly run. To remove the script's access completely, go to your Google Account, open **Security**, and remove it under third-party access.

## Disclaimer

This script moves mail to Trash, and Gmail deletes mail in Trash after 30 days. Read the rules, set your protected labels, and run `preview` before you run anything else. You use it at your own risk.
