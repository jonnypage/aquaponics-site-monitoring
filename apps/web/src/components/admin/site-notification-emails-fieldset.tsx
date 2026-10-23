import { Mail, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormSectionHeading } from '~/components/layout/form-section-heading';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SITE_NOTIFICATION_EMAILS = 20;

export function SiteNotificationEmailsFieldset({
  emails,
  onChange,
  suggestions = [],
}: {
  emails: string[];
  onChange: (emails: string[]) => void;
  suggestions?: string[];
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const unusedSuggestions = suggestions.filter(
    (email) => !emails.includes(email),
  );

  function addEmail(raw: string) {
    const email = raw.toLowerCase().trim();
    setError(null);
    if (!email) {
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError(t('admin.sites.notificationEmailsInvalid'));
      return;
    }
    if (emails.includes(email)) {
      setDraft('');
      return;
    }
    if (emails.length >= MAX_SITE_NOTIFICATION_EMAILS) {
      setError(
        t('admin.sites.notificationEmailsMax', {
          max: MAX_SITE_NOTIFICATION_EMAILS,
        }),
      );
      return;
    }
    onChange([...emails, email].sort());
    setDraft('');
  }

  function removeEmail(email: string) {
    setError(null);
    onChange(emails.filter((item) => item !== email));
  }

  return (
    <div className='space-y-3'>
      <FormSectionHeading id='site-notification-emails-heading' icon={Mail}>
        {t('admin.sites.notificationEmails')}
      </FormSectionHeading>
      <p className='text-sm text-muted-foreground'>
        {t('admin.sites.notificationEmailsHint')}
      </p>
      {emails.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          {t('admin.sites.notificationEmailsEmpty')}
        </p>
      ) : (
        <ul className='flex flex-wrap gap-2'>
          {emails.map((email) => (
            <li key={email}>
              <Badge variant='secondary' className='gap-1 pr-1'>
                <span>{email}</span>
                <button
                  type='button'
                  className='rounded-full p-0.5 hover:bg-muted'
                  onClick={() => removeEmail(email)}
                  aria-label={t('admin.sites.notificationEmailsRemove', {
                    email,
                  })}
                >
                  <X className='h-3 w-3' aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
        <div className='min-w-0 flex-1 space-y-2'>
          <Label htmlFor='notification-email'>
            {t('admin.sites.notificationEmailsAdd')}
          </Label>
          <Input
            id='notification-email'
            type='email'
            autoComplete='off'
            list='notification-email-suggestions'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addEmail(draft);
              }
            }}
          />
          {unusedSuggestions.length > 0 ? (
            <datalist id='notification-email-suggestions'>
              {unusedSuggestions.map((email) => (
                <option key={email} value={email} />
              ))}
            </datalist>
          ) : null}
        </div>
        <Button type='button' variant='outline' onClick={() => addEmail(draft)}>
          {t('admin.sites.notificationEmailsAdd')}
        </Button>
      </div>
      {error ? <p className='text-sm text-destructive'>{error}</p> : null}
    </div>
  );
}
