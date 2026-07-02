import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSettings, setSettings, type Settings as SettingsValues } from '@/lib/settings';
import { fullName, email as userEmail, monogram } from '@/lib/user';

/** iOS-style pill toggle. Sage track when on. */
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-[120ms] ${
        on ? 'bg-accent-success' : 'bg-rail'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-[120ms] ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between px-[14px] py-3">{children}</div>;
}

function GroupCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-[rgba(245,239,229,0.07)] overflow-hidden rounded-[12px] border border-hairline bg-surface">
      {children}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 px-[2px] text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
      {children}
    </div>
  );
}

export function Settings() {
  const { session, signOut } = useAuth();
  const [values, setValues] = useState<SettingsValues>(() => getSettings());

  function update(patch: Partial<SettingsValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
    setSettings(patch);
  }

  const name = fullName(session?.user);
  const email = userEmail(session?.user);
  const initial = monogram(session?.user);

  return (
    <div className="flex-1 px-[22px] pb-6 pt-8">
      <h1 className="text-[26px] font-bold tracking-[-0.01em] text-ink-primary">Settings</h1>

      {/* Profile */}
      <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-hairline bg-surface p-[14px]">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-hairline bg-chip-alt text-[16px] font-medium text-ink-card">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-ink-primary">{name}</div>
          {email && <div className="truncate text-[12px] text-ink-faint">{email}</div>}
        </div>
      </div>

      {/* Daily plan */}
      <GroupLabel>Daily plan</GroupLabel>
      <GroupCard>
        <Row>
          <span className="text-[14px] text-ink-secondary">Target tasks / day</span>
          <div className="flex items-center gap-3">
            <button
              aria-label="Decrease target"
              onClick={() => update({ targetPerDay: Math.max(1, values.targetPerDay - 1) })}
              className="text-[16px] text-ink-muted"
            >
              −
            </button>
            <span className="w-4 text-center text-[14px] font-medium text-accent-priority">
              {values.targetPerDay}
            </span>
            <button
              aria-label="Increase target"
              onClick={() => update({ targetPerDay: Math.min(20, values.targetPerDay + 1) })}
              className="text-[16px] text-ink-muted"
            >
              +
            </button>
          </div>
        </Row>
        <Row>
          <span className="text-[14px] text-ink-secondary">Carry overdue forward</span>
          <Toggle
            label="Carry overdue forward"
            on={values.carryOverdueForward}
            onChange={(v) => update({ carryOverdueForward: v })}
          />
        </Row>
        <Row>
          <span className="text-[14px] text-ink-secondary">Day starts</span>
          <input
            type="time"
            aria-label="Day starts"
            value={values.dayStart}
            onChange={(e) => update({ dayStart: e.target.value })}
            className="rounded-chip bg-chip px-2 py-1 text-[13px] text-ink-secondary outline-none"
          />
        </Row>
      </GroupCard>

      {/* Connections */}
      <GroupLabel>Connections</GroupLabel>
      <GroupCard>
        <Row>
          <span className="text-[14px] text-ink-secondary">Google Calendar</span>
          <span className="flex items-center gap-2 text-[13px] text-ink-fainter">
            Not connected
            <span className="rounded-full bg-chip px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-ink-faint">
              Coming soon
            </span>
          </span>
        </Row>
        <Row>
          <span className="text-[14px] text-ink-secondary">Due-soon reminders</span>
          <Toggle
            label="Due-soon reminders"
            on={values.dueSoonReminders}
            onChange={(v) => update({ dueSoonReminders: v })}
          />
        </Row>
        <Row>
          <span className="text-[14px] text-ink-secondary">Daily plan notification</span>
          {/* No scheduler exists yet (nothing fires at this time) — stubbed like
              Google Calendar until a background trigger lands. */}
          <span className="flex items-center gap-2 text-[13px] text-ink-fainter">
            {values.dailyPlanNotification}
            <span className="rounded-full bg-chip px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-ink-faint">
              Coming soon
            </span>
          </span>
        </Row>
      </GroupCard>

      <button
        onClick={() => void signOut()}
        className="mt-6 w-full rounded-full border border-[rgba(245,239,229,0.18)] py-3 text-[15px] font-medium text-ink-secondary transition-colors duration-[120ms] hover:text-ink-primary"
      >
        Sign out
      </button>

      <p className="mt-6 text-center text-[11px] text-ink-footer">© The h.wood Group 2025</p>
    </div>
  );
}
