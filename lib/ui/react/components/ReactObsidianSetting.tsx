import { useEffect, useRef } from 'react';
import { Setting } from 'obsidian';

export type TextConfig = {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void | Promise<void>;
};

export type DropdownConfig = {
  options: Record<string, string>;
  value: string;
  onChange?: (value: string) => void | Promise<void>;
};

export type ToggleConfig = {
  value: boolean;
  onChange?: (value: boolean) => void | Promise<void>;
};

export function ReactObsidianSetting({
  name,
  desc,
  setHeading,
  setDisabled,
  noBorder,
  className,
  text,
  dropdown,
  toggle,
  setup,
  renderControl
}: {
  name?: string;
  desc?: string;
  setHeading?: boolean;
  setDisabled?: boolean;
  noBorder?: boolean;
  className?: string;
  text?: TextConfig;
  dropdown?: DropdownConfig;
  toggle?: ToggleConfig;
  setup?: (setting: Setting) => void;
  renderControl?: (controlEl: HTMLElement) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const setting = new Setting(ref.current);
    if (className) {
      setting.settingEl.addClass(className);
    }
    if (name) {
      setting.setName(name);
    }
    if (desc) {
      setting.setDesc(desc);
    }
    if (setHeading) {
      setting.setHeading();
    }
    if (setDisabled) {
      setting.setDisabled(true);
    }
    if (noBorder) {
      setting.settingEl.addClass('no-border');
    }

    if (text) {
      setting.addText((t) => {
        if (text.placeholder) {
          t.setPlaceholder(text.placeholder);
        }
        if (text.value !== undefined) {
          t.setValue(text.value);
        }
        if (text.onChange) {
          t.onChange(async (value) => {
            await text.onChange!(value);
          });
        }
      });
    }

    if (dropdown) {
      setting.addDropdown((d) => {
        // add options
        Object.entries(dropdown.options).forEach(([key, label]) => d.addOption(key, label));
        d.setValue(dropdown.value);
        if (dropdown.onChange) {
          d.onChange(async (value) => {
            await dropdown.onChange!(value);
          });
        }
      });
    }

    if (toggle) {
      setting.addToggle((tg) => {
        tg.setValue(toggle.value);
        if (toggle.onChange) {
          tg.onChange(async (value) => {
            await toggle.onChange!(value);
          });
        }
      });
    }

    if (renderControl) {
      try {
        renderControl(setting.controlEl);
      } catch (e) {
        console.warn('renderControl failed', e);
      }
    }

    if (setup) {
      try {
        setup(setting);
      } catch (e) {
        console.warn('setup failed', e);
      }
    }

    return () => {
      if (ref.current) {
        // best-effort cleanup
        try {
          (ref.current as any).empty?.();
        } catch (e) {
          console.warn('cleanup failed', e);
        }
        ref.current.innerHTML = '';
      }
    };
    // Rebuild when inputs change
  }, [
    name,
    desc,
    setHeading,
    setDisabled,
    noBorder,
    className,
    text?.placeholder,
    text?.value,
    dropdown?.value,
    toggle?.value
  ]);

  return <div ref={ref} />;
}