export default {
  app: { title: 'SubConverter 配置组装', subtitle: '可视化组装你的订阅链接' },
  form: {
    target: '目标格式', sourceUrl: '订阅源地址',
    sourceUrlPlaceholder: 'https://订阅地址/...', sourceUrlInvalid: '请输入合法的 http(s) 地址',
    savePreset: '保存为预设', importLink: '导入现有链接',
    backendBase: '自定义后端地址', backendBasePlaceholder: '如 http://127.0.0.1:25500，留空为同源',
    groups: { node: '节点选项', rule: '规则选项', advanced: '高级选项' },
  },
  preview: { title: '生成的订阅 URL', copy: '复制', copied: '已复制！', copyFailed: '复制失败', qr: '二维码' },
  presets: { title: '预设', empty: '暂无预设', load: '加载', delete: '删除', savePrompt: '预设名称', saved: '预设已保存', storageUnavailable: '浏览器存储不可用，预设无法保存' },
  import: { title: '导入现有链接', placeholder: '粘贴已有的 /sub?... 链接', invalid: '不是合法的 subconverter 订阅链接', unknownKept: '已保留未知参数' },
  common: { lang: 'EN', cancel: '取消', confirm: '确定' },
};
