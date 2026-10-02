/**
 * Service charge / SST / rounding toggles. Malaysia replaced GST with SST in 2018.
 * Restaurants usually add 10% service charge + 6% SST, but both rates are editable.
 */
export interface ChargesForm {
  service: boolean;
  servicePct: string;
  sst: boolean;
  sstPct: string;
  round5: boolean;
}

interface Props {
  value: ChargesForm;
  onChange: (value: ChargesForm) => void;
}

export function ChargesPicker({ value, onChange }: Props) {
  const set = (patch: Partial<ChargesForm>) => onChange({ ...value, ...patch });

  return (
    <fieldset>
      <legend>Extra charges</legend>
      <div className="charges">
        <label className="charge">
          <input type="checkbox" checked={value.service} onChange={(e) => set({ service: e.target.checked })} />
          <span>Service charge</span>
          <input
            className="pct"
            inputMode="decimal"
            value={value.servicePct}
            aria-label="Service charge percent"
            disabled={!value.service}
            onChange={(e) => set({ servicePct: e.target.value })}
          />
          %
        </label>
        <label className="charge">
          <input type="checkbox" checked={value.sst} onChange={(e) => set({ sst: e.target.checked })} />
          <span>SST</span>
          <input
            className="pct"
            inputMode="decimal"
            value={value.sstPct}
            aria-label="SST percent"
            disabled={!value.sst}
            onChange={(e) => set({ sstPct: e.target.value })}
          />
          %
        </label>
        <label className="charge">
          <input type="checkbox" checked={value.round5} onChange={(e) => set({ round5: e.target.checked })} />
          <span>Round to nearest 5 sen</span>
        </label>
      </div>
    </fieldset>
  );
}
