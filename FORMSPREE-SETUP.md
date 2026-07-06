# Formspree Webhook Setup

1. Deploy the app and copy the production URL.
2. In Formspree, open the form that receives your ad leads.
3. Add a webhook integration that sends JSON to:

```text
https://your-domain.com/api/webhooks/formspree
```

4. Set authentication to `Bearer token` and paste the same value as `FORMSPREE_WEBHOOK_SECRET`.

The CRM also accepts this custom header if your webhook tool supports headers:

```text
x-webhook-secret: the same value as FORMSPREE_WEBHOOK_SECRET
```

5. Make sure your form sends at least `email` or `phone`. The CRM accepts common field names:

```json
{
  "name": "Lead name",
  "email": "lead@example.com",
  "phone": "+27 82 000 0000",
  "company": "Company",
  "service": "AI Sales Automation",
  "budget": "25000",
  "message": "What they need help with"
}
```

Duplicate leads are matched by email or phone. When a duplicate arrives, the existing lead is updated and an activity entry is added.
