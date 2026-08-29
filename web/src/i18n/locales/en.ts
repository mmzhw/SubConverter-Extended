export default {
  app: { title: 'SubConverter Config Builder', subtitle: 'Assemble your subscription URL visually' },
  form: {
    target: 'Target Format', sourceUrl: 'Subscription Source URL',
    sourceUrlPlaceholder: 'https://sub.example.com/...', sourceUrlInvalid: 'Enter a valid http(s) URL',
    savePreset: 'Save as preset', importLink: 'Import from link',
    groups: { node: 'Node Options', rule: 'Rule Options', advanced: 'Advanced Options' },
  },
  preview: { title: 'Generated Subscription URL', copy: 'Copy', copied: 'Copied!', copyFailed: 'Copy failed', qr: 'QR Code' },
  presets: { title: 'Presets', empty: 'No presets yet', load: 'Load', delete: 'Delete', savePrompt: 'Preset name', saved: 'Preset saved', storageUnavailable: 'Presets cannot be saved: browser storage is unavailable' },
  import: { title: 'Import from link', placeholder: 'Paste an existing /sub?... link', invalid: 'Not a valid subconverter link', unknownKept: 'Unknown parameters kept' },
  common: { lang: '中', cancel: 'Cancel', confirm: 'Confirm' },
};
