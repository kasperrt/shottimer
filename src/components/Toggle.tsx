interface Props {
  checked: boolean;
  label: string;
  onChange: () => void;
}

export function Toggle(props: Props) {
  return (
    <label class="setting-row switch-row">
      <span>{props.label}</span>
      <span class="switch">
        <input
          autocomplete="off"
          aria-label={props.label}
          type="checkbox"
          checked={props.checked}
          onChange={() => props.onChange()}
        />
        <span aria-hidden="true" class="switch-face">
          {props.checked ? 'On' : 'Off'}
        </span>
      </span>
    </label>
  );
}
