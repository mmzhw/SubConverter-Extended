export default {
  app: { title: 'SubConverter Config Builder', subtitle: 'Assemble your subscription URL visually', kicker: 'Subscription conversion workspace', ready: 'Ready', waiting: 'Waiting' },
  form: {
    target: 'Node Type', sourceUrl: 'Subscription Source URL',
    sourceUrlPlaceholder: 'https://sub.example.com/...', sourceUrlInvalid: 'Enter a valid http(s) URL',
    sourceUrlHelp: 'Enter the original provider or node subscription URL. Supported prefixes can be used here, such as provider:HK,interval:21600,https://example.com/sub for provider name and refresh interval.',
    primaryTitle: 'Node type and source',
    savePreset: 'Save as preset', importLink: 'Import from link',
    backendBase: 'Custom backend', backendBasePlaceholder: 'https://your-backend:8080 (blank = same origin)',
    backendBaseHelp: 'Choose the SubConverter backend to call. Leave blank to generate a relative /sub path for same-origin deployment; use a full backend URL for local or remote debugging.',
    groups: { node: 'Node Options', rule: 'Rule Options', advanced: 'Advanced Options' },
  },
  preview: { title: 'Generated Subscription URL', kicker: 'Live preview', ready: 'Copy ready', emptyState: 'Empty', copy: 'Copy', copied: 'Copied!', copyFailed: 'Copy failed', qr: 'QR Code', qrEmpty: 'Enter a source URL to create a QR code' },
  presets: { title: 'Presets', empty: 'No presets yet', load: 'Load', delete: 'Delete', savePrompt: 'Preset name', saved: 'Preset saved', storageUnavailable: 'Presets cannot be saved: browser storage is unavailable' },
  import: { title: 'Import from link', placeholder: 'Paste an existing /sub?... link', invalid: 'Not a valid subconverter link', unknownKept: 'Unknown parameters kept' },
  common: { lang: '中', cancel: 'Cancel', confirm: 'Confirm' },
};
